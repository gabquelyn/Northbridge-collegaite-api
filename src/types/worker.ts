import mongoose from "mongoose";
export interface IApplicationWorker extends mongoose.Document {
  application: mongoose.Schema.Types.ObjectId;
  job: number;
}
