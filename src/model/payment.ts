import mongoose from "mongoose";
const paymentSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Application",
  },
  referenceId: {
    required: true,
    type: String,
  },
  amount: {
    required: true,
    type: Number,
  },
  completed: {
    required: true,
    default: false,
    type: Boolean,
  },
});

export default mongoose.model("Paymnet", paymentSchema);
