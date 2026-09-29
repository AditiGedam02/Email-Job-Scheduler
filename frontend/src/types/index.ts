export interface Sender {
  id: string;
  email: string;
  displayName?: string | null;
}

export interface Campaign {
  id: string;
  senderId: string;
  subject: string;
  body: string;
  startAt: string;
  delayMs: number;
  hourlyLimit: number;
  totalRecipients: number;
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
}

export interface EmailJob {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: string;
  sentAt?: string | null;
  previewUrl?: string | null;
  providerMessageId?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
}

export interface CreateCampaignRequest {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayMs: number;
  hourlyLimit: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
}