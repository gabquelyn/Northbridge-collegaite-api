import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import userModel from "../../model/user";
import { validationResult } from "express-validator";
import { CustomRequest } from "../../types/request";
import Profile from "../../model/profile";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import { APPLICATION_FEE, UNIT_COURSE } from "../../config/prices";
import { getCachedMoodleCourses } from "../../utils/getMoodleCached";
import mongoose from "mongoose";
import { emailQueue, fileUploadQueue } from "../../services/queue";
import { compileEmail } from "../../emails/compileEmail";
import moment from "moment";

type fileNames = "passport" | "transcripts" | "govId" | "birthCert";
const requestApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
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
      fatherFirstName,
      fatherLastName,
      fatherPhoneNumber,
      fatherEmail,
      fatherDeaceased,
      motherFirstName,
      motherLastName,
      motherEmail,
      motherPhoneNumber,
      motherDeaceased,
      requestedInstallment,
      referrer,
    }: { [key: string]: string; mode: "on-site" | "off-site" } = req.body;
    const { id } = req.params;
    const prevProfile = await Profile.findById(id).exec();

    const error = validationResult(req);
    if (!prevProfile) {
      return res.status(404).json({ message: "Profile does not exist" });
    }

    const prevApplication = await Application.findOne({ profile: id }).exec();
    if (prevApplication)
      return res.status(400).json({ message: "Already applied" });
    if (
      (!fatherFirstName ||
        !fatherLastName ||
        !fatherPhoneNumber ||
        !fatherEmail) &&
      fatherDeaceased == "false"
    ) {
      return res.status(400).json({
        message: "Father details required if not deceased",
      });
    }

    if (
      (!motherFirstName ||
        !motherLastName ||
        !motherPhoneNumber ||
        !motherEmail) &&
      motherDeaceased == "false"
    ) {
      return res.status(400).json({
        message: "Mother details required if not deceased",
      });
    }

    // * validation of required fields and documents
    if (!error.isEmpty()) {
      return res.status(400).json({
        message: error
          .array()
          .map((e) => (e.type === "field" ? `${e.path}: ${e.msg}` : e.msg))
          .join(", "),
      });
    }

    const fileFields = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const requiredFiles: fileNames[] = [
      "passport",
      "transcripts",
      "govId",
      "birthCert",
    ];

    for (const field of requiredFiles) {
      if (!fileFields?.[field] && prevProfile.documents?.[field]?.length == 0) {
        return res.status(400).json({ message: `Missing ${field}` });
      }
    }

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
    let response;
    const session = await mongoose.startSession();
    session.startTransaction();
    let application;
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
            parent: {
              fatherFirstName,
              fatherLastName,
              fatherPhoneNumber,
              fatherEmail,
              fatherDeaceased,
              motherFirstName,
              motherLastName,
              motherEmail,
              motherPhoneNumber,
              motherDeaceased,
            },
            referrer,
            requestedInstallment
          },
        },
        { session },
      );

      application = await Application.create(
        [
          {
            profile: id,
            programs: mode === "on-site" ? programsArray : [],
            courses: mode === "off-site" ? selectedCourseIds : [],
            mode,
            applicant: userId,
          },
        ],
        { session },
      );

      response = await initializePayment({
        amount: APPLICATION_FEE,
        email: guardian.email,
        metadata: {
          applicationId: application[0]._id,
          type: "APPLICATION_FEE",
        },
        applicationId: application[0]._id,
        customerName: guardian.name,
      });
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
        profileId: id,
      },
      {
        jobId: application[0]._id.toString(),
        // attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    const { html } = compileEmail("notification", {
      adminName: "Admin",
      applicantName: `${firstName} ${lastName}`,
      applicantEmail: email,
      program: `${mode} ${mode == "off-site" ? `${selectedCourseIds.length} courses` : `${programsArray.join(", ")}`}`,
      submissionDate: new Date().toDateString(),
      dashboardUrl: `${process.env.FRONTEND_URL}/application/${application[0]._id.toString()}`,
    });

    await emailQueue.add("deliver", {
      to: "admissions@northbridgec.ca",
      html,
      subject: "New Application Request",
    });

    if (response.status) {
      return res.status(201).json({
        paymentUrl: response.data?.authorization_url,
      });
    }

    return res.status(201).json({ message: "Admission request submitted" });
  },
);

export default requestApplication;
