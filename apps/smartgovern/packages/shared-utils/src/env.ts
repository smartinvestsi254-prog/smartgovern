export function getEnv(name: string, fallback?: string): string {
  return process.env[name] ?? fallback ?? "";
}

export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAllowedOrigins(defaults: string[] = []): string[] {
  const raw = getEnv("ALLOWED_ORIGINS", defaults.join(","));
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isProduction(): boolean {
  return getEnv("NODE_ENV", "development") === "production";
}
