import mongoose from "mongoose";
export interface IApplication extends mongoose.Document {
  profile: mongoose.Schema.Types.ObjectId;
  applicant: mongoose.Schema.Types.ObjectId;

  programs: ["CAAP" | "GRADE11" | "GRADE12" | "AY12"];
  mode: "on-site" | "off-site";
  courses: number[];

  granted: boolean;
  paid: boolean;
  completed: boolean;
}
