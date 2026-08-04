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
import paymentWebhook from "./controllers/paymentWebhook";
import { rateLimit } from "express-rate-limit";
import profileRouter from "./routes/profile";
import courseRouter from "./routes/course";
import consultationRouter from "./routes/consultation";
import {
  discountExpiryQueue,
  paymentCampaignQueue,
  suspendDebtorQueue,
} from "./services/queue";
import initializePayment from "./utils/initializePayment";
import blogRoutes from "./routes/blog";
import personnelRouter from "./routes/personnel";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: "Too many requests from this IP",
});

const allowedOrigins = [
  "http://localhost:3000",
  "https://northbridgec.ca",
  "https://www.northbridgec.ca",
];


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
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.join(__dirname, "public")));
app.use(cookierParser());


app.use("/auth", authRouter);
app.use("/blog", blogRoutes);
app.use("/consultation", consultationRouter);
app.use("/application", applicationRouter);
app.use("/courses", courseRouter);
app.post("/webhook", paymentWebhook);
app.use("/profile", profileRouter);
app.use("/personnel", personnelRouter);
app.get(
  "/test",
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    // const url = await getSignedUrl({
    //   publicId:
    //     "student-documents/1778262698534.docx",
    //   resourceType: "raw",
    //   format: "docx",
    // });

    const url = await initializePayment({
      amount: 100,
      email: "gabquelyn@gmail.com",
      customerName: "Gabs",
      metadata: {
        test: "test",
      },
      applicationId: "a3f29c8b1e6d4072f8b3c1a9",
    });
    return res.status(200).json({ url });
  }),
);

app.get("/health", (req, res: Response) => {
  return res.status(200).json({ message: "Server ready" });
});
app.use(errorHandler);

mongoose.connection.on("open", async () => {
  console.log("Connected to DB");
  await paymentCampaignQueue.add(
    "check-record",
    {},
    {
      repeat: { every: 48 * 60 * 60 * 1000 },
      jobId: "record-checker",
    },
  );

  await discountExpiryQueue.add(
    "expire-discounts",
    {},
    {
      repeat: {
        pattern: "0 0 * * *", // once a day, at midnight
        jobId: "expire-discounts-checker",
      },
    },
  );

  await suspendDebtorQueue.add(
    "installment",
    {},
    {
      repeat: {
        every: 24 * 60 * 60 * 1000,
        jobId: "installment-checker",
      },
    },
  );
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
