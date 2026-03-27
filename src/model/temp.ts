import { Schema, model } from "mongoose";
import ITemp from "../types/temp";
const tempSchema = new Schema<ITemp>({
  application: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Application",
  },
  courses: [{ type: Number, required: true }],
  programs: [{ type: String, required: true }],
  reference: { type: String, required: true },
});

export default model<ITemp>("Temp", tempSchema);
