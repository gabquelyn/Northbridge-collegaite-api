import { QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const uploadEvents = new QueueEvents("nbc", {
  connection,
});

uploadEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed ${returnvalue}`);
});

uploadEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason} `);
});

uploadEvents.on("active", ({ jobId }) => {
  console.log(`🚀 Job ${jobId} started`);
});
