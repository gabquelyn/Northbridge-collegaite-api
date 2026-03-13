import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import crypto from "crypto";
import Application from "../model/application";
import { createMoodleUser, getMoodleUserByEmail } from "../utils/moodle";
import Profile from "../model/profile";
import generatePassword from "../utils/generateRandomPassword";
import sendMail from "../utils/sendMail";
import { compileEmail } from "../emails/compileEmail";
import invoice from "../model/invoice";

interface PayStackEvent {
  event: string;
  data: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: "success" | string;
    metadata: {
      applicationId: string;
    };
  };
}

const paystackWebhookHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    // ! confirming the webhook source
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash == req.headers["x-paystack-signature"]) {
      const response: PayStackEvent = req.body;
      console.log(response);

      if (response.event == "charge.success") {
        //   * Mark admission as paid upon completion

        const applicationId = response.data.metadata.applicationId;
        await invoice.findOneAndUpdate(
          { reference: response.data.reference },
          {
            currency: response.data.currency,
            amount: response.data.amount,
             status: response.data.status,
          },
        );

        const application = await Application.findByIdAndUpdate(applicationId, {
          paid: true,
        })
          .lean()
          .exec();

        const profile = await Profile.findById(application?.profile)
          .lean()
          .exec();

        // ! MOODLE FOR ONSITE USERS
        if (application?.mode == "on-site" && profile) {
          // * Create a payment reference for the admission;
          const { email, firstName, lastName } = profile.bio;
          //  * Check moodle details and create
          const moodleUser = await getMoodleUserByEmail(email);
          const password = generatePassword(6);

          if (moodleUser.length === 0) {
            // * create a new moodle account using the application profile email
            await createMoodleUser({
              username: email,
              password,
              firstName,
              lastName,
              email,
            });

            const { html } = compileEmail("moodle", {
              studentEmail: email,
              studentPassword: password,
              companyName: "NBC",
            });

            // * send moodle details to user (CAAP)
            await sendMail({
              to: `${email}`,
              html,
              subject: "Study Account Credentials",
            });
          }

          // TODO: if it is on-site create moodle user, send them the details, and assign courses
        }
      }
    }

    res.send(200);
  },
);

export default paystackWebhookHandler;
