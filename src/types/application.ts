import mongoose from "mongoose";
export interface IApplication extends mongoose.Document {
  profile: mongoose.Schema.Types.ObjectId;
  applicant: mongoose.Schema.Types.ObjectId;

  programs: APPLICATION_PROGRAMS[];
  mode: "on-site" | "off-site";
  courses: number[];

  granted: boolean;
  paid: boolean;
  completed: boolean;
}
