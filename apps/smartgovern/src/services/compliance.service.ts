import { prisma } from "../lib/prisma";
import { ComplianceStatus, PolicyStatus } from "@prisma/client";

// --- Policies ---
export async function createPolicy(params: {
  title: string;
  category: string;
  content?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  organizationId?: string;
  ownerId?: string;
  createdBy?: string;
}) {
  return prisma.policy.create({ data: params });
}

export async function updatePolicyStatus(params: { id: string; status: PolicyStatus }) {
  return prisma.policy.update({ where: { id: params.id }, data: { status: params.status } });
}

export async function listPolicies(params: { status?: PolicyStatus; category?: string } = {}) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.category) where.category = params.category;
  return prisma.policy.findMany({ where, orderBy: { updatedAt: "desc" } });
}

// --- Compliance Records ---
export async function createComplianceRecord(params: {
  ownerId: string;
  entityType: string;
  entityId: string;
  regulation: string;
  status?: ComplianceStatus;
  evidenceUrl?: string;
  dueDate?: Date;
}) {
  return prisma.complianceRecord.create({ data: params });
}

export async function reviewComplianceRecord(params: {
  id: string;
  status: ComplianceStatus;
  reviewNotes?: string;
  reviewedBy: string;
}) {
  return prisma.complianceRecord.update({
    where: { id: params.id },
    data: { status: params.status, reviewNotes: params.reviewNotes, reviewedBy: params.reviewedBy, reviewedAt: new Date() },
  });
}

export async function listComplianceRecords(params: { status?: ComplianceStatus; entityType?: string } = {}) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.entityType) where.entityType = params.entityType;
  return prisma.complianceRecord.findMany({ where, orderBy: { updatedAt: "desc" } });
}
</content>
