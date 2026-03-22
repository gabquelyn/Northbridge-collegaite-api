import mongoose from "mongoose";
export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  verified: boolean;
  role: "user" | "admin";
  provider: "local" | "google";

  name: string;
}
