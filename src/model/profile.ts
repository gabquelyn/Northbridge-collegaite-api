import mongoose from "mongoose";
import { IProfile } from "../types/profile";

const profileSchema = new mongoose.Schema<IProfile>({
  guardian: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bio: {
    firstName: {
      type: String,
      required: true,
    },
    middleName: String,
    lastName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    email: {
      required: true,
      type: String,
    },
    dob: {
      required: true,
      type: Date,
    },
    gender: {
      required: true,
      type: String,
      enum: ["M", "F"],
    },
  },

  address: {
    street: {
      required: true,
      type: String,
    },
    city: {
      required: true,
      type: String,
    },
    unit: {
      required: true,
      type: String,
    },
    state: String,
  },

  academics: {
    currentSchool: {
      required: true,
      type: String,
    },
    homeSchool: {
      required: true,
      type: String,
    },

    secondaryEntry: {
      required: true,
      type: Date,
    },

    secondaryCompletion: {
      required: true,
      type: Date,
    },

    pathway: {
      required: true,
      type: String,
    },

    completedSecondaryDiploma: {
      required: true,
      type: Boolean,
      default: false,
    },
  },

  citizenship: {
    language: { required: true, type: String },
    country: { required: true, type: String },
    canadian: {
      required: true,
      type: Boolean,
      default: false,
    },
    canadianVisa: {
      required: true,
      type: Boolean,
      default: false,
    },
    intendToApply: {
      required: true,
      type: Boolean,
      default: false,
    },
  },

  documents: {
    transcripts: [{ url: String, public_id: String, filename: String }],
    govId: [{ url: String, public_id: String, filename: String }],
    others: [{ url: String, public_id: String, filename: String }],
  },
});

export default mongoose.model<IProfile>("Profile", profileSchema);
