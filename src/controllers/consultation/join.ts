import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { uploadFilesFromPaths } from "../../utils/application";
import { emailQueue } from "../../services/queue";
import { compileEmail } from "../../emails/compileEmail";
export const joinApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const fileFields = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };
    const { name, email } = req.body;
    const requiredFiles = ["resume", "coverLetter"];

    for (const field of requiredFiles) {
      if (!fileFields?.[field]) {
        return res.status(400).json({ message: `Missing ${field}` });
      }
    }

    const files = Object.keys(fileFields).reduce(
      (acc, key) => {
        acc[key] = fileFields[key].map((f) => f.path);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    const uploadedFiles = await uploadFilesFromPaths(files, "team-application");

    const { html } = compileEmail("join", {
      name,
      email,
      resumeUrl: uploadedFiles["resume"][0].url,
      coverLetterUrl: uploadedFiles["coverLetter"][0].url,
    });

    await emailQueue.add("deliver", {
      to: "gabquelyn@gmail.com",
      html,
      subject: "New Job Application",
    });
  },
);
