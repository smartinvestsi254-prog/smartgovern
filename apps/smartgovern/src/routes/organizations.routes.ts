import { Router } from "express";
import { z } from "zod";
import { createBodyValidator } from "../../../packages/shared-security/src/index";
import { authRequired, requireRole } from "../services/auth.service";
import {
  createOrganization,
  listOrganizations,
  getOrganization,
  addUserToOrganization,
  createGovernmentUser,
  listGovernmentUsers,
} from "../services/organization.service";
import { hashPassword } from "../services/auth.service";

const router = Router();

router.use(authRequired);

const orgSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  ministry: z.string().optional(),
  department: z.string().optional(),
  code: z.string().optional(),
  parentId: z.string().optional(),
});

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.string().optional(),
  department: z.string().optional(),
  ministry: z.string().optional(),
  agency: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
});

router.post("/", requireRole("ADMIN"), createBodyValidator(orgSchema), async (req, res) => {
  try {
    const organization = await createOrganization(req.body);
    res.status(201).json({ success: true, organization });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const organizations = await listOrganizations();
    res.json({ success: true, organizations });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const organization = await getOrganization(req.params.id);
    res.json({ success: true, organization });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.post("/:id/members", requireRole("ADMIN"), createBodyValidator(addMemberSchema), async (req, res) => {
  try {
    const result = await addUserToOrganization({ organizationId: req.params.id, userId: req.body.userId });
    res.json({ success: true, result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

// Government users
router.post("/users", requireRole("ADMIN"), createBodyValidator(userSchema), async (req, res) => {
  try {
    const passwordHash = await hashPassword(req.body.password);
    const user = await createGovernmentUser({ ...req.body, passwordHash });
    res.status(201).json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/users", requireRole("ADMIN", "DIRECTOR"), async (req, res) => {
  try {
    const users = await listGovernmentUsers({ role: (req.query.role as string) ?? undefined });
    res.json({ success: true, users });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
