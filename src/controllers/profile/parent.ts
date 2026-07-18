import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Profile from "../../model/profile";
import { CustomRequest } from "../../types/request";

const parentHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const {
      fatherFirstName,
      fatherLastName,
      fatherPhoneNumber,
      fatherEmail,
      fatherDeaceased,
      motherFirstName,
      motherLastName,
      motherEmail,
      motherPhoneNumber,
      motherDeaceased,
    } = req.body;
    const profileId = req.params.id as string | undefined;
    if (profileId && !mongoose.Types.ObjectId.isValid(profileId)) {
      res.status(400).json({ message: "Invalid profile id." });
      return;
    }
    if (
      (!fatherFirstName ||
        !fatherLastName ||
        !fatherPhoneNumber ||
        !fatherEmail) &&
      fatherDeaceased == "false"
    ) {
      return res.status(400).json({
        message: "Father details required if not deceased",
      });
    }

    if (
      (!motherFirstName ||
        !motherLastName ||
        !motherPhoneNumber ||
        !motherEmail) &&
      motherDeaceased == "false"
    ) {
      return res.status(400).json({
        message: "Mother details required if not deceased",
      });
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      { _id: profileId, },
      {
        $set: {
          "parent.fatherFirstName": fatherFirstName,
          "parent.fatherLastName": fatherLastName,
          "parent.fatherPhoneNumber": fatherPhoneNumber,
          "parent.fatherEmail": fatherEmail,
          "parent.fatherDeaceased": fatherDeaceased,
          "parent.motherFirstName": motherFirstName,
          "parent.motherLastName": motherLastName,
          "parent.motherPhoneNumber": motherPhoneNumber,
          "parent.motherEmail": motherEmail,
          "parent.motherDeaceased": motherDeaceased,
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

export default parentHandler;
