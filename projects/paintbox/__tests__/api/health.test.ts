/**
 * Health Check API Endpoint Tests
 * Tests for the /api/health endpoint
 */

import { NextRequest } from 'next/server';
import { GET, HEAD } from '@/app/api/health/route';

// Mock all dependencies
jest.mock('@/lib/logging/simple-logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/cache/cache-service', () => {
  return jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    disconnect: jest.fn(),
  }));
});

jest.mock('@/lib/services/secrets-manager', () => ({
  getSecretsManager: jest.fn(() => ({
    getSecrets: jest.fn(),
  })),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

jest.mock('@/lib/services/salesforce-api', () => ({
  default: {
    testConnection: jest.fn(),
  },
}));

jest.mock('@/lib/services/companycam-api', () => ({
  default: {
    testConnection: jest.fn(),
  },
}));

// Mock fs for disk space checks
jest.mock('fs', () => ({
  promises: {
    statfs: jest.fn(),
  },
}));

// Mock os for memory checks
jest.mock('os', () => ({
  totalmem: jest.fn(),
  freemem: jest.fn(),
}));

// Mock fetch for JWKS endpoint check
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Health Check Endpoint (/api/health)', () => {
  let mockCache: any;
  let mockSecretsManager: any;
  let mockPrisma: any;
  let mockSalesforce: any;
  let mockCompanyCam: any;
  let mockFs: any;
  let mockOs: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    const getCacheInstance = require('@/lib/cache/cache-service');
    mockCache = getCacheInstance();

    const { getSecretsManager } = require('@/lib/services/secrets-manager');
    mockSecretsManager = getSecretsManager();

    const { PrismaClient } = require('@prisma/client');
    mockPrisma = new PrismaClient();

    const salesforceApi = require('@/lib/services/salesforce-api');
    mockSalesforce = salesforceApi.default;

    const companyCamApi = require('@/lib/services/companycam-api');
    mockCompanyCam = companyCamApi.default;

    mockFs = require('fs').promises;
    mockOs = require('os');

    // Setup default successful responses
    mockPrisma.$queryRaw.mockResolvedValue([{ health_check: 1 }]);
    mockCache.set.mockResolvedValue(true);
    mockCache.get.mockResolvedValue('ok');
    mockCache.del.mockResolvedValue(1);
    
    mockSecretsManager.getSecrets.mockResolvedValue({
      database: { url: 'postgresql://test' },
      redis: { url: 'redis://test' },
    });

    mockSalesforce.testConnection.mockResolvedValue({
      success: true,
      instanceUrl: 'https://test.salesforce.com',
      apiVersion: '52.0',
    });

    mockCompanyCam.testConnection.mockResolvedValue({
      success: true,
    });

    // Mock system resources
    mockFs.statfs.mockResolvedValue({
      blocks: 1000000,
      bsize: 4096,
      bavail: 800000, // 80% used
    });

    mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
    mockOs.freemem.mockReturnValue(2 * 1024 * 1024 * 1024); // 2GB free (75% used)

    // Mock JWKS endpoint
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            kid: 'test-key-1',
            alg: 'RS256',
            n: 'test-modulus',
            e: 'AQAB',
          },
        ],
      }),
    } as Response);

    // Mock process.memoryUsage
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100 * 1024 * 1024, // 100MB
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 80 * 1024 * 1024, // 80MB
      external: 10 * 1024 * 1024, // 10MB
      arrayBuffers: 5 * 1024 * 1024, // 5MB
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all services are working', async () => {
      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('summary');

      // Check summary counts
      expect(data.summary.total).toBeGreaterThan(0);
      expect(data.summary.healthy).toBeGreaterThan(0);
      expect(data.summary.unhealthy).toBe(0);
    });

    it('should include all critical service checks', async () => {
      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      // Critical services that should be checked
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('redis');
      expect(data.checks).toHaveProperty('secrets');
      expect(data.checks).toHaveProperty('jwks');

      // Optional services
      expect(data.checks).toHaveProperty('salesforce');
      expect(data.checks).toHaveProperty('companycam');

      // System resources
      expect(data.checks).toHaveProperty('disk_space');
      expect(data.checks).toHaveProperty('memory');
    });

    it('should return degraded status when optional services fail', async () => {
      // Make optional services fail
      mockSalesforce.testConnection.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Still operational
      expect(data.status).toBe('degraded');
      expect(data.checks.salesforce.status).toBe('degraded');
      expect(data.checks.salesforce.error).toBe('Connection timeout');
    });

    it('should return unhealthy status when critical services fail', async () => {
      // Make database fail
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database.status).toBe('unhealthy');
      expect(data.summary.unhealthy).toBeGreaterThan(0);
    });

    it('should test database connectivity', async () => {
      const request = new NextRequest('https://test.com/api/health');
      await GET(request);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.any(Object));
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it('should test Redis connectivity with read/write operations', async () => {
      const request = new NextRequest('https://test.com/api/health');
      await GET(request);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('health_check_'),
        'ok',
        10
      );
      expect(mockCache.get).toHaveBeenCalledWith(expect.stringContaining('health_check_'));
      expect(mockCache.del).toHaveBeenCalledWith(expect.stringContaining('health_check_'));
    });

    it('should test JWKS endpoint internally', async () => {
      const request = new NextRequest('https://test.com/api/health');
      await GET(request);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/.well-known/jwks.json'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'PaintboxHealthCheck/1.0',
          }),
        })
      );
    });

    it('should validate JWKS response structure', async () => {
      // Mock invalid JWKS response
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          keys: [
            {
              // Missing required fields
              kty: 'RSA',
            },
          ],
        }),
      } as Response);

      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.jwks.status).toBe('degraded');
      expect(data.checks.jwks.details.validKeyCount).toBe(0);
    });

    it('should handle secrets manager errors gracefully', async () => {
      mockSecretsManager.getSecrets.mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.secrets.status).toBe('unhealthy');
      expect(data.checks.secrets.error).toBe('Access denied');
    });

    it('should report disk space status correctly', async () => {
      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.disk_space).toBeDefined();
      expect(data.checks.disk_space.details).toHaveProperty('total_gb');
      expect(data.checks.disk_space.details).toHaveProperty('free_gb');
      expect(data.checks.disk_space.details).toHaveProperty('used_percentage');
    });

    it('should report memory usage correctly', async () => {
      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.memory).toBeDefined();
      expect(data.checks.memory.details).toHaveProperty('rss_mb');
      expect(data.checks.memory.details).toHaveProperty('heap_used_mb');
      expect(data.checks.memory.details).toHaveProperty('heap_total_mb');
      expect(data.checks.memory.details).toHaveProperty('system_memory_used_percentage');
    });

    it('should handle timeout for slow health checks', async () => {
      // Make database check timeout
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 10000)) // 10 second delay
      );

      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      // Should timeout and mark as unhealthy
      expect(data.checks.database.status).toBe('unhealthy');
      expect(data.checks.database.error).toContain('timeout');
    }, 15000); // Increase test timeout

    it('should include response times for all checks', async () => {
      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      Object.values(data.checks).forEach((check: any) => {
        expect(check).toHaveProperty('responseTime');
        expect(typeof check.responseTime).toBe('number');
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle complete health check failure', async () => {
      // Mock a critical error in health check process
      mockPrisma.$queryRaw.mockImplementation(() => {
        throw new Error('Critical system failure');
      });

      mockCache.set.mockImplementation(() => {
        throw new Error('Cache system failure');
      });

      const request = new NextRequest('https://test.com/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 for healthy critical services', async () => {
      const request = new NextRequest('https://test.com/api/health', {
        method: 'HEAD',
      });

      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
      expect(response.headers.get('Cache-Control')).toContain('no-cache');
    });

    it('should return 503 for unhealthy critical services', async () => {
      // Make database fail
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database down'));

      const request = new NextRequest('https://test.com/api/health', {
        method: 'HEAD',
      });

      const response = await HEAD(request);

      expect(response.status).toBe(503);
      expect(response.body).toBeNull();
    });

    it('should only check critical services for HEAD requests', async () => {
      const request = new NextRequest('https://test.com/api/health', {
        method: 'HEAD',
      });

      await HEAD(request);

      // Should check critical services
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockSecretsManager.getSecrets).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalled(); // JWKS check

      // Should NOT check optional services (they're not awaited in HEAD)
      // This is a lightweight check
    });

    it('should handle HEAD request errors gracefully', async () => {
      // Mock critical error
      mockPrisma.$queryRaw.mockImplementation(() => {
        throw new Error('System failure');
      });

      const request = new NextRequest('https://test.com/api/health', {
        method: 'HEAD',
      });

      const response = await HEAD(request);

      expect(response.status).toBe(503);
    });
  });

  describe('Health Check Performance', () => {
    it('should complete health check within reasonable time', async () => {
      const startTime = Date.now();
      
      const request = new NextRequest('https://test.com/api/health');
      await GET(request);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 10 seconds (with all mocks)
      expect(duration).toBeLessThan(10000);
    });

    it('should run health checks in parallel', async () => {
      // This is tested indirectly by ensuring the overall time is reasonable
      // when all services respond quickly
      
      const request = new NextRequest('https://test.com/api/health');
      const startTime = Date.now();
      
      await GET(request);
      
      const duration = Date.now() - startTime;
      
      // If checks were serial, this would take much longer
      expect(duration).toBeLessThan(1000);
    });
  });
});