export {
  getEnv,
  requireEnv,
  getAllowedOrigins,
  isProduction,
} from "./env";

import crypto from "crypto";

/** Generate a cryptographically random token (hex) */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Generate a cryptographically random idempotency key */
export function generateIdempotencyKey(prefix = "idem"): string {
  return `${prefix}_${Date.now()}_${randomToken(6)}`;
}

/** Simple constant-time string comparison */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Pagination helper returning { skip, take } */
export function paginate(page = 1, pageSize = 20) {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  return {
    skip: (safePage - 1) * safeSize,
    take: safeSize,
    page: safePage,
    pageSize: safeSize,
  };
}

/** Redact sensitive fields from a plain object (for logs) */
export function redact(obj: Record<string, unknown>, keys: string[] = []): Record<string, unknown> {
  const sensitive = new Set([
    "password",
    "passwordHash",
    "token",
    "refreshToken",
    "twoFactorSecret",
    "secret",
    "clientSecret",
    "consumerSecret",
    "passKey",
    "initiatorPassword",
    "apiKey",
    "authorization",
    ...keys,
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (sensitive.has(k.toLowerCase())) {
      out[k] = "***REDACTED***";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redact(v as Record<string, unknown>, keys);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Normalize an email address to lowercase + trim */
export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/** Validate a 254-char email format */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && email.length <= 254 && re.test(email);
}

/** mask a phone number for display (e.g. 2547****1234) */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return "***";
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

/** Generate a UUID v4 */
export function uuid(): string {
  return crypto.randomUUID();
}

/** JSON stringify with stable ordering (useful for webhook signatures) */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
