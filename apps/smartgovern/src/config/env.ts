import { z } from "zod";

const csv = z
  .string()
  .optional()
  .default("")
  .transform((val) => (val && val.length ? val.split(",").map((s) => s.trim()).filter(Boolean) : []));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
  ADMIN_REG_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: csv,
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SENTRY_DSN: z.string().url().optional(),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid SmartGovern environment variables");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = parsed.data;
export type Env = typeof env;
</content>
