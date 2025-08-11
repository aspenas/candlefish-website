import { PrismaClient } from '@prisma/client';
import { config } from './index';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  // Use global to prevent multiple instances during development hot reloading
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  prisma = globalForPrisma.prisma;
}

// Connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};

export { prisma };
