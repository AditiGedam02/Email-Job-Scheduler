import { prisma } from "../../config/database";
import { enqueueEmailJob } from "../../services/email-job.service";
import type { CreateCampaignInput } from "./campaign.schema";
import { indexEmailJob } from "../../services/email-search.service";

const HOUR_MS = 60 * 60 * 1000;

function getHourStart(date: Date): Date {
  const result = new Date(date);
  result.setMinutes(0, 0, 0);
  return result;
}

function getNextHour(date: Date): Date {
  return new Date(getHourStart(date).getTime() + HOUR_MS);
}

async function reserveScheduleWindows(
  senderId: string,
  startAt: Date,
  recipientCount: number,
  hourlyLimit: number,
  delayMs: number
) {
  const scheduledTimes: Date[] = [];

  let currentTime = new Date(startAt);

  while (scheduledTimes.length < recipientCount) {
    const windowStart = getHourStart(currentTime);
    const windowEnd = new Date(
      windowStart.getTime() + HOUR_MS
    );

    const remaining =
      recipientCount - scheduledTimes.length;

    const window = await prisma.scheduleWindow.upsert({
      where: {
        senderId_windowStart: {
          senderId,
          windowStart,
        },
      },
      update: {},
      create: {
        senderId,
        windowStart,
        windowEnd,
        capacity: hourlyLimit,
        reservedCount: 0,
      },
    });

    const available =
      Math.max(0, window.capacity - window.reservedCount);

    if (available === 0) {
      currentTime = windowEnd;
      continue;
    }

    const numberToReserve = Math.min(
      available,
      remaining
    );

    /*
     * Reserve capacity atomically.
     *
     * The WHERE condition ensures another concurrent
     * request cannot push reservedCount above capacity.
     */
    const updated = await prisma.scheduleWindow.updateMany({
      where: {
        id: window.id,
        reservedCount: {
          lte: window.capacity - numberToReserve,
        },
      },
      data: {
        reservedCount: {
          increment: numberToReserve,
        },
      },
    });

    if (updated.count === 0) {
      continue;
    }

    for (let i = 0; i < numberToReserve; i++) {
      let scheduledAt = new Date(currentTime);

      if (i > 0) {
        scheduledAt = new Date(
          scheduledAt.getTime() + delayMs
        );
      }

      /*
       * Never schedule beyond the end of the hourly window.
       */
      if (scheduledAt >= windowEnd) {
        currentTime = windowEnd;
        break;
      }

      scheduledTimes.push(scheduledAt);
      currentTime = scheduledAt;
    }

    /*
     * If the minimum delay pushes the next email outside
     * the current hour, continue in the next window.
     */
    if (
      scheduledTimes.length < recipientCount &&
      currentTime >= windowEnd
    ) {
      currentTime = windowEnd;
    }
  }

  return scheduledTimes;
}

export async function createCampaign(
  input: CreateCampaignInput
) {
  const startAt = new Date(input.startAt);

  if (Number.isNaN(startAt.getTime())) {
    throw new Error("Invalid startAt date");
  }

  if (startAt.getTime() < Date.now()) {
    throw new Error("startAt must be in the future");
  }

  const sender = await prisma.sender.findUnique({
    where: {
      id: input.senderId,
    },
  });

  if (!sender) {
    throw new Error("Sender not found");
  }

  if (!sender.isActive) {
    throw new Error("Sender is inactive");
  }

  const scheduledTimes = await reserveScheduleWindows(
    sender.id,
    startAt,
    input.recipients.length,
    input.hourlyLimit,
    input.delayMs
  );

  if (scheduledTimes.length !== input.recipients.length) {
    throw new Error(
      "Unable to reserve scheduling capacity for all recipients"
    );
  }

  const campaign = await prisma.$transaction(
    async (tx) => {
      const createdCampaign = await tx.campaign.create({
        data: {
          senderId: sender.id,
          userId: sender.userId,
          subject: input.subject,
          body: input.body,
          startAt,
          delayMs: input.delayMs,
          hourlyLimit: input.hourlyLimit,
          totalRecipients: input.recipients.length,
          scheduledCount: input.recipients.length,
          status: "SCHEDULED",
        },
      });

      await tx.emailJob.createMany({
        data: input.recipients.map((recipient, index) => ({
          campaignId: createdCampaign.id,
          senderId: sender.id,
          recipient,
          subject: input.subject,
          body: input.body,
          scheduledAt: scheduledTimes[index],
          status: "SCHEDULED",
        })),
      });

      return createdCampaign;
    }
  );

  const emailJobs = await prisma.emailJob.findMany({
    where: {
      campaignId: campaign.id,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  /*
   * PostgreSQL is the source of truth.
   * BullMQ is only the execution mechanism.
   */
  for (const emailJob of emailJobs) {
  await enqueueEmailJob(emailJob.id, emailJob.scheduledAt);

  await indexEmailJob({
    emailJobId: emailJob.id,
    campaignId: emailJob.campaignId,
    userId: campaign.userId,
    senderId: emailJob.senderId,
    recipient: emailJob.recipient,
    subject: emailJob.subject,
    body: emailJob.body,
    scheduledAt: emailJob.scheduledAt.toISOString(),
    status: emailJob.status,
    sentAt: emailJob.sentAt?.toISOString() ?? null,
    createdAt: emailJob.createdAt.toISOString(),
  });
}

  return {
    campaign,
    scheduledEmails: emailJobs.length,
  };
}

export async function listCampaigns(userId: string) {
  return prisma.campaign.findMany({
    where: {
      userId,
    },
    include: {
      sender: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}