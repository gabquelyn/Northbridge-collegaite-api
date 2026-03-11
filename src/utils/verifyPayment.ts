import axios from "axios";

export default async function verifyPayment(
  reference: string,
): Promise<"ongoing" | "failed" | "abandoned" | "success"> {
  const url = `${process.env.PAYSTACK_URI}/transaction/verify/${reference}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    return response.data.status;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to verify payment");
  }
}
