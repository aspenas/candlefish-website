import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { app } from '../../../5470_S_Highline_Circle/backend/test-app';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock JWT secret for testing
const JWT_SECRET = 'test-jwt-secret-key';
const JWT_REFRESH_SECRET = 'test-refresh-secret-key';

// Test user data
const testUsers = {
  admin: {
    id: 'admin-1',
    email: 'admin@test.com',
    password: 'SecureAdmin123!',
    hashedPassword: bcrypt.hashSync('SecureAdmin123!', 10),
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin'],
    isActive: true,
  },
  user: {
    id: 'user-1',
    email: 'user@test.com',
    password: 'SecureUser123!',
    hashedPassword: bcrypt.hashSync('SecureUser123!', 10),
    role: 'user',
    permissions: ['read', 'write'],
    isActive: true,
  },
  viewer: {
    id: 'viewer-1',
    email: 'viewer@test.com',
    password: 'SecureViewer123!',
    hashedPassword: bcrypt.hashSync('SecureViewer123!', 10),
    role: 'viewer',
    permissions: ['read'],
    isActive: true,
  },
  inactive: {
    id: 'inactive-1',
    email: 'inactive@test.com',
    password: 'SecureInactive123!',
    hashedPassword: bcrypt.hashSync('SecureInactive123!', 10),
    role: 'user',
    permissions: ['read'],
    isActive: false,
  },
};

// Helper functions
function generateValidToken(user: typeof testUsers.admin): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    },
    JWT_SECRET
  );
}

function generateExpiredToken(user: typeof testUsers.admin): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000) - (60 * 60 * 2), // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - (60 * 60), // 1 hour ago (expired)
    },
    JWT_SECRET
  );
}

function generateTamperedToken(user: typeof testUsers.admin): string {
  const validToken = generateValidToken(user);
  // Tamper with the token by changing a character
  return validToken.slice(0, -1) + 'X';
}

function generateInvalidSignatureToken(user: typeof testUsers.admin): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
    },
    'wrong-secret'
  );
}

describe('Inventory API Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication Tests', () => {
    describe('JWT Token Validation', () => {
      it('should accept valid JWT token', async () => {
        const token = generateValidToken(testUsers.admin);

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should reject expired JWT token', async () => {
        const expiredToken = generateExpiredToken(testUsers.admin);

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body.error).toContain('expired');
      });

      it('should reject tampered JWT token', async () => {
        const tamperedToken = generateTamperedToken(testUsers.admin);

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(response.body.error).toContain('invalid');
      });

      it('should reject JWT with invalid signature', async () => {
        const invalidToken = generateInvalidSignatureToken(testUsers.admin);

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);

        expect(response.body.error).toContain('invalid');
      });

      it('should reject malformed JWT token', async () => {
        const malformedToken = 'not.a.valid.jwt.token';

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${malformedToken}`)
          .expect(401);

        expect(response.body.error).toContain('invalid');
      });

      it('should reject request without authorization header', async () => {
        const response = await request(app)
          .get('/api/v1/items')
          .expect(401);

        expect(response.body.error).toContain('authorization');
      });

      it('should reject request with malformed authorization header', async () => {
        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', 'InvalidFormat token')
          .expect(401);

        expect(response.body.error).toContain('authorization');
      });
    });

    describe('Token Injection Attacks', () => {
      it('should reject SQL injection in token', async () => {
        const maliciousToken = "'; DROP TABLE users; --";

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${maliciousToken}`)
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should reject XSS attempts in token', async () => {
        const xssToken = '<script>alert("xss")</script>';

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${xssToken}`)
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should handle very long tokens gracefully', async () => {
        const longToken = 'A'.repeat(10000);

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${longToken}`)
          .expect(401);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('User Status Validation', () => {
      it('should reject inactive user', async () => {
        const token = generateValidToken(testUsers.inactive);

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error).toContain('inactive');
      });

      it('should reject user with missing permissions claim', async () => {
        const tokenWithoutPermissions = jwt.sign(
          {
            sub: testUsers.user.id,
            email: testUsers.user.email,
            role: testUsers.user.role,
            // permissions missing
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60),
          },
          JWT_SECRET
        );

        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${tokenWithoutPermissions}`)
          .expect(401);

        expect(response.body.error).toContain('permissions');
      });
    });
  });

  describe('Authorization Tests', () => {
    describe('Role-Based Access Control', () => {
      it('should allow admin to access all endpoints', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        // Test various endpoints
        await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Item',
            category: 'Test',
            sku: 'TEST-001',
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(201);

        await request(app)
          .delete('/api/v1/admin/setup-database')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should allow user to read and write but not admin functions', async () => {
        const userToken = generateValidToken(testUsers.user);

        // Should allow read operations
        await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        // Should allow write operations
        await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: 'User Test Item',
            category: 'Test',
            sku: 'USER-001',
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(201);

        // Should reject admin operations
        await request(app)
          .post('/api/v1/admin/setup-database')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('should allow viewer only read access', async () => {
        const viewerToken = generateValidToken(testUsers.viewer);

        // Should allow read operations
        await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(200);

        // Should reject write operations
        await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            name: 'Viewer Test Item',
            category: 'Test',
            sku: 'VIEWER-001',
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(403);

        // Should reject delete operations
        await request(app)
          .delete('/api/v1/items/item-1')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);
      });
    });

    describe('Resource Ownership', () => {
      it('should allow user to modify their own items', async () => {
        const userToken = generateValidToken(testUsers.user);

        // Create item as user
        const createResponse = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: 'User Owned Item',
            category: 'Test',
            sku: 'OWNED-001',
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(201);

        const itemId = createResponse.body.id;

        // Should allow user to update their item
        await request(app)
          .put(`/api/v1/items/${itemId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'Updated User Item' })
          .expect(200);
      });

      it('should prevent user from modifying items they don\'t own', async () => {
        const user1Token = generateValidToken(testUsers.user);
        const user2Token = generateValidToken({
          ...testUsers.user,
          id: 'user-2',
          email: 'user2@test.com',
        });

        // Create item as user1
        const createResponse = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'User1 Item',
            category: 'Test',
            sku: 'USER1-001',
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(201);

        const itemId = createResponse.body.id;

        // Should prevent user2 from updating user1's item
        await request(app)
          .put(`/api/v1/items/${itemId}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({ name: 'Hacked Item' })
          .expect(403);
      });
    });

    describe('Privilege Escalation Prevention', () => {
      it('should prevent role modification through API', async () => {
        const userToken = generateValidToken(testUsers.user);

        const response = await request(app)
          .put('/api/v1/users/user-1')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'admin' })
          .expect(403);

        expect(response.body.error).toContain('insufficient privileges');
      });

      it('should prevent permission escalation', async () => {
        const userToken = generateValidToken(testUsers.user);

        // Try to access admin-only endpoint
        const response = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.error).toContain('admin');
      });

      it('should validate permission claims in JWT', async () => {
        // Create token with elevated permissions that don't match user's actual role
        const elevatedToken = jwt.sign(
          {
            sub: testUsers.user.id,
            email: testUsers.user.email,
            role: 'user',
            permissions: ['read', 'write', 'delete', 'admin'], // More permissions than user should have
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60),
          },
          JWT_SECRET
        );

        const response = await request(app)
          .post('/api/v1/admin/setup-database')
          .set('Authorization', `Bearer ${elevatedToken}`)
          .expect(403);

        expect(response.body.error).toContain('invalid permissions');
      });
    });
  });

  describe('Input Validation Security', () => {
    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in search queries', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        const maliciousQuery = "'; DROP TABLE inventory_items; --";

        const response = await request(app)
          .get(`/api/v1/search?q=${encodeURIComponent(maliciousQuery)}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Should return empty results, not crash
        expect(response.body).toEqual([]);
      });

      it('should prevent SQL injection in item creation', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        const response = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: "'; DROP TABLE inventory_items; --",
            category: "'; DELETE FROM users; --",
            sku: "'; UPDATE users SET role='admin'; --",
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(400);

        expect(response.body.error).toContain('invalid');
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize script tags in item data', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        const response = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '<script>alert("xss")</script>',
            description: '<img src="x" onerror="alert(1)">',
            category: 'Test',
            sku: 'XSS-001',
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(400);

        expect(response.body.error).toContain('invalid characters');
      });

      it('should encode special characters in output', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        // First create item with special characters
        const createResponse = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test & Co < > " \'',
            description: 'Ampersand & quotes " \'',
            category: 'Test',
            sku: 'SPECIAL-001',
            quantity: 1,
            unitPrice: 100,
            location: 'Test Location',
          })
          .expect(201);

        // Retrieve and verify encoding
        const getResponse = await request(app)
          .get(`/api/v1/items/${createResponse.body.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Should be properly encoded in response
        expect(getResponse.body.name).not.toContain('<script>');
        expect(getResponse.body.name).not.toContain('javascript:');
      });
    });

    describe('Data Validation', () => {
      it('should validate required fields', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        const response = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            // Missing required fields
            description: 'Missing name and other required fields',
          })
          .expect(400);

        expect(response.body.error).toContain('required');
      });

      it('should validate data types', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        const response = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Item',
            category: 'Test',
            sku: 'TYPE-001',
            quantity: 'not-a-number', // Invalid type
            unitPrice: 'also-not-a-number', // Invalid type
            location: 123, // Invalid type
          })
          .expect(400);

        expect(response.body.error).toContain('invalid type');
      });

      it('should validate data ranges', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        const response = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Item',
            category: 'Test',
            sku: 'RANGE-001',
            quantity: -1, // Invalid negative quantity
            unitPrice: -100, // Invalid negative price
            location: 'Test Location',
          })
          .expect(400);

        expect(response.body.error).toContain('range');
      });

      it('should validate string lengths', async () => {
        const adminToken = generateValidToken(testUsers.admin);

        const response = await request(app)
          .post('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'A'.repeat(1000), // Too long
            description: 'B'.repeat(10000), // Too long
            category: 'Test',
            sku: 'C'.repeat(500), // Too long
            quantity: 1,
            unitPrice: 100,
            location: 'D'.repeat(1000), // Too long
          })
          .expect(400);

        expect(response.body.error).toContain('length');
      });
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should rate limit repeated requests', async () => {
      const adminToken = generateValidToken(testUsers.admin);

      // Make many requests rapidly
      const requests = Array(100).fill(null).map(() =>
        request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should rate limit by IP address', async () => {
      const adminToken = generateValidToken(testUsers.admin);

      // Make requests from same IP
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .get('/api/v1/items')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Forwarded-For', '192.168.1.1')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });

    it('should implement exponential backoff for failed authentication', async () => {
      const invalidToken = 'invalid-token';

      // Multiple failed attempts
      const failedAttempts = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const response = await request(app)
          .get('/api/v1/items')
          .set('Authorization', `Bearer ${invalidToken}`);
        const duration = Date.now() - start;

        failedAttempts.push({ response, duration });
      }

      // Later attempts should take longer (rate limited)
      const firstAttempt = failedAttempts[0].duration;
      const lastAttempt = failedAttempts[4].duration;

      expect(lastAttempt).toBeGreaterThan(firstAttempt);
      expect(failedAttempts[4].response.status).toBe(429);
    });
  });

  describe('Session and Token Security', () => {
    it('should invalidate token after password change', async () => {
      const userToken = generateValidToken(testUsers.user);

      // Token should work initially
      await request(app)
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Simulate password change (this would invalidate tokens in real implementation)
      await request(app)
        .put('/api/v1/users/user-1/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          oldPassword: testUsers.user.password,
          newPassword: 'NewSecurePassword123!',
        })
        .expect(200);

      // Token should no longer work
      await request(app)
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);
    });

    it('should prevent token reuse after logout', async () => {
      const userToken = generateValidToken(testUsers.user);

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Token should no longer work
      await request(app)
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);
    });

    it('should have secure token refresh mechanism', async () => {
      const refreshToken = jwt.sign(
        { sub: testUsers.user.id, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();

      // Old refresh token should be invalidated
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose sensitive data in error messages', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      // Should not reveal whether email exists
      expect(response.body.error).not.toContain('user not found');
      expect(response.body.error).not.toContain('email');
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should not expose internal paths in error messages', async () => {
      const adminToken = generateValidToken(testUsers.admin);

      const response = await request(app)
        .get('/api/v1/items/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).not.toContain('/var/');
      expect(response.body.error).not.toContain('C:\\');
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('SQL');
    });

    it('should not include sensitive headers in responses', async () => {
      const adminToken = generateValidToken(testUsers.admin);

      const response = await request(app)
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should not expose server details
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-database-version']).toBeUndefined();

      // Should include security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log authentication attempts', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password,
        });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUTH_ATTEMPT'),
        expect.objectContaining({
          email: testUsers.admin.email,
          success: true,
          timestamp: expect.any(String),
        })
      );

      logSpy.mockRestore();
    });

    it('should log authorization failures', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const viewerToken = generateValidToken(testUsers.viewer);

      await request(app)
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized Item',
          category: 'Test',
          sku: 'UNAUTH-001',
          quantity: 1,
          unitPrice: 100,
          location: 'Test Location',
        })
        .expect(403);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUTHORIZATION_FAILURE'),
        expect.objectContaining({
          userId: testUsers.viewer.id,
          action: 'CREATE_ITEM',
          resource: 'items',
          reason: 'INSUFFICIENT_PERMISSIONS',
        })
      );

      logSpy.mockRestore();
    });

    it('should log sensitive operations', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const adminToken = generateValidToken(testUsers.admin);

      await request(app)
        .delete('/api/v1/items/item-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('SENSITIVE_OPERATION'),
        expect.objectContaining({
          userId: testUsers.admin.id,
          action: 'DELETE_ITEM',
          resourceId: 'item-1',
          timestamp: expect.any(String),
        })
      );

      logSpy.mockRestore();
    });
  });
});
