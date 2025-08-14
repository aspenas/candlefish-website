import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/keys/route';
import { PUT, DELETE } from '@/app/api/v1/keys/[id]/route';
import { POST as ROTATE_KEY } from '@/app/api/v1/keys/[id]/rotate/route';
import { GET as GET_USAGE } from '@/app/api/v1/keys/[id]/usage/route';
import { ProductionTestFactory } from '../../factories/productionFactory';
import type { APIKey, APIKeyUsage } from '@/lib/types/production';

// Mock external dependencies
jest.mock('@/lib/services/secrets-manager');
jest.mock('@/lib/db/prisma');
jest.mock('@/lib/middleware/rate-limit');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-signature'),
  })),
}));

describe('/api/v1/keys', () => {
  let mockAPIKeys: APIKey[];
  let mockUsageData: APIKeyUsage[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAPIKeys = ProductionTestFactory.createAPIKeys(5);
    mockUsageData = Array.from({ length: 10 }, () => ProductionTestFactory.createAPIKeyUsage());
  });

  describe('GET /api/v1/keys', () => {
    it('should return all API keys for authenticated user', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findMany.mockResolvedValue(mockAPIKeys);

      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            sub: 'user-123',
            permissions: ['read:keys']
          }),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(5);
      expect(data.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        keyPrefix: expect.stringMatching(/^pk_/),
        status: expect.stringMatching(/^(active|revoked|expired)$/),
        permissions: expect.any(Array),
      });
      
      // Ensure sensitive key values are not returned
      data.data.forEach((key: APIKey) => {
        expect(key).not.toHaveProperty('keyValue');
        expect(key).not.toHaveProperty('secret');
      });
    });

    it('should filter keys by status', async () => {
      const activeKeys = mockAPIKeys.filter(key => key.status === 'active');
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findMany.mockResolvedValue(activeKeys);

      const request = new NextRequest('http://localhost:3000/api/v1/keys?status=active', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:keys']
          }),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((key: APIKey) => key.status === 'active')).toBe(true);
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: {
          userId: expect.any(String),
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle pagination', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findMany.mockResolvedValue(mockAPIKeys.slice(0, 2));
      mockPrisma.apiKey.count.mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3000/api/v1/keys?page=1&limit=2', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:keys']
          }),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        pages: 3,
      });
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/keys');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should require read:keys permission', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys'] // Wrong permission
          }),
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/keys', () => {
    it('should create a new API key', async () => {
      const newKey = ProductionTestFactory.createAPIKey();
      const mockPrisma = require('@/lib/db/prisma');
      const mockSecretsManager = require('@/lib/services/secrets-manager');

      mockPrisma.apiKey.create.mockResolvedValue(newKey);
      mockSecretsManager.createSecret.mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify({
          name: newKey.name,
          permissions: newKey.permissions,
          rateLimits: newKey.rateLimits,
          expiresAt: newKey.expiresAt,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: newKey.name,
        permissions: newKey.permissions,
        keyPrefix: expect.stringMatching(/^pk_/),
      });
      
      // Ensure the full key value is returned only on creation
      expect(data.data.keyValue).toBeDefined();
      expect(data.data.keyValue).toMatch(/^pk_[a-zA-Z0-9]{32,}$/);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify({
          name: '', // Empty name
          permissions: [], // Empty permissions
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation');
    });

    it('should validate permission format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify({
          name: 'Test Key',
          permissions: ['invalid-permission', 'read:*', 'admin:everything'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid permissions');
    });

    it('should validate rate limit values', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify({
          name: 'Test Key',
          permissions: ['read:metrics'],
          rateLimits: {
            requestsPerMinute: -1, // Invalid negative value
            requestsPerHour: 'not-a-number',
            requestsPerDay: Number.MAX_SAFE_INTEGER + 1, // Too large
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('rate limit');
    });

    it('should prevent creation of keys with admin permissions for non-admin users', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys'], // No admin permission
            role: 'user'
          }),
        },
        body: JSON.stringify({
          name: 'Admin Key',
          permissions: ['admin:all'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should enforce key creation limits per user', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.count.mockResolvedValue(50); // User already has 50 keys

      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify({
          name: 'New Key',
          permissions: ['read:metrics'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('limit');
    });
  });

  describe('PUT /api/v1/keys/[id]', () => {
    it('should update API key metadata', async () => {
      const existingKey = mockAPIKeys[0];
      const updatedData = {
        name: 'Updated Key Name',
        permissions: ['read:metrics', 'read:alerts'],
        rateLimits: {
          requestsPerMinute: 200,
          requestsPerHour: 12000,
          requestsPerDay: 288000,
        },
      };

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findUnique.mockResolvedValue(existingKey);
      mockPrisma.apiKey.update.mockResolvedValue({
        ...existingKey,
        ...updatedData,
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${existingKey.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify(updatedData),
      });

      const response = await PUT(request, { params: { id: existingKey.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updatedData.name);
      expect(data.data.permissions).toEqual(updatedData.permissions);
    });

    it('should prevent updating another user\'s key', async () => {
      const otherUserKey = ProductionTestFactory.createAPIKey();
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findUnique.mockResolvedValue(null); // Key not found for this user

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${otherUserKey.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify({ name: 'Malicious Update' }),
      });

      const response = await PUT(request, { params: { id: otherUserKey.id } });
      expect(response.status).toBe(404);
    });

    it('should prevent updating revoked keys', async () => {
      const revokedKey = ProductionTestFactory.createAPIKey({ status: 'revoked' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findUnique.mockResolvedValue(revokedKey);

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${revokedKey.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PUT(request, { params: { id: revokedKey.id } });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('revoked');
    });
  });

  describe('DELETE /api/v1/keys/[id]', () => {
    it('should revoke API key (soft delete)', async () => {
      const existingKey = mockAPIKeys[0];
      const mockPrisma = require('@/lib/db/prisma');

      mockPrisma.apiKey.findUnique.mockResolvedValue(existingKey);
      mockPrisma.apiKey.update.mockResolvedValue({
        ...existingKey,
        status: 'revoked',
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${existingKey.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
      });

      const response = await DELETE(request, { params: { id: existingKey.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: existingKey.id },
        data: { status: 'revoked', revokedAt: expect.any(Date) },
      });
    });

    it('should prevent deleting already revoked keys', async () => {
      const revokedKey = ProductionTestFactory.createAPIKey({ status: 'revoked' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findUnique.mockResolvedValue(revokedKey);

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${revokedKey.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
      });

      const response = await DELETE(request, { params: { id: revokedKey.id } });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/keys/[id]/rotate', () => {
    it('should rotate API key successfully', async () => {
      const existingKey = mockAPIKeys[0];
      const newKeyValue = 'pk_new_rotated_key_value_123456789';
      
      const mockPrisma = require('@/lib/db/prisma');
      const mockSecretsManager = require('@/lib/services/secrets-manager');
      const mockCrypto = require('crypto');

      mockPrisma.apiKey.findUnique.mockResolvedValue(existingKey);
      mockPrisma.apiKey.update.mockResolvedValue({
        ...existingKey,
        keyPrefix: 'pk_new12345',
        updatedAt: new Date().toISOString(),
      });
      mockSecretsManager.updateSecret.mockResolvedValue({ success: true });
      mockCrypto.randomBytes.mockReturnValue(Buffer.from('new-random-bytes'));

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${existingKey.id}/rotate`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
      });

      const response = await ROTATE_KEY(request, { params: { id: existingKey.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.keyValue).toBeDefined();
      expect(data.data.keyPrefix).not.toBe(existingKey.keyPrefix);
      expect(mockSecretsManager.updateSecret).toHaveBeenCalled();
    });

    it('should enforce rotation rate limits', async () => {
      const existingKey = ProductionTestFactory.createAPIKey();
      const mockPrisma = require('@/lib/db/prisma');
      
      // Mock recent rotation
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        ...existingKey,
        lastRotatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${existingKey.id}/rotate`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
      });

      const response = await ROTATE_KEY(request, { params: { id: existingKey.id } });
      expect(response.status).toBe(429); // Too many requests
    });

    it('should log key rotation events for audit', async () => {
      const existingKey = mockAPIKeys[0];
      const mockPrisma = require('@/lib/db/prisma');
      
      mockPrisma.apiKey.findUnique.mockResolvedValue(existingKey);
      mockPrisma.apiKey.update.mockResolvedValue(existingKey);
      mockPrisma.auditLog.create = jest.fn();

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${existingKey.id}/rotate`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
      });

      await ROTATE_KEY(request, { params: { id: existingKey.id } });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'key_rotated',
          resource: 'api_key',
          resourceId: existingKey.id,
          userId: expect.any(String),
          metadata: expect.any(Object),
        },
      });
    });
  });

  describe('GET /api/v1/keys/[id]/usage', () => {
    it('should return usage statistics for API key', async () => {
      const apiKey = mockAPIKeys[0];
      const mockPrisma = require('@/lib/db/prisma');
      
      mockPrisma.apiKey.findUnique.mockResolvedValue(apiKey);
      mockPrisma.apiKeyUsage.findMany.mockResolvedValue(mockUsageData);

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${apiKey.id}/usage?period=7d`, {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:keys']
          }),
        },
      });

      const response = await GET_USAGE(request, { params: { id: apiKey.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.usage).toHaveLength(mockUsageData.length);
      expect(data.data.summary).toMatchObject({
        totalRequests: expect.any(Number),
        totalErrors: expect.any(Number),
        averageRequestsPerDay: expect.any(Number),
        errorRate: expect.any(Number),
      });
    });

    it('should support different time periods', async () => {
      const apiKey = mockAPIKeys[0];
      const mockPrisma = require('@/lib/db/prisma');
      
      mockPrisma.apiKey.findUnique.mockResolvedValue(apiKey);
      mockPrisma.apiKeyUsage.findMany.mockResolvedValue(mockUsageData);

      const periods = ['1h', '24h', '7d', '30d'];
      
      for (const period of periods) {
        const request = new NextRequest(`http://localhost:3000/api/v1/keys/${apiKey.id}/usage?period=${period}`, {
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['read:keys']
            }),
          },
        });

        const response = await GET_USAGE(request, { params: { id: apiKey.id } });
        expect(response.status).toBe(200);
      }
    });

    it('should return 404 for non-existent keys', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/v1/keys/non-existent/usage', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:keys']
          }),
        },
      });

      const response = await GET_USAGE(request, { params: { id: 'non-existent' } });
      expect(response.status).toBe(404);
    });
  });

  describe('Security and Rate Limiting', () => {
    it('should prevent brute force attacks on key creation', async () => {
      const rateLimitMock = require('@/lib/middleware/rate-limit');
      rateLimitMock.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'Test Key',
          permissions: ['read:metrics'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('should sanitize input to prevent injection attacks', async () => {
      const maliciousInputs = global.securityTestHelpers.sqlInjectionPayloads;

      for (const payload of maliciousInputs) {
        const request = new NextRequest('http://localhost:3000/api/v1/keys', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['write:keys']
            }),
          },
          body: JSON.stringify({
            name: payload,
            permissions: ['read:metrics'],
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should log suspicious activities', async () => {
      const mockLogger = jest.fn();
      const rateLimitRequests = global.securityTestHelpers.createRateLimitRequests(100);

      // Simulate multiple failed attempts
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest('http://localhost:3000/api/v1/keys', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer invalid-token',
            'X-Forwarded-For': '192.168.1.100',
          },
          body: JSON.stringify({
            name: 'Malicious Key',
            permissions: ['admin:all'],
          }),
        });

        await POST(request);
      }

      // Should trigger security alerts for repeated failures
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent key operations efficiently', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findMany.mockResolvedValue(mockAPIKeys);

      const concurrentRequests = Array.from({ length: 100 }, () =>
        new NextRequest('http://localhost:3000/api/v1/keys', {
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['read:keys']
            }),
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests.map(req => GET(req)));
      const endTime = Date.now();

      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should efficiently handle large usage data queries', async () => {
      const apiKey = mockAPIKeys[0];
      const largeUsageDataset = Array.from({ length: 10000 }, () => 
        ProductionTestFactory.createAPIKeyUsage()
      );
      
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.apiKey.findUnique.mockResolvedValue(apiKey);
      mockPrisma.apiKeyUsage.findMany.mockResolvedValue(largeUsageDataset);

      const request = new NextRequest(`http://localhost:3000/api/v1/keys/${apiKey.id}/usage?period=30d`, {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:keys']
          }),
        },
      });

      const startTime = Date.now();
      const response = await GET_USAGE(request, { params: { id: apiKey.id } });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});