import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import user from "../../model/user";

const payOutstanding = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const prev = await application.findById(id).exec();
    if (!prev)
      return res.status(404).json({ message: "Application not found" });
    const guardian = await user.findById(prev.applicant).exec();
    if (prev?.outstanding <= 0)
      return res
        .status(400)
        .json({ message: "No outstanding payment on the application" });

    const response = await initializePayment({
      amount: prev.outstanding,
      email: guardian?.email || "",
      metadata: {
        applicationId: prev._id,
        custom_fields: [
          {
            display_name: "Outstandig payment for application",
            variable_name: "AEF",
            value: prev.outstanding * 100,
          },
        ],
      },
      applicationId: prev._id,
    });

    return res
      .status(200)
      .json({ paymentUrl: response.data.authorization_url });
  },
);

export default payOutstanding;
