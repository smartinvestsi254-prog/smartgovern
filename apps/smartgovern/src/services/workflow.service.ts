import { prisma } from "../lib/prisma";
import { WorkflowState } from "@prisma/client";

type Decision = "APPROVE" | "REQUEST_CHANGES" | "REJECT";

const canTransition: Record<WorkflowState, WorkflowState[]> = {
  DRAFT: ["IN_REVIEW", "ARCHIVED"],
  IN_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["IN_REVIEW", "ARCHIVED"],
  APPROVED: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
  REJECTED: ["ARCHIVED"],
};

export async function createWorkflow(params: {
  name: string;
  description?: string;
  type: string;
  organizationId?: string;
  actorId: string;
  steps?: Array<{ name: string; order: number; type: string }>;
}) {
  const workflow = await prisma.workflow.create({
    data: {
      name: params.name,
      description: params.description,
      type: params.type,
      organizationId: params.organizationId,
      state: "DRAFT",
      lockedById: params.actorId,
      steps: params.steps
        ? { create: params.steps.map((s) => ({ name: s.name, order: s.order, type: s.type as any })) }
        : undefined,
    },
    include: { steps: true, organization: true },
  });
  return workflow;
}

export async function submitForReview(params: { workflowId: string; actorId: string }) {
  const wf = await prisma.workflow.findUniqueOrThrow({ where: { id: params.workflowId } });
  if (!canTransition[wf.state].includes("IN_REVIEW")) {
    throw Object.assign(new Error(`Invalid transition: ${wf.state} -> IN_REVIEW`), { statusCode: 400 });
  }
  await prisma.$transaction([
    prisma.workflow.update({
      where: { id: wf.id },
      data: { state: "IN_REVIEW", lockedById: params.actorId, lockedAt: new Date() },
    }),
    prisma.workflowEvent.create({
      data: {
        workflowId: wf.id,
        actorId: params.actorId,
        fromState: wf.state,
        toState: "IN_REVIEW",
        reason: "Submitted for review",
      },
    }),
  ]);
  return { ok: true, workflowId: wf.id };
}

export async function recordDecision(params: {
  workflowId: string;
  actorId: string;
  decision: Decision;
  notes?: string;
}) {
  const wf = await prisma.workflow.findUniqueOrThrow({ where: { id: params.workflowId } });
  if (wf.state !== "IN_REVIEW") {
    throw Object.assign(new Error(`Workflow not in review. state=${wf.state}`), { statusCode: 400 });
  }
  const toState: WorkflowState =
    params.decision === "APPROVE"
      ? "APPROVED"
      : params.decision === "REQUEST_CHANGES"
      ? "CHANGES_REQUESTED"
      : "REJECTED";
  if (!canTransition[wf.state].includes(toState)) {
    throw Object.assign(new Error(`Invalid transition: ${wf.state} -> ${toState}`), { statusCode: 400 });
  }
  await prisma.$transaction([
    prisma.workflowApproval.create({
      data: { workflowId: wf.id, reviewerId: params.actorId, decision: params.decision, notes: params.notes },
    }),
    prisma.workflow.update({ where: { id: wf.id }, data: { state: toState, lockedById: null, lockedAt: null } }),
    prisma.workflowEvent.create({
      data: {
        workflowId: wf.id,
        actorId: params.actorId,
        fromState: wf.state,
        toState,
        reason: `Review decision: ${params.decision}`,
        meta: { notes: params.notes },
      },
    }),
  ]);
  return { ok: true, toState };
}

export async function publishWorkflow(params: { workflowId: string; actorId: string }) {
  const wf = await prisma.workflow.findUniqueOrThrow({ where: { id: params.workflowId } });
  if (wf.state !== "APPROVED") {
    throw Object.assign(new Error(`Workflow must be APPROVED to publish. state=${wf.state}`), { statusCode: 400 });
  }
  await prisma.$transaction([
    prisma.workflow.update({ where: { id: wf.id }, data: { state: "PUBLISHED" } }),
    prisma.workflowEvent.create({
      data: {
        workflowId: wf.id,
        actorId: params.actorId,
        fromState: wf.state,
        toState: "PUBLISHED",
        reason: "Published",
      },
    }),
  ]);
  return { ok: true };
}

export async function listWorkflows(params: { state?: WorkflowState; orgId?: string; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: any = {};
  if (params.state) where.state = params.state;
  if (params.orgId) where.organizationId = params.orgId;
  const [total, workflows] = await Promise.all([
    prisma.workflow.count({ where }),
    prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { steps: { orderBy: { order: "asc" } }, organization: true },
    }),
  ]);
  return { total, page, workflows };
}

export async function getWorkflow(id: string) {
  return prisma.workflow.findUniqueOrThrow({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } }, events: { orderBy: { createdAt: "desc" } }, approvals: true, organization: true },
  });
}
</content>
