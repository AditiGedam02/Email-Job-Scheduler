import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const EMAIL_QUEUE_NAME = "email-delivery";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
});