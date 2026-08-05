import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, requireRole } from "../services/auth.service";
import {
  createPolicy,
  updatePolicyStatus,
  listPolicies,
  createComplianceRecord,
  reviewComplianceRecord,
  listComplianceRecords,
} from "../services/compliance.service";

const router = Router();

router.use(authRequired);

const policySchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  content: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  organizationId: z.string().optional(),
});

const policyStatusSchema = z.object({
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "ACTIVE", "REVOKED", "EXPIRED"]),
});

const complianceSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  regulation: z.string().min(1),
  status: z.enum(["COMPLIANT", "NON_COMPLIANT", "PENDING", "WAIVER", "UNDER_REVIEW"]).optional(),
  evidenceUrl: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

const reviewSchema = z.object({
  status: z.enum(["COMPLIANT", "NON_COMPLIANT", "PENDING", "WAIVER", "UNDER_REVIEW"]),
  reviewNotes: z.string().optional(),
});

// Policies
router.post("/policies", requireRole("ADMIN", "MINISTER", "DIRECTOR"), createBodyValidator(policySchema), async (req, res) => {
  try {
    const policy = await createPolicy({
      ...req.body,
      effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      ownerId: (req as any).user.id,
      createdBy: (req as any).user.id,
    });
    res.status(201).json({ success: true, policy });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.patch("/policies/:id/status", requireRole("ADMIN", "MINISTER", "DIRECTOR"), createBodyValidator(policyStatusSchema), async (req, res) => {
  try {
    const policy = await updatePolicyStatus({ id: req.params.id, status: req.body.status });
    res.json({ success: true, policy });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/policies", async (req, res) => {
  try {
    const policies = await listPolicies({ status: (req.query.status as any) ?? undefined, category: (req.query.category as string) ?? undefined });
    res.json({ success: true, policies });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Compliance Records
router.post("/records", requireRole("ADMIN", "DIRECTOR", "OFFICER"), createBodyValidator(complianceSchema), async (req, res) => {
  try {
    const record = await createComplianceRecord({
      ...req.body,
      ownerId: (req as any).user.id,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    });
    res.status(201).json({ success: true, record });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.patch("/records/:id/review", requireRole("ADMIN", "DIRECTOR", "COMPLIANCE", "MINISTER"), createBodyValidator(reviewSchema), async (req, res) => {
  try {
    const record = await reviewComplianceRecord({ id: req.params.id, ...req.body, reviewedBy: (req as any).user.id });
    res.json({ success: true, record });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/records", async (req, res) => {
  try {
    const records = await listComplianceRecords({ status: (req.query.status as any) ?? undefined, entityType: (req.query.entityType as string) ?? undefined });
    res.json({ success: true, records });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
