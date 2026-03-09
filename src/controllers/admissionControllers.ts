import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import uploadToCloudinary from "../utils/upload";
import userModel from "../model/user";
import { CustomRequest } from "../../types";
import { validationResult } from "express-validator";

export const requestAdmission = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const uploadedFiles: Record<
      string,
      { url: string; public_id: string; filename: string }[]
    > = {};
    const result = validationResult(req);
    if (!result.isEmpty())
      return res
        .status(400)
        .json({ message: "Invalid data received", error: result.array() });
    if (!req.files)
      return res.status(400).json({ message: "Missing required files" });

    // check guardian profile has been completed first
    const guardian = await userModel
      .findById((req as CustomRequest).id)
      .lean()
      .exec();
    if (!guardian?.profile)
      return res
        .status(400)
        .json({ message: "Guardian profile doesn't exist" });

    // check the selected programs

    // handles file uploads to cloudinary for (transcripts, govId, and supporting documents)
    for (const field in req.files) {
      uploadedFiles[field] = [];
      for (const file of (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      )[field]) {
        const result = await uploadToCloudinary(
          file.buffer,
          "student-documents",
        );

        uploadedFiles[field].push({
          url: result.secure_url,
          public_id: result.public_id,
          filename: result.original_filename,
        });
      }
    }
  },
);
