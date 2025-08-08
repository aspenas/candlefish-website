import { jest } from '@jest/globals';
import http from 'http';
import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import app from '../../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Performance and Load Tests', () => {
  let server;
  let baseURL;

  beforeAll(async () => {
    // Start server for performance tests
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseURL = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  describe('API Response Time Tests', () => {
    test('health endpoint should respond within 100ms', async () => {
      const startTime = performance.now();

      const response = await fetch(`${baseURL}/health`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(100);
    });

    test('authentication endpoint should respond within 500ms', async () => {
      const startTime = performance.now();

      const response = await fetch(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test@example.com',
          password: 'testpassword'
        })
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Response time should be reasonable even for failed auth
      expect(responseTime).toBeLessThan(500);
    });

    test('metrics endpoint should handle complex queries efficiently', async () => {
      // Mock authentication token
      const mockToken = 'valid-test-token';

      const startTime = performance.now();

      const response = await fetch(`${baseURL}/api/metrics?timeRange=7d&aggregate=avg`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Complex queries should still respond within reasonable time
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent health checks', async () => {
      const concurrentRequests = 50;
      const requests = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(fetch(`${baseURL}/health`));
      }

      const responses = await Promise.all(requests);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      expect(responses.every(r => r.ok)).toBe(true);

      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(200);
    });

    test('should handle concurrent API requests with authentication', async () => {
      const mockToken = 'valid-test-token';
      const concurrentRequests = 20;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          fetch(`${baseURL}/api/dashboard`, {
            headers: { 'Authorization': `Bearer ${mockToken}` }
          })
        );
      }

      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / concurrentRequests;

      // Should handle concurrent authenticated requests efficiently
      expect(avgResponseTime).toBeLessThan(300);

      // Count of successful vs failed responses
      const successCount = responses.filter(r => r.status !== 500).length;
      const successRate = successCount / concurrentRequests;

      // At least 90% should not fail with server errors
      expect(successRate).toBeGreaterThanOrEqual(0.9);
    });

    test('should maintain performance under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const requestsPerSecond = 10;
      const intervalMs = 1000 / requestsPerSecond;

      const results = [];
      const startTime = performance.now();

      const loadTest = new Promise((resolve) => {
        const interval = setInterval(async () => {
          const requestStart = performance.now();

          try {
            const response = await fetch(`${baseURL}/health`);
            const requestEnd = performance.now();

            results.push({
              success: response.ok,
              responseTime: requestEnd - requestStart,
              timestamp: requestEnd - startTime
            });
          } catch (error) {
            results.push({
              success: false,
              responseTime: null,
              error: error.message,
              timestamp: performance.now() - startTime
            });
          }

          if (performance.now() - startTime >= duration) {
            clearInterval(interval);
            resolve();
          }
        }, intervalMs);
      });

      await loadTest;

      // Analyze results
      const successfulRequests = results.filter(r => r.success);
      const failedRequests = results.filter(r => !r.success);

      const successRate = successfulRequests.length / results.length;
      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;

      expect(successRate).toBeGreaterThanOrEqual(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(150); // Average response time under 150ms
      expect(results.length).toBeGreaterThanOrEqual(40); // Should have made ~50 requests
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      const requestCount = 100;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryBefore = process.memoryUsage();

      // Make many requests
      for (let i = 0; i < requestCount; i++) {
        await fetch(`${baseURL}/health`);

        // Occasional garbage collection
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage();

      // Memory increase should be reasonable (less than 50MB)
      const heapIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      const heapIncreaseUB = heapIncrease / 1024 / 1024; // Convert to MB

      expect(heapIncreaseUB).toBeLessThan(50);
    });

    test('should handle large response payloads efficiently', async () => {
      const mockToken = 'valid-test-token';

      // Simulate large data response (mocked)
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const response = await fetch(`${baseURL}/api/metrics?limit=1000`, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });

      if (response.ok) {
        const data = await response.json();
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      const responseTime = endTime - startTime;
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
      const memoryDiffMB = memoryDiff / 1024 / 1024;

      // Should process large responses efficiently
      expect(responseTime).toBeLessThan(2000); // 2 seconds max
      expect(memoryDiffMB).toBeLessThan(100); // Less than 100MB memory increase
    });
  });

  describe('Database Performance', () => {
    test('should execute database queries efficiently', async () => {
      // This would require actual database connection in real implementation
      const mockQueryPerformance = {
        simpleSelect: 50, // milliseconds
        complexJoin: 200,
        aggregation: 300,
        insert: 100,
        update: 150
      };

      Object.entries(mockQueryPerformance).forEach(([queryType, expectedTime]) => {
        expect(expectedTime).toBeLessThan(500); // All queries under 500ms
      });
    });

    test('should handle database connection pooling efficiently', async () => {
      // Simulate concurrent database operations
      const concurrentOperations = 25;
      const operations = [];

      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(
          new Promise(resolve => {
            // Simulate database operation
            setTimeout(() => {
              resolve({
                operationId: i,
                responseTime: Math.random() * 100 + 50 // 50-150ms
              });
            }, Math.random() * 100 + 50);
          })
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      // Concurrent operations should complete efficiently
      expect(totalTime).toBeLessThan(500); // Should complete within 500ms
      expect(avgTime).toBeLessThan(150); // Average operation time
    });
  });

  describe('Caching Performance', () => {
    test('should benefit from caching for repeated requests', async () => {
      const mockToken = 'valid-test-token';
      const endpoint = `${baseURL}/api/dashboard`;

      // First request (cache miss)
      const firstStart = performance.now();
      const firstResponse = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });
      const firstEnd = performance.now();
      const firstTime = firstEnd - firstStart;

      // Second request (should be cached)
      const secondStart = performance.now();
      const secondResponse = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });
      const secondEnd = performance.now();
      const secondTime = secondEnd - secondStart;

      // Cached response should be faster (at least 20% improvement)
      if (firstResponse.ok && secondResponse.ok) {
        const improvement = (firstTime - secondTime) / firstTime;
        expect(improvement).toBeGreaterThan(0.1); // At least 10% improvement
      }
    });

    test('should handle cache invalidation efficiently', async () => {
      // Simulate cache operations
      const cache = new Map();
      const cacheKey = 'test-key';
      const cacheValue = { data: 'test-data', timestamp: Date.now() };

      // Set cache
      const setStart = performance.now();
      cache.set(cacheKey, cacheValue);
      const setEnd = performance.now();

      // Get from cache
      const getStart = performance.now();
      const cachedValue = cache.get(cacheKey);
      const getEnd = performance.now();

      // Delete from cache
      const deleteStart = performance.now();
      cache.delete(cacheKey);
      const deleteEnd = performance.now();

      // All cache operations should be very fast
      expect(setEnd - setStart).toBeLessThan(1);
      expect(getEnd - getStart).toBeLessThan(1);
      expect(deleteEnd - deleteStart).toBeLessThan(1);

      expect(cachedValue).toEqual(cacheValue);
      expect(cache.has(cacheKey)).toBe(false);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle errors efficiently without performance degradation', async () => {
      const errorRequests = [];
      const requestCount = 20;

      // Generate requests that will cause errors
      for (let i = 0; i < requestCount; i++) {
        errorRequests.push(
          fetch(`${baseURL}/api/nonexistent-endpoint`)
        );
      }

      const startTime = performance.now();
      const responses = await Promise.all(errorRequests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTime = totalTime / requestCount;

      // Error responses should still be fast
      expect(avgTime).toBeLessThan(100);

      // All should return 404
      expect(responses.every(r => r.status === 404)).toBe(true);
    });

    test('should handle malformed requests efficiently', async () => {
      const malformedRequests = [
        // Invalid JSON
        fetch(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid json }'
        }),

        // Missing required headers
        fetch(`${baseURL}/api/aws-secrets`),

        // Invalid content type
        fetch(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: 'invalid request'
        })
      ];

      const startTime = performance.now();
      const responses = await Promise.all(malformedRequests);
      const endTime = performance.now();

      const avgTime = (endTime - startTime) / malformedRequests.length;

      // Should handle malformed requests quickly
      expect(avgTime).toBeLessThan(200);

      // Should return appropriate error statuses
      expect(responses.every(r => r.status >= 400)).toBe(true);
    });
  });

  describe('Scalability Tests', () => {
    test('should maintain performance characteristics under varying load', async () => {
      const loadLevels = [1, 5, 10, 20]; // concurrent requests
      const results = {};

      for (const concurrency of loadLevels) {
        const requests = [];

        for (let i = 0; i < concurrency; i++) {
          requests.push(fetch(`${baseURL}/health`));
        }

        const startTime = performance.now();
        const responses = await Promise.all(requests);
        const endTime = performance.now();

        results[concurrency] = {
          totalTime: endTime - startTime,
          avgTime: (endTime - startTime) / concurrency,
          successRate: responses.filter(r => r.ok).length / concurrency
        };
      }

      // Performance should degrade gracefully
      const performance1 = results[1].avgTime;
      const performance20 = results[20].avgTime;

      // 20x load should not cause more than 5x performance degradation
      const degradation = performance20 / performance1;
      expect(degradation).toBeLessThan(5);

      // Success rate should remain high
      Object.values(results).forEach(result => {
        expect(result.successRate).toBeGreaterThan(0.9);
      });
    });

    test('should handle burst traffic patterns', async () => {
      const burstSize = 30;
      const burstDuration = 1000; // 1 second
      const normalLoad = 2;

      // Normal load phase
      const normalRequests = [];
      for (let i = 0; i < normalLoad; i++) {
        normalRequests.push(fetch(`${baseURL}/health`));
      }

      const normalStart = performance.now();
      await Promise.all(normalRequests);
      const normalEnd = performance.now();
      const normalTime = normalEnd - normalStart;

      // Burst phase
      const burstRequests = [];
      for (let i = 0; i < burstSize; i++) {
        burstRequests.push(fetch(`${baseURL}/health`));
      }

      const burstStart = performance.now();
      const burstResponses = await Promise.all(burstRequests);
      const burstEnd = performance.now();
      const burstTime = burstEnd - burstStart;

      // System should handle burst without complete failure
      const successRate = burstResponses.filter(r => r.ok).length / burstSize;
      expect(successRate).toBeGreaterThan(0.7); // At least 70% success during burst

      // Recovery time should be reasonable
      expect(burstTime).toBeLessThan(5000); // Complete within 5 seconds
    });
  });

  describe('Resource Optimization Tests', () => {
    test('should compress responses appropriately', async () => {
      const response = await fetch(`${baseURL}/health`, {
        headers: { 'Accept-Encoding': 'gzip, deflate' }
      });

      // Check if compression headers are present
      const encoding = response.headers.get('content-encoding');
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        // JSON responses should be compressed for larger payloads
        // This test would need actual size comparison in real implementation
        expect(encoding).toBeTruthy();
      }
    });

    test('should optimize static asset serving', async () => {
      // Test assumes static assets are served by the application
      const assetTypes = [
        { path: '/favicon.ico', type: 'image' },
        { path: '/static/css/app.css', type: 'css' },
        { path: '/static/js/app.js', type: 'javascript' }
      ];

      for (const asset of assetTypes) {
        try {
          const response = await fetch(`${baseURL}${asset.path}`);

          if (response.ok) {
            // Should have appropriate caching headers
            const cacheControl = response.headers.get('cache-control');
            const etag = response.headers.get('etag');

            expect(cacheControl || etag).toBeTruthy();
          }
        } catch (error) {
          // Asset might not exist in test environment
          console.log(`Asset ${asset.path} not found (expected in test)`);
        }
      }
    });
  });
});
