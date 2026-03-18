import nodemailer from "nodemailer";
import { logEvents } from "../middlewares/logger";
import dotenv from "dotenv";

dotenv.config();
export default async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 465,
      secure: true,

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.CONTACT,
      sender: "Northbridge Collegiate",
      to,
      subject,
      html,
      text,
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.log(err);
    logEvents(`${err}`, "mailErrorLog.log");
  }
}
