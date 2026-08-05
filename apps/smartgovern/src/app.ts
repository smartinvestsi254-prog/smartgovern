import express from "express";
import cookieParser from "cookie-parser";
import { createSecurityMiddleware } from "../../packages/shared-security/src/index";
import { getAllowedOrigins } from "../../packages/shared-utils/src/env";
import { env } from "./config/env";

// Route modules
import authRoutes from "./routes/auth.routes";
import workflowRoutes from "./routes/workflows.routes";
import incidentRoutes from "./routes/incidents.routes";
import licensingRoutes from "./routes/licensing.routes";
import diplomacyRoutes from "./routes/diplomacy.routes";
import complianceRoutes from "./routes/compliance.routes";
import organizationRoutes from "./routes/organizations.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

app.set("trust proxy", 1);

app.use(
  createSecurityMiddleware({
    allowedOrigins: getAllowedOrigins([
      "http://localhost:3000",
      "http://localhost:5000",
      "https://smartgovern.netlify.app",
    ]),
    environment: env.NODE_ENV,
    rateLimitMax: env.RATE_LIMIT_MAX,
    trustProxy: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(express.raw({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ service: "smartgovern", status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/licensing", licensingRoutes);
app.use("/api/diplomacy", diplomacyRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  console.error("[Error]", err);
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? "An internal error occurred" : err.message,
  });
});

export default app;
</content>
