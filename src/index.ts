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
import paystackWebhookHandler from "./controllers/paystackWebhook";
import { compileEmail } from "./emails/compileEmail";
import { rateLimit } from "express-rate-limit";
import { getCachedMoodleCourses } from "./utils/getMoodleCached";
import { emailQueue } from "./services/queue";
import profileRouter from "./routes/profile";
import courseRouter from "./routes/course";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: "Too many requests from this IP",
});

const allowedOrigins = ["https://www.northbridgec.ca", "https://northbridgec.ca"];

dotenv.config();
connectDB();
const app: Express = express();
const port = process.env.PORT || 8080;

app.use(limiter);
app.use(logger);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow Postman or server-to-server requests without origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true); // echo the origin
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.join(__dirname, "public")));
app.use(cookierParser());

app.use("/auth", authRouter);
app.use("/application", applicationRouter);
app.use("/courses", courseRouter);
app.get("/webhook", paystackWebhookHandler);
app.use("/profile", profileRouter);
app.get(
  // "/email/:template",
  "/test",
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { html } = compileEmail("welcome", {});
    const courses = await getCachedMoodleCourses();
    return res.status(200).json({ courses });
  }),
);

app.get("/health", (req, res: Response) => {
  return res.status(200).json({ message: "Server ready" });
});
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
