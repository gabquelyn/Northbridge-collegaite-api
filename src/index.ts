import express, { Express, Request, Response } from "express";
import logger, { logEvents } from "./middlewares/logger";
import cookierParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler";
import dotenv from "dotenv";
import connectDB from "./config/connectDB";
import mongoose from "mongoose";
import path from "path";
import authRouter from "./routes/auth";
import expressAsyncHandler from "express-async-handler";
import applicationRouter from "./routes/application";
import cors from "cors";
import verifyPayment from "./utils/verifyPayment";
import paystackWebhookHandler from "./controllers/paystackWebhook";
import {
  getCoursesByCategory,
  getMoodleCourses,
  getMoodleUserByEmail,
} from "./utils/moodle";
import { compileEmail } from "./emails/compileEmail";
import { rateLimit } from "express-rate-limit";
import { getCachedMoodleCourses } from "./utils/getMoodleCached";
import { emailQueue } from "./services/queue";
import VerifyJWT from "./middlewares/VerifyJwt";
import user from "./model/user";
import { CustomRequest } from "./types/request";
import profileRouter from "./routes/profile";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: "Too many requests from this IP",
});

dotenv.config();
connectDB();
const app: Express = express();
const port = process.env.PORT || 8080;

app.use(limiter);
app.use(logger);
app.use(
  cors({
    origin: ["http://localhost:3000"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.join(__dirname, "public")));
app.use(cookierParser());

app.use("/auth", authRouter);
app.use("/application", applicationRouter);
app.get("/webhook", paystackWebhookHandler);
app.use("/profile", profileRouter);
app.get(
  // "/email/:template",
  "/test",
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    const consultation = {
      question: "What is the treatment plan?",
      reply: "You should follow the prescribed medication for 2 weeks.",
      doctor: "Dr. Smith",
      date: "2026-03-27",
    };

    const { html } = compileEmail("review", {
      applicantName: "emm",
      reviewMessage: "erereruiereiurb ruibebr reiuber buirebbr ",
      applicationId: "rerheer",
      programName: "CAAP",
      applicationPortalUrl: `${process.env.FRONTEND_URL}/dashboard/application/rekreer`,
    });

    await emailQueue.add(
      "deliver",
      {
        to: "gabquelyn@gmail.com",
        html,
        subject: "Application Review message",
      },
      // { jobId: uuid() },
    );
    return res.status(200).json({ message: "email sent" });
  }),
);

app.use(errorHandler);

mongoose.connection.on("open", () => {
  console.log("Connected to DB");
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErr.log",
  );
});
