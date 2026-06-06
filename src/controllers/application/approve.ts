import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import userModel from "../../model/user";
import Profile from "../../model/profile";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import { compileEmail } from "../../emails/compileEmail";
import { enrolStudentInCourses } from "../../utils/moodle";
import { prices, APPLICATION_FEE } from "../../config/prices";
import moodleCredentials from "../../utils/moodleCredentials";
import { emailQueue } from "../../services/queue";
import { v4 as uuid } from "uuid";
import cost from "../../utils/programs";

const approveApplicationRequest = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { installment } = req.body;
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
      // TODO: Increase payment srutiny
      if (!application.paid)
        return res
          .status(400)
          .json({ message: "Payment for courses not completed yet" });

      const userId = await moodleCredentials({ email, firstName, lastName });
      await enrolStudentInCourses(userId, application.courses);
    }

    // ! ONSITE STUDENTS GET ADMISSION LETTER AND ARE MEANT TO PAY
    if (application.mode == "on-site") {
      //* calculate all the prices for the selected program

      const totalPrice = cost(application.programs);
      if (installment) application.installment = true;

      const response = await initializePayment({
        amount: installment ? totalPrice * 0.6 : totalPrice,
        email: guardian.email,
        metadata: {
          applicationId: application._id,
          custom_fields: [
            ...prices.map((p) => ({
              display_name: p.detail,
              variable_name: p.name,
              value: p.amount * 100,
            })),
            {
              display_name: "Profile & Enrolment Fee",
              variable_name: "AEF",
              value: APPLICATION_FEE * 100,
            },
          ],
        },
        applicationId: application._id,
        customerName: guardian.name
      });

      if (response.status && response.data?.authorization_url) {
        const { html } = compileEmail("payment", {
          date: new Date().getDate(),
          studentName: `${firstName} ${lastName}`,
          program: application.programs.join(", "),
          academicYear: new Date().getFullYear(),
          paymentUrl: response.data.authorization_url,
        });

        await emailQueue.add(
          "deliver",
          {
            to: guardian.email,
            html,
            subject: "Complete Payment For Programs",
          },
          { jobId: uuid() },
        );
        await application.save();
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

export default approveApplicationRequest;
