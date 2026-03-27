import mongoose from "mongoose";
const invoiveSchema = new mongoose.Schema({
  application: {
    required: true,
    ref: "Application",
    type: mongoose.Schema.Types.ObjectId,
  },

  reference: {
    required: true,
    type: String,
    unique: true
  },
  status: {
    type: String,
    default: false,
  },
  amount: {
    required: true,
    type: Number,
  },
  currency: {
    required: true,
    type: String,
  },
}, { timestamps: true },);

export default mongoose.model("Invoice", invoiveSchema);
