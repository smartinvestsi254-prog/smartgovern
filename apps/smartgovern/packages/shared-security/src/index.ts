import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";

/** Minimal session shape (avoid hard dependency on express-session) */
interface CsrfSession {
  csrfToken?: string;
}

// ============================================================
// Security Options
// ============================================================

export interface SecurityOptions {
  allowedOrigins: string[];
  environment: string;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  trustProxy?: boolean;
}

// ============================================================
// Middleware factory
// ============================================================

export function createSecurityMiddleware(options: SecurityOptions) {
  return [
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }
        if (options.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("CORS policy violation"), false);
      },
      credentials: true,
    }),
    rateLimit({
      windowMs: options.rateLimitWindowMs ?? 15 * 60 * 1000,
      max: options.rateLimitMax ?? 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  ];
}

// ============================================================
// Zod body validator
// ============================================================

export function createBodyValidator<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

// ============================================================
// Subscription plan enforcement (requirePlan)
// ============================================================

export type SubscriptionPlan = "BASIC" | "PREMIUM" | "ENTERPRISE";

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  BASIC: 0,
  PREMIUM: 1,
  ENTERPRISE: 2,
};

/**
 * requirePlan("PREMIUM")  -> enforces PREMIUM or ENTERPRISE
 * requirePlan("ENTERPRISE") -> enforces ENTERPRISE only
 * requirePlan("BASIC")   -> any authenticated user
 */
export function requirePlan(required: SubscriptionPlan) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPlan = (req.user?.plan as SubscriptionPlan | undefined) ?? "BASIC";
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    if (PLAN_HIERARCHY[userPlan] < PLAN_HIERARCHY[required]) {
      return res.status(403).json({
        success: false,
        error: `This feature requires ${required} plan`,
        code: "INSUFFICIENT_PLAN",
        requiredPlan: required,
        userPlan,
        upgradeUrl: "/pricing.html",
      });
    }
    next();
  };
}

// ============================================================
// Webhook signature verification (HMAC-SHA256)
// ============================================================

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ============================================================
// Secure cookie options
// ============================================================

export function getSecureCookieOptions(environment: string) {
  return {
    httpOnly: true,
    secure: environment === "production",
    sameSite: "lax" as const,
    maxAge: 1000 * 60 * 60 * 8,
  };
}

// ============================================================
// CSRF protection
// ============================================================

export interface CsrfOptions {
  secret?: string;
  cookieName?: string;
  headerName?: string;
  environment?: string;
}

/**
 * Generate a CSRF token bound to the session (double-submit pattern).
 * Requires express-session to be mounted before this middleware.
 */
export function csrfProtection(options: CsrfOptions = {}) {
  const cookieName = options.cookieName ?? "csrf_token";
  const headerName = options.headerName ?? "x-csrf-token";
return (req: Request, res: Response, next: NextFunction) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
      // Ensure token is issued
      const session = req.session as unknown as CsrfSession;
      if (session && !session.csrfToken) {
        session.csrfToken = crypto.randomBytes(24).toString("hex");
      }
      res.cookie(cookieName, session?.csrfToken ?? crypto.randomBytes(24).toString("hex"), {
        httpOnly: false,
        secure: options.environment === "production",
        sameSite: "lax",
      });
      return next();
    }

    const session = req.session as unknown as CsrfSession;
    const expected = session?.csrfToken;
    const provided = req.header(headerName) || req.body?.csrfToken;
    if (!expected || !provided || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
      return res.status(403).json({ success: false, error: "CSRF token validation failed" });
    }
    next();
  };
}

// ============================================================
// TOTP 2FA (RFC 6238)
// ============================================================

export class TotpService {
  constructor(private readonly algorithm: "sha1" | "sha256" | "sha512" = "sha1") {}

  /** Generate a base32 secret for TOTP */
  generateSecret(byteLength = 20): string {
    const bytes = crypto.randomBytes(byteLength);
    return this.base32Encode(bytes);
  }

  /** Generate provisioning otpauth:// URI */
  generateUri(secret: string, account: string, issuer = "SmartInvestsi"): string {
    const encoded = encodeURIComponent(account);
    return `otpauth://totp/${issuer}:${encoded}?secret=${secret}&issuer=${issuer}&algorithm=${this.algorithm.toUpperCase()}&period=30&digits=6`;
  }

  /** Verify a 6-digit code against the secret with a 2-step window */
  verify(code: string, secret: string, window = 1): boolean {
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) return false;
    const counter = Math.floor(Date.now() / 30000);
    for (let i = -window; i <= window; i++) {
      if (this.generateCode(secret, counter + i) === clean) return true;
    }
    return false;
  }

  private generateCode(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac(this.algorithm, key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const otp = binary % 1000000;
    return otp.toString().padStart(6, "0");
  }

  private base32Encode(buf: Buffer): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let output = "";
    for (let i = 0; i < buf.length; i++) {
      value = (value << 8) | buf[i];
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
    return output;
  }

  private base32Decode(input: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = input.toUpperCase().replace(/=+$/, "").replace(/[\s-]/g, "");
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of clean) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }
}

// ============================================================
// Password hashing (argon2-style via Node crypto scrypt)
// ============================================================

export interface PasswordOptions {
  saltLen?: number;
  keyLen?: number;
  N?: number;
  r?: number;
  p?: number;
}

/**
 * Hash a password using scrypt - returns "$scrypt$N$r$p$salt$hash"
 */
export function hashPassword(password: string, opts: PasswordOptions = {}): string {
  const saltLen = opts.saltLen ?? 16;
  const keyLen = opts.keyLen ?? 64;
  const N = opts.N ?? 32768;
  const r = opts.r ?? 8;
  const p = opts.p ?? 1;
  const salt = crypto.randomBytes(saltLen);
  const hash = crypto.scryptSync(password, salt, keyLen, { N, r, p });
  return `$scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.startsWith("$scrypt$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 7) return false;
  const [, , N, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const hash = crypto.scryptSync(password, salt, expected.length, {
    N: parseInt(N, 10),
    r: parseInt(r, 10),
    p: parseInt(p, 10),
  });
  return crypto.timingSafeEqual(hash, expected);
}

// ============================================================
// JWT helpers (refresh + access)
// ============================================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * AES-256-GCM encryption helper for refresh tokens stored at rest.
 */
export function encryptToken(token: string, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptToken(payload: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ============================================================
// Device tracking fingerprint
// ============================================================

export function deviceFingerprint(req: Request): string {
  const ua = req.headers["user-agent"] || "";
  const accept = req.headers["accept"] || "";
  const acceptLang = req.headers["accept-language"] || "";
  const secChUa = req.headers["sec-ch-ua"] || "";
  const raw = `${ua}|${accept}|${acceptLang}|${secChUa}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ============================================================
// Audit logging helper (interface only; concrete impl uses DB)
// ============================================================

export interface AuditEntry {
  userId?: string;
  userEmail?: string;
  eventType: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  success: boolean;
  errorMessage?: string;
}

export type AuditLoggerFn = (entry: AuditEntry) => Promise<void>;

export function createAuditMiddleware(logger: AuditLoggerFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger({
        userId: req.user?.id,
        userEmail: req.user?.email,
        eventType: "HTTP_REQUEST",
        action: `${req.method} ${req.originalUrl}`,
        details: { statusCode: res.statusCode, duration },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceId: req.user?.deviceId,
        success: res.statusCode < 400,
      }).catch(() => {
        /* non-fatal */
      });
    });
    next();
  };
}

// ============================================================
// Express Request augmentation (declare)
// ============================================================

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        plan?: SubscriptionPlan;
        role?: string;
        deviceId?: string;
      };
    }
  }
}
