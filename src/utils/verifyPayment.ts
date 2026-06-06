import axios from "axios";

type MonnifyPaymentStatus =
  | "PAID"
  | "OVERPAID"
  | "PARTIALLY_PAID"
  | "PENDING"
  | "ABANDONED"
  | "CANCELLED"
  | "FAILED"
  | "REVERSED"
  | "EXPIRED";

type NormalizedStatus = "ongoing" | "failed" | "abandoned" | "success";

async function getMonnifyAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
  ).toString("base64");

  const response = await axios.post(
    `${process.env.MONNIFY_BASE_URL}/api/v1/auth/login`,
    {},
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.responseBody.accessToken;
}

function normalizeStatus(status: MonnifyPaymentStatus): NormalizedStatus {
  switch (status) {
    case "PAID":
    case "OVERPAID":
      return "success";
    case "ABANDONED":
    case "CANCELLED":
    case "EXPIRED":
      return "abandoned";
    case "PENDING":
    case "PARTIALLY_PAID":
      return "ongoing";
    case "FAILED":
    case "REVERSED":
      return "failed";
  }
}

export default async function verifyPayment(
  reference: string,
): Promise<NormalizedStatus> {
  const url = `${process.env.MONNIFY_BASE_URL}/api/v2/merchant/transactions/query?transactionReference=${encodeURIComponent(reference)}`;
  try {
    const accessToken = await getMonnifyAccessToken();

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const paymentStatus: MonnifyPaymentStatus =
      response.data.responseBody.paymentStatus;

    return normalizeStatus(paymentStatus);
  } catch (error) {
    console.log(error);
    throw new Error("Failed to verify payment");
  }
}