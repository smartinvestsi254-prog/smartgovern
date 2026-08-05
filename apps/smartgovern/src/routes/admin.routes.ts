import { Router } from "express";
import { authRequired, requireRole } from "../services/auth.service";
import { listAuditLogs } from "../services/audit.service";
import { prisma } from "../lib/prisma";

const router = Router();

router.use(authRequired, requireRole("ADMIN"));

router.get("/audit-logs", async (req, res) => {
  try {
    const result = await listAuditLogs({
      eventType: (req.query.eventType as string) ?? undefined,
      userId: (req.query.userId as string) ?? undefined,
      page: req.query.page ? Number(req.query.page) : 1,
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

router.get("/dashboard", async (_req, res) => {
  try {
    const [
      workflows,
      incidents,
      licenses,
      treaties,
      delegations,
      complianceRecords,
      organizations,
      users,
    ] = await Promise.all([
      prisma.workflow.count(),
      prisma.incident.count(),
      prisma.dataLicense.count(),
      prisma.treaty.count(),
      prisma.delegation.count(),
      prisma.complianceRecord.count(),
      prisma.organization.count(),
      prisma.governmentUser.count(),
    ]);
    res.json({
      success: true,
      stats: {
        workflows,
        incidents,
        licenses,
        treaties,
        delegations,
        complianceRecords,
        organizations,
        users,
      },
    });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message });
  }
});

export default router;
</content>
