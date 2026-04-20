import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { CustomRequest } from "../../types/request";
import Profile from "../../model/profile";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import User from "../../model/user";
import { getCachedMoodleCourses } from "../../utils/getMoodleCached";
import mongoose from "mongoose";
import { fileUploadQueue } from "../../services/queue";
import { UNIT_COURSE } from "../../config/prices";
import moment from "moment";

const editApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const result = validationResult(req);

    // * validation of required fields and documents
    if (!result.isEmpty())
      return res
        .status(400)
        .json({ message: "Invalid data received", error: result.array() });

    const userId = (req as CustomRequest).id;
    const { id } = req.params;
    const prevApplicationPromise = Application.findById(id).exec();
    const userPromise = User.findById(userId).exec();
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

    const moodleCoursesPromise =
      mode === "off-site" ? getCachedMoodleCourses() : [];

    const [prevApplication, user, moodleCourses] = await Promise.all([
      prevApplicationPromise,
      userPromise,
      moodleCoursesPromise,
    ]);

    if (!prevApplication)
      return res.status(404).json({ message: "Application not found" });

    if (!user) return res.status(404).json({ message: "Applicant not found" });

    const prevProfile = await Profile.findById(prevApplication.profile).exec();

    if (!prevProfile)
      return res.status(404).json({ message: "Profile not found" });

    if (
      prevApplication.applicant.toString() !== userId &&
      user?.role !== "admin"
    )
      return res
        .status(400)
        .json({ message: "Not permitted to edit application" });

    if (
      ((prevApplication.paid && prevApplication.mode == "on-site") ||
        (prevApplication.granted && prevApplication.mode == "off-site")) &&
      user?.role !== "admin"
    )
      return res.status(400).json({
        message: "Applcation cannot be edited after being granted or paid for",
      });

    const fileFields = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const canadianStudent = String(canadian).toLowerCase() === "true";

    let programsArray: string[] = [];

    // onsite checks
    if (mode === "on-site") {
      //* parse the programs and booleans

      try {
        programsArray = JSON.parse(programs);
      } catch {
        return res.status(400).json({ message: "Invalid programs format" });
      }

      const VALID_PROGRAMS = new Set([
        "CAAP",
        "AY12",
        "GRADE11",
        "GRADE12",
        "DIRECT",
      ]);
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

      const now = moment();
      const current = now.format("MM-DD");
      const isWithinRange = current >= "11-01" && current <= "12-15";

      if (programsSet.has("AY12") && !isWithinRange) {
        return res.status(400).json({
          message: "Application window for Academic Year (AY12) closed",
        });
      }
    }

    let selectedCourseIds: number[] = [];

    if (mode === "off-site") {
      try {
        selectedCourseIds = JSON.parse(courses);
        console.log(selectedCourseIds);
      } catch {
        return res.status(400).json({ message: "Invalid courses format" });
      }
      if (selectedCourseIds.length === 0)
        return res
          .status(400)
          .json({ message: "Select at least a course for online programs" });

      const moodleCourseIds = new Set(moodleCourses.map((obj) => obj.id));
      for (const id of selectedCourseIds) {
        if (!moodleCourseIds.has(id)) {
          console.log(id, "br", moodleCourseIds);
          return res
            .status(400)
            .json({ message: "Selected course doesn't exist in moodle" });
        }
      }
    }

    const files = Object.keys(fileFields).reduce(
      (acc, key) => {
        acc[key] = fileFields[key].map((f) => f.path);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await prevProfile.updateOne(
        {
          $set: {
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
        },
        { session },
      );
      await prevApplication.updateOne(
        {
          $set: {
            programs: mode === "on-site" ? programsArray : [],
            courses: mode === "off-site" ? selectedCourseIds : [],
          },
        },
        { session },
      );
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    await fileUploadQueue.add(
      "upload-files",
      {
        files,
        profileId: prevProfile._id,
      },
      {
        // attempts: 3,
        jobId: prevApplication._id.toString(),
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    if (mode === "off-site") {
      const response = await initializePayment({
        amount: selectedCourseIds.length * UNIT_COURSE,
        email: user.email,
        metadata: {
          applicationId: prevApplication._id,
        },
        applicationId: prevApplication._id,
      });

      if (response.status) {
        return res.status(201).json({
          paymentUrl: response.data?.authorization_url,
          accessCode: response.data?.access_code,
        });
      }
    }

    return res.status(201).json({ message: "Admission details edited" });
  },
);

export default editApplication;
