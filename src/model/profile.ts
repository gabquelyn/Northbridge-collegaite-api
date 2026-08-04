import mongoose from "mongoose";
import { IProfile } from "../types/profile";

const profileSchema = new mongoose.Schema<IProfile>(
  {
    guardian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bio: {
      firstName: {
        type: String,
      },
      middleName: String,
      lastName: {
        type: String,
      },
      phoneNumber: {
        type: String,
      },
      email: {
        type: String,
      },
      dob: {
        type: Date,
      },
      gender: {
        type: String,
        enum: ["M", "F"],
      },
    },
    
    address: {
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      unit: String,
      country: {
        type: String,
      },
      state: String,
    },

    academics: {
      currentSchool: {
        type: String,
      },
      homeSchool: {
        type: String,
      },

      secondaryEntry: {
        type: Date,
      },

      secondaryCompletion: String,

      pathway: {
        type: String,
      },

      completedSecondaryDiploma: {
        type: Boolean,
        default: false,
      },
      qualification: String,
    },

    citizenship: {
      language: { type: String },
      birthCountry: { type: String },
      canadian: {
        type: Boolean,
        default: false,
      },
      canadianVisa: {
        type: Boolean,
        default: false,
      },
      intendToApply: {
        type: Boolean,
        default: false,
      },
    },

    documents: {
      transcripts: [
        {
          url: String,
          public_id: String,
          filename: String,
          format: String,
          resource_type: String,
        },
      ],
      govId: [
        {
          url: String,
          public_id: String,
          filename: String,
          format: String,
          resource_type: String,
        },
      ],
      passport: [
        {
          url: String,
          public_id: String,
          filename: String,
          format: String,
          resource_type: String,
        },
      ],
      birthCert: [
        {
          url: String,
          public_id: String,
          filename: String,
          format: String,
          resource_type: String,
        },
      ],
      others: [
        {
          url: String,
          public_id: String,
          filename: String,
          format: String,
          resource_type: String,
        },
      ],
    },
    parent: {
      fatherFirstName: String,
      fatherLastName: String,
      fatherPhoneNumber: String,
      fatherEmail: String,
      fatherDeaceased: Boolean,
      motherFirstName: String,
      motherLastName: String,
      motherEmail: String,
      motherPhoneNumber: String,
      motherDeaceased: Boolean,
    },
    referrer: String,
  },
  { timestamps: true },
);

export default mongoose.model<IProfile>("Profile", profileSchema);
