import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import Application from "../../model/application";
import Profile from "../../model/profile";
import { emailQueue } from "../../services/queue";
import { compileEmail } from "../../emails/compileEmail";
import { v4 as uuid } from "uuid";
import User from "../../model/user";
const rescindApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const application = await Application.findById(id).exec();
    if (!application)
      return res.status(404).json({ message: "Application not found" });
    const profile = await Profile.findById(application?.profile).lean().exec();
    const guardian = await User.findById(application?.applicant).lean().exec();
    const { html } = compileEmail("rescind", {
      applicantName: `${profile?.bio.firstName} ${profile?.bio.lastName}`,
    });
    await emailQueue.add(
      "deliver",
      {
        to: guardian?.email,
        html,
        subject: "Complete Payment For Programs",
      },
      { jobId: uuid() },
    );
    application.rescinded = true;
    await application.save();
    return res.status(200).json({ message: "Application rescinded" });
  },
);

export default rescindApplication;
