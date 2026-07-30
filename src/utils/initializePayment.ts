import axios from "axios";
import invoice from "../model/invoice";

async function getMonnifyAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`,
  ).toString("base64");

  const response = await axios.post(
    `${process.env.MONNIFY_BASE_URL}/api/v1/auth/login`,
    {},
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data.responseBody.accessToken;
}

export default async function initializePayment({
  amount,
  email,
  customerName,
  metadata,
  currency = "NGN",
  applicationId,
  discount = 0,
}: {
  amount: number;
  email: string;
  customerName: string;
  metadata: {
    [key: string]: any;
  };
  currency?: string;
  applicationId: string;
  discount?: number;
}): Promise<{
  status: boolean;
  message: string;
  data: {
    authorization_url?: string;
    transactionReference?: string;
    reference?: string;
  };
}> {
  try {
    const accessToken = await getMonnifyAccessToken();

    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // calculating discount
    const val = (discount * amount) / 100;

    // +7.5% vat fee
    const VAT_FEE = 1.075;

    // calculated price
    const price = (amount - val) * VAT_FEE;

    const response = await axios.post(
      `${process.env.MONNIFY_BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      {
        amount: price,
        customerName,
        customerEmail: email,
        paymentReference,
        paymentDescription: metadata?.description ?? "Payment",
        currencyCode: currency,
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: process.env.FRONTEND_URL,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"],
        metaData: metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const { responseBody, requestSuccessful, responseMessage } = response.data;
    await invoice.create({
      application: applicationId,
      url: responseBody?.checkoutUrl,
      reference: responseBody?.transactionReference,
      status: "pending",
      amount,
      currency,
    });

    return {
      status: requestSuccessful,
      message: responseMessage,
      data: {
        authorization_url: responseBody?.checkoutUrl,
        transactionReference: responseBody?.transactionReference,
        reference: responseBody?.paymentReference,
      },
    };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to initialize payment");
  }
}
