import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import userModel from "../../model/user";
import Profile from "../../model/profile";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import { compileEmail } from "../../emails/compileEmail";
import { UNIT_COURSE } from "../../config/prices";
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
      return res.status(404).json({
        message: "Important admission details not found",
        application,
        profile,
        guardian,
      });

    if (!application?.completed) {
      return res.status(400).json({ message: "Application fee not paid" });
    }

    if (application.mode == "off-site" && installment) {
      return res.status(400).json({
        message: "Installmental payment not allowed for off-site scholars",
      });
    }

    const { firstName, lastName } = profile.bio;

    if (application.granted) {
      return res.status(400).json({ message: "Application already granted" });
    }

    if (application.granted && application.paid)
      return res
        .status(400)
        .json({ message: "Admission already granted and payment completed" });

    const totalPrice =
      application.mode == "on-site"
        ? cost(application.programs)
        : application.courses.length * UNIT_COURSE;

    if (installment) application.installment = true;

    let url;
    if (totalPrice) {
      const response = await initializePayment({
        amount: installment ? totalPrice * 0.6 : totalPrice,
        email: guardian.email,
        metadata: {
          applicationId: application._id,
        },
        applicationId: application._id,
        customerName: guardian.name,
      });

      if (response.status && response.data?.authorization_url) {
        url = response.data.authorization_url;
      }
    }

    const { html } = compileEmail("payment", {
      date: new Date().getDate(),
      studentName: `${firstName} ${lastName}`,
      program: application.programs.join(", "),
      academicYear: new Date().getFullYear(),
      paymentUrl: url,
    });

    await emailQueue.add(
      "deliver",
      {
        to: guardian.email,
        html,
        subject: "Official Admission Notice — Northbridge Collegiate",
      },
      { jobId: uuid() },
    );
    await application.save();

    application.granted = true;
    await application.save();

    return res.status(200).json({
      message: "Admission granted and payment link sent",
    });
  },
);

export default approveApplicationRequest;
