import mongoose from "mongoose";
import { IUser } from "../types/user";
const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  provider: {
    type: String,
    enum: ["local", "google"],
    required: true,
  },

  profile: {
    firstName: String,
  },
});

export default mongoose.model<IUser>("User", userSchema);
