import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Application from "../../model/application";
import moment from "moment";

const programController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { programs } = req.body;
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

    const VALID_PROGRAMS = new Set([
      "CAAP",
      "AY12",
      "GRADE11",
      "GRADE12",
      "DIRECT",
    ]);

    const programsSet = new Set(programs);
    for (const p of programs) {
      if (!VALID_PROGRAMS.has(p)) {
        return res.status(400).json({ message: "Invalid program selected" });
      }
    }

    if (programs.length < 1) {
      return res.status(400).json({
        message: `students are expected to pick at least a program`,
      });
    }

    const now = moment();
    const current = now.format("MM-DD");
    const isWithinRange = current >= "11-01" && current <= "12-15";

    if (programsSet.has("AY12") && !isWithinRange) {
      return res.status(400).json({
        message: "Application window for Academic Year (AY12) closed",
      });
    }

    if (existing.paid || existing.granted) {
      res.status(409).json({
        message:
          "Mode cannot be changed once the application is paid or granted",
      });
      return;
    }

    existing.programs = programs;
    await existing.save();

    res.status(200).json({ id: existing._id });
    return;
  },
);

export default programController;
