import { PrismaClient } from '@prisma/client';

export async function createAuditLog(
  prisma: PrismaClient,
  data: {
    organizationId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    meta?: any;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  return prisma.auditLog.create({
    data,
  });
}
