import express, { Express, Request, Response } from "express";
import logger, { logEvents } from "./middlewares/logger";
import cookierParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler";
import dotenv from "dotenv";
import connectDB from "./utils/connectDB";
import mongoose from "mongoose";
import path from "path";
import authRouter from "./routes/authRoutes";
import expressAsyncHandler from "express-async-handler";
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

app.use("/api/auth", authRouter);

app.get(
  "/email/:template",
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { template } = req.params;
    const previewData = {
      name: "Gabriel Arebamen",
      companyName: "Northbridge Collegiate",
      dashboardUrl: "http://localhost:3000/dashboard",
      date: new Date().getFullYear()
    };

    try {
      const { html } = compileEmail(template, previewData);
      res.send(html);
    } catch (err) {
      console.log(err)
      res.status(500).send("Template not found or failed to compile.");
    }
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
