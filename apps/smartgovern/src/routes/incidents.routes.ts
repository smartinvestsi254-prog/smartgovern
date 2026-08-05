import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, requireRole } from "../services/auth.service";
import { createIncident, updateIncidentStatus, listIncidents, getIncident } from "../services/incident.service";

const router = Router();

router.use(authRequired);

const createSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  runbookKey: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "MITIGATING", "RESOLVED", "CLOSED"]),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
});

router.post("/", requireRole("ADMIN", "INCIDENT_COMMANDER", "ANALYST", "REVIEWER", "EDITOR", "OFFICER"), createBodyValidator(createSchema), async (req, res) => {
  try {
    const incident = await createIncident({ ...req.body, reporterId: (req as any).user.id });
    res.status(201).json({ success: true, incident });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await listIncidents({
      status: (req.query.status as any) ?? undefined,
      severity: (req.query.severity as any) ?? undefined,
      page: req.query.page ? Number(req.query.page) : 1,
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const incident = await getIncident(req.params.id);
    res.json({ success: true, incident });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.patch("/:id/status", requireRole("ADMIN", "INCIDENT_COMMANDER"), createBodyValidator(updateSchema), async (req, res) => {
  try {
    const incident = await updateIncidentStatus({ incidentId: req.params.id, actorId: (req as any).user.id, ...req.body });
    res.json({ success: true, incident });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
