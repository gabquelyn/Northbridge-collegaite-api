import { Schema, model } from "mongoose";
const personnelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    resume: [
      {
        url: String,
        public_id: String,
        filename: String,
        format: String,
        resource_type: String,
      },
    ],
    coverLetter: [
      {
        url: String,
        public_id: String,
        filename: String,
        format: String,
        resource_type: String,
      },
    ],
  },
  { timestamps: true },
);

export default model("Personnel", personnelSchema);
