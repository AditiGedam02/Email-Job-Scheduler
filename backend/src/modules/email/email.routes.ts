import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware";
import {
  getScheduledEmails,
  getSentEmails,
} from "./email.service";

const router = Router();

router.get(
  "/scheduled",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const emails = await getScheduledEmails(req.userId);

      return res.json({
        success: true,
        data: emails,
      });
    } catch (error) {
      console.error("Failed to fetch scheduled emails:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch scheduled emails",
      });
    }
  }
);

router.get(
  "/sent",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const emails = await getSentEmails(req.userId);

      return res.json({
        success: true,
        data: emails,
      });
    } catch (error) {
      console.error("Failed to fetch sent emails:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch sent emails",
      });
    }
  }
);

export default router;