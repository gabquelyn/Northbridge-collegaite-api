import { Worker } from "bullmq";
import IORedis from "ioredis";
import { uploadFilesFromPaths } from "../utils/application";
import Profile from "../model/profile";
import connectDB from "../config/connectDB";
import sendMail from "../utils/sendMail";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

async function myWorker() {
  try {
    await connectDB();
    const fileUploadWorker = new Worker(
      "nbc",
      async (job) => {
        if (job.name === "upload-files") {
          const { profileId, files } = job.data;

          const uploadedFiles = await uploadFilesFromPaths(files);
          await Profile.findByIdAndUpdate(profileId, {
            documents: uploadedFiles,
          })
            .lean()
            .exec();
        }
        if (job.name === "send-email") {
          const { to, html, subject } = job.data;
          await sendMail({ to, html, subject });
        }

        return { success: true };
      },
      { connection, concurrency: 1 },
    );

    fileUploadWorker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed`, err);
    });

    process.on("SIGINT", async () => {
      await fileUploadWorker.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await fileUploadWorker.close();
      process.exit(0);
    });
  } catch (err) {
    console.log(err);
  }
}

myWorker();
