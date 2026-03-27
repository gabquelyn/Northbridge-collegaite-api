import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import crypto from "crypto";
import { paystackQueue } from "../services/queue";

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
        // handle the hook
        const { currency, amount, status, reference } = response.data;
        const applicationId = response.data.metadata.applicationId;

        await paystackQueue.add(
          "charged",
          {
            applicationId,
            currency,
            amount,
            status,
            reference,
          },
          { jobId: response.data.reference },
        );
      }
    }

    res.send(200);
  },
);

export default paystackWebhookHandler;
