import mongoose from "mongoose";
const blogSchema = new mongoose.Schema<IBlog>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    images: [
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

export default mongoose.model<IBlog>("Blog", blogSchema);
