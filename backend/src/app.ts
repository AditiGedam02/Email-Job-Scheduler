import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import senderRoutes from "./modules/sender/sender.routes";

import { prisma } from "./config/database";
import campaignRoutes from "./modules/campaign/campaign.routes";
import emailRoutes from "./modules/email/email.routes";
import searchRoutes from "./modules/search/search.routes";
import { emailQueue } from "./queue/email.queue";
import { backfillEmailSearchIndex } from "./services/email-search-backfill.service";
import cookieParser from "cookie-parser";
import passport from "./config/passport";
import authRoutes from "./modules/auth/auth.routes";
import slackRoutes from "./modules/slack/slack.routes";


const app = express();

app.use(cookieParser());
app.use(passport.initialize());

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// -----------------------------------------------------
// Health check
// -----------------------------------------------------

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      success: true,
      service: "email-job-scheduler-api",
      status: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return res.status(503).json({
      success: false,
      service: "email-job-scheduler-api",
      status: "unhealthy",
      database: "disconnected",
    });
  }
});

// -----------------------------------------------------
// Bull Board
// -----------------------------------------------------

const bullBoardServerAdapter = new ExpressAdapter();

bullBoardServerAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter: bullBoardServerAdapter,
});

app.use(
  "/admin/queues",
  bullBoardServerAdapter.getRouter()
);

// -----------------------------------------------------
// Application routes
// -----------------------------------------------------
app.use("/auth", authRoutes);

app.use("/api/campaigns", campaignRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/search", searchRoutes);

// -----------------------------------------------------
// Elasticsearch development backfill
// -----------------------------------------------------

app.post("/api/search/backfill", async (_req, res) => {
  try {
    const indexed = await backfillEmailSearchIndex();

    return res.json({
      success: true,
      message: "Elasticsearch backfill completed",
      indexed,
    });
  } catch (error) {
    console.error("Elasticsearch backfill failed:", error);

    return res.status(500).json({
      success: false,
      message: "Elasticsearch backfill failed",
    });
  }
});

app.use("/api/senders", senderRoutes);

app.use(cookieParser());
app.use(passport.initialize());
app.use("/auth", authRoutes);
app.use("/api/slack", slackRoutes);

export default app;