import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const fileUploadQueue = new Queue("file-upload", {
  connection,
});

export const emailQueue = new Queue("send-email", {
  connection,
});

export const paystackQueue = new Queue("webhook", {
  connection,
});

