import { prisma } from "../lib/prisma";
import { DataUsagePurpose, LicenseStatus } from "@prisma/client";

export async function createLicensePartner(params: { name: string; type?: string; contactEmail?: string }) {
  return prisma.licensePartner.create({ data: params });
}

export async function listLicensePartners() {
  return prisma.licensePartner.findMany({ orderBy: { name: "asc" }, include: { licenses: true } });
}

export async function createLicense(params: {
  partnerId: string;
  allowedPurposes: DataUsagePurpose[];
  attributionRequired?: boolean;
  attributionText?: string;
  allowRedistribution?: boolean;
  rateLimitPerMin?: number;
  startDate?: Date;
  endDate?: Date;
  entitlements?: string[];
}) {
  return prisma.dataLicense.create({
    data: {
      partnerId: params.partnerId,
      allowedPurposes: params.allowedPurposes,
      attributionRequired: params.attributionRequired,
      attributionText: params.attributionText,
      allowRedistribution: params.allowRedistribution,
      rateLimitPerMin: params.rateLimitPerMin,
      startDate: params.startDate,
      endDate: params.endDate,
      entitlements: params.entitlements
        ? { create: params.entitlements.map((datasetKey) => ({ datasetKey })) }
        : undefined,
    },
    include: { partner: true, entitlements: true },
  });
}

export async function listLicenses(params: { status?: LicenseStatus; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: any = {};
  if (params.status) where.status = params.status;
  const [total, licenses] = await Promise.all([
    prisma.dataLicense.count({ where }),
    prisma.dataLicense.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { partner: true, entitlements: true, holders: true },
    }),
  ]);
  return { total, page, licenses };
}

export async function updateLicenseStatus(params: { licenseId: string; status: LicenseStatus }) {
  return prisma.dataLicense.update({ where: { id: params.licenseId }, data: { status: params.status } });
}

export async function addLicenseHolder(params: {
  licenseId: string;
  holderName: string;
  holderEmail?: string;
  purpose?: string;
  expiresAt?: Date;
}) {
  return prisma.licenseHolder.create({ data: params });
}

export async function checkEntitlement(params: {
  datasetKey: string;
  purpose: DataUsagePurpose;
  actorUserId?: string;
  ip?: string;
  userAgent?: string;
  requestMeta?: any;
}) {
  const now = new Date();
  const license = await prisma.dataLicense.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gt: now } }],
      allowedPurposes: { has: params.purpose },
      entitlements: { some: { datasetKey: params.datasetKey } },
    },
    include: { partner: true, entitlements: true },
    orderBy: { updatedAt: "desc" },
  });

  await prisma.dataUsageLog.create({
    data: {
      licenseId: license?.id ?? undefined,
      datasetKey: params.datasetKey,
      purpose: params.purpose,
      actorUserId: params.actorUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      requestMeta: params.requestMeta,
    },
  });

  if (!license) {
    return { allowed: false, reason: "No active license entitlement", datasetKey: params.datasetKey, purpose: params.purpose };
  }
  return {
    allowed: true,
    licenseId: license.id,
    partner: { id: license.partnerId, name: license.partner.name },
    attributionRequired: license.attributionRequired,
    attributionText: license.attributionText,
    allowRedistribution: license.allowRedistribution,
    rateLimitPerMin: license.rateLimitPerMin,
  };
}
</content>
