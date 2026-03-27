import axios from "axios";
import invoice from "../model/invoice";

export default async function initializePayment({
  amount,
  email,
  metadata,
  currency = "NGN",
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
  currency?: string;
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
        amount: amount * 100,
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

    const data = response.data;
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to initialize payment");
  }
}
