import mongoose from "mongoose";

const AutoIncrement = require("mongoose-sequence")(mongoose);
const studentSchema = new mongoose.Schema({
  studentId: {
    type: Number,
    required: true,
  },
  application: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "Application",
  },
  moddle: {
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
  },
});

studentSchema.plugin(AutoIncrement, {
  inc_field: "studentId",
  start_seq: 10001,
});
