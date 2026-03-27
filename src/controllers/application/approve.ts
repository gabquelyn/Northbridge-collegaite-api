import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import userModel from "../../model/user";
import { CustomRequest } from "../../types/request";
import Profile from "../../model/profile";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import { compileEmail } from "../../emails/compileEmail";
import sendMail from "../../utils/sendMail";
import {
  createMoodleUser,
  enrolStudentInCourses,
  getMoodleUserByEmail,
} from "../../utils/moodle";
import { prices, APPLICATION_FEE } from "../../config/prices";
import generatePassword from "../../utils/generateRandomPassword";

const approveApplicationRequest = expressAsyncHandler(
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
        amount: totalPrice + APPLICATION_FEE,
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
              value: APPLICATION_FEE * 100,
            },
          ],
          
        },

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

export default approveApplicationRequest