import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Profile from "../../model/profile";
import Application from "../../model/application";

const deleteApplication = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const foundApplication = await Application.findById(id)
        .session(session);

      if (!foundApplication) {
        await session.abortTransaction();

        return res.status(404).json({
          message: "Application not found",
        });
      }

      await Profile.findByIdAndDelete(foundApplication.profile)
        .session(session);

      await Application.findByIdAndDelete(id)
        .session(session);

      await session.commitTransaction();

      return res.status(200).json({
        message: "Application and profile deleted successfully",
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },
);

export default deleteApplication;