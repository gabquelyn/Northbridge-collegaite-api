import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { compileEmail } from "../../emails/compileEmail";
import { emailQueue } from "../../services/queue";
export const inquire = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const errors = validationResult(req.body);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array() });

    const {
      fullName,
      email,
      phoneNumber,
      country,
      city,
      academicBackground,
      pathway,
    } = req.body;

    const { html } = compileEmail("consultation", {
      fullName,
      email,
      phoneNumber,
      country,
      city,
      academicBackground,
      pathway,
    });

    await emailQueue.add("deliver", {
      to: "contact@northbridgec.ca",
      html,
      subject: "New Consultation",
    });

    return res.status(200).json({ message: "Email sent" });
  },
);
