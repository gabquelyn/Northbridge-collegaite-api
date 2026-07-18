import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Application from "../../model/application";
import { getCachedMoodleCourses } from "../../utils/getMoodleCached";

const coursesController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { courses } = req.body;
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

    const moodleCourses = await getCachedMoodleCourses();
    const moodleCourseIds = new Set(moodleCourses.map((obj) => obj.id));
    for (const id of courses) {
      if (!moodleCourseIds.has(id))
        return res
          .status(400)
          .json({ message: "Selected course doesn't exist in moodle" });
    }

    existing.courses = courses;
    await existing.save();

    res.status(200).json({ id: existing._id });
    return;
  },
);


export default coursesController;