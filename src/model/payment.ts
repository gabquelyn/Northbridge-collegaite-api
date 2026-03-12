import mongoose from "mongoose";
const paymentSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Application",
  },
  reference: {
    required: true,
    type: String,
  },
  amount: {
    required: true,
    type: Number,
  },
  status: {
    required: true,
    type: String,
  },
  currency: {
    required: true,
    type: String,
  },
});

export default mongoose.model("Paymnet", paymentSchema);
