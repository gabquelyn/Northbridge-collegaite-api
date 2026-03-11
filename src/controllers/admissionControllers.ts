import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import uploadToCloudinary from "../utils/upload";
import userModel from "../model/user";
import { validationResult } from "express-validator";
import { CustomRequest } from "../types/request";
import Application from "../model/application";
import Admission from "../model/admission";
import initializePayment from "../utils/initializePayment";
import { compileEmail } from "../emails/compileEmail";
import sendMail from "../utils/sendMail";
import {
  createMoodleUser,
  getMoodleCourses,
  getMoodleUserByEmail,
} from "../utils/moodle";
import { prices } from "../utils/prices";
import generatePassword from "../utils/generateRandomPassword";

export const requestAdmission = expressAsyncHandler(
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
    if (!req.files)
      return res.status(400).json({ message: "Missing required files" });

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
    } = req.body;

    //* parse the programs and booleans
    const programsArray = JSON.parse(programs || "[]");
    const canadianStudent = Boolean(canadian);

    const guardian = await userModel
      .findById((req as CustomRequest).id)
      .lean()
      .exec();
    if (!guardian?.profile)
      return res.status(400).json({ message: "Profile not completed yet" });

    if (mode === "on-site") {
      if (programsArray.length < 1) {
        return res.status(400).json({
          message: `${mode} students are expected to pick at least a program`,
        });
      }

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
    }

    //* checking for programs on moodle
    // TODO: ask Arif for the id's of courses and programs

    const selectedCourseIds: number[] = JSON.parse(courses || "[]");
    const moodleCourses = await getMoodleCourses();
    const moodleCourseIds = moodleCourses.map((obj) => obj.id);

    if (mode === "off-site" && selectedCourseIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Select at least a course for online programs" });
    }

    for (const id of selectedCourseIds) {
      if (!moodleCourseIds.includes(id))
        return res
          .status(400)
          .json({ message: "Selected course doesn't exist in moodle" });
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

    //* save neccesary application data
    const newApplication = await Application.create({
      guardian: (req as CustomRequest).id,
      profile: {
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
    const admission = await Admission.create({
      application: newApplication._id,
      programs: programsArray,
      courses: selectedCourseIds,
      mode,
    });

    //* send checkoutlink for off-site users

    if (mode === "off-site") {
      const response = await initializePayment({
        amount: selectedCourseIds.length * 1015 * 100,
        email: guardian.email,
        metadata: {
          admissionId: admission._id,
        },
      });

      if (response.status) {
        res.status(201).json({ paymentUrl: response.data?.authorization_url });
      }
    }
    return res.status(201).json({ message: "Admission request submitted" });
  },
);

export const approveAdmissionRequest = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const admission = await Admission.findById(id).lean().exec();
    const application = await Application.findById(admission?.application)
      .lean()
      .exec();
    const guardian = await userModel
      .findById(application?.guardian)
      .lean()
      .exec();
    if (!admission || !application || !guardian)
      return res
        .status(404)
        .json({ message: "Important admission details not found" });

    if (admission.granted && admission.paid)
      return res
        .status(400)
        .json({ message: "Admission already granted and payment completed" });

    // ! ACTIONS FOR MATURED STUDENTS (BUYING OF UNIT COURSES)
    if (admission.mode == "off-site") {
      if (!admission.paid)
        return res
          .status(400)
          .json({ message: "Payment for courses not completed yet" });

      //   create a moodle account for the user and send admission letter if not exist
      const applicantEmail = application.profile.email;
      const moodleUser = await getMoodleUserByEmail(applicantEmail);

      // if applicant does not have an account with NBC
      if (moodleUser.length === 0) {
        // * create a new moodle account using the application profile email
        await createMoodleUser({
          username: applicantEmail,
          password: generatePassword(6),
          firstname: application.profile.firstName,
          lastName: application.profile.lastName,
          email: applicantEmail,
        });
      }

      // TODO: add them to the respective courses without creating another account
      // TODO: request form Arif the ids, of just pull them and update them
    }

    // TODO: Prices conversion to Naira

    if (admission.mode == "on-site") {
      //* calculate all the prices for the selected program

      let totalPrice = 0;
      for (const program of admission.programs) {
        for (const price of prices) {
          if (program === price.name) {
            totalPrice += price.amount;
          }
        }
      }

      const response = await initializePayment({
        amount: (totalPrice + 1335) * 100,
        email: guardian.email,
        metadata: {
          admissionId: admission._id,
          custom_fields: [
            ...prices.map((p) => ({
              display_name: p.detail,
              variable_name: p.name,
              value: p.amount,
            })),
            {
              display_name: "Application & Enrolment Fee",
              variable_name: "AEF",
              value: 1335 * 100,
            },
          ],
        },
      });

      if (response.status && response.data?.authorization_url) {
        const { html } = compileEmail("payment", {
          date: new Date().getDate(),
          studentName: `${application.profile.firstName} ${application.profile.lastName}`,
          program: admission.programs.join(", "),
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

    return res.status(200).json({
      message:
        admission.mode == "off-site"
          ? "Admission granted and payment link sent"
          : "Course purchase approved and user added to moodle",
    });
  },
);
