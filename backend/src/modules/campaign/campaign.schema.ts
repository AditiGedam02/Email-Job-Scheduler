import { z } from "zod";

export const createCampaignSchema = z.object({
  senderId: z.string().min(1),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  recipients: z
    .array(z.string().email())
    .min(1)
    .max(10000),
  startAt: z.string().datetime(),
  delayMs: z.number().int().min(0).default(0),
  hourlyLimit: z.number().int().min(1).max(100000),
});

export type CreateCampaignInput = z.infer<
  typeof createCampaignSchema
>;