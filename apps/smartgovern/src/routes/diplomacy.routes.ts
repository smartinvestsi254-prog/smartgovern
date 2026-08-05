import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, requireRole } from "../services/auth.service";
import {
  createMission,
  listMissions,
  createTreaty,
  listTreaties,
  updateTreaty,
  createDelegation,
  listDelegations,
  createCooperationRecord,
  listCooperationRecords,
} from "../services/diplomacy.service";

const router = Router();

router.use(authRequired);

const missionSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  region: z.string().optional(),
  type: z.enum(["EMBASSY", "HIGH_COMMISSION", "CONSULATE", "PERMANENT_MISSION", "HONORARY_CONSULATE"]),
  status: z.enum(["ACTIVE", "PAUSED", "PLANNING"]).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  focusArea: z.string().optional(),
});

const treatyCreateSchema = z.object({
  title: z.string().min(1),
  partner: z.string().min(1),
  sector: z.string().min(1),
  status: z.enum(["NEGOTIATION", "SIGNED", "RATIFIED", "IN_REVIEW", "IMPLEMENTATION", "EXPIRED"]).optional(),
  signedAt: z.string().datetime().optional(),
  nextMilestone: z.string().optional(),
  summary: z.string().optional(),
});

const treatyUpdateSchema = z.object({
  status: z.enum(["NEGOTIATION", "SIGNED", "RATIFIED", "IN_REVIEW", "IMPLEMENTATION", "EXPIRED"]).optional(),
  signedAt: z.string().datetime().optional(),
  nextMilestone: z.string().optional(),
  summary: z.string().optional(),
});

const delegationSchema = z.object({
  name: z.string().min(1),
  focus: z.string().min(1),
  hostCity: z.string().min(1),
  hostCountry: z.string().min(1),
  leadMinistry: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  objectives: z.string().optional(),
});

const cooperationSchema = z.object({
  partnerCountry: z.string().min(1),
  program: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().optional(),
});

// Missions
router.post("/missions", requireRole("ADMIN", "MINISTER", "DIRECTOR"), createBodyValidator(missionSchema), async (req, res) => {
  try {
    const mission = await createMission(req.body);
    res.status(201).json({ success: true, mission });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/missions", async (req, res) => {
  try {
    const missions = await listMissions({ type: (req.query.type as any) ?? undefined, status: (req.query.status as any) ?? undefined });
    res.json({ success: true, missions });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Treaties
router.post("/treaties", requireRole("ADMIN", "MINISTER", "DIRECTOR"), createBodyValidator(treatyCreateSchema), async (req, res) => {
  try {
    const treaty = await createTreaty({ ...req.body, signedAt: req.body.signedAt ? new Date(req.body.signedAt) : undefined, ownerId: (req as any).user.id });
    res.status(201).json({ success: true, treaty });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.patch("/treaties/:id", requireRole("ADMIN", "MINISTER", "DIRECTOR"), createBodyValidator(treatyUpdateSchema), async (req, res) => {
  try {
    const treaty = await updateTreaty({ id: req.params.id, ...req.body, signedAt: req.body.signedAt ? new Date(req.body.signedAt) : undefined });
    res.json({ success: true, treaty });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/treaties", async (req, res) => {
  try {
    const treaties = await listTreaties({ status: (req.query.status as any) ?? undefined });
    res.json({ success: true, treaties });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Delegations
router.post("/delegations", requireRole("ADMIN", "MINISTER", "DIRECTOR"), createBodyValidator(delegationSchema), async (req, res) => {
  try {
    const delegation = await createDelegation({
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      ownerId: (req as any).user.id,
    });
    res.status(201).json({ success: true, delegation });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/delegations", async (req, res) => {
  try {
    const delegations = await listDelegations({ status: (req.query.status as string) ?? undefined });
    res.json({ success: true, delegations });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Cooperation
router.post("/cooperation", requireRole("ADMIN", "MINISTER", "DIRECTOR"), createBodyValidator(cooperationSchema), async (req, res) => {
  try {
    const record = await createCooperationRecord({
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    });
    res.status(201).json({ success: true, record });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/cooperation", async (req, res) => {
  try {
    const records = await listCooperationRecords({ partnerCountry: (req.query.partnerCountry as string) ?? undefined });
    res.json({ success: true, records });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
