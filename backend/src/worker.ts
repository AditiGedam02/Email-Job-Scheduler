import "dotenv/config";
import "./queue/email.worker";
import { recoverScheduledJobs } from "./services/scheduler-recovery.service";

async function startWorker() {
  console.log("Worker process started.");

  try {
    await recoverScheduledJobs();
  } catch (error) {
    console.error("Scheduler recovery failed:", error);
    process.exit(1);
  }
}

startWorker();