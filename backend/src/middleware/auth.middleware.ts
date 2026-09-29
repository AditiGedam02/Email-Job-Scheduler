import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

interface AuthTokenPayload extends jwt.JwtPayload {
  userId: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT configuration is missing",
      });
    }

    const verified = jwt.verify(token, JWT_SECRET);

    if (
      typeof verified !== "object" ||
      verified === null ||
      typeof verified.userId !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const payload = verified as AuthTokenPayload;

    req.userId = payload.userId;

    next();
  } catch (error) {
    console.error("Authentication failed:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}