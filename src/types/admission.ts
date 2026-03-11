import mongoose from "mongoose";
export interface IAdmission extends mongoose.Document {
  application: mongoose.Schema.Types.ObjectId;

  programs: ["CAAP" | "GRADE11" | "GRADE12" | "AY12"];
  mode: "on-site" | "off-site";
  courses: {
    courseId: number;
  }[];

  granted: boolean;
  paid: boolean;
}
