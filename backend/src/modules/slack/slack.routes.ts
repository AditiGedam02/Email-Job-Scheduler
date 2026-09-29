import { Router } from "express";
import {
  disconnectSlack,
  getSlackIntegration,
  sendSlackNotification,
} from "../../services/slack.service";
import {
  AuthenticatedRequest,
  requireAuth,
} from "../../middleware/auth.middleware";

const router = Router();

router.get(
  "/status",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const integration = await getSlackIntegration(req.userId);

      return res.json({
        success: true,
        data: {
          connected: Boolean(integration),
          integration,
        },
      });
    } catch (error) {
      console.error("Slack status error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to get Slack status",
      });
    }
  },
);

router.post(
  "/disconnect",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      await disconnectSlack(req.userId);

      return res.json({
        success: true,
        message: "Slack disconnected",
      });
    } catch (error) {
      console.error("Slack disconnect error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to disconnect Slack",
      });
    }
  },
);

router.post(
  "/test",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const sent = await sendSlackNotification(
        req.userId,
        "✅ Email Job Scheduler Slack integration is working.",
      );

      if (!sent) {
        return res.status(400).json({
          success: false,
          message: "Slack is not connected.",
        });
      }

      return res.json({
        success: true,
        message: "Test Slack notification sent",
      });
    } catch (error) {
      console.error("Slack test error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to send Slack notification",
      });
    }
  },
);

export default router;