import { randomUUID } from "crypto";
import { prisma } from "../config/database";
import { emailQueue } from "../queue/email.queue";
import { sendEmail } from "./email.service";
import { indexEmailJob } from "./email-search.service";
import { notifyHourlyLimitReached } from "./slack.service";

export async function processEmailJob(emailJobId: string) {
  const processingToken = randomUUID();

  // Atomically claim the job.
  // This prevents multiple workers from processing the same
  // database job at the same time.
  const claimedJob = await prisma.emailJob.updateMany({
    where: {
      id: emailJobId,
      status: {
        in: ["SCHEDULED", "RETRYING"],
      },
    },
    data: {
      status: "PROCESSING",
      processingToken,
      processingStartedAt: new Date(),
      attemptCount: {
        increment: 1,
      },
    },
  });

  if (claimedJob.count === 0) {
    console.log(
      `Job ${emailJobId} was already processed or claimed.`
    );

    return;
  }

  const job = await prisma.emailJob.findUnique({
  where: { id: emailJobId },
  include: {
    campaign: {
      select: {
        userId: true,
        hourlyLimit: true,
      },
    },
    sender: {
      select: {
        email: true,
      },
    },
  },
});

  if (!job) {
    throw new Error(`Email job ${emailJobId} not found`);
  }

  const attemptNumber = job.attemptCount;

  const attempt = await prisma.deliveryAttempt.create({
    data: {
      emailJobId: job.id,
      attemptNumber,
      status: "STARTED",
    },
  });

  try {
    const result = await sendEmail({
      to: job.recipient,
      subject: job.subject,
      body: job.body,
    });

    const sentAt = new Date();

    await prisma.$transaction([
      prisma.deliveryAttempt.update({
        where: {
          id: attempt.id,
        },
        data: {
          status: "SENT",
          completedAt: sentAt,
          providerMessageId: result.messageId,
        },
      }),

      prisma.emailJob.update({
        where: {
          id: job.id,
          processingToken,
        },
        data: {
          status: "SENT",
          sentAt,
          providerMessageId: result.messageId,
          previewUrl:
            typeof result.previewUrl === "string"
              ? result.previewUrl
              : null,
          processingToken: null,
          processingStartedAt: null,
          lastError: null,
        },
      }),
    ]);

    await prisma.campaign.update({
      where: {
        id: job.campaignId,
      },
      data: {
        sentCount: {
          increment: 1,
        },
      },
    });

    // Refresh the Elasticsearch document with the latest status.
    const updatedJob = await prisma.emailJob.findUnique({
      where: {
        id: job.id,
      },
    });

    if (updatedJob) {
      try {
        await indexEmailJob({
          emailJobId: updatedJob.id,
          campaignId: updatedJob.campaignId,
          userId: job.campaign.userId,
          senderId: updatedJob.senderId,
          recipient: updatedJob.recipient,
          subject: updatedJob.subject,
          body: updatedJob.body,
          scheduledAt: updatedJob.scheduledAt.toISOString(),
          status: updatedJob.status,
          sentAt: updatedJob.sentAt
            ? updatedJob.sentAt.toISOString()
            : null,
          createdAt: updatedJob.createdAt.toISOString(),
        });
      } catch (error) {
        // Elasticsearch is a search projection.
        // A temporary Elasticsearch failure must not
        // mark an already-sent email as failed.
        console.error(
          `Failed to update Elasticsearch for email job ${job.id}:`,
          error
        );
      }
    }

    const currentHourStart = new Date();
currentHourStart.setMinutes(0, 0, 0);

const currentHourEnd = new Date(currentHourStart);
currentHourEnd.setHours(currentHourEnd.getHours() + 1);

const sentThisHour = await prisma.emailJob.count({
  where: {
    senderId: job.senderId,
    status: "SENT",
    sentAt: {
      gte: currentHourStart,
      lt: currentHourEnd,
    },
  },
});

if (sentThisHour >= job.campaign.hourlyLimit) {
  await notifyHourlyLimitReached(
    job.campaign.userId,
    job.sender.email,
    job.campaign.hourlyLimit,
  );
}

    console.log(
      `Email sent successfully: ${job.id}`
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown email error";

    await prisma.$transaction([
      prisma.deliveryAttempt.update({
        where: {
          id: attempt.id,
        },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: message,
        },
      }),

      prisma.emailJob.update({
        where: {
          id: job.id,
          processingToken,
        },
        data: {
          status: "FAILED",
          lastError: message,
          processingToken: null,
          processingStartedAt: null,
        },
      }),

      prisma.campaign.update({
        where: {
          id: job.campaignId,
        },
        data: {
          failedCount: {
            increment: 1,
          },
        },
      }),
    ]);

    // Keep Elasticsearch in sync with the failed status.
    const failedJob = await prisma.emailJob.findUnique({
      where: {
        id: job.id,
      },
    });

    if (failedJob) {
      try {
        await indexEmailJob({
          emailJobId: failedJob.id,
          campaignId: failedJob.campaignId,
          userId: job.campaign.userId,
          senderId: failedJob.senderId,
          recipient: failedJob.recipient,
          subject: failedJob.subject,
          body: failedJob.body,
          scheduledAt: failedJob.scheduledAt.toISOString(),
          status: failedJob.status,
          sentAt: failedJob.sentAt
            ? failedJob.sentAt.toISOString()
            : null,
          createdAt: failedJob.createdAt.toISOString(),
        });
      } catch (indexError) {
        console.error(
          `Failed to update Elasticsearch for failed email job ${job.id}:`,
          indexError
        );
      }
    }

    throw error;
  }
}

/**
 * Adds an email job to BullMQ using the database emailJob ID
 * as a deterministic job ID.
 *
 * This makes enqueueing idempotent:
 * the same email job cannot create multiple BullMQ jobs
 * with different IDs.
 */
export async function enqueueEmailJob(
  emailJobId: string,
  scheduledAt: Date
) {
  await emailQueue.add(
    "send-email",
    {
      emailJobId,
    },
    {
      jobId: `email-${emailJobId}`,
      delay: Math.max(
        0,
        scheduledAt.getTime() - Date.now()
      ),
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}