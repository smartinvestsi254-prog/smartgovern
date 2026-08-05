import { prisma } from "../lib/prisma";

export async function createOrganization(params: {
  name: string;
  type: string;
  ministry?: string;
  department?: string;
  code?: string;
  parentId?: string;
}) {
  return prisma.organization.create({ data: params });
}

export async function listOrganizations() {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { children: true, members: true, policies: true },
  });
}

export async function getOrganization(id: string) {
  return prisma.organization.findUniqueOrThrow({
    where: { id },
    include: { children: true, members: true, policies: true, workflows: true },
  });
}

export async function addUserToOrganization(params: { organizationId: string; userId: string }) {
  return prisma.governmentUser.update({
    where: { id: params.userId },
    data: { organizations: { connect: { id: params.organizationId } } },
  });
}

export async function createGovernmentUser(params: {
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  department?: string;
  ministry?: string;
  agency?: string;
}) {
  return prisma.governmentUser.create({ data: params });
}

export async function listGovernmentUsers(params: { role?: string } = {}) {
  const where: any = {};
  if (params.role) where.role = params.role;
  return prisma.governmentUser.findMany({
    where,
    select: { id: true, email: true, fullName: true, role: true, department: true, ministry: true, isActive: true },
    orderBy: { fullName: "asc" },
  });
}
</content>
