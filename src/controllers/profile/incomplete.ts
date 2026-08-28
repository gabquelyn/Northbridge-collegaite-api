import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { CustomRequest } from "../../types/request";
import Profile from "../../model/profile";
import Application from "../../model/application";
import User from "../../model/user";

const incompleteController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid or missing user" });
    }

    const user = await User.findById(userId).lean().exec();

    const matchStage: Record<string, any> =
      user?.role == "admin"
        ? {}
        : { guardian: new mongoose.Types.ObjectId(userId) };

    const incompleteProfiles = await Profile.aggregate([
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: Application.collection.name,
          let: { profileId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$profile", "$$profileId"] },
                    {
                      $eq: ["$applicant", new mongoose.Types.ObjectId(userId)],
                    },
                  ],
                },
              },
            },
          ],
          as: "applications",
        },
      },
      {
        $match: {
          applications: { $size: 0 },
        },
      },
      {
        $project: {
          applications: 0,
        },
      },
       {
        $lookup: {
          from: User.collection.name,
          localField: "guardian",
          foreignField: "_id",
          as: "guardian",
        },
      },
      {
        $unwind: {
          path: "$guardian",
          preserveNullAndEmptyArrays: true, // keep profile even if guardian was deleted
        },
      },
      {
        $project: {
          applications: 0,
          "guardian.password": 0, // strip sensitive fields, adjust to your schema
          "guardian.__v": 0,
        },
      }
    ]);

    return res.status(200).json({
      incomplete: incompleteProfiles.length > 0,
      profiles: incompleteProfiles,
    });
  },
);

export default incompleteController;
