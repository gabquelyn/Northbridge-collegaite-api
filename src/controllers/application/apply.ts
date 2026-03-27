import expressAsyncHandler from "express-async-handler";
import {Request, Response } from "express";
import userModel from "../../model/user";
import { validationResult } from "express-validator";
import { CustomRequest } from "../../types/request";
import Profile from "../../model/profile";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import { UNIT_COURSE } from "../../config/prices";
import { getCachedMoodleCourses } from "../../utils/getMoodleCached";
import mongoose from "mongoose";
import { fileUploadQueue } from "../../services/queue";

 const requestApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const result = validationResult(req);

    // * validation of required fields and documents
    if (!result.isEmpty())
      return res
        .status(400)
        .json({ message: "Invalid data received", error: result.array() });

    const fileFields = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const requiredFiles = ["passport", "transcripts", "govId"];

    for (const field of requiredFiles) {
      if (!fileFields?.[field]) {
        return res.status(400).json({ message: `Missing ${field}` });
      }
    }

    const {
      mode,
      programs,
      canadian,
      firstName,
      lastName,
      middleName,
      phoneNumber,
      email,
      dob,
      gender,
      street,
      city,
      unit,
      state,
      currentSchool,
      homeSchool,
      pathway,
      completedSecondaryDiploma,
      language,
      country,
      canadianVisa,
      birthCountry,
      intendToApply,
      courses,
      qualification,
      secondaryEntry,
    }: { [key: string]: string; mode: "on-site" | "off-site" } = req.body;

    const canadianStudent = String(canadian).toLowerCase() === "true";
    const userId = (req as CustomRequest).id;
    const guardianPromise = userModel.findById(userId).lean().exec();

    const prevOffSiteAppplication = Application.findOne({
      applicant: userId,
      mode: "off-site",
    })
      .lean()
      .exec();

    const moodleCoursesPromise =
      mode === "off-site" ? getCachedMoodleCourses() : [];

    const [guardian, moodleCourses, prev] = await Promise.all([
      guardianPromise,
      moodleCoursesPromise,
      prevOffSiteAppplication,
    ]);

    if (!guardian)
      return res
        .status(400)
        .json({ message: "Guardian/User account does not exist" });

    let programsArray: string[] = [];

    // onsite checks
    if (mode === "on-site") {
      //* parse the programs and booleans

      try {
        programsArray = JSON.parse(programs || "[]");
      } catch {
        return res.status(400).json({ message: "Invalid programs format" });
      }

      const VALID_PROGRAMS = new Set(["CAAP", "AY12", "GRADE11", "GRADE12"]);
      const programsSet = new Set(programsArray);

      for (const p of programsArray) {
        if (!VALID_PROGRAMS.has(p)) {
          return res.status(400).json({ message: "Invalid program selected" });
        }
      }

      if (programsArray.length < 1) {
        return res.status(400).json({
          message: `${mode} students are expected to pick at least a program`,
        });
      }

      //! non-canadian student must take CAAP alongside other programs
      if (!canadianStudent && !programsSet.has("CAAP"))
        return res
          .status(400)
          .json({ message: "Non-canadian students are mandated to take CAAP" });

      //! AY12 must accompany Grade 12
      if (programsSet.has("AY12") && !programsSet.has("GRADE12")) {
        return res
          .status(400)
          .json({ message: "Ay 12 must be accompanied with Grade 12" });
      }

      //! Grade 11 must be done before Grade 12
      if (programsSet.has("GRADE12") && !programsSet.has("GRADE11")) {
        return res
          .status(400)
          .json({ message: "Grade 11 must be done before Grade 12" });
      }
    }

    let selectedCourseIds: number[] = [];

    // * OFFSITE STUDENTS
    if (mode === "off-site") {
      if (prev)
        return res.status(400).json({
          message: "Admission profile exists already, purchase courses",
        });

      try {
        selectedCourseIds = JSON.parse(courses || "[]");
      } catch {
        return res.status(400).json({ message: "Invalid courses format" });
      }
      if (selectedCourseIds.length === 0)
        return res
          .status(400)
          .json({ message: "Select at least a course for online programs" });

      const moodleCourseIds = new Set(moodleCourses.map((obj) => obj.id));
      for (const id of selectedCourseIds) {
        if (!moodleCourseIds.has(id))
          return res
            .status(400)
            .json({ message: "Selected course doesn't exist in moodle" });
      }
    }

    const files = Object.keys(fileFields).reduce(
      (acc, key) => {
        acc[key] = fileFields[key].map((f) => f.path);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // Using transactions to monitor db
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const profile = await Profile.create(
        [
          {
            guardian: userId,
            bio: {
              firstName,
              lastName,
              middleName,
              phoneNumber,
              email,
              dob,
              gender,
            },
            address: {
              street,
              city,
              unit,
              state,
              country,
            },
            academics: {
              currentSchool,
              homeSchool,
              pathway,
              completedSecondaryDiploma,
              qualification,
              secondaryEntry,
            },
            citizenship: {
              canadian,
              language,
              birthCountry,
              canadianVisa,
              intendToApply,
            },
          },
        ],
        { session },
      );

      const application = await Application.create(
        [
          {
            profile: profile[0]._id,
            programs: mode === "on-site" ? programsArray : [],
            courses: mode === "off-site" ? selectedCourseIds : [],
            mode,
            applicant: userId,
          },
        ],
        { session },
      );
      await session.commitTransaction();

      await fileUploadQueue.add(
        "upload-files",
        {
          files,
          profileId: profile[0]._id,
        },
        {
          jobId: application[0]._id,
          // attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }, 
      );

      if (mode === "off-site") {
        const response = await initializePayment({
          amount: selectedCourseIds.length * UNIT_COURSE,
          email: guardian.email,
          metadata: {
            applicationId: application[0]._id,
          },

        });

        if (response.status) {
          return res.status(201).json({
            paymentUrl: response.data?.authorization_url,
            accessCode: response.data?.access_code,
          });
        }
      }
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    return res.status(201).json({ message: "Admission request submitted" });
  },
);

export default requestApplication;