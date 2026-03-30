import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { compileEmail } from "../../emails/compileEmail";
import { emailQueue } from "../../services/queue";
export const inquire = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { html } = compileEmail("inquire", {
      fields: Object.entries(req.body).map(([key, value]) => ({ key, value })),
    });

    await emailQueue.add("deliver", {
      to: "contact@northbridgec.ca",
      html,
      subject: "New Consultation",
    });

    return res.status(200).json({ message: "Email sent" });
  },
);
