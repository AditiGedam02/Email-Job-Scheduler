import { elasticsearch } from "../config/elasticsearch";

export const EMAIL_INDEX = "email_jobs";

export interface EmailSearchDocument {
  emailJobId: string;
  campaignId: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: string;
  sentAt?: string | null;
  createdAt: string;
}

export async function ensureEmailIndex(): Promise<void> {
  const exists = await elasticsearch.indices.exists({
    index: EMAIL_INDEX,
  });

  if (exists) {
    return;
  }

  await elasticsearch.indices.create({
    index: EMAIL_INDEX,
    mappings: {
      properties: {
        emailJobId: { type: "keyword" },
        campaignId: { type: "keyword" },
        userId: { type: "keyword" },
        senderId: { type: "keyword" },
        recipient: { type: "text" },
        subject: { type: "text" },
        body: { type: "text" },
        scheduledAt: { type: "date" },
        status: { type: "keyword" },
        sentAt: { type: "date" },
        createdAt: { type: "date" },
      },
    },
  });

  console.log(`Elasticsearch index "${EMAIL_INDEX}" created.`);
}

export async function indexEmailJob(
  document: EmailSearchDocument
): Promise<void> {
  await elasticsearch.index({
    index: EMAIL_INDEX,
    id: document.emailJobId,
    document,
  });
}

export async function searchEmails(
  userId: string,
  query: string
) {
  const result = await elasticsearch.search<EmailSearchDocument>({
    index: EMAIL_INDEX,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: [
                "recipient",
                "subject",
                "body",
              ],
            },
          },
        ],
        filter: [
          {
            term: {
              userId,
            },
          },
        ],
      },
    },
    sort: [
      {
        createdAt: {
          order: "desc",
        },
      },
    ],
  });

  return result.hits.hits.map((hit) => ({
    id: hit._id,
    ...hit._source,
  }));
}