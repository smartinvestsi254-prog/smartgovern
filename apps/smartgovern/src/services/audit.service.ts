import { prisma } from "../lib/prisma";

export async function writeAuditLog(params: {
  userId?: string;
  userEmail?: string;
  eventType: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId ?? undefined,
      userEmail: params.userEmail ?? undefined,
      eventType: params.eventType,
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
    },
  });
}

export async function listAuditLogs(params: { eventType?: string; userId?: string; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 50;
  const where: any = {};
  if (params.eventType) where.eventType = params.eventType;
  if (params.userId) where.userId = params.userId;
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { total, page, logs };
}
</content>
