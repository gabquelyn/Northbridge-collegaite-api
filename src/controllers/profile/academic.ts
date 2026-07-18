import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Profile from "../../model/profile";
import { CustomRequest } from "../../types/request";

const academicHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const {
      currentSchool,
      homeSchool,
      secondaryEntry,
      dob,
      pathway,
      completedSecondaryDiploma,
      qualification,
      gender,
    } = req.body;
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
    const userId = (req as CustomRequest).id;
    if (profileId && !mongoose.Types.ObjectId.isValid(profileId)) {
      res.status(400).json({ message: "Invalid profile id." });
      return;
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      { _id: profileId},
      {
        $set: {
          "academics.currentSchool": currentSchool,
          "academics.homeSchool": homeSchool,
          "academics.secondaryEntry": secondaryEntry,
          "academics.dob": dob,
          "academics.pathway": pathway,
          "academics.completedSecondaryDiploma": completedSecondaryDiploma,
          "academics.qualification": qualification,
          "academics.gender": gender,
        },
      },
      { new: true, runValidators: true },
    ).exec();

    if (!updatedProfile) {
      return res.status(404).json({ message: "Profile not found." });
    }
    return res.status(200).json({ id: updatedProfile._id });
  },
);

export default academicHandler;
