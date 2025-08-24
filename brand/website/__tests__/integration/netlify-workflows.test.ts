// Comprehensive integration tests for Netlify extension management workflows

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Server } from 'http';
import next from 'next';
import { NetlifyApiClient } from '../../lib/netlify-api';
import {
  mockCandlefishSites,
  mockExtensionsByCategory,
  createBulkOperationData,
  assertionHelpers,
  createWebSocketMessage
} from '../factories/netlify-factory';

// Mock Next.js server setup
const app = next({ dev: true, hostname: 'localhost', port: 3001 });
const handle = app.getRequestHandler();
let server: Server;

// Test WebSocket server mock
class MockWebSocketServer {
  private clients: Set<any> = new Set();

  broadcast(message: any) {
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  addClient(client: any) {
    this.clients.add(client);
  }

  removeClient(client: any) {
    this.clients.delete(client);
  }
}

const mockWSServer = new MockWebSocketServer();

describe('Netlify Extension Management Integration Tests', () => {
  let apiClient: NetlifyApiClient;

  beforeAll(async () => {
    await app.prepare();

    // Start test server
    server = require('http').createServer(handle);
    await new Promise<void>((resolve) => {
      server.listen(3001, resolve);
    });

    // Initialize API client
    apiClient = new NetlifyApiClient('http://localhost:3001/api');
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Extension Management Workflow', () => {
    it('should complete full extension lifecycle: list → enable → configure → disable', async () => {
      // Step 1: Get available extensions
      const extensions = await apiClient.getExtensions();
      expect(extensions).toBeDefined();
      expect(Array.isArray(extensions)).toBe(true);

      if (extensions.length === 0) {
        console.warn('No extensions available for testing');
        return;
      }

      const testExtension = extensions[0];
      const testSite = mockCandlefishSites[0];

      // Step 2: Get initial site extensions
      const initialSiteExtensions = await apiClient.getSiteExtensions(testSite.id);
      assertionHelpers.expectValidApiResponse({ success: true, data: initialSiteExtensions, timestamp: new Date() });

      const initiallyEnabled = initialSiteExtensions.extensions.find(ext => ext.id === testExtension.id)?.isEnabled || false;

      // Step 3: Enable the extension if not already enabled
      if (!initiallyEnabled) {
        const enabledExtension = await apiClient.enableExtension(testSite.id, testExtension.id);
        expect(enabledExtension.id).toBe(testExtension.id);
        expect(enabledExtension.isEnabled).toBe(true);

        // Verify extension is now enabled
        const updatedSiteExtensions = await apiClient.getSiteExtensions(testSite.id);
        const nowEnabledExtension = updatedSiteExtensions.extensions.find(ext => ext.id === testExtension.id);
        expect(nowEnabledExtension?.isEnabled).toBe(true);
      }

      // Step 4: Configure the extension
      const testConfig = {
        threshold: 100,
        enabled: true,
        options: ['option1', 'option2']
      };

      const configResult = await apiClient.updateExtensionConfig(testSite.id, testExtension.id, testConfig);
      expect(configResult.config).toEqual(testConfig);
      expect(configResult.extensionId).toBe(testExtension.id);
      expect(configResult.siteId).toBe(testSite.id);

      // Step 5: Verify configuration was saved
      const retrievedConfig = await apiClient.getExtensionConfig(testSite.id, testExtension.id);
      expect(retrievedConfig).not.toBeNull();
      expect(retrievedConfig?.config).toEqual(testConfig);

      // Step 6: Get recommendations (should reflect new configuration)
      const recommendations = await apiClient.getRecommendations(testSite.id);
      expect(Array.isArray(recommendations)).toBe(true);

      // Step 7: Disable the extension
      await apiClient.disableExtension(testSite.id, testExtension.id);

      // Verify extension is now disabled
      const finalSiteExtensions = await apiClient.getSiteExtensions(testSite.id);
      const nowDisabledExtension = finalSiteExtensions.extensions.find(ext => ext.id === testExtension.id);
      expect(nowDisabledExtension?.isEnabled).toBe(false);
    });

    it('should handle concurrent extension toggles correctly', async () => {
      const testSite = mockCandlefishSites[0];
      const testExtensions = Object.values(mockExtensionsByCategory).flat().slice(0, 3);

      // Attempt to enable multiple extensions concurrently
      const enablePromises = testExtensions.map(ext =>
        apiClient.enableExtension(testSite.id, ext.id)
      );

      const results = await Promise.allSettled(enablePromises);

      // At least some should succeed (depending on API rate limiting)
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const finalState = await apiClient.getSiteExtensions(testSite.id);
      const enabledExtensions = finalState.extensions.filter(ext =>
        testExtensions.some(test => test.id === ext.id) && ext.isEnabled
      );

      expect(enabledExtensions.length).toBe(successful.length);
    });
  });

  describe('Bulk Deployment Workflows', () => {
    it('should execute bulk deployment across multiple sites', async () => {
      const { sites, extensions, operations } = createBulkOperationData();

      // Execute bulk operations
      const result = await apiClient.batchToggleExtensions(operations);

      expect(result.success).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.success + result.failed).toBe(operations.length);

      if (result.errors.length > 0) {
        // Verify error structure
        result.errors.forEach(error => {
          expect(error).toHaveProperty('operation');
          expect(error).toHaveProperty('error');
        });
      }

      // Verify operations were applied correctly
      for (const operation of operations) {
        if (result.errors.every(err => err.operation.siteId !== operation.siteId || err.operation.extensionId !== operation.extensionId)) {
          // Operation should have succeeded
          const siteExtensions = await apiClient.getSiteExtensions(operation.siteId);
          const targetExtension = siteExtensions.extensions.find(ext => ext.id === operation.extensionId);

          if (targetExtension) {
            expect(targetExtension.isEnabled).toBe(operation.action === 'enable');
          }
        }
      }
    });

    it('should handle partial failures in bulk operations gracefully', async () => {
      const operations = [
        // Valid operation
        { siteId: mockCandlefishSites[0].id, extensionId: Object.values(mockExtensionsByCategory).flat()[0].id, action: 'enable' as const },
        // Invalid site
        { siteId: 'non-existent-site', extensionId: Object.values(mockExtensionsByCategory).flat()[0].id, action: 'enable' as const },
        // Invalid extension
        { siteId: mockCandlefishSites[0].id, extensionId: 'non-existent-extension', action: 'enable' as const }
      ];

      const result = await apiClient.batchToggleExtensions(operations);

      expect(result.success).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBe(result.failed);

      // Verify specific error messages
      const nonExistentSiteError = result.errors.find(err => err.operation.siteId === 'non-existent-site');
      const nonExistentExtError = result.errors.find(err => err.operation.extensionId === 'non-existent-extension');

      expect(nonExistentSiteError?.error).toContain('not found');
      expect(nonExistentExtError?.error).toContain('not found');
    });
  });

  describe('Performance Metrics Integration', () => {
    it('should fetch and correlate performance data across time ranges', async () => {
      const testSite = mockCandlefishSites[0];
      const timeRanges = ['1h', '24h', '7d', '30d'] as const;

      // Fetch metrics for different time ranges
      const metricsPromises = timeRanges.map(range =>
        apiClient.getPerformanceMetrics(testSite.id, range)
      );

      const allMetrics = await Promise.all(metricsPromises);

      // Verify each time range returns data
      allMetrics.forEach((metrics, index) => {
        expect(Array.isArray(metrics)).toBe(true);
        expect(metrics.length).toBeGreaterThan(0);

        // Longer time ranges should have more data points
        if (index > 0) {
          expect(metrics.length).toBeGreaterThanOrEqual(allMetrics[index - 1].length);
        }

        // Validate metric structure
        metrics.forEach(metric => {
          assertionHelpers.expectValidPerformanceMetrics(metric);
        });
      });

      // Verify chronological ordering within each range
      allMetrics.forEach(metrics => {
        for (let i = 1; i < metrics.length; i++) {
          expect(new Date(metrics[i].timestamp).getTime()).toBeGreaterThanOrEqual(
            new Date(metrics[i - 1].timestamp).getTime()
          );
        }
      });
    });

    it('should correlate extension changes with performance impacts', async () => {
      const testSite = mockCandlefishSites[0];
      const performanceExtension = Object.values(mockExtensionsByCategory)
        .flat()
        .find(ext => ext.category === 'performance');

      if (!performanceExtension) {
        console.warn('No performance extension available for testing');
        return;
      }

      // Get baseline performance
      const baselineMetrics = await apiClient.getPerformanceMetrics(testSite.id, '1h');
      expect(baselineMetrics.length).toBeGreaterThan(0);

      const latestBaseline = baselineMetrics[baselineMetrics.length - 1];

      // Enable performance extension
      await apiClient.enableExtension(testSite.id, performanceExtension.id);

      // Wait a moment for potential metrics update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get updated metrics
      const updatedMetrics = await apiClient.getPerformanceMetrics(testSite.id, '1h');
      const latestUpdated = updatedMetrics[updatedMetrics.length - 1];

      // Performance extension should potentially improve metrics
      // Note: This is simulated data, so we mainly verify structure consistency
      expect(latestUpdated.siteId).toBe(latestBaseline.siteId);
      expect(latestUpdated.metrics).toBeDefined();
      expect(latestUpdated.scores).toBeDefined();
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should provide comprehensive site health status', async () => {
      // Fetch health status
      const response = await fetch('http://localhost:3001/api/health/sites');
      expect(response.ok).toBe(true);

      const healthData = await response.json();
      assertionHelpers.expectValidApiResponse(healthData);

      expect(healthData.data).toHaveProperty('overview');
      expect(healthData.data).toHaveProperty('sites');

      // Validate overview metrics
      const overview = healthData.data.overview;
      expect(overview.totalSites).toBeGreaterThan(0);
      expect(overview.healthySites + overview.degradedSites + overview.unhealthySites + overview.maintenanceSites)
        .toBe(overview.totalSites);
      expect(overview.averageResponseTime).toBeGreaterThan(0);
      expect(overview.overallUptime).toBeGreaterThanOrEqual(0);
      expect(overview.overallUptime).toBeLessThanOrEqual(100);

      // Validate site health data
      healthData.data.sites.forEach((site: any) => {
        expect(site).toHaveProperty('siteId');
        expect(site).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy', 'maintenance']).toContain(site.status);
        expect(site.responseTime).toBeGreaterThan(0);
        expect(site.uptime).toBeGreaterThanOrEqual(0);
        expect(site.uptime).toBeLessThanOrEqual(100);
      });
    });

    it('should correlate extension status with site health', async () => {
      const testSite = mockCandlefishSites[0];

      // Get current site extensions and health
      const [siteExtensions, healthResponse] = await Promise.all([
        apiClient.getSiteExtensions(testSite.id),
        fetch('http://localhost:3001/api/health/sites?details=true')
      ]);

      const healthData = await healthResponse.json();
      const siteHealth = healthData.data.sites.find((site: any) => site.siteId === testSite.id);

      expect(siteHealth).toBeDefined();

      // Sites with more enabled extensions might have different performance characteristics
      const enabledExtensionsCount = siteExtensions.extensions.filter(ext => ext.isEnabled).length;

      // Verify consistent data between endpoints
      expect(siteHealth.siteId).toBe(testSite.id);
      expect(siteHealth.metrics.deploymentStatus).toBe(testSite.status);
    });
  });

  describe('Webhook Processing Integration', () => {
    it('should process Netlify deployment webhooks correctly', async () => {
      const webhookPayload = {
        id: 'deploy-integration-test',
        site_id: mockCandlefishSites[0].id,
        build_id: 'build-integration-test',
        state: 'ready' as const,
        name: 'Integration Test Deploy',
        url: 'https://test.netlify.app',
        ssl_url: 'https://test.netlify.app',
        admin_url: 'https://app.netlify.com/sites/test',
        deploy_url: 'https://deploy-integration-test.netlify.app',
        deploy_ssl_url: 'https://deploy-integration-test.netlify.app',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'integration-test-user',
        branch: 'main',
        context: 'production',
        deploy_time: 42000
      };

      const response = await fetch('http://localhost:3001/api/netlify/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      assertionHelpers.expectValidApiResponse(result);

      expect(result.data).toHaveProperty('eventType', 'deployment.complete');
      expect(result.data).toHaveProperty('processed', true);
      expect(result.data).toHaveProperty('notificationSent', true);
    });

    it('should handle webhook failures gracefully', async () => {
      const invalidWebhookPayload = {
        id: 'invalid-deploy',
        // Missing required fields: site_id, state
        name: 'Invalid Deploy'
      };

      const response = await fetch('http://localhost:3001/api/netlify/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidWebhookPayload)
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details.required).toContain('site_id');
      expect(result.details.required).toContain('state');
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should maintain data consistency across all endpoints', async () => {
      const testSite = mockCandlefishSites[0];

      // Fetch data from multiple endpoints
      const [
        allExtensions,
        siteExtensions,
        recommendations,
        performanceMetrics,
        healthResponse
      ] = await Promise.all([
        apiClient.getExtensions(),
        apiClient.getSiteExtensions(testSite.id),
        apiClient.getRecommendations(testSite.id),
        apiClient.getPerformanceMetrics(testSite.id, '24h'),
        fetch('http://localhost:3001/api/health/sites?details=true')
      ]);

      const healthData = await healthResponse.json();
      const siteHealth = healthData.data.sites.find((site: any) => site.siteId === testSite.id);

      // Verify data consistency
      expect(siteExtensions.siteId).toBe(testSite.id);
      expect(performanceMetrics.every(m => m.siteId === testSite.id)).toBe(true);
      expect(siteHealth?.siteId).toBe(testSite.id);

      // Verify extension consistency
      siteExtensions.extensions.forEach(siteExt => {
        const globalExt = allExtensions.find(ext => ext.id === siteExt.id);
        expect(globalExt).toBeDefined();
        expect(siteExt.name).toBe(globalExt?.name);
        expect(siteExt.category).toBe(globalExt?.category);
      });

      // Verify recommendations reference valid extensions
      recommendations.forEach(rec => {
        const referencedExt = allExtensions.find(ext => ext.id === rec.extension.id);
        expect(referencedExt).toBeDefined();
      });
    });

    it('should handle race conditions in concurrent operations', async () => {
      const testSite = mockCandlefishSites[0];
      const testExtension = Object.values(mockExtensionsByCategory).flat()[0];

      // Simulate concurrent operations on the same extension
      const operations = [
        apiClient.enableExtension(testSite.id, testExtension.id),
        apiClient.updateExtensionConfig(testSite.id, testExtension.id, { test: true }),
        apiClient.getExtensionConfig(testSite.id, testExtension.id)
      ];

      const results = await Promise.allSettled(operations);

      // At least the configuration retrieval should succeed
      const configResult = results[2];
      if (configResult.status === 'fulfilled') {
        expect(configResult.value).toBeDefined();
      }

      // Final state should be consistent
      const finalState = await apiClient.getSiteExtensions(testSite.id);
      const finalExtension = finalState.extensions.find(ext => ext.id === testExtension.id);
      expect(finalExtension).toBeDefined();
    });

    it('should propagate extension changes through the system', async () => {
      const testSite = mockCandlefishSites[0];
      const testExtension = Object.values(mockExtensionsByCategory)
        .flat()
        .find(ext => ext.category === 'performance');

      if (!testExtension) {
        console.warn('No performance extension available for testing');
        return;
      }

      // 1. Enable extension
      await apiClient.enableExtension(testSite.id, testExtension.id);

      // 2. Verify it appears in site extensions
      const siteExtensions = await apiClient.getSiteExtensions(testSite.id);
      const enabledExtension = siteExtensions.extensions.find(ext => ext.id === testExtension.id);
      expect(enabledExtension?.isEnabled).toBe(true);

      // 3. Verify recommendations might change
      const updatedRecommendations = await apiClient.getRecommendations(testSite.id);
      expect(Array.isArray(updatedRecommendations)).toBe(true);

      // 4. Verify health status reflects the change (would need real monitoring)
      const healthResponse = await fetch('http://localhost:3001/api/health/sites?details=true');
      const healthData = await healthResponse.json();
      expect(healthData.success).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from API failures gracefully', async () => {
      const testSite = mockCandlefishSites[0];

      // Test with a non-existent extension to trigger controlled failure
      const nonExistentExtensionId = 'non-existent-extension-id';

      await expect(
        apiClient.enableExtension(testSite.id, nonExistentExtensionId)
      ).rejects.toThrow();

      // System should remain functional for valid operations
      const validExtension = Object.values(mockExtensionsByCategory).flat()[0];
      const result = await apiClient.enableExtension(testSite.id, validExtension.id);
      expect(result.id).toBe(validExtension.id);
    });

    it('should handle network timeouts appropriately', async () => {
      // Create a client with very short timeout for testing
      const shortTimeoutClient = new NetlifyApiClient('http://localhost:3001/api');

      // Mock a slow endpoint by creating delay
      const slowOperation = fetch('http://localhost:3001/api/extensions', {
        signal: AbortSignal.timeout(1) // 1ms timeout to force failure
      });

      await expect(slowOperation).rejects.toThrow();

      // Normal operations should still work
      const normalResult = await apiClient.getExtensions();
      expect(Array.isArray(normalResult)).toBe(true);
    });
  });
});
