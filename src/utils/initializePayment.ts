import axios from "axios";
import invoice from "../model/invoice";

export default async function initializePayment({
  amount,
  email,
  metadata,
  application,
  user,
}: {
  amount: number;
  email: string;
  metadata: {
    [key: string]: any;
    custom_fields?: {
      display_name: string;
      variable_name: string;
      value: number;
    }[];
  };
  application: string;
  user: string;
}): Promise<{
  status: boolean;
  message: string;
  data: {
    authorization_url?: string;
    reference?: string;
    access_code: string;
  };
}> {
  const url = `${process.env.PAYSTACK_URI}/transaction/initialize`;
  try {
    const response = await axios.post(
      url,
      {
        email,
        amount,
        // currency: "USD",
        channels: [
          "card",
          "bank",
          "apple_pay",
          "ussd",
          "qr",
          "mobile_money",
          "bank_transfer",
          "eft",
          "capitec_pay",
          "payattitude",
        ],
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    // create an invoice details for the application
    await invoice.create({
      application,
      user,
      code: response.data?.access_code,
      reference: response.data?.reference,
    });

    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to initialize payment");
  }
}
