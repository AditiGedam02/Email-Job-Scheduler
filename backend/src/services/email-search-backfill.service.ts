import { prisma } from "../config/database";
import {
  ensureEmailIndex,
  indexEmailJob,
} from "./email-search.service";

export async function backfillEmailSearchIndex() {
  await ensureEmailIndex();

  const jobs = await prisma.emailJob.findMany({
  select: {
    id: true,
    campaignId: true,
    senderId: true,
    recipient: true,
    subject: true,
    body: true,
    scheduledAt: true,
    status: true,
    sentAt: true,
    createdAt: true,
    campaign: {
      select: {
        userId: true,
      },
    },
  },
  orderBy: {
    createdAt: "asc",
  },
});

  let indexed = 0;

  for (const job of jobs) {
    await indexEmailJob({
      emailJobId: job.id,
      campaignId: job.campaignId,
      userId: job.campaign.userId,
      senderId: job.senderId,
      recipient: job.recipient,
      subject: job.subject,
      body: job.body,
      scheduledAt: job.scheduledAt.toISOString(),
      status: job.status,
      sentAt: job.sentAt
        ? job.sentAt.toISOString()
        : null,
      createdAt: job.createdAt.toISOString(),
    });

    indexed++;
  }

  console.log(
    `Elasticsearch backfill complete. Indexed ${indexed} email jobs.`
  );

  return indexed;
}