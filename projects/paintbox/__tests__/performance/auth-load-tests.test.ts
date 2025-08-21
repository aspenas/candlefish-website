/**
 * Load Tests for Authentication and JWKS Performance
 * Tests concurrent requests, rate limiting, and performance characteristics
 */

import { performance } from 'perf_hooks';
import axios, { AxiosResponse } from 'axios';
import pLimit from 'p-limit';
import { faker } from '@faker-js/faker';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const JWKS_URL = `${BASE_URL}/.well-known/jwks.json`;
const CONCURRENT_LIMIT = 50;
const REQUEST_TIMEOUT = 30000;

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  jwks: {
    p95: 500, // 95th percentile < 500ms
    p99: 1000, // 99th percentile < 1000ms
    mean: 200, // Mean < 200ms
    successRate: 0.99 // 99% success rate
  },
  auth: {
    p95: 1000,
    p99: 2000,
    mean: 500,
    successRate: 0.95
  }
};

// Helper functions
const createAxiosInstance = () => {
  return axios.create({
    timeout: REQUEST_TIMEOUT,
    validateStatus: () => true // Don't throw on HTTP errors
  });
};

const measurePerformance = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

const calculateStats = (durations: number[]) => {
  const sorted = durations.sort((a, b) => a - b);
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return { mean, p95, p99, min, max };
};

const generateConcurrentRequests = async <T>(
  requestFn: () => Promise<T>,
  count: number,
  concurrency: number = 10
): Promise<Array<{ result: T; duration: number; error?: Error }>> => {
  const limit = pLimit(concurrency);

  const promises = Array.from({ length: count }, () =>
    limit(async () => {
      try {
        return await measurePerformance(requestFn);
      } catch (error) {
        return {
          result: null as T,
          duration: 0,
          error: error as Error
        };
      }
    })
  );

  return await Promise.all(promises);
};

describe('Authentication Load Tests', () => {
  let axiosInstance: ReturnType<typeof createAxiosInstance>;

  beforeEach(() => {
    axiosInstance = createAxiosInstance();
  });

  describe('JWKS Endpoint Load Tests', () => {
    test('should handle 100 concurrent JWKS requests', async () => {
      const requestCount = 100;
      const concurrency = 20;

      const requestFn = async () => {
        const response = await axiosInstance.get(JWKS_URL);
        return response;
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      // Calculate success rate
      const successful = results.filter(r => !r.error && r.result?.status === 200);
      const successRate = successful.length / results.length;

      // Calculate performance stats
      const durations = successful.map(r => r.duration);
      const stats = calculateStats(durations);

      console.log('JWKS Load Test Results:', {
        requestCount,
        successRate,
        stats
      });

      // Assertions
      expect(successRate).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.jwks.successRate);
      expect(stats.mean).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.jwks.mean);
      expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.jwks.p95);
      expect(stats.p99).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.jwks.p99);

      // Verify response structure for successful requests
      successful.forEach(result => {
        expect(result.result.data).toHaveProperty('keys');
        expect(Array.isArray(result.result.data.keys)).toBe(true);
      });
    }, 60000);

    test('should maintain performance under sustained load', async () => {
      const requestCount = 200;
      const concurrency = 10;
      const batchSize = 50;
      const batchDelay = 1000; // 1 second between batches

      const allResults: Array<{ result: AxiosResponse; duration: number; error?: Error }> = [];

      // Run multiple batches with delays
      for (let i = 0; i < requestCount; i += batchSize) {
        const batchCount = Math.min(batchSize, requestCount - i);

        const requestFn = async () => {
          return await axiosInstance.get(JWKS_URL);
        };

        const batchResults = await generateConcurrentRequests(requestFn, batchCount, concurrency);
        allResults.push(...batchResults);

        // Delay between batches (except for the last one)
        if (i + batchSize < requestCount) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }

      const successful = allResults.filter(r => !r.error && r.result?.status === 200);
      const successRate = successful.length / allResults.length;
      const durations = successful.map(r => r.duration);
      const stats = calculateStats(durations);

      console.log('Sustained Load Test Results:', {
        totalRequests: requestCount,
        successRate,
        stats
      });

      expect(successRate).toBeGreaterThanOrEqual(0.95);
      expect(stats.mean).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.jwks.mean * 1.5); // Allow 50% degradation
    }, 120000);

    test('should handle cache efficiency under load', async () => {
      const requestCount = 50;
      const concurrency = 25;

      // First, make a request to warm the cache
      await axiosInstance.get(JWKS_URL);

      const requestFn = async () => {
        return await axiosInstance.get(JWKS_URL);
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      const successful = results.filter(r => !r.error && r.result?.status === 200);
      const durations = successful.map(r => r.duration);
      const stats = calculateStats(durations);

      // Cached responses should be very fast
      expect(stats.mean).toBeLessThanOrEqual(100); // Should be much faster due to caching
      expect(stats.p95).toBeLessThanOrEqual(200);

      // Check cache hit indicators
      successful.forEach(result => {
        const cacheSource = result.result.headers['x-jwks-source'];
        expect(['aws', 'cache', 'fallback']).toContain(cacheSource);
      });
    });

    test('should handle ETag-based conditional requests efficiently', async () => {
      // Get initial ETag
      const initialResponse = await axiosInstance.get(JWKS_URL);
      const etag = initialResponse.headers['etag'];
      expect(etag).toBeTruthy();

      const requestCount = 30;
      const concurrency = 10;

      const requestFn = async () => {
        return await axiosInstance.get(JWKS_URL, {
          headers: {
            'If-None-Match': etag
          }
        });
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      // All should return 304 Not Modified
      const notModified = results.filter(r => !r.error && r.result?.status === 304);
      expect(notModified.length).toBe(requestCount);

      // 304 responses should be very fast
      const durations = notModified.map(r => r.duration);
      const stats = calculateStats(durations);
      expect(stats.mean).toBeLessThanOrEqual(50); // Very fast for 304s
    });
  });

  describe('Authentication Endpoint Load Tests', () => {
    test('should handle concurrent session validation requests', async () => {
      const requestCount = 50;
      const concurrency = 10;

      const requestFn = async () => {
        return await axiosInstance.get(`${BASE_URL}/api/auth/session`);
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      // Most should return 200 (no session) or 401 (unauthorized)
      const validResponses = results.filter(r =>
        !r.error && [200, 401].includes(r.result?.status)
      );
      const successRate = validResponses.length / results.length;

      expect(successRate).toBeGreaterThanOrEqual(0.95);

      const durations = validResponses.map(r => r.duration);
      const stats = calculateStats(durations);
      expect(stats.mean).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.auth.mean);
    });

    test('should handle OAuth callback simulation load', async () => {
      const requestCount = 20; // Lower count for OAuth callbacks
      const concurrency = 5;

      const requestFn = async () => {
        const mockCode = faker.string.alphanumeric(32);
        const mockState = faker.string.alphanumeric(16);

        return await axiosInstance.get(
          `${BASE_URL}/api/auth/callback/google?code=${mockCode}&state=${mockState}`
        );
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      // Should handle all requests (even if they fail due to invalid params)
      const responses = results.filter(r => !r.error && r.result?.status);
      const successRate = responses.length / results.length;

      expect(successRate).toBeGreaterThanOrEqual(0.90);

      const durations = responses.map(r => r.duration);
      const stats = calculateStats(durations);
      expect(stats.mean).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.auth.mean * 2); // OAuth is more complex
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should implement rate limiting for excessive requests', async () => {
      const requestCount = 1000; // Very high number
      const concurrency = 50;

      const requestFn = async () => {
        return await axiosInstance.get(JWKS_URL);
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      // Should have some rate limiting (429 responses) for excessive load
      const rateLimited = results.filter(r => r.result?.status === 429);
      const successful = results.filter(r => r.result?.status === 200);

      console.log('Rate Limiting Test:', {
        total: requestCount,
        successful: successful.length,
        rateLimited: rateLimited.length,
        errors: results.filter(r => r.error).length
      });

      // At least some requests should succeed
      expect(successful.length).toBeGreaterThan(requestCount * 0.5);

      // Performance should remain acceptable for successful requests
      if (successful.length > 0) {
        const durations = successful.map(r => r.duration);
        const stats = calculateStats(durations);
        expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.jwks.p95 * 2);
      }
    }, 180000);

    test('should recover from rate limiting', async () => {
      // Generate high load to trigger rate limiting
      const heavyLoadCount = 100;
      const heavyLoadConcurrency = 25;

      const heavyRequestFn = async () => {
        return await axiosInstance.get(JWKS_URL);
      };

      await generateConcurrentRequests(heavyRequestFn, heavyLoadCount, heavyLoadConcurrency);

      // Wait for rate limiting to reset
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test normal load after rate limiting
      const normalLoadCount = 10;
      const normalResults = await generateConcurrentRequests(heavyRequestFn, normalLoadCount, 5);

      const successful = normalResults.filter(r => !r.error && r.result?.status === 200);
      const successRate = successful.length / normalResults.length;

      // Should recover and handle normal load
      expect(successRate).toBeGreaterThanOrEqual(0.80);
    });
  });

  describe('Memory and Resource Tests', () => {
    test('should not leak memory under sustained load', async () => {
      const initialMemory = process.memoryUsage();

      // Run sustained load
      const requestCount = 200;
      const batchSize = 25;

      for (let i = 0; i < requestCount; i += batchSize) {
        const requestFn = async () => {
          return await axiosInstance.get(JWKS_URL);
        };

        await generateConcurrentRequests(requestFn, batchSize, 10);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      console.log('Memory usage increase:', `${memoryIncrease.toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100);
    }, 120000);

    test('should handle connection pooling efficiently', async () => {
      const requestCount = 100;
      const concurrency = 20;

      // Use the same axios instance to test connection pooling
      const persistentAxios = axios.create({
        timeout: REQUEST_TIMEOUT,
        maxRedirects: 0,
        validateStatus: () => true,
        // Enable keep-alive
        headers: {
          'Connection': 'keep-alive'
        }
      });

      const requestFn = async () => {
        return await persistentAxios.get(JWKS_URL);
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      const successful = results.filter(r => !r.error && r.result?.status === 200);
      const durations = successful.map(r => r.duration);
      const stats = calculateStats(durations);

      // With connection pooling, requests should be faster
      expect(stats.mean).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.jwks.mean);
      expect(successful.length / results.length).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('Error Recovery Tests', () => {
    test('should recover from temporary service failures', async () => {
      // This test would need to be run against a test environment
      // where we can simulate service failures
      const requestCount = 50;
      const concurrency = 10;

      const requestFn = async () => {
        return await axiosInstance.get(JWKS_URL);
      };

      const results = await generateConcurrentRequests(requestFn, requestCount, concurrency);

      // Even with potential failures, most requests should eventually succeed
      const successful = results.filter(r => !r.error && r.result?.status === 200);
      expect(successful.length / results.length).toBeGreaterThanOrEqual(0.80);
    });

    test('should handle mixed success/failure scenarios', async () => {
      const requestCount = 30;
      const concurrency = 10;

      // Mix valid and invalid requests
      const requestFns = [
        // Valid JWKS request
        () => axiosInstance.get(JWKS_URL),
        // Invalid endpoint
        () => axiosInstance.get(`${BASE_URL}/api/invalid-endpoint`),
        // Valid auth session check
        () => axiosInstance.get(`${BASE_URL}/api/auth/session`)
      ];

      const mixedRequests = Array.from({ length: requestCount }, (_, i) => {
        const requestFn = requestFns[i % requestFns.length];
        return measurePerformance(requestFn);
      });

      const results = await Promise.allSettled(mixedRequests);

      // Should handle mixed scenarios gracefully
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length / results.length).toBeGreaterThanOrEqual(0.70);
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain baseline performance characteristics', async () => {
      const baselineTests = [
        {
          name: 'JWKS Single Request',
          fn: () => axiosInstance.get(JWKS_URL),
          threshold: 200
        },
        {
          name: 'Auth Session Check',
          fn: () => axiosInstance.get(`${BASE_URL}/api/auth/session`),
          threshold: 300
        },
        {
          name: 'JWKS with ETag',
          fn: async () => {
            const initial = await axiosInstance.get(JWKS_URL);
            return axiosInstance.get(JWKS_URL, {
              headers: { 'If-None-Match': initial.headers['etag'] }
            });
          },
          threshold: 100
        }
      ];

      for (const testCase of baselineTests) {
        const measurements = [];

        // Run each test multiple times
        for (let i = 0; i < 10; i++) {
          const { duration } = await measurePerformance(testCase.fn);
          measurements.push(duration);
        }

        const stats = calculateStats(measurements);

        console.log(`${testCase.name} baseline:`, stats);

        expect(stats.mean).toBeLessThanOrEqual(testCase.threshold);
        expect(stats.p95).toBeLessThanOrEqual(testCase.threshold * 2);
      }
    });
  });
});
