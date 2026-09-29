import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: {
      googleId: "development-user",
    },
    update: {},
    create: {
      googleId: "development-user",
      email: "developer@example.com",
      name: "Development User",
      avatarUrl: null,
    },
  });

  const sender = await prisma.sender.upsert({
    where: {
      id: "development-sender",
    },
    update: {
      smtpHost: process.env.ETHEREAL_HOST || "smtp.ethereal.email",
      smtpPort: Number(process.env.ETHEREAL_PORT || 587),
      smtpUsername: process.env.ETHEREAL_USER || "",
      smtpPassword: process.env.ETHEREAL_PASSWORD || "",
    },
    create: {
      id: "development-sender",
      userId: user.id,
      email: process.env.ETHEREAL_USER || "developer@ethereal.email",
      displayName: "Development Sender",
      smtpHost: process.env.ETHEREAL_HOST || "smtp.ethereal.email",
      smtpPort: Number(process.env.ETHEREAL_PORT || 587),
      smtpUsername: process.env.ETHEREAL_USER || "",
      smtpPassword: process.env.ETHEREAL_PASSWORD || "",
      defaultHourlyLimit: 100,
      defaultDelayMs: 0,
      isActive: true,
    },
  });

  console.log("Development user created:", user.id);
  console.log("Development sender created:", sender.id);
  console.log("Sender email:", sender.email);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });