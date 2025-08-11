import { prisma } from '../config/database';
import { redisService } from '../config/redis';

// Setup test environment
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();

  // Connect to Redis
  await redisService.connect();

  // Clean up existing test data
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up test data
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Disconnect from database
  await prisma.$disconnect();

  // Disconnect from Redis
  await redisService.disconnect();
});

// Clean up between tests
beforeEach(async () => {
  // Clean up test-specific data but keep test users/orgs
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
});
