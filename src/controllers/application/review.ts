import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { emailQueue } from "../../services/queue";
import Application from "../../model/application";
import { v4 as uuid } from "uuid";
import User from "../../model/user";
import { compileEmail } from "../../emails/compileEmail";
import reviews from "../../model/reviews";
import { uploadFilesFromPaths } from "../../utils/application";
const reviewApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const files = req.files as Express.Multer.File[];
    const { reason } = req.body;
    const { id } = req.params;

    const attachementFilesPath = {
      attachment: files.map((f) => f.path),
    };

    let fileUrls: string[] = [];

    if (files.length > 0) {
      const uploadedFiles = await uploadFilesFromPaths(
        attachementFilesPath,
        "review-attachment",
      );

      fileUrls = uploadedFiles.attachment.map(
        (obj) =>
          `${process.env.FRONTEND_URL}/view?public_id=${obj.public_id}&resource_type=${obj.resource_type}`,
      );
    }

    if (!reason)
      return res.status(400).json({ message: "Enter a review message" });
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
      fileUrls,
    });

    await reviews.create({
      application: id,
      message: reason,
      attachments: fileUrls,
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
