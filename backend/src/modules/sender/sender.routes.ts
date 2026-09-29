import { Router } from "express";
import { prisma } from "../../config/database";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware";

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

      const senders = await prisma.sender.findMany({
        where: {
          userId: req.userId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          defaultHourlyLimit: true,
          defaultDelayMs: true,
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return res.json({
        success: true,
        data: senders,
      });
    } catch (error) {
      console.error("Failed to fetch senders:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch senders",
      });
    }
  }
);

export default router;