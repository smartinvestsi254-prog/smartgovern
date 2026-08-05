import { prisma } from "../lib/prisma";
import { IncidentSeverity, IncidentStatus } from "@prisma/client";

export async function createIncident(params: {
  reporterId: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  runbookKey?: string;
}) {
  const incident = await prisma.incident.create({
    data: {
      title: params.title,
      summary: params.summary,
      severity: params.severity,
      status: "OPEN",
      reportedById: params.reporterId,
      runbookKey: params.runbookKey,
      timeline: { create: { message: "Incident created", meta: { severity: params.severity } } },
      updates: {
        create: { status: "OPEN", publicNote: "Investigating an issue", internalNote: params.summary },
      },
      logs: {
        create: { action: "INCIDENT_CREATED", actorEmail: String(params.reporterId) },
      },
    },
    include: { timeline: true, updates: true },
  });
  return incident;
}

export async function updateIncidentStatus(params: {
  actorId: string;
  incidentId: string;
  status: IncidentStatus;
  publicNote?: string;
  internalNote?: string;
}) {
  const updated = await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findUniqueOrThrow({ where: { id: params.incidentId } });
    await tx.incidentUpdate.create({
      data: {
        incidentId: incident.id,
        status: params.status,
        publicNote: params.publicNote,
        internalNote: params.internalNote,
      },
    });
    await tx.incidentEvent.create({
      data: { incidentId: incident.id, message: `Status -> ${params.status}`, meta: { publicNote: params.publicNote } },
    });
    await tx.incidentLog.create({
      data: {
        incidentId: incident.id,
        action: `STATUS_${params.status}`,
        actorEmail: String(params.actorId),
        details: { publicNote: params.publicNote },
      },
    });
    const timePatch: any = {};
    if (params.status === "MITIGATING") timePatch.mitigatedAt = new Date();
    if (params.status === "RESOLVED") timePatch.resolvedAt = new Date();
    if (params.status === "CLOSED") timePatch.closedAt = new Date();
    return tx.incident.update({
      where: { id: incident.id },
      data: { status: params.status, ownerId: incident.ownerId ?? params.actorId, ...timePatch },
    });
  });
  return updated;
}

export async function listIncidents(params: { status?: IncidentStatus; severity?: IncidentSeverity; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.severity) where.severity = params.severity;
  const [total, incidents] = await Promise.all([
    prisma.incident.count({ where }),
    prisma.incident.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { timeline: { orderBy: { createdAt: "desc" } }, updates: { orderBy: { createdAt: "desc" } } },
    }),
  ]);
  return { total, page, incidents };
}

export async function getIncident(id: string) {
  return prisma.incident.findUniqueOrThrow({
    where: { id },
    include: {
      timeline: { orderBy: { createdAt: "desc" } },
      updates: { orderBy: { createdAt: "desc" } },
      logs: { orderBy: { createdAt: "desc" } },
    },
  });
}
</content>
