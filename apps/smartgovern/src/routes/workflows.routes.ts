import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, requireRole } from "../services/auth.service";
import {
  createWorkflow,
  submitForReview,
  recordDecision,
  publishWorkflow,
  listWorkflows,
  getWorkflow,
} from "../services/workflow.service";

const router = Router();

router.use(authRequired);

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  organizationId: z.string().optional(),
  steps: z.array(z.object({ name: z.string(), order: z.number(), type: z.string() })).optional(),
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT"]),
  notes: z.string().optional(),
});

router.post("/", requireRole("ADMIN", "MINISTER", "SECRETARY", "DIRECTOR", "OFFICER", "ANALYST"), createBodyValidator(createSchema), async (req, res) => {
  try {
    const workflow = await createWorkflow({ ...req.body, actorId: (req as any).user.id });
    res.status(201).json({ success: true, workflow });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await listWorkflows({
      state: (req.query.state as any) ?? undefined,
      orgId: (req.query.orgId as string) ?? undefined,
      page: req.query.page ? Number(req.query.page) : 1,
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const workflow = await getWorkflow(req.params.id);
    res.json({ success: true, workflow });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.post("/:id/submit", async (req, res) => {
  try {
    const result = await submitForReview({ workflowId: req.params.id, actorId: (req as any).user.id });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.post("/:id/decision", requireRole("ADMIN", "REVIEWER", "SECRETARY", "DIRECTOR"), createBodyValidator(decisionSchema), async (req, res) => {
  try {
    const result = await recordDecision({ workflowId: req.params.id, actorId: (req as any).user.id, ...req.body });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.post("/:id/publish", requireRole("ADMIN", "EDITOR", "SECRETARY"), async (req, res) => {
  try {
    const result = await publishWorkflow({ workflowId: req.params.id, actorId: (req as any).user.id });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
