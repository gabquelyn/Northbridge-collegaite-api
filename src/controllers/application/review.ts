import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { emailQueue } from "../../services/queue";
import Application from "../../model/application";
import { v4 as uuid } from "uuid";
import User from "../../model/user";
import { compileEmail } from "../../emails/compileEmail";
const reviewApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { reason } = req.body;
    const { id } = req.params;

    if (!reason)
      return res
        .status(400)
        .json({ message: "Enter a reason for application not accepted" });
    const applicationDetails = await Application.findById(id).lean().exec();
    const guardian = await User.findById(applicationDetails?.applicant)
      .lean()
      .exec();
    if (!applicationDetails || !guardian)
      return res
        .status(400)
        .json({ message: "Application and applicant not found" });

    const { html } = compileEmail("review", {
      applicantName: guardian.name,
      reviewMessage: reason,
      applicationId: applicationDetails._id,
      applicationPortalUrl: `${process.env.FRONTEND_URL}/application/${applicationDetails._id}`,
    });

    await emailQueue.add(
      "deliver",
      {
        to: guardian.email,
        html,
        subject: "Application Review message",
      },
      { jobId: uuid() },
    );
    return res.status(200).json({ message: "Review message sent" });
  },
);

export default reviewApplication;
