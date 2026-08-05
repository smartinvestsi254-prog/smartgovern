import { defineConfig } from "@prisma/config";

/**
 * SmartGovern — Governance & Workflow Platform
 * Prisma configuration for the SmartGovern app.
 * Schema: ../../prisma/schemas/smartgovern.prisma
 */
const databaseUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? databaseUrl;

export default defineConfig({
  datasource: {
    url: databaseUrl,
    directUrl,
  },
  schema: "../../prisma/schemas/smartgovern.prisma",
  log: ["warn", "error"],
  migrate: {
    datasource: {
      url: databaseUrl,
    },
  },
});
