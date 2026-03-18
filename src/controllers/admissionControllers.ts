import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import uploadToCloudinary from "../utils/upload";
import userModel from "../model/user";
import { validationResult } from "express-validator";
import { CustomRequest, RequestWithCahcedKey } from "../types/request";
import Profile from "../model/profile";
import Application from "../model/application";
import initializePayment from "../utils/initializePayment";
import { compileEmail } from "../emails/compileEmail";
import sendMail from "../utils/sendMail";
import {
  createMoodleUser,
  enrolStudentInCourses,
  getMoodleCourses,
  getMoodleUserByEmail,
} from "../utils/moodle";
import { prices } from "../utils/prices";
import generatePassword from "../utils/generateRandomPassword";
import { cache } from "../middlewares/cache";
import User from "../model/user";
import invoice from "../model/invoice";

export const requestApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const uploadedFiles: Record<
      string,
      { url: string; public_id: string; filename: string }[]
    > = {};
    const result = validationResult(req);

    // * validation of required fields and documents
    if (!result.isEmpty())
      return res
        .status(400)
        .json({ message: "Invalid data received", error: result.array() });

    const fileFields = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    if (!fileFields?.transcripts || !fileFields?.govId)
      return res.status(400).json({ message: "Missing transcript and govId" });

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
      secondaryEntry,
      secondaryCompletion,
      pathway,
      completedSecondaryDiploma,
      language,
      country,
      canadianVisa,
      intendToApply,
      courses,
    }: { [key: string]: string; mode: "on-site" | "off-site" } = req.body;

    //* parse the programs and booleans
    const programsArray = JSON.parse(programs || "[]");
    const canadianStudent = canadian === "true" || canadian === "True";

    const guardian = await userModel
      .findById((req as CustomRequest).id)
      .lean()
      .exec();

    if (!guardian)
      return res
        .status(400)
        .json({ message: "Guardian/User account does not exist" });

    // * ONSITE STUDENTS
    if (mode === "on-site") {
      if (programsArray.length < 1) {
        return res.status(400).json({
          message: `${mode} students are expected to pick at least a program`,
        });
      }
      // Checking previous applications--ongoing or completed

      //! non-canadian student must take CAAP alongside other programs
      if (!canadianStudent && !programsArray.includes("CAAP"))
        return res
          .status(400)
          .json({ message: "Non-canadian students are mandated to take CAAP" });

      //! AY12 must accompany Grade 12
      if (
        programsArray.includes("AY12") &&
        !programsArray.includes("GRADE12")
      ) {
        return res
          .status(400)
          .json({ message: "Ay 12 must be accompanied with Grade 12" });
      }

      //! Grade 11 must be done before Grade 12
      if (
        programsArray.includes("GRADE12") &&
        !programsArray.includes("GRADE11")
      ) {
        return res
          .status(400)
          .json({ message: "Grade 11 must be done before Grade 12" });
      }
    }

    //* checking for programs on moodle
    // TODO: ask Arif for the id's of courses and programs

    const selectedCourseIds: number[] = JSON.parse(courses || "[]");

    // * OFFSITE STUDENTS
    if (mode === "off-site") {
      const moodleCourses = await getMoodleCourses();
      const moodleCourseIds = moodleCourses.map((obj) => obj.id);
      if (selectedCourseIds.length === 0)
        return res
          .status(400)
          .json({ message: "Select at least a course for online programs" });

      for (const id of selectedCourseIds) {
        if (!moodleCourseIds.includes(id))
          return res
            .status(400)
            .json({ message: "Selected course doesn't exist in moodle" });
      }
    }

    //* handles file uploads to cloudinary for (transcripts, govId, and supporting documents)
    // TODO: ask Arif about using cloudinary for compliance

    for (const field in req.files) {
      uploadedFiles[field] = [];
      for (const file of (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      )[field]) {
        const result = await uploadToCloudinary(
          file.buffer,
          "student-documents",
        );

        uploadedFiles[field].push({
          url: result.secure_url,
          public_id: result.public_id,
          filename: result.original_filename,
        });
      }
    }

    //* save neccesary profile data
    const newProfile = await Profile.create({
      guardian: (req as CustomRequest).id,
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
      },
      academics: {
        currentSchool,
        homeSchool,
        secondaryEntry,
        secondaryCompletion,
        pathway,
        completedSecondaryDiploma,
      },
      citizenship: {
        canadian,
        language,
        country,
        canadianVisa,
        intendToApply,
      },
      documents: uploadedFiles,
    });

    //* create a pending admission request
    const application = await Application.create({
      profile: newProfile._id,
      applicant: (req as CustomRequest).id,
      programs: mode == "on-site" ? programsArray : [],
      courses: mode == "off-site" ? selectedCourseIds : [],
      mode,
    });

    //* send checkoutlink for off-site users

    if (mode === "off-site") {
      const response = await initializePayment({
        amount: selectedCourseIds.length * 1045000,
        email: guardian.email,
        metadata: {
          applicationId: application._id,
        },
        application: application._id,
        user: (req as CustomRequest).id,
      });

      if (response.status) {
        return res.status(201).json({
          paymentUrl: response.data?.authorization_url,
          accessCode: response.data?.access_code,
        });
      }
    }
    return res.status(201).json({ message: "Admission request submitted" });
  },
);

export const approveApplicationRequest = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const application = await Application.findById(id).exec();
    const profile = await Profile.findById(application?.profile).lean().exec();
    const guardian = await userModel
      .findById(application?.applicant)
      .lean()
      .exec();
    if (!application || !profile || !guardian)
      return res
        .status(404)
        .json({ message: "Important admission details not found" });

    const { email, firstName, lastName } = profile.bio;

    if (application.granted) {
      return res.status(400).json({ message: "Application already granted" });
    }

    if (application.granted && application.paid)
      return res
        .status(400)
        .json({ message: "Admission already granted and payment completed" });

    // ! ACTIONS FOR MATURED STUDENTS (BUYING OF UNIT COURSES)
    if (application.mode == "off-site") {
      // TODO: Increase payment check by relying on Paystack
      if (!application.paid)
        return res
          .status(400)
          .json({ message: "Payment for courses not completed yet" });

      //   create a moodle account for the user and send admission letter if not exist
      const moodleUser: { id: number }[] = await getMoodleUserByEmail(email);

      const password = generatePassword();
      // if applicant does not have an account with NBC
      let userId;

      if (moodleUser.length === 0) {
        // * create a new moodle account using the profile profile email
        const userid = await createMoodleUser({
          username: email,
          password,
          firstName,
          lastName,
          email,
        });
        userId = userid;

        const { html } = compileEmail("moodle", {
          studentEmail: email,
          studentPassword: password,
          companyName: "NBC",
        });

        // * send moodle details to off-site users
        await sendMail({
          to: `${email}, ${guardian.email}`,
          html,
          subject: "Study Account Credentials",
        });
      } else {
        userId = moodleUser[0].id;
      }

      await enrolStudentInCourses(userId, application.courses);
    }

    // ! ONSITE STUDENTS GET ADMISSION LETTER AND ARE MEANT TO PAY
    if (application.mode == "on-site") {
      //* calculate all the prices for the selected program

      let totalPrice = 0;
      for (const program of application.programs) {
        for (const price of prices) {
          if (program === price.name) {
            totalPrice += price.amount;
          }
        }
      }

      const response = await initializePayment({
        amount: totalPrice + 1335,
        email: guardian.email,
        metadata: {
          applicationId: application._id,
          custom_fields: [
            ...prices.map((p) => ({
              display_name: p.detail,
              variable_name: p.name,
              value: p.amount,
            })),
            {
              display_name: "Profile & Enrolment Fee",
              variable_name: "AEF",
              value: 1335 * 100,
            },
          ],
        },
        application: application._id,
        user: (req as CustomRequest).id,
      });

      if (response.status && response.data?.authorization_url) {
        const { html } = compileEmail("payment", {
          date: new Date().getDate(),
          studentName: `${firstName} ${lastName}`,
          program: application.programs.join(", "),
          academicYear: new Date().getFullYear(),
          paymentUrl: response.data.authorization_url,
        });

        await sendMail({
          to: guardian.email,
          subject: "Complete Payment For Programs",
          html,
        });
      }
    }

    application.granted = true;
    await application.save();
    return res.status(200).json({
      message:
        application.mode == "on-site"
          ? "Admission granted and payment link sent"
          : "Course purchase approved and user added to moodle",
    });
  },
);

export const getApplications = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const user = await userModel
      .findById((req as CustomRequest).id)
      .lean()
      .exec();

    const application = await Application.find(
      user?.role == "admin" ? {} : { applicant: (req as CustomRequest).id },
    )
      .populate("profile")
      .lean()
      .exec();

    return res.status(200).json({ data: application });
  },
);

export const getOnlineCourses = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const data = await getMoodleCourses();
    // * Set cache for course to reduce Moodle server calls
    cache.set((req as RequestWithCahcedKey).cachedKey, data);
    return res.status(200).json({ data });
  },
);

export const getPayments = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const data = await invoice
      .find({})
      .populate("application")
      .populate("user", "-password")
      .lean()
      .exec();
    return res.status(200).json({ data });
  },
);

export const enrol = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const { profile } = req.params;
    const { programs, courses } = req.body;
    const error = validationResult(req);
    if (!error.isEmpty()) return res.status(400).json({ error: error.array() });
    const selectedProfile = await Profile.findById(profile).lean().exec();
    const user = await User.findById(userId).lean().exec();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!selectedProfile)
      return res.status(404).json({ message: "Admission profile not found" });
    const hasPrograms = programs.length > 0;
    const hasCourses = courses.length > 0;

    if (!hasPrograms && !hasCourses) {
      return res.status(400).json({ message: "Select a course or program" });
    }

    if (hasPrograms && hasCourses) {
      return res.status(400).json({
        message: "Can't enrol for a course and a program simultaneously",
      });
    }

    const query: { applicant: string; profile: string; paid?: boolean } = {
      applicant: userId,
      profile: profile,
    };

    if (hasCourses) {
      query.paid = true;
    }

    const prevApplications = await Application.find(query).lean().exec();

    // * check if the admission requested already on the course or program
    // Paid for courses and applied for programs
    for (const application of prevApplications) {
      if (hasCourses) {
        for (const course of courses) {
          if (application.courses.includes(course))
            return res
              .status(400)
              .json({ message: `Course ,${course}, already paid for` });
        }
      }

      if (hasPrograms) {
        for (const program of programs) {
          if (application.programs.includes(program))
            return res
              .status(400)
              .json({ message: `Program ,${program}, already applied for` });
        }
      }
    }

    // for course purchase
    if (hasCourses) {
      const moodleCourses = await getMoodleCourses();
      const moodleCourseIds = moodleCourses.map((obj) => obj.id);
      for (const course of courses)
        if (!moodleCourseIds.includes(course))
          return res
            .status(400)
            .json({ message: "Selected course doesn't exist in moodle" });
    }

    // for non-canadian student: check CAAP is included or taken previously
    if (hasPrograms) {
      const activeCAAP = await Application.findOne({
        ...query,
        paid: true,
        programs: "CAAP",
      })

        .lean()
        .exec();
      if (
        !selectedProfile.citizenship.canadian &&
        !programs.includes("CAAP") &&
        !activeCAAP
      )
        return res
          .status(400)
          .json({ message: "Non-canadian students are mandated to take CAAP" });

      const activeGrade12 = await Application.findOne({
        ...query,
        paid: true,
        programs: "GRADE12",
      });

      // can't take AY12 without grade 12
      if (
        programs.include("AY12") &&
        !programs.include("GRADE12") &&
        !activeGrade12
      ) {
        return res
          .status(400)
          .json({ message: "Grade 12 program must accompany AY12" });
      }

      // can't take Grade 12 without grade 11

      const activeGrade11 = await Application.findOne({
        ...query,
        paid: true,
        programs: "GRADE11",
      });
      if (
        programs.include("GRADE12") &&
        !programs.include("GRADE11") &&
        !activeGrade11
      ) {
        return res
          .status(400)
          .json({ message: "Grade 11 program must be done before grade 12" });
      }
    }

    // create a new application for program or courses
    const application = await Application.create({
      applicant: (req as CustomRequest).id,
      profile,
      programs,
      courses,
      mode: hasCourses ? "off-site" : "on-site",
    });

    if (hasCourses) {
      // * send details to make payments
      const totalPrice = courses.length * 1045000;
      const response = await initializePayment({
        amount: totalPrice,
        email: user.email,
        metadata: {
          applicationId: application._id,
        },
        application: application._id,
        user: (req as CustomRequest).id,
      });

      return res.status(201).json({
        paymentUrl: response.data?.authorization_url,
        accessCode: response.data?.access_code,
      });
    }

    return res
      .status(201)
      .json({ message: `Application for ${programs.join(",")} submitted` });
  },
);
