import mongoose from "mongoose";
export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  verified: boolean;
  role: "user" | "admin" | "moderator";
  provider: "local" | "google";

  name: string;
}
