import mongoose from "mongoose";
export default interface ITemp {
  application: mongoose.Schema.Types.ObjectId;
  courses: number[];
  programs: APPLICATION_PROGRAMS[];
  reference: string;
}