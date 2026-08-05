import { prisma } from "../lib/prisma";
import { MissionStatus, MissionType, TreatyStatus } from "@prisma/client";

// --- Missions ---
export async function createMission(params: {
  name: string;
  country: string;
  city: string;
  region?: string;
  type: MissionType;
  status?: MissionStatus;
  contactEmail?: string;
  contactPhone?: string;
  focusArea?: string;
}) {
  return prisma.diplomacyMission.create({ data: params });
}

export async function listMissions(params: { type?: MissionType; status?: MissionStatus } = {}) {
  const where: any = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  return prisma.diplomacyMission.findMany({ where, orderBy: { country: "asc" } });
}

// --- Treaties ---
export async function createTreaty(params: {
  title: string;
  partner: string;
  sector: string;
  status?: TreatyStatus;
  signedAt?: Date;
  nextMilestone?: string;
  summary?: string;
  ownerId?: string;
}) {
  return prisma.treaty.create({ data: params });
}

export async function listTreaties(params: { status?: TreatyStatus } = {}) {
  const where: any = {};
  if (params.status) where.status = params.status;
  return prisma.treaty.findMany({ where, orderBy: { updatedAt: "desc" } });
}

export async function updateTreaty(params: { id: string; status?: TreatyStatus; signedAt?: Date; nextMilestone?: string; summary?: string }) {
  const data: any = {};
  if (params.status) data.status = params.status;
  if (params.signedAt) data.signedAt = params.signedAt;
  if (params.nextMilestone) data.nextMilestone = params.nextMilestone;
  if (params.summary) data.summary = params.summary;
  return prisma.treaty.update({ where: { id: params.id }, data });
}

// --- Delegations ---
export async function createDelegation(params: {
  name: string;
  focus: string;
  hostCity: string;
  hostCountry: string;
  leadMinistry: string;
  startDate: Date;
  endDate: Date;
  objectives?: string;
  ownerId?: string;
}) {
  return prisma.delegation.create({
    data: {
      name: params.name,
      focus: params.focus,
      hostCity: params.hostCity,
      hostCountry: params.hostCountry,
      leadMinistry: params.leadMinistry,
      startDate: params.startDate,
      endDate: params.endDate,
      objectives: params.objectives,
      ownerId: params.ownerId,
    },
  });
}

export async function listDelegations(params: { status?: string } = {}) {
  const where: any = {};
  if (params.status) where.status = params.status;
  return prisma.delegation.findMany({ where, orderBy: { startDate: "desc" } });
}

// --- Cooperation Records ---
export async function createCooperationRecord(params: {
  partnerCountry: string;
  program: string;
  description?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  ownerId?: string;
}) {
  return prisma.cooperationRecord.create({ data: params });
}

export async function listCooperationRecords(params: { partnerCountry?: string } = {}) {
  const where: any = {};
  if (params.partnerCountry) where.partnerCountry = params.partnerCountry;
  return prisma.cooperationRecord.findMany({ where, orderBy: { updatedAt: "desc" } });
}
</content>
