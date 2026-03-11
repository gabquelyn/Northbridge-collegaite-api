import mongoose from "mongoose";
export interface IApplication extends mongoose.Document {
  guardian: mongoose.Schema.Types.ObjectId;
  profile: {
    firstName: string;
    middleName?: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    dob: string;
    gender: "M" | "F";
  };
  address: {
    street: string;
    city: string;
    unit: string;
    state?: string;
  };
  academics: {
    currentSchool: string;
    homeSchool: string;
    secondaryEntry: string;
    secondaryCompletion: string;
    pathway: string;
    completedSecondaryDiploma: boolean;
  };
  citizenship: {
    language: string;
    country: string;
    canadian: boolean;
    canadianVisa: boolean;
    intendToApply: boolean;
  };
  documents: {
    transcripts: { url: string; public_id: string; filename: string }[];
    govId: { url: string; public_id: string; filename: string }[];
    others: { url: string; public_id: string; filename: string }[];
  };
}