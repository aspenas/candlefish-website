/**
 * Authentication helper utilities for tests
 * Provides user creation, token generation, and auth mocking
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Test JWT configuration
const TEST_JWT_SECRET = 'test-secret-key-for-deployment-api-tests';
const TEST_JWT_ISSUER = 'candlefish-ai-test';

export interface TestUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  created_at: string;
}

export interface TestJWTPayload {
  sub: string;
  email?: string;
  role: string;
  permissions?: string[];
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(userData: {
  email: string;
  role: string;
  permissions: string[];
  id?: string;
}): Promise<TestUser> {
  const testUser: TestUser = {
    id: userData.id || uuidv4(),
    email: userData.email,
    role: userData.role,
    permissions: userData.permissions,
    created_at: new Date().toISOString()
  };

  // In a real implementation, this would save to the test database
  // For now, we'll store in a mock registry
  TestUserRegistry.addUser(testUser);

  return testUser;
}

/**
 * Generate a test JWT token for authentication
 */
export function generateTestJWT(payload: TestJWTPayload, secret?: string): string {
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions || [],
    iss: payload.iss || TEST_JWT_ISSUER,
    aud: payload.aud || 'deployment-api',
    iat: payload.iat || now,
    exp: payload.exp || (now + 3600), // 1 hour expiry by default
    jti: payload.jti || uuidv4()
  };

  return jwt.sign(jwtPayload, secret || TEST_JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Get a test authentication token for a user
 */
export async function getTestAuthToken(userId: string): Promise<string> {
  const user = TestUserRegistry.getUser(userId);
  if (!user) {
    throw new Error(`Test user ${userId} not found`);
  }

  return generateTestJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions
  });
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredJWT(payload: Omit<TestJWTPayload, 'exp'>): string {
  const expiredTime = Math.floor(Date.now() / 1000) - 3600; // Expired 1 hour ago

  return generateTestJWT({
    ...payload,
    exp: expiredTime
  });
}

/**
 * Generate a JWT token with invalid signature
 */
export function generateInvalidSignatureJWT(payload: TestJWTPayload): string {
  return generateTestJWT(payload, 'wrong-secret-key');
}

/**
 * Generate a malformed JWT token
 */
export function generateMalformedJWT(): string {
  return 'malformed.jwt.token';
}

/**
 * Create JWT with missing required claims
 */
export function generateJWTWithMissingClaims(missingClaims: string[]): string {
  const basePayload: any = {
    sub: 'user-123',
    role: 'admin',
    permissions: ['deployments:read'],
    iss: TEST_JWT_ISSUER,
    aud: 'deployment-api',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  // Remove specified claims
  missingClaims.forEach(claim => {
    delete basePayload[claim];
  });

  return jwt.sign(basePayload, TEST_JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Mock auth service responses for testing
 */
export class AuthServiceMock {
  private static revokedTokens = new Set<string>();
  private static userPermissions = new Map<string, string[]>();

  static revokeToken(tokenId: string): void {
    this.revokedTokens.add(tokenId);
  }

  static isTokenRevoked(tokenId: string): boolean {
    return this.revokedTokens.has(tokenId);
  }

  static setUserPermissions(userId: string, permissions: string[]): void {
    this.userPermissions.set(userId, permissions);
  }

  static getUserPermissions(userId: string): string[] {
    return this.userPermissions.get(userId) || [];
  }

  static clearAll(): void {
    this.revokedTokens.clear();
    this.userPermissions.clear();
  }
}

/**
 * In-memory registry for test users
 */
class TestUserRegistry {
  private static users = new Map<string, TestUser>();

  static addUser(user: TestUser): void {
    this.users.set(user.id, user);
  }

  static getUser(id: string): TestUser | undefined {
    return this.users.get(id);
  }

  static getUserByEmail(email: string): TestUser | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  static getAllUsers(): TestUser[] {
    return Array.from(this.users.values());
  }

  static clearAll(): void {
    this.users.clear();
  }
}

/**
 * Helper for creating users with common roles
 */
export const CommonTestUsers = {
  admin: () => createTestUser({
    email: 'admin@candlefish.ai',
    role: 'admin',
    permissions: [
      'deployments:create',
      'deployments:read',
      'deployments:rollback',
      'secrets:rotate',
      'audit-logs:read',
      'environments:manage'
    ]
  }),

  developer: () => createTestUser({
    email: 'developer@candlefish.ai',
    role: 'developer',
    permissions: [
      'deployments:create',
      'deployments:read',
      'deployments:rollback:staging',
      'environments:read'
    ]
  }),

  viewer: () => createTestUser({
    email: 'viewer@candlefish.ai',
    role: 'viewer',
    permissions: [
      'deployments:read',
      'environments:read'
    ]
  }),

  ciSystem: () => createTestUser({
    email: 'ci@candlefish.ai',
    role: 'system',
    permissions: [
      'deployments:create',
      'deployments:read',
      'deployments:update'
    ]
  })
};

/**
 * Permission validation helpers
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * Test cleanup helper
 */
export function cleanupAuthTests(): void {
  TestUserRegistry.clearAll();
  AuthServiceMock.clearAll();
}

/**
 * JWT verification helper for tests
 */
export function verifyTestJWT(token: string): TestJWTPayload {
  try {
    return jwt.verify(token, TEST_JWT_SECRET) as TestJWTPayload;
  } catch (error) {
    throw new Error(`Invalid test JWT: ${error.message}`);
  }
}

/**
 * Generate tokens for common test scenarios
 */
export const TestTokens = {
  valid: () => generateTestJWT({
    sub: 'test-user-123',
    role: 'admin',
    permissions: ['deployments:create', 'deployments:read', 'deployments:rollback']
  }),

  expired: () => generateExpiredJWT({
    sub: 'test-user-123',
    role: 'admin',
    permissions: ['deployments:read']
  }),

  invalidSignature: () => generateInvalidSignatureJWT({
    sub: 'test-user-123',
    role: 'admin',
    permissions: ['deployments:read']
  }),

  malformed: () => generateMalformedJWT(),

  noPermissions: () => generateTestJWT({
    sub: 'test-user-123',
    role: 'none',
    permissions: []
  }),

  limitedPermissions: () => generateTestJWT({
    sub: 'test-user-123',
    role: 'viewer',
    permissions: ['deployments:read']
  })
};
