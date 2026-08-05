import { model, Schema } from "mongoose";
const reviewSchema = new Schema(
  {
    application: {
      ref: "Application",
      type: Schema.Types.ObjectId,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default model("Review", reviewSchema);
