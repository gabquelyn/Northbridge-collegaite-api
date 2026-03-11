import mongoose from "mongoose";
export interface IToken extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;
  token: string;
  createdAt: Date;
}
