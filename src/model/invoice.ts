import mongoose from "mongoose";
import { IInvoice } from "../types/invoice";
const invoiveSchema = new mongoose.Schema<IInvoice>(
  {
    application: {
      required: true,
      ref: "Application",
      type: mongoose.Schema.Types.ObjectId,
    },

    url: {
      type: String,
      required: true,
    },

    reference: {
      required: true,
      type: String,
      unique: true,
    },
    status: {
      type: String,
      default: "pending",
    },
    amount: {
      required: true,
      type: Number,
    },
    currency: {
      required: true,
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IInvoice>("Invoice", invoiveSchema);
