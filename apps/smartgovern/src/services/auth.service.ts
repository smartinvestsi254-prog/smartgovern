import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

const JWT_SECRET = env.JWT_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: { id: string; email: string; role: string; fullName: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export async function createSession(userId: string, req: Request): Promise<string> {
  const refreshToken = signRefreshToken(userId);
  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      deviceId: (req.headers["x-device-id"] as string) ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return refreshToken;
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshToken },
    data: { isRevoked: true },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | null> {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { sub: string; jti: string };
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return null;
    }
    const user = await prisma.governmentUser.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
    return { accessToken };
  } catch (e) {
    return null;
  }
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = (req.headers.authorization || "").toString();
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      fullName: string;
    };
    req.user = { ...payload };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }
    next();
  };
}

export function adminRequired(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole("ADMIN")(req, res, next);
}
</content>
