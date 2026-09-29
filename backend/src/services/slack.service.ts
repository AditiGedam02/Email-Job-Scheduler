import { randomUUID } from "crypto";
import { prisma } from "../config/database";
import { redisConnection } from "../config/redis";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_CALLBACK_URL = process.env.SLACK_CALLBACK_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

if (!SLACK_CLIENT_ID) {
  console.warn("SLACK_CLIENT_ID is not configured.");
}

if (!SLACK_CLIENT_SECRET) {
  console.warn("SLACK_CLIENT_SECRET is not configured.");
}

if (!SLACK_CALLBACK_URL) {
  console.warn("SLACK_CALLBACK_URL is not configured.");
}

const OAUTH_STATE_TTL_SECONDS = 600;

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: {
    id?: string;
    name?: string;
  };
  incoming_webhook?: {
    url?: string;
    channel?: string;
    channel_id?: string;
  };
  error?: string;
}

export async function createSlackAuthorizationUrl(
  userId: string,
): Promise<string> {
  if (!SLACK_CLIENT_ID || !SLACK_CALLBACK_URL) {
    throw new Error("Slack OAuth is not configured.");
  }

  const state = randomUUID();

  await redisConnection.set(
    `slack:oauth:state:${state}`,
    userId,
    "EX",
    OAUTH_STATE_TTL_SECONDS,
  );

  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: "incoming-webhook",
    redirect_uri: SLACK_CALLBACK_URL,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function completeSlackAuthorization(
  code: string,
  state: string,
) {
  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_CALLBACK_URL) {
    throw new Error("Slack OAuth is not configured.");
  }

  const stateKey = `slack:oauth:state:${state}`;
  const userId = await redisConnection.get(stateKey);

  if (!userId) {
    throw new Error("Invalid or expired Slack OAuth state.");
  }

  // OAuth state is single-use.
  await redisConnection.del(stateKey);

  const body = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code,
    redirect_uri: SLACK_CALLBACK_URL,
  });

  const response = await fetch(
    "https://slack.com/api/oauth.v2.access",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const result = (await response.json()) as SlackOAuthResponse;

  if (!result.ok || !result.access_token) {
    throw new Error(
      `Slack OAuth failed: ${result.error || "Unknown Slack error"}`,
    );
  }

  const webhookUrl = result.incoming_webhook?.url;

  if (!webhookUrl) {
    throw new Error(
      "Slack did not return an incoming webhook URL. Make sure the incoming-webhook scope is enabled.",
    );
  }

  await prisma.slackIntegration.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      accessToken: result.access_token,
      webhookUrl,
      teamId: result.team?.id ?? null,
      teamName: result.team?.name ?? null,
      channelId: result.incoming_webhook?.channel_id ?? null,
      channelName: result.incoming_webhook?.channel ?? null,
    },
    update: {
      accessToken: result.access_token,
      webhookUrl,
      teamId: result.team?.id ?? null,
      teamName: result.team?.name ?? null,
      channelId: result.incoming_webhook?.channel_id ?? null,
      channelName: result.incoming_webhook?.channel ?? null,
    },
  });

  return {
    userId,
    teamName: result.team?.name ?? null,
    channelName: result.incoming_webhook?.channel ?? null,
  };
}

export async function getSlackIntegration(userId: string) {
  return prisma.slackIntegration.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      teamId: true,
      teamName: true,
      channelId: true,
      channelName: true,
      connectedAt: true,
      updatedAt: true,
    },
  });
}

export async function disconnectSlack(userId: string) {
  await prisma.slackIntegration.deleteMany({
    where: {
      userId,
    },
  });
}

export async function sendSlackNotification(
  userId: string,
  message: string,
): Promise<boolean> {
  const integration = await prisma.slackIntegration.findUnique({
    where: {
      userId,
    },
    select: {
      webhookUrl: true,
    },
  });

  // Slack is optional. Don't break email scheduling/sending.
  if (!integration?.webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(integration.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      console.error(
        `Slack notification failed with HTTP ${response.status}.`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Slack notification error:", error);
    return false;
  }
}


export async function notifyHourlyLimitReached(
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
): Promise<boolean> {
  const notificationKey = `slack:hourly-limit:${userId}:${new Date()
    .toISOString()
    .slice(0, 13)}`;

  const alreadyNotified = await redisConnection.set(
    notificationKey,
    "1",
    "EX",
    7200,
    "NX",
  );

  if (alreadyNotified !== "OK") {
    return false;
  }

  const message =
    `:warning: *Hourly email limit reached*\n\n` +
    `Sender: ${senderEmail}\n` +
    `Hourly limit: ${hourlyLimit}\n` +
    `The remaining emails will continue in the next available hourly window.`;

  return sendSlackNotification(userId, message);
}

export function getFrontendUrl(): string {
  return FRONTEND_URL;
}