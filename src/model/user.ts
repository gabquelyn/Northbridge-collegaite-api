import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
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
      enum: ["guardian", "admin"],
      default: "guardian",
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      required: true,
    },

    profile: {}
  },

);

export default mongoose.model("User", userSchema);
