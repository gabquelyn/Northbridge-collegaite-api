import mongoose from "mongoose";
const applicationSchema = new mongoose.Schema({
  guardian: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  profile: {
    firstName: {
      type: String,
      required: true,
    },
    middleName: String,
    lastName: {
      type: String,
      required: true,
    },
    phoneNumber: String,
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
  mode: {
    type: String,
    required: true,
    enum: ["on-site", "off-site"],
    default: "on-site",
  },

  approved: {
    type: Boolean,
    default: false,
  },

  //   for on-site students
  program: [
    {
      type: String,
      required: true,
      enum: ["CAAP", "GRADE11", "GRADE12", "AY12"],
    },
  ],

  //   for off-site students
  courses: [
    {
      type: String,
      required: true,
    },
  ],
});

export default mongoose.model("Application", applicationSchema);
