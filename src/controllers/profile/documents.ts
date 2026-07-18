import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Profile from "../../model/profile";
import { fileUploadQueue } from "../../services/queue";
import cleanupUploadedFiles from "../../utils/cleanUploadedFiles";
import { CustomRequest } from "../../types/request";

const documentHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const fileFields = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const profileId = req.params.id as string | undefined;
    if (profileId && !mongoose.Types.ObjectId.isValid(profileId)) {
      res.status(400).json({ message: "Invalid profile id." });
      return;
    }

    const hasAnyFile = fileFields && Object.keys(fileFields).length > 0;
    if (!hasAnyFile) {
      res.status(400).json({ message: "No files were uploaded." });
      return;
    }
    const prevProfile = await Profile.findOne({
      _id: profileId,
    }).exec();
    if (!prevProfile) {
      await cleanupUploadedFiles(fileFields);
      res.status(404).json({ message: "Profile not found." });
      return;
    }

    const files = Object.keys(fileFields).reduce(
      (acc, key) => {
        acc[key] = fileFields[key].map((f) => f.path);
        return acc;
      },
      {} as Record<string, string[]>,
    );
    
    await fileUploadQueue.add(
      "upload-files",
      {
        files,
        profileId: prevProfile._id,
      },
      {
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    return res.status(201).json({ id: prevProfile._id });
  },
);

export default documentHandler;
