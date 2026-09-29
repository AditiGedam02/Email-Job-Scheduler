import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware";
import { createCampaignSchema } from "./campaign.schema";
import {
  createCampaign,
  listCampaigns,
} from "./campaign.service";

const router = Router();

router.post(
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

      const parsed = createCampaignSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid campaign data",
          errors: parsed.error.flatten(),
        });
      }

      
      const result = await createCampaign(parsed.data);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Failed to create campaign:", error);

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create campaign",
      });
    }
  }
);

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

      const campaigns = await listCampaigns(req.userId);

      return res.json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch campaigns",
      });
    }
  }
);

export default router;