import express, { Express, Request, Response } from "express";
import logger, { logEvents } from "./middlewares/logger";
import cookierParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler";
import dotenv from "dotenv";
import connectDB from "./utils/connectDB";
import mongoose from "mongoose";
import path from "path";
import authRouter from "./routes/auth";
import expressAsyncHandler from "express-async-handler";
import applicationRouter from "./routes/application";
import verifyPayment from "./utils/verifyPayment";
import paystackWebhookHandler from "./controllers/paystackWebhook";
import { getMoodleCourses, getMoodleUserByEmail } from "./utils/moodle";
import { compileEmail } from "./emails/compileEmail";

dotenv.config();
connectDB();
const app: Express = express();
const port = process.env.PORT || 8080;
 
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.join(__dirname, "public")));
app.use(cookierParser());

app.use("/auth", authRouter);
app.use("/application", applicationRouter);
app.get("/webhook", paystackWebhookHandler);

app.get(
  // "/email/:template",
  "/test",
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    // * email template test
    // try {
    //   const { html } = compileEmail("moodle", {
    //     date: new Date().toDateString(),
    //     studentName: `John Doe`,
    //     studentId: "__",
    //     program: ["CAAP", "GRADE 11"].join(", "),
    //     academicYear: new Date().getFullYear(),
    //     paymentUrl: "",
    //   });
    //   res.send(html);
    // } catch (err) {
    //   console.log(err);
    //   res.status(500).send("Template not found or failed to compile.");
    // }

    // * initialize payment test
    // const response = await initializePayment({
    //   amount: 500 * 100,
    //   email: "gabquelyn@gmail.com",
    //   metadata: {
    //     admissionId: "5",
    //     custom_fields: [{ detail: "some detail", name: "BG", amount: 4 }].map(
    //       (p) => ({
    //         display_name: p.detail,
    //         variable_name: p.name,
    //         value: p.amount,
    //       }),
    //     ),
    //   },
    // });

    // * moodle course
    // const moodleCourses = await getMoodleCourses();

    // * verify payment call
    const response = await getMoodleUserByEmail("admin")
    return res.status(200).json({ response });
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
