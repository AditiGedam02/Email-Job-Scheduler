import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { EMAIL_QUEUE_NAME } from "./email.queue";
import { processEmailJob } from "../services/email-job.service";

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 5;

const emailWorker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job) => {
    if (job.name !== "send-email") {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    const { emailJobId } = job.data as {
      emailJobId: string;
    };

    await processEmailJob(emailJobId);
  },
  {
    connection: redisConnection,
    concurrency,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Email delivery job completed: ${job.id}`);
});

emailWorker.on("failed", (job, error) => {
  console.error(
    `Email delivery job failed: ${job?.id}`,
    error.message
  );
});

emailWorker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log(
  `Email worker started with concurrency: ${concurrency}`
);