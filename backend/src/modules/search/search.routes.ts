import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware";
import { searchEmails } from "../../services/email-search.service";

const router = Router();

router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const query =
        typeof req.query.q === "string"
          ? req.query.q.trim()
          : "";

      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      const results = await searchEmails(
        req.userId,
        query
      );

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error("Email search failed:", error);

      return res.status(500).json({
        success: false,
        message: "Email search failed",
      });
    }
  }
);

export default router;