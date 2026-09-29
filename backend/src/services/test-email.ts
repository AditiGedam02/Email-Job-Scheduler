import "dotenv/config";
import { sendEmail } from "./email.service";

async function main() {
  const result = await sendEmail({
    to: "test@example.com",
    subject: "Email Scheduler Test",
    body: "This is a test email from the email job scheduler.",
  });

  console.log("Email sent successfully.");
  console.log("Message ID:", result.messageId);
  console.log("Preview URL:", result.previewUrl);
}

main().catch((error) => {
  console.error("Email sending failed:", error);
  process.exit(1);
});