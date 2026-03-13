import mongoose from "mongoose";
const invoiveSchema = new mongoose.Schema({
  user: {
    required: true,
    ref: "User",
    type: mongoose.Schema.Types.ObjectId,
  },

  application: {
    required: true,
    ref: "Application",
    type: mongoose.Schema.Types.ObjectId,
  },

  code: {
    required: true,
    type: String,
  },

  reference: {
    required: true,
    type: String,
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
});

export default mongoose.model("Invoice", invoiveSchema);
