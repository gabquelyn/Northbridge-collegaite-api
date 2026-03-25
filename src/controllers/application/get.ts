import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import userModel from "../../model/user";
import { CustomRequest } from "../../types/request";
import Application from "../../model/application";
import invoice from "../../model/invoice";

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

    return res.status(200).json({ data: { user, application } });
  },
);

export const getApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const application = await Application.findById(id)
      .populate("profile")
      .populate("applicant")
      .lean()
      .exec();
    if (!application)
      return res.status(404).json({ message: "Application not found" });
    let lastInvoice;
    if (!application.paid) {
      lastInvoice = await invoice
        .find({ application: id })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    }
    return res.status(200).json({ data: application, lastInvoice });
  },
);
