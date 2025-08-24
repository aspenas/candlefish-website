import { server } from './__tests__/__mocks__/server';

// Start MSW server for backend testing
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Backend-specific environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/candlefish_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Database test helpers
export const resetDatabase = async () => {
  // Reset database state between tests
  console.log('Resetting test database...');
};

export const seedTestData = async () => {
  // Seed test data
  console.log('Seeding test data...');
};

// GraphQL test utilities
export const createTestServer = async () => {
  const { ApolloServer } = require('@apollo/server');
  const { typeDefs } = require('../graphql/schema');
  const { resolvers } = require('../graphql/resolvers');
  
  return new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      user: req?.user || null,
      db: mockDb,
    }),
  });
};

// Mock database interface
export const mockDb = {
  users: new Map(),
  documents: new Map(),
  organizations: new Map(),
  
  // User operations
  findUserById: jest.fn(),
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  
  // Document operations
  findDocumentById: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  
  // Organization operations
  findOrganizationById: jest.fn(),
  createOrganization: jest.fn(),
  updateOrganization: jest.fn(),
  deleteOrganization: jest.fn(),
};

// Custom matchers for backend tests
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },
  
  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/;
    const pass = jwtRegex.test(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid JWT`,
      pass,
    };
  },
  
  toHaveGraphQLError(received, expectedMessage) {
    const hasErrors = received.errors && received.errors.length > 0;
    const hasExpectedMessage = hasErrors && 
      received.errors.some(error => error.message.includes(expectedMessage));
    
    return {
      message: () => `expected GraphQL response ${hasExpectedMessage ? 'not ' : ''}to have error "${expectedMessage}"`,
      pass: hasExpectedMessage,
    };
  }
});

// Global test hooks
beforeEach(async () => {
  await resetDatabase();
});

// Increase timeout for backend tests
jest.setTimeout(30000);
