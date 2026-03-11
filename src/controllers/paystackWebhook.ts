import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import crypto from "crypto";
import Admission from "../model/admission";
import Payment from "../model/payment";

interface PayStackEvent {
  event: string;
  data: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: "success" | string;
    metadata: {
      admissionId: string;
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

        const admissionId = response.data.metadata.admissionId;
        await Admission.findByIdAndUpdate(admissionId, {
          paid: true,
        })
          .lean()
          .exec();

        // * Create a payment reference for the admission
        await Payment.create({
          admission: admissionId,
          reference: response.data.reference,
          currency: response.data.currency,
          amount: response.data.amount,
          status: response.data.status,
        });

        // TODO: if it is on-site, send admission letter, create moodle user and assign
        
      }
    }

    res.send(200);
  },
);

export default paystackWebhookHandler;
