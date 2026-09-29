import axios from "axios";

const API_BASE_URL = "http://localhost:4000/api";

export interface SlackIntegration {
  id: string;
  teamId: string | null;
  teamName: string | null;
  channelId: string | null;
  channelName: string | null;
  connectedAt: string;
  updatedAt: string;
}

export interface SlackStatusResponse {
  connected: boolean;
  integration: SlackIntegration | null;
}

export async function getSlackStatus(): Promise<SlackStatusResponse> {
  const response = await axios.get(`${API_BASE_URL}/slack/status`, {
    withCredentials: true,
  });

  return response.data.data;
}

export async function disconnectSlack(): Promise<void> {
  await axios.post(
    `${API_BASE_URL}/slack/disconnect`,
    {},
    {
      withCredentials: true,
    },
  );
}

export async function sendSlackTest(): Promise<void> {
  await axios.post(
    `${API_BASE_URL}/slack/test`,
    {},
    {
      withCredentials: true,
    },
  );
}