import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import crypto from "crypto";
import { paymentWebhookQueue } from "../services/queue"; // rename to paymentQueue ideally

interface MonnifyEvent {
  eventType: string;
  eventData: {
    transactionReference: string;
    paymentReference: string;
    amountPaid: number;
    totalPayable: number;
    currency: string;
    paymentStatus: "PAID" | string;
    paymentMethod: string;
    metaData: {
      applicationId: string;
      [key: string]: any;
    };
    customer: {
      name: string;
      email: string;
    };
    paidOn: string;
  };
}

const monnifyWebhookHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    // Confirm webhook source — formula is HMAC-SHA512(secretKey, rawBody)
    console.log("Event received");
    const hash = crypto
      .createHmac("sha512", process.env.MONNIFY_SECRET_KEY || "")
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash === req.headers["monnify-signature"]) {
      const response: MonnifyEvent = req.body;
      console.log(response);

      if (response.eventType === "SUCCESSFUL_TRANSACTION") {
        const { currency, amountPaid, paymentStatus, transactionReference } =
          response.eventData;
        const applicationId = response.eventData.metaData?.applicationId;
        const type = response.eventData.metaData?.type;

        await paymentWebhookQueue.add(
          "charged",
          {
            applicationId,
            currency,
            amount: amountPaid,
            status: paymentStatus,
            reference: transactionReference,
            type
          },
          { jobId: transactionReference },
        );
      }
    }

    res.sendStatus(200);
  },
);

export default monnifyWebhookHandler;
