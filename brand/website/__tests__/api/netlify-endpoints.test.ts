// Comprehensive unit tests for Netlify API endpoints

import { NextRequest } from 'next/server';
import { GET as extensionsGet } from '../../app/api/extensions/route';
import { GET as sitesGet } from '../../app/api/sites/route';
import { GET as siteExtensionsGet, POST as siteExtensionsPost, DELETE as siteExtensionsDelete } from '../../app/api/sites/[siteId]/extensions/route';
import { POST as bulkDeployPost } from '../../app/api/bulk/deploy/route';
import { GET as extensionMetricsGet } from '../../app/api/metrics/extensions/[id]/route';
import { GET as healthSitesGet } from '../../app/api/health/sites/route';
import { POST as netlifyWebhookPost } from '../../app/api/netlify/webhook/route';

import {
  mockCandlefishSites,
  mockExtensionsByCategory,
  createBulkOperationData,
  assertionHelpers
} from '../factories/netlify-factory';

// Mock console methods to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Netlify API Endpoints', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('GET /api/extensions', () => {
    it('should return all extensions', async () => {
      const request = new NextRequest('http://localhost/api/extensions');
      const response = await extensionsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      assertionHelpers.expectValidApiResponse(data);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('extensions');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('categories');
      expect(Array.isArray(data.data.extensions)).toBe(true);

      // Validate extension structure
      if (data.data.extensions.length > 0) {
        assertionHelpers.expectValidExtension(data.data.extensions[0]);
      }
    });

    it('should filter extensions by category', async () => {
      const request = new NextRequest('http://localhost/api/extensions?category=performance');
      const response = await extensionsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // All returned extensions should be performance category
      data.data.extensions.forEach((ext: any) => {
        expect(ext.category).toBe('performance');
      });
    });

    it('should filter extensions by search query', async () => {
      const request = new NextRequest('http://localhost/api/extensions?search=cache');
      const response = await extensionsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // All returned extensions should match search term
      data.data.extensions.forEach((ext: any) => {
        expect(
          ext.name.toLowerCase().includes('cache') ||
          ext.description.toLowerCase().includes('cache')
        ).toBe(true);
      });
    });

    it('should handle combined filters', async () => {
      const request = new NextRequest('http://localhost/api/extensions?category=security&search=headers');
      const response = await extensionsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/sites', () => {
    it('should return all sites', async () => {
      const request = new NextRequest('http://localhost/api/sites');
      const response = await sitesGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data.sites).toHaveLength(mockCandlefishSites.length);

      // Validate site structure
      data.data.sites.forEach((site: any) => {
        expect(site).toHaveProperty('id');
        expect(site).toHaveProperty('name');
        expect(site).toHaveProperty('url');
        expect(site).toHaveProperty('status');
      });
    });

    it('should filter sites by status', async () => {
      const request = new NextRequest('http://localhost/api/sites?status=active');
      const response = await sitesGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.sites.forEach((site: any) => {
        expect(site.status).toBe('active');
      });
    });
  });

  describe('GET /api/sites/[siteId]/extensions', () => {
    it('should return site extensions', async () => {
      const siteId = mockCandlefishSites[0].id;
      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions`);
      const response = await siteExtensionsGet(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data).toHaveProperty('siteId', siteId);
      expect(data.data).toHaveProperty('extensions');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('performance');

      // Validate extensions have isEnabled property
      data.data.extensions.forEach((ext: any) => {
        expect(ext).toHaveProperty('isEnabled');
        expect(typeof ext.isEnabled).toBe('boolean');
      });
    });

    it('should return 404 for non-existent site', async () => {
      const siteId = 'non-existent-site';
      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions`);
      const response = await siteExtensionsGet(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Site not found');
    });
  });

  describe('POST /api/sites/[siteId]/extensions', () => {
    it('should enable extension successfully', async () => {
      const siteId = mockCandlefishSites[0].id;
      const extensionId = Object.values(mockExtensionsByCategory).flat()[0].id;

      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions`, {
        method: 'POST',
        body: JSON.stringify({ extensionId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await siteExtensionsPost(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data.isEnabled).toBe(true);
      expect(data.data.id).toBe(extensionId);
    });

    it('should return 400 for missing extensionId', async () => {
      const siteId = mockCandlefishSites[0].id;

      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await siteExtensionsPost(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent site', async () => {
      const siteId = 'non-existent-site';
      const extensionId = Object.values(mockExtensionsByCategory).flat()[0].id;

      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions`, {
        method: 'POST',
        body: JSON.stringify({ extensionId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await siteExtensionsPost(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent extension', async () => {
      const siteId = mockCandlefishSites[0].id;
      const extensionId = 'non-existent-extension';

      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions`, {
        method: 'POST',
        body: JSON.stringify({ extensionId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await siteExtensionsPost(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should handle rate limiting', async () => {
      const siteId = mockCandlefishSites[0].id;
      const extensionId = Object.values(mockExtensionsByCategory).flat()[0].id;

      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions`, {
        method: 'POST',
        body: JSON.stringify({ extensionId }),
        headers: {
          'Content-Type': 'application/json',
          'x-test-rate-limit': 'true'
        }
      });

      const response = await siteExtensionsPost(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
      expect(data.details).toHaveProperty('retryAfter');
    });
  });

  describe('DELETE /api/sites/[siteId]/extensions/[extensionId]', () => {
    it('should disable extension successfully', async () => {
      const siteId = mockCandlefishSites[0].id;
      const extensionId = Object.values(mockExtensionsByCategory).flat()[0].id;

      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions/${extensionId}`, {
        method: 'DELETE'
      });

      const response = await siteExtensionsDelete(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data).toBeNull();
    });

    it('should return 404 for non-existent site', async () => {
      const siteId = 'non-existent-site';
      const extensionId = Object.values(mockExtensionsByCategory).flat()[0].id;

      const request = new NextRequest(`http://localhost/api/sites/${siteId}/extensions/${extensionId}`, {
        method: 'DELETE'
      });

      const response = await siteExtensionsDelete(request, { params: { siteId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/bulk/deploy', () => {
    it('should process bulk operations successfully', async () => {
      const { operations } = createBulkOperationData();

      const request = new NextRequest('http://localhost/api/bulk/deploy', {
        method: 'POST',
        body: JSON.stringify({ operations }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await bulkDeployPost(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status for bulk operations
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data).toHaveProperty('summary');
      expect(data.data).toHaveProperty('successful');
      expect(data.data).toHaveProperty('failed');
      expect(data.data.summary.total).toBe(operations.length);
    });

    it('should validate operations array', async () => {
      const request = new NextRequest('http://localhost/api/bulk/deploy', {
        method: 'POST',
        body: JSON.stringify({ operations: [] }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await bulkDeployPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle rate limiting for large batches', async () => {
      const largeOperationsBatch = Array.from({ length: 15 }, (_, i) => ({
        siteId: mockCandlefishSites[0].id,
        extensionId: Object.values(mockExtensionsByCategory).flat()[i % 5].id,
        action: 'enable' as const
      }));

      const request = new NextRequest('http://localhost/api/bulk/deploy', {
        method: 'POST',
        body: JSON.stringify({ operations: largeOperationsBatch }),
        headers: {
          'Content-Type': 'application/json',
          'x-test-rate-limit': 'true'
        }
      });

      const response = await bulkDeployPost(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
      expect(data.details).toHaveProperty('maxBatchSize');
    });

    it('should handle validation errors in operations', async () => {
      const invalidOperations = [
        { siteId: '', extensionId: 'test', action: 'enable' },
        { siteId: 'test', extensionId: '', action: 'disable' },
        { siteId: 'test', extensionId: 'test', action: 'invalid' }
      ];

      const request = new NextRequest('http://localhost/api/bulk/deploy', {
        method: 'POST',
        body: JSON.stringify({ operations: invalidOperations }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await bulkDeployPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details.errors).toBeDefined();
      expect(data.details.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/metrics/extensions/[id]', () => {
    it('should return extension metrics', async () => {
      const extensionId = Object.values(mockExtensionsByCategory).flat()[0].id;
      const siteId = mockCandlefishSites[0].id;

      const request = new NextRequest(`http://localhost/api/metrics/extensions/${extensionId}?siteId=${siteId}&timeRange=24h`);
      const response = await extensionMetricsGet(request, { params: { id: extensionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data).toHaveProperty('extension');
      expect(data.data).toHaveProperty('metrics');
      expect(data.data).toHaveProperty('analysis');
      expect(data.data.metrics).toHaveProperty('current');
      expect(data.data.metrics).toHaveProperty('timeSeries');
      expect(data.data.metrics).toHaveProperty('usage');
      expect(data.data.metrics).toHaveProperty('regional');
    });

    it('should return 404 for non-existent extension', async () => {
      const extensionId = 'non-existent-extension';

      const request = new NextRequest(`http://localhost/api/metrics/extensions/${extensionId}`);
      const response = await extensionMetricsGet(request, { params: { id: extensionId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should handle different time ranges', async () => {
      const extensionId = Object.values(mockExtensionsByCategory).flat()[0].id;
      const timeRanges = ['1h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        const request = new NextRequest(`http://localhost/api/metrics/extensions/${extensionId}?timeRange=${timeRange}`);
        const response = await extensionMetricsGet(request, { params: { id: extensionId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.timeRange).toBe(timeRange);
      }
    });
  });

  describe('GET /api/health/sites', () => {
    it('should return health status for all sites', async () => {
      const request = new NextRequest('http://localhost/api/health/sites');
      const response = await healthSitesGet(request);
      const data = await response.json();

      expect([200, 207, 503]).toContain(response.status); // Different status codes based on health
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data).toHaveProperty('overview');
      expect(data.data).toHaveProperty('sites');
      expect(data.data.overview).toHaveProperty('totalSites');
      expect(data.data.overview).toHaveProperty('healthySites');
      expect(Array.isArray(data.data.sites)).toBe(true);
    });

    it('should return detailed health information', async () => {
      const request = new NextRequest('http://localhost/api/health/sites?details=true');
      const response = await healthSitesGet(request);
      const data = await response.json();

      expect([200, 207, 503]).toContain(response.status);

      // Detailed response should include full site health data
      if (data.data.sites.length > 0) {
        const site = data.data.sites[0];
        expect(site).toHaveProperty('siteId');
        expect(site).toHaveProperty('status');
        expect(site).toHaveProperty('issues');
        expect(site).toHaveProperty('metrics');
      }
    });

    it('should filter by status', async () => {
      const request = new NextRequest('http://localhost/api/health/sites?status=healthy');
      const response = await healthSitesGet(request);
      const data = await response.json();

      expect([200, 207, 503]).toContain(response.status);
      data.data.sites.forEach((site: any) => {
        expect(site.status).toBe('healthy');
      });
    });
  });

  describe('POST /api/netlify/webhook', () => {
    const validWebhookPayload = {
      id: 'deploy-123',
      site_id: mockCandlefishSites[0].id,
      build_id: 'build-123',
      state: 'ready' as const,
      name: 'Test Deploy',
      url: 'https://test.netlify.app',
      ssl_url: 'https://test.netlify.app',
      admin_url: 'https://app.netlify.com/sites/test',
      deploy_url: 'https://deploy-123.netlify.app',
      deploy_ssl_url: 'https://deploy-123.netlify.app',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-20T10:05:00Z',
      user_id: 'user-123',
      branch: 'main',
      context: 'production',
      deploy_time: 45000
    };

    it('should process webhook for successful deployment', async () => {
      const request = new NextRequest('http://localhost/api/netlify/webhook', {
        method: 'POST',
        body: JSON.stringify(validWebhookPayload),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await netlifyWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      assertionHelpers.expectValidApiResponse(data);
      expect(data.data).toHaveProperty('eventType', 'deployment.complete');
      expect(data.data).toHaveProperty('processed', true);
    });

    it('should process webhook for failed deployment', async () => {
      const failedPayload = {
        ...validWebhookPayload,
        state: 'error' as const,
        error_message: 'Build failed'
      };

      const request = new NextRequest('http://localhost/api/netlify/webhook', {
        method: 'POST',
        body: JSON.stringify(failedPayload),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await netlifyWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.eventType).toBe('deployment.failed');
    });

    it('should process webhook for building deployment', async () => {
      const buildingPayload = {
        ...validWebhookPayload,
        state: 'building' as const
      };

      const request = new NextRequest('http://localhost/api/netlify/webhook', {
        method: 'POST',
        body: JSON.stringify(buildingPayload),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await netlifyWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.eventType).toBe('deployment.started');
    });

    it('should validate required webhook fields', async () => {
      const invalidPayload = {
        id: 'deploy-123',
        // Missing site_id and state
        name: 'Test Deploy'
      };

      const request = new NextRequest('http://localhost/api/netlify/webhook', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await netlifyWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toHaveProperty('required');
    });

    it('should handle webhook signature verification', async () => {
      // Mock environment variable
      const originalEnv = process.env.NETLIFY_WEBHOOK_SECRET;
      process.env.NETLIFY_WEBHOOK_SECRET = 'test-secret';

      const request = new NextRequest('http://localhost/api/netlify/webhook', {
        method: 'POST',
        body: JSON.stringify(validWebhookPayload),
        headers: { 'Content-Type': 'application/json' }
        // Missing x-netlify-webhook-signature header
      });

      const response = await netlifyWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');

      // Restore environment
      if (originalEnv) {
        process.env.NETLIFY_WEBHOOK_SECRET = originalEnv;
      } else {
        delete process.env.NETLIFY_WEBHOOK_SECRET;
      }
    });

    it('should handle processing errors gracefully', async () => {
      // Create a payload that will cause an error during processing
      const request = new NextRequest('http://localhost/api/netlify/webhook', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await netlifyWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Returns 200 to prevent Netlify retries
      expect(data.success).toBe(false);
      expect(data.code).toBe('PROCESSING_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors consistently', async () => {
      const endpoints = [
        { path: '/api/sites/test-site/extensions', method: 'POST' },
        { path: '/api/bulk/deploy', method: 'POST' },
        { path: '/api/netlify/webhook', method: 'POST' }
      ];

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost${endpoint.path}`, {
          method: endpoint.method,
          body: 'invalid-json',
          headers: { 'Content-Type': 'application/json' }
        });

        let response;
        if (endpoint.path.includes('bulk/deploy')) {
          response = await bulkDeployPost(request);
        } else if (endpoint.path.includes('webhook')) {
          response = await netlifyWebhookPost(request);
        } else {
          response = await siteExtensionsPost(request, { params: { siteId: 'test-site' } });
        }

        expect([400, 200, 500]).toContain(response.status);
        const data = await response.json();
        expect(data.success).toBe(false);
      }
    });
  });
});
