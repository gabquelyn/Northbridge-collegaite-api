import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { CustomRequest } from "../../types/request";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Application from "../../model/application";

const modeHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const { mode } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        message: errors
          .array()
          .map((e) => (e.type === "field" ? `${e.path}: ${e.msg}` : e.msg))
          .join(", "),
      });
      return;
    }

    const profileId = req.params.id as string | undefined;

    if (!profileId) {
      res.status(400).json({ message: "Application id is required." });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      res.status(400).json({ message: "Invalid application id." });
      return;
    }


    const existing = await Application.findOne({
      profile: profileId,
    }).exec();

    if (!existing) {
      res.status(404).json({ message: "Application not submitted yet" });
      return;
    }

    if (existing.paid || existing.granted) {
      res.status(409).json({
        message:
          "Mode cannot be changed once the application is paid or granted",
      });
      return;
    }

    existing.mode = mode;
    await existing.save();

    res.status(200).json({ id: existing._id });
  },
);

export default modeHandler;
