import "dotenv/config";
import { emailQueue } from "./email.queue";

async function main() {
  const job = await emailQueue.add(
    "test-email",
    {
      recipient: "test@example.com",
      subject: "BullMQ Test",
    },
    {
      jobId: `test-${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log("Test job added:", job.id);

  await emailQueue.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});