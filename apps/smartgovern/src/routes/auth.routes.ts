import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  createSession,
  revokeSession,
  revokeAllSessions,
  refreshAccessToken,
  authRequired,
} from "../services/auth.service";
import { getAllowedOrigins } from "../../../packages/shared-utils/src/env";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.string().optional(),
  department: z.string().optional(),
  ministry: z.string().optional(),
  agency: z.string().optional(),
  adminSecret: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post("/signup", createBodyValidator(signupSchema), async (req, res) => {
  try {
    const { email, password, fullName, role, department, ministry, agency, adminSecret } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.governmentUser.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ success: false, error: "User already exists" });
    }

    let finalRole = "VIEWER";
    const wantAdmin = role === "ADMIN";
    const adminEnvSecret = env.ADMIN_REG_SECRET;
    const count = await prisma.governmentUser.count();
    if (wantAdmin) {
      if ((adminEnvSecret && adminSecret === adminEnvSecret) || count === 0) {
        finalRole = "ADMIN";
      } else {
        return res.status(403).json({ success: false, error: "Cannot create admin account" });
      }
    } else if (role) {
      finalRole = role;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.governmentUser.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName,
        role: finalRole,
        department,
        ministry,
        agency,
      },
      select: { id: true, email: true, fullName: true, role: true },
    });

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
    const refreshToken = await createSession(user.id, req);

    res.status(201).json({ success: true, user, accessToken, refreshToken });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.post("/login", createBodyValidator(loginSchema), async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const user = await prisma.governmentUser.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    const valid = await verifyPassword(req.body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
    const refreshToken = await createSession(user.id, req);

    await prisma.governmentUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const allowedOrigins = getAllowedOrigins(["http://localhost:5000"]);
    res.status(200).json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, accessToken, refreshToken, allowedOrigins });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.post("/refresh", createBodyValidator(refreshSchema), async (req, res) => {
  try {
    const result = await refreshAccessToken(req.body.refreshToken);
    if (!result) return res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/logout", authRequired, async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (refreshToken) await revokeSession(refreshToken);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/logout/all", authRequired, async (req, res) => {
  try {
    await revokeAllSessions((req as any).user.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await prisma.governmentUser.findUnique({
      where: { id: (req as any).user.id },
      select: { id: true, email: true, fullName: true, role: true, department: true, ministry: true, agency: true, lastLoginAt: true },
    });
    res.json({ success: true, user });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
