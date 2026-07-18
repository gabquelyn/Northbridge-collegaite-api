import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Application from "../../model/application";
import { CustomRequest } from "../../types/request";
import user from "../../model/user";
import initializePayment from "../../utils/initializePayment";
import { APPLICATION_FEE } from "../../config/prices";

const payController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const prevApplication = await Application.findById(id).lean().exec();
    if (!prevApplication)
      return res.status(404).json({ message: "Applcation not found" });

    if (prevApplication?.rescinded) {
      return res.status(400).json({ message: "Application rescinded" });
    }

    if (prevApplication?.completed) {
      return res.status(400).json({ message: "Application fee already paid" });
    }
    const userId = (req as CustomRequest).id;
    const guardian = await user.findById(userId).lean().exec();
    if (!guardian) return res.status(404).json({ message: "User not found" });
    const response = await initializePayment({
      amount: APPLICATION_FEE,
      email: guardian.email,
      metadata: {
        applicationId: id,
        type: "APPLICATION_FEE",
      },
      applicationId: id,
      customerName: guardian.name,
    });
    if (response.status) {
      return res.status(201).json({
        paymentUrl: response.data?.authorization_url,
      });
    }
  },
);

export default payController;
