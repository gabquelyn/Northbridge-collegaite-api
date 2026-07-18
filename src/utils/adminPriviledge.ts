import expressAsyncHandler from "express-async-handler";
import { NextFunction, Request, Response } from "express";
import { CustomRequest } from "../types/request";
import User from "../model/user";
import Application from "../model/application";
import Profile from "../model/profile";

const adminPriviledge = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const profileId = req.params.id;
    const profile = await Profile.findById(profileId).lean().exec();
    const user = await User.findById(userId).lean().exec();
    const application = await Application.findOne({ profile: profileId })
      .lean()
      .exec();

    if (!profile) return res.status(404).json({ message: "Profile not found" });
    if (userId != profile.guardian.toString() && user?.role !== "admin") {
      return res.status(400).json({ message: "Unauthorized to edit" });
    }

    if (
      user?.role == "user" &&
      (application?.rescinded || application?.granted)
    ) {
      return res.status(400).json({
        message: "Rescinded and granted application cannot be edited",
      });
    }
    next();
  },
);

export default adminPriviledge;
