import { Schema, model } from "mongoose";
import { IToken } from "../types/token";
const tokenSchema = new Schema<IToken>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
    unique: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

tokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 15 });

export default model<IToken>("Token", tokenSchema);
