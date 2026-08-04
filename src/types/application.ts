import mongoose from "mongoose";
export interface IApplication extends mongoose.Document {
  profile: mongoose.Schema.Types.ObjectId;
  applicant: mongoose.Schema.Types.ObjectId;
  outstanding: number;
  programs: APPLICATION_PROGRAMS[];
  mode: "on-site" | "off-site";
  courses: number[];
  installment: boolean;
  granted: boolean;
  paused: boolean;
  paid: boolean;
  completed: boolean;
  discount: number;
  createdAt?: string;
  discountExpires?: string;
  rescinded: boolean;
  requestedInstallment: boolean;
}
