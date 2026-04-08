import mongoose from "mongoose";
export interface IApplication extends mongoose.Document {
  profile: mongoose.Schema.Types.ObjectId;
  applicant: mongoose.Schema.Types.ObjectId;
  outstanding: number;
  programs: APPLICATION_PROGRAMS[];
  mode: "on-site" | "off-site";
  courses: number[];

  granted: boolean;
  paused: boolean;
  paid: boolean;
  completed: boolean;
  createdAt?: string;
}
