import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Middleware to auto-filter by organizationId
prisma.$use(async (params, next) => {
  // Auto-filter queries by organizationId if present in context
  // This is handled at the router level for better control
  return next(params);
});
