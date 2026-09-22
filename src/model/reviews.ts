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
    attachments: [{ type: String }],
  },
  { timestamps: true },
);

export default model("Review", reviewSchema);
