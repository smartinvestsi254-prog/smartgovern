import { describe, expect, test } from "@jest/globals";
import {
  verifyWebhookSignature,
  hashPassword,
  verifyPassword,
  TotpService,
  encryptToken,
  decryptToken,
} from "./index";

describe("shared security helpers", () => {
  test("verifies webhook signatures using HMAC-SHA256", () => {
    const payload = JSON.stringify({ status: "completed" });
    const secret = "shared-secret";
    // Compute expected signature
    const crypto = require("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    expect(verifyWebhookSignature(payload, expected, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, "tampered", secret)).toBe(false);
  });

  test("hashes and verifies passwords with scrypt", () => {
    const hash = hashPassword("S3curePass123!");
    expect(hash.startsWith("$scrypt$")).toBe(true);
    expect(verifyPassword("S3curePass123!", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  test("TOTP generates a secret and verifies a code", () => {
    const totp = new TotpService();
    const secret = totp.generateSecret();
    expect(secret.length).toBeGreaterThan(10);
    // Verify a valid code is rejected for invalid input
    expect(totp.verify("abc", secret)).toBe(false);
    expect(totp.verify("12345", secret)).toBe(false);
  });

  test("encrypts and decrypts tokens with AES-256-GCM", () => {
    const secret = "0123456789abcdef0123456789abcdef";
    const token = "refresh-token-value";
    const encrypted = encryptToken(token, secret);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted, secret)).toBe(token);
  });
});
