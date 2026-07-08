import mongoose from "mongoose";
import { IApplication } from "../types/application";
const applicationSchema = new mongoose.Schema<IApplication>(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    profile: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Profile",
    },

    //   for on-site students
    programs: [
      {
        type: String,
        required: true,
        enum: ["CAAP", "GRADE11", "GRADE12", "AY12", "DIRECT"],
      },
    ],

    mode: {
      type: String,
      required: true,
      enum: ["on-site", "off-site"],
    },

    outstanding: {
      type: Number,
      default: 0,
    },

    //   for off-site students
    courses: [
      {
        type: Number,
        required: true,
      },
    ],

    granted: {
      type: Boolean,
      default: false,
    },

    installment: {
      type: Boolean,
      default: false,
    },

    paused: {
      type: Boolean,
      default: false,
    },

    rescinded: {
      type: Boolean,
      default: false,
    },

    paid: {
      type: Boolean,
      default: false,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IApplication>("Application", applicationSchema);
