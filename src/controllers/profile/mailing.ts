import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Profile from "../../model/profile";
import { CustomRequest } from "../../types/request";

const mailingController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
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
    const { street, city, unit, state, country } = req.body;
    const profileId = req.params.id as string | undefined;
    if (profileId && !mongoose.Types.ObjectId.isValid(profileId)) {
      res.status(400).json({ message: "Invalid profile id." });
      return;
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      { _id: profileId, },
      {
        $set: {
          "address.street": street,
          "address.city": city,
          "address.unit": unit,
          "address.country": country,
          "address.state": state,
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

export default mailingController;
