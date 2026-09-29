import { prisma } from "../config/database";
import { enqueueEmailJob } from "./email-job.service";

export async function recoverScheduledJobs() {
  console.log("Starting scheduler recovery...");

  const jobs = await prisma.emailJob.findMany({
    where: {
      status: {
        in: ["SCHEDULED", "RETRYING"],
      },
    },
    select: {
      id: true,
      scheduledAt: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  let recovered = 0;

  for (const job of jobs) {
    await enqueueEmailJob(job.id, job.scheduledAt);
    recovered++;
  }

  console.log(
    `Scheduler recovery complete. Reconciled ${recovered} jobs.`
  );

  return recovered;
}