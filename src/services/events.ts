import { QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const uploadEvents = new QueueEvents("file-upload", {
  connection,
});

export const emailEvents = new QueueEvents("send-email", {
  connection,
});

export const webhookEvent = new QueueEvents("webhook", {
  connection,
});

export const paymentCampaignEvent = new QueueEvents("campaign", {
  connection,
});

export const suspendDebtorEvent = new QueueEvents("suspend", {
  connection,
});

uploadEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed ${returnvalue}`);
});

uploadEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason} `);
});

uploadEvents.on("active", ({ jobId }) => {
  console.log(`Upload 🚀 Job ${jobId} started`);
});

emailEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed ${returnvalue}`);
});

emailEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`Email Job ${jobId} failed: ${failedReason} `);
});

emailEvents.on("active", ({ jobId }) => {
  console.log(`Email 🚀 Job ${jobId} started`);
});

webhookEvent.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed ${returnvalue}`);
});

webhookEvent.on("failed", ({ jobId, failedReason }) => {
  console.error(`Webhook Job ${jobId} failed: ${failedReason} `);
});

webhookEvent.on("active", ({ jobId }) => {
  console.log(`Webhook 🚀 Job ${jobId} started`);
});

paymentCampaignEvent.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Payment Campaign Job ${jobId} completed ${returnvalue}`);
});

paymentCampaignEvent.on("failed", ({ jobId, failedReason }) => {
  console.error(`Payment Campaign Job ${jobId} failed: ${failedReason} `);
});

paymentCampaignEvent.on("active", ({ jobId }) => {
  console.log(`Payment Campaign 🚀 Job ${jobId} started`);
});

suspendDebtorEvent.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Suspend debtor Job ${jobId} completed ${returnvalue}`);
});

suspendDebtorEvent.on("failed", ({ jobId, failedReason }) => {
  console.error(`Suspend debtor Job ${jobId} failed: ${failedReason} `);
});

suspendDebtorEvent.on("active", ({ jobId }) => {
  console.log(`Suspend debtor 🚀 Job ${jobId} started`);
});
