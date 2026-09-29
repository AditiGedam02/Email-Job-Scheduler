import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import {
  completeSlackAuthorization,
  createSlackAuthorizationUrl,
  getFrontendUrl,
} from "../../services/slack.service";
import { requireAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

// Start Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login?error=google_auth_failed",
  }),
  (req, res) => {
    const user = req.user as {
      id: string;
    };

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect("http://localhost:5173/");
  }
);

// Current authenticated user
router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Failed to fetch current user:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch current user",
      });
    }
  }
);

// Logout
router.post("/logout", (_req, res) => {
  res.clearCookie("auth_token");

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
});

router.get(
  "/slack",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const authorizationUrl = await createSlackAuthorizationUrl(req.userId);

      return res.redirect(authorizationUrl);
    } catch (error) {
      console.error("Slack authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to start Slack connection",
      });
    }
  },
);

router.get(
  "/slack/callback",
  async (req, res) => {
    try {
      const code =
        typeof req.query.code === "string"
          ? req.query.code
          : undefined;

      const state =
        typeof req.query.state === "string"
          ? req.query.state
          : undefined;

      if (!code || !state) {
        return res.redirect(
          `${getFrontendUrl()}/?slack=error`,
        );
      }

      await completeSlackAuthorization(code, state);

      return res.redirect(
        `${getFrontendUrl()}/?slack=connected`,
      );
    } catch (error) {
      console.error("Slack callback error:", error);

      return res.redirect(
        `${getFrontendUrl()}/?slack=error`,
      );
    }
  },
);

export default router;