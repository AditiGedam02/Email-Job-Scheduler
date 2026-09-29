import { prisma } from "../../config/database";

export async function getScheduledEmails(userId: string) {
  return prisma.emailJob.findMany({
    where: {
      sender: {
        userId,
      },
      status: {
        in: ["SCHEDULED", "RETRYING", "PROCESSING"],
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          subject: true,
          status: true,
        },
      },
      sender: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });
}

export async function getSentEmails(userId: string) {
  return prisma.emailJob.findMany({
    where: {
      sender: {
        userId,
      },
      status: "SENT",
    },
    include: {
      campaign: {
        select: {
          id: true,
          subject: true,
          status: true,
        },
      },
      sender: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
      attempts: {
        orderBy: {
          attemptNumber: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      sentAt: "desc",
    },
  });
}