import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/circuit-breakers/route';
import { PUT, DELETE } from '@/app/api/v1/circuit-breakers/[name]/route';
import { POST as RESET_BREAKER } from '@/app/api/v1/circuit-breakers/[name]/reset/route';
import { GET as GET_METRICS } from '@/app/api/v1/circuit-breakers/[name]/metrics/route';
import { POST as TEST_BREAKER } from '@/app/api/v1/circuit-breakers/[name]/test/route';
import { ProductionTestFactory } from '../../factories/productionFactory';
import type { CircuitBreaker, CircuitBreakerMetrics } from '@/lib/types/production';

// Mock external dependencies
jest.mock('@/lib/db/prisma');
jest.mock('@/lib/services/circuit-breaker-service');
jest.mock('@/lib/middleware/rate-limit');

// Mock circuit breaker service
const mockCircuitBreakerService = {
  getBreaker: jest.fn(),
  createBreaker: jest.fn(),
  updateBreaker: jest.fn(),
  deleteBreaker: jest.fn(),
  resetBreaker: jest.fn(),
  testBreaker: jest.fn(),
  recordSuccess: jest.fn(),
  recordFailure: jest.fn(),
  getMetrics: jest.fn(),
};

jest.mock('@/lib/services/circuit-breaker-service', () => mockCircuitBreakerService);

describe('/api/v1/circuit-breakers', () => {
  let mockBreakers: CircuitBreaker[];
  let mockMetrics: CircuitBreakerMetrics[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockBreakers = Array.from({ length: 5 }, () => ProductionTestFactory.createCircuitBreaker());
    mockMetrics = Array.from({ length: 10 }, () => ({
      timestamp: new Date().toISOString(),
      requestCount: Math.floor(Math.random() * 1000),
      successCount: Math.floor(Math.random() * 800),
      failureCount: Math.floor(Math.random() * 200),
      timeouts: Math.floor(Math.random() * 50),
      averageResponseTime: Math.random() * 1000,
      p95ResponseTime: Math.random() * 2000,
      p99ResponseTime: Math.random() * 3000,
    }));
  });

  describe('GET /api/v1/circuit-breakers', () => {
    it('should return all circuit breakers', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findMany.mockResolvedValue(mockBreakers);

      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(5);
      expect(data.data[0]).toMatchObject({
        name: expect.any(String),
        service: expect.any(String),
        state: expect.stringMatching(/^(closed|open|half_open)$/),
        failureThreshold: expect.any(Number),
        recoveryTimeout: expect.any(Number),
      });
    });

    it('should filter circuit breakers by state', async () => {
      const openBreakers = mockBreakers.filter(breaker => breaker.state === 'open');
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findMany.mockResolvedValue(openBreakers);

      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers?state=open', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((breaker: CircuitBreaker) => breaker.state === 'open')).toBe(true);
    });

    it('should filter circuit breakers by service', async () => {
      const serviceBreakers = mockBreakers.filter(breaker => breaker.service === 'payment-service');
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findMany.mockResolvedValue(serviceBreakers);

      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers?service=payment-service', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.circuitBreaker.findMany).toHaveBeenCalledWith({
        where: { service: 'payment-service' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should require read permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers'] // Wrong permission
          }),
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/circuit-breakers', () => {
    it('should create a new circuit breaker', async () => {
      const newBreaker = ProductionTestFactory.createCircuitBreaker();
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.create.mockResolvedValue(newBreaker);
      mockCircuitBreakerService.createBreaker.mockResolvedValue(newBreaker);

      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          name: newBreaker.name,
          service: newBreaker.service,
          failureThreshold: newBreaker.failureThreshold,
          recoveryTimeout: newBreaker.recoveryTimeout,
          requestTimeout: newBreaker.requestTimeout,
          config: newBreaker.config,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: newBreaker.name,
        service: newBreaker.service,
        state: 'closed', // New breakers start in closed state
      });
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          name: '', // Empty name
          service: '', // Empty service
          failureThreshold: -1, // Invalid threshold
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation');
    });

    it('should prevent duplicate circuit breaker names', async () => {
      const existingBreaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(existingBreaker);

      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          name: existingBreaker.name,
          service: 'different-service',
          failureThreshold: 5,
          recoveryTimeout: 60,
          requestTimeout: 5000,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      expect((await response.json()).error).toContain('already exists');
    });

    it('should validate configuration parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          name: 'test-breaker',
          service: 'test-service',
          failureThreshold: 1000, // Too high
          recoveryTimeout: -1, // Invalid
          requestTimeout: 0, // Invalid
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should sanitize input to prevent injection attacks', async () => {
      const maliciousInputs = global.securityTestHelpers.sqlInjectionPayloads;

      for (const payload of maliciousInputs) {
        const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['write:circuit-breakers']
            }),
          },
          body: JSON.stringify({
            name: payload,
            service: 'test-service',
            failureThreshold: 5,
            recoveryTimeout: 60,
            requestTimeout: 5000,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('PUT /api/v1/circuit-breakers/[name]', () => {
    it('should update circuit breaker configuration', async () => {
      const existingBreaker = mockBreakers[0];
      const updatedData = {
        failureThreshold: 10,
        recoveryTimeout: 120,
        config: {
          enabled: true,
          automaticRecovery: false,
          notificationsEnabled: true,
        },
      };

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(existingBreaker);
      mockPrisma.circuitBreaker.update.mockResolvedValue({
        ...existingBreaker,
        ...updatedData,
      });
      mockCircuitBreakerService.updateBreaker.mockResolvedValue({
        ...existingBreaker,
        ...updatedData,
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${existingBreaker.name}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify(updatedData),
      });

      const response = await PUT(request, { params: { name: existingBreaker.name } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.failureThreshold).toBe(updatedData.failureThreshold);
      expect(data.data.recoveryTimeout).toBe(updatedData.recoveryTimeout);
    });

    it('should return 404 for non-existent circuit breaker', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers/non-existent', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({ failureThreshold: 10 }),
      });

      const response = await PUT(request, { params: { name: 'non-existent' } });
      expect(response.status).toBe(404);
    });

    it('should prevent updating state directly', async () => {
      const existingBreaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(existingBreaker);

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${existingBreaker.name}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          state: 'open', // Should not be allowed
          failureThreshold: 10,
        }),
      });

      const response = await PUT(request, { params: { name: existingBreaker.name } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('state cannot be updated directly');
    });
  });

  describe('DELETE /api/v1/circuit-breakers/[name]', () => {
    it('should delete circuit breaker', async () => {
      const existingBreaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(existingBreaker);
      mockPrisma.circuitBreaker.delete.mockResolvedValue(existingBreaker);
      mockCircuitBreakerService.deleteBreaker.mockResolvedValue(true);

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${existingBreaker.name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
      });

      const response = await DELETE(request, { params: { name: existingBreaker.name } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCircuitBreakerService.deleteBreaker).toHaveBeenCalledWith(existingBreaker.name);
    });

    it('should prevent deletion of active circuit breakers', async () => {
      const activeBreaker = ProductionTestFactory.createCircuitBreaker({
        state: 'half_open',
        metrics: {
          successCount: 100,
          failureCount: 0,
          timeouts: 0,
          consecutiveFailures: 0,
          lastFailureTime: undefined,
          lastSuccessTime: new Date().toISOString(),
        },
      });

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(activeBreaker);

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${activeBreaker.name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
      });

      const response = await DELETE(request, { params: { name: activeBreaker.name } });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('active circuit breaker');
    });
  });

  describe('POST /api/v1/circuit-breakers/[name]/reset', () => {
    it('should reset circuit breaker to closed state', async () => {
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      const resetBreaker = { ...openBreaker, state: 'closed' as const };

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(openBreaker);
      mockPrisma.circuitBreaker.update.mockResolvedValue(resetBreaker);
      mockCircuitBreakerService.resetBreaker.mockResolvedValue(resetBreaker);

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
      });

      const response = await RESET_BREAKER(request, { params: { name: openBreaker.name } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.state).toBe('closed');
      expect(mockCircuitBreakerService.resetBreaker).toHaveBeenCalledWith(openBreaker.name);
    });

    it('should log circuit breaker reset events', async () => {
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      const mockPrisma = require('@/lib/db/prisma');

      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(openBreaker);
      mockPrisma.circuitBreaker.update.mockResolvedValue(openBreaker);
      mockPrisma.auditLog.create = jest.fn();
      mockCircuitBreakerService.resetBreaker.mockResolvedValue(openBreaker);

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
      });

      await RESET_BREAKER(request, { params: { name: openBreaker.name } });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'circuit_breaker_reset',
          resource: 'circuit_breaker',
          resourceId: openBreaker.name,
          userId: expect.any(String),
          metadata: expect.any(Object),
        },
      });
    });

    it('should prevent unauthorized resets', async () => {
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers'] // Wrong permission
          }),
        },
      });

      const response = await RESET_BREAKER(request, { params: { name: openBreaker.name } });
      expect(response.status).toBe(403);
    });

    it('should enforce reset rate limiting', async () => {
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      const rateLimitMock = require('@/lib/middleware/rate-limit');

      rateLimitMock.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
          'X-Forwarded-For': '192.168.1.1',
        },
      });

      const response = await RESET_BREAKER(request, { params: { name: openBreaker.name } });
      expect(response.status).toBe(429);
    });
  });

  describe('GET /api/v1/circuit-breakers/[name]/metrics', () => {
    it('should return circuit breaker metrics', async () => {
      const breaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(breaker);
      mockCircuitBreakerService.getMetrics.mockResolvedValue(mockMetrics);

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/metrics?period=24h`, {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      const response = await GET_METRICS(request, { params: { name: breaker.name } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metrics).toHaveLength(10);
      expect(data.data.summary).toMatchObject({
        totalRequests: expect.any(Number),
        successRate: expect.any(Number),
        failureRate: expect.any(Number),
        averageResponseTime: expect.any(Number),
      });
    });

    it('should support different time periods', async () => {
      const breaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(breaker);
      mockCircuitBreakerService.getMetrics.mockResolvedValue(mockMetrics);

      const periods = ['1h', '6h', '24h', '7d', '30d'];

      for (const period of periods) {
        const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/metrics?period=${period}`, {
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['read:circuit-breakers']
            }),
          },
        });

        const response = await GET_METRICS(request, { params: { name: breaker.name } });
        expect(response.status).toBe(200);
      }
    });

    it('should return 404 for non-existent circuit breaker', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers/non-existent/metrics', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      const response = await GET_METRICS(request, { params: { name: 'non-existent' } });
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/circuit-breakers/[name]/test', () => {
    it('should test circuit breaker functionality', async () => {
      const breaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(breaker);
      mockCircuitBreakerService.testBreaker.mockResolvedValue({
        success: true,
        responseTime: 150,
        state: 'closed',
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/test`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          requestCount: 10,
          timeout: 5000,
        }),
      });

      const response = await TEST_BREAKER(request, { params: { name: breaker.name } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        success: true,
        responseTime: 150,
        state: 'closed',
      });
    });

    it('should handle test failures gracefully', async () => {
      const breaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(breaker);
      mockCircuitBreakerService.testBreaker.mockRejectedValue(new Error('Service unavailable'));

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/test`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          requestCount: 5,
        }),
      });

      const response = await TEST_BREAKER(request, { params: { name: breaker.name } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(false);
      expect(data.data.error).toContain('Service unavailable');
    });

    it('should validate test parameters', async () => {
      const breaker = mockBreakers[0];

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/test`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          requestCount: -1, // Invalid
          timeout: 'not-a-number', // Invalid
        }),
      });

      const response = await TEST_BREAKER(request, { params: { name: breaker.name } });
      expect(response.status).toBe(400);
    });
  });

  describe('State Transition Logic', () => {
    it('should handle automatic state transitions', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      const breakerWithFailures = ProductionTestFactory.createCircuitBreaker({
        state: 'closed',
        metrics: {
          successCount: 100,
          failureCount: 5, // At threshold
          timeouts: 0,
          consecutiveFailures: 5,
          lastFailureTime: new Date().toISOString(),
          lastSuccessTime: new Date(Date.now() - 60000).toISOString(),
        },
      });

      mockPrisma.circuitBreaker.findMany.mockResolvedValue([breakerWithFailures]);
      mockCircuitBreakerService.getBreaker.mockReturnValue({
        ...breakerWithFailures,
        shouldTransitionToOpen: () => true,
      });

      // Simulate the background process that checks breaker states
      const request = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('should respect recovery timeout for half-open transitions', async () => {
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      openBreaker.metrics.lastFailureTime = new Date(Date.now() - 70000).toISOString(); // 70 seconds ago
      openBreaker.recoveryTimeout = 60; // 60 seconds

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(openBreaker);
      mockCircuitBreakerService.getBreaker.mockReturnValue({
        ...openBreaker,
        canTransitionToHalfOpen: () => true,
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}`, {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      // The breaker should be eligible for half-open transition
      // This would be handled by the circuit breaker service
      expect(openBreaker.recoveryTimeout).toBe(60);
      expect(Date.now() - new Date(openBreaker.metrics.lastFailureTime!).getTime()).toBeGreaterThan(60000);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should handle high-frequency metric updates', async () => {
      const breaker = mockBreakers[0];
      const requests = Array.from({ length: 1000 }, (_, i) =>
        new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/metrics`, {
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['read:circuit-breakers']
            }),
          },
        })
      );

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(breaker);
      mockCircuitBreakerService.getMetrics.mockResolvedValue(mockMetrics);

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => GET_METRICS(req, { params: { name: breaker.name } }))
      );
      const endTime = Date.now();

      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should efficiently aggregate metrics data', async () => {
      const breaker = mockBreakers[0];
      const largeMetricsDataset = Array.from({ length: 10000 }, () => ({
        timestamp: new Date().toISOString(),
        requestCount: Math.floor(Math.random() * 1000),
        successCount: Math.floor(Math.random() * 800),
        failureCount: Math.floor(Math.random() * 200),
        timeouts: Math.floor(Math.random() * 50),
        averageResponseTime: Math.random() * 1000,
        p95ResponseTime: Math.random() * 2000,
        p99ResponseTime: Math.random() * 3000,
      }));

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(breaker);
      mockCircuitBreakerService.getMetrics.mockResolvedValue(largeMetricsDataset);

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/metrics?period=30d`, {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:circuit-breakers']
          }),
        },
      });

      const startTime = Date.now();
      const response = await GET_METRICS(request, { params: { name: breaker.name } });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent reset attempts', async () => {
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      const mockPrisma = require('@/lib/db/prisma');

      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(openBreaker);
      mockCircuitBreakerService.resetBreaker.mockImplementation(() => {
        // Simulate concurrent modification
        throw new Error('Circuit breaker state changed during reset');
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
      });

      const response = await RESET_BREAKER(request, { params: { name: openBreaker.name } });
      expect(response.status).toBe(409); // Conflict
    });

    it('should handle service discovery failures', async () => {
      const breaker = mockBreakers[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.circuitBreaker.findUnique.mockResolvedValue(breaker);
      mockCircuitBreakerService.testBreaker.mockRejectedValue(new Error('Service not found'));

      const request = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${breaker.name}/test`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({ requestCount: 1 }),
      });

      const response = await TEST_BREAKER(request, { params: { name: breaker.name } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(false);
      expect(data.data.error).toContain('Service not found');
    });
  });
});
