import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, requireRole } from "../services/auth.service";
import {
  createLicensePartner,
  listLicensePartners,
  createLicense,
  listLicenses,
  updateLicenseStatus,
  addLicenseHolder,
  checkEntitlement,
} from "../services/licensing.service";

const router = Router();

router.use(authRequired);

const partnerSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

const licenseSchema = z.object({
  partnerId: z.string().min(1),
  allowedPurposes: z.array(z.enum(["ANALYTICS", "DISPLAY", "REDISTRIBUTION", "INTERNAL", "RESEARCH"])).min(1),
  attributionRequired: z.boolean().optional(),
  attributionText: z.string().optional(),
  allowRedistribution: z.boolean().optional(),
  rateLimitPerMin: z.number().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  entitlements: z.array(z.string()).optional(),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "PENDING", "REVOKED"]),
});

const holderSchema = z.object({
  holderName: z.string().min(1),
  holderEmail: z.string().email().optional(),
  purpose: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const entitlementSchema = z.object({
  datasetKey: z.string().min(1),
  purpose: z.enum(["ANALYTICS", "DISPLAY", "REDISTRIBUTION", "INTERNAL", "RESEARCH"]),
});

// Partners
router.post("/partners", requireRole("ADMIN", "DIRECTOR"), createBodyValidator(partnerSchema), async (req, res) => {
  try {
    const partner = await createLicensePartner(req.body);
    res.status(201).json({ success: true, partner });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/partners", async (_req, res) => {
  try {
    const partners = await listLicensePartners();
    res.json({ success: true, partners });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Licenses
router.post("/", requireRole("ADMIN", "DIRECTOR"), createBodyValidator(licenseSchema), async (req, res) => {
  try {
    const license = await createLicense({
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    });
    res.status(201).json({ success: true, license });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await listLicenses({
      status: (req.query.status as any) ?? undefined,
      page: req.query.page ? Number(req.query.page) : 1,
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.patch("/:id/status", requireRole("ADMIN", "DIRECTOR"), createBodyValidator(statusSchema), async (req, res) => {
  try {
    const license = await updateLicenseStatus({ licenseId: req.params.id, status: req.body.status });
    res.json({ success: true, license });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.post("/:id/holders", requireRole("ADMIN", "DIRECTOR"), createBodyValidator(holderSchema), async (req, res) => {
  try {
    const holder = await addLicenseHolder({
      licenseId: req.params.id,
      ...req.body,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    });
    res.status(201).json({ success: true, holder });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Entitlement check
router.post("/check", createBodyValidator(entitlementSchema), async (req, res) => {
  try {
    const result = await checkEntitlement({
      ...req.body,
      actorUserId: (req as any).user.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
