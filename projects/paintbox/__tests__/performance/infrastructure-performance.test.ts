/**
 * Infrastructure Performance Test Suite
 * Performance benchmarks and load testing for infrastructure components
 */

import { performance } from 'perf_hooks';
import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { performanceTestFactory } from '../factories/performanceTestFactory';
import { createPerformanceMonitor } from '../helpers/performanceMonitor';

// Mock implementations for performance testing
jest.mock('@/lib/database/connection-pool');
jest.mock('@/lib/cache/redis-client');
jest.mock('@/services/temporal/client');

describe('Infrastructure Performance Tests', () => {
  let performanceMonitor: any;

  beforeEach(() => {
    performanceMonitor = createPerformanceMonitor();
    performanceMonitor.start();
  });

  afterEach(() => {
    performanceMonitor.stop();
    performanceMonitor.report();
  });

  describe('API Endpoint Performance', () => {
    it('should handle health check requests within acceptable time', async () => {
      const startTime = performance.now();

      // Simulate 100 concurrent health check requests
      const requests = Array.from({ length: 100 }, () =>
        performanceTestFactory.simulateHealthCheckRequest()
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert performance requirements
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      expect(responses.every(r => r.status === 200)).toBe(true);

      // Check individual response times
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      expect(avgResponseTime).toBeLessThan(50); // Average under 50ms

      // Verify no timeouts
      const timeouts = responses.filter(r => r.responseTime > 5000);
      expect(timeouts.length).toBe(0);
    });

    it('should handle workflow API requests under load', async () => {
      const concurrentUsers = 50;
      const requestsPerUser = 10;

      const startTime = performance.now();

      const userSessions = Array.from({ length: concurrentUsers }, async () => {
        const userRequests = Array.from({ length: requestsPerUser }, () =>
          performanceTestFactory.simulateWorkflowRequest()
        );
        return Promise.all(userRequests);
      });

      const allResponses = await Promise.all(userSessions);
      const flatResponses = allResponses.flat();
      const endTime = performance.now();

      // Performance assertions
      const totalTime = endTime - startTime;
      const throughput = flatResponses.length / (totalTime / 1000); // requests per second

      expect(throughput).toBeGreaterThan(100); // Minimum 100 RPS
      expect(flatResponses.every(r => r.status < 400)).toBe(true); // No client/server errors

      // Response time percentiles
      const responseTimes = flatResponses.map(r => r.responseTime).sort((a, b) => a - b);
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

      expect(p95).toBeLessThan(200); // 95th percentile under 200ms
      expect(p99).toBeLessThan(500); // 99th percentile under 500ms
    });

    it('should handle webhook requests efficiently', async () => {
      const webhookPayloads = performanceTestFactory.createWebhookPayloads(1000);

      const startTime = performance.now();

      // Process webhooks in batches to simulate realistic load
      const batchSize = 50;
      const batches = [];

      for (let i = 0; i < webhookPayloads.length; i += batchSize) {
        const batch = webhookPayloads.slice(i, i + batchSize);
        batches.push(
          Promise.all(batch.map(payload =>
            performanceTestFactory.simulateWebhookRequest(payload)
          ))
        );
      }

      const results = await Promise.all(batches);
      const flatResults = results.flat();
      const endTime = performance.now();

      // Webhook processing performance
      const processingTime = endTime - startTime;
      const webhooksPerSecond = webhookPayloads.length / (processingTime / 1000);

      expect(webhooksPerSecond).toBeGreaterThan(200); // Process 200+ webhooks/second
      expect(flatResults.every(r => r.processed)).toBe(true);

      // Verify signature validation performance
      const avgValidationTime = flatResults.reduce((sum, r) => sum + r.validationTime, 0) / flatResults.length;
      expect(avgValidationTime).toBeLessThan(5); // Signature validation under 5ms
    });

    it('should maintain performance under memory pressure', async () => {
      // Create memory pressure scenario
      const largeDatasets = Array.from({ length: 10 }, () =>
        performanceTestFactory.createLargeDataset(1000000) // 1M records each
      );

      const initialMemory = process.memoryUsage();

      // Perform API operations under memory pressure
      const requests = Array.from({ length: 100 }, () =>
        performanceTestFactory.simulateHealthCheckRequest()
      );

      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Performance should not degrade significantly under memory pressure
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      expect(avgResponseTime).toBeLessThan(100); // Still under 100ms average

      // Memory should not leak excessively
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

      // Cleanup large datasets
      largeDatasets.length = 0;
    });
  });

  describe('Database Performance', () => {
    it('should execute health check queries efficiently', async () => {
      const queryCount = 1000;
      const startTime = performance.now();

      const queries = Array.from({ length: queryCount }, () =>
        performanceTestFactory.simulateDatabaseHealthCheck()
      );

      const results = await Promise.all(queries);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const queriesPerSecond = queryCount / (totalTime / 1000);

      expect(queriesPerSecond).toBeGreaterThan(500); // 500+ queries/second
      expect(results.every(r => r.success)).toBe(true);

      // Check query execution times
      const avgQueryTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
      expect(avgQueryTime).toBeLessThan(10); // Average under 10ms
    });

    it('should handle connection pool efficiently under load', async () => {
      const connectionPoolSize = 20;
      const concurrentConnections = 100; // More than pool size

      const startTime = performance.now();

      const connectionRequests = Array.from({ length: concurrentConnections }, () =>
        performanceTestFactory.simulateDatabaseConnection()
      );

      const connections = await Promise.all(connectionRequests);
      const endTime = performance.now();

      // All connections should be established
      expect(connections.every(c => c.established)).toBe(true);

      // Check connection acquisition times
      const avgAcquisitionTime = connections.reduce((sum, c) => sum + c.acquisitionTime, 0) / connections.length;
      expect(avgAcquisitionTime).toBeLessThan(50); // Under 50ms average

      // No connection should timeout
      const timeouts = connections.filter(c => c.timeout);
      expect(timeouts.length).toBe(0);
    });

    it('should optimize complex health check aggregations', async () => {
      const services = ['database', 'redis', 'temporal', 'api', 'websocket'];
      const metricsHistory = 1000; // Last 1000 data points

      const startTime = performance.now();

      const aggregationQueries = services.map(service =>
        performanceTestFactory.simulateHealthMetricsAggregation(service, metricsHistory)
      );

      const results = await Promise.all(aggregationQueries);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // Complex aggregations should complete quickly
      expect(totalTime).toBeLessThan(200); // Under 200ms for all services

      // Verify data integrity
      results.forEach(result => {
        expect(result.dataPoints).toBe(metricsHistory);
        expect(result.aggregations).toHaveProperty('avg');
        expect(result.aggregations).toHaveProperty('min');
        expect(result.aggregations).toHaveProperty('max');
        expect(result.aggregations).toHaveProperty('p95');
      });
    });
  });

  describe('Cache Performance', () => {
    it('should provide fast cache lookups for health data', async () => {
      const cacheKeys = performanceTestFactory.generateCacheKeys(10000);

      // Warm up cache
      const warmupPromises = cacheKeys.map(key =>
        performanceTestFactory.simulateCacheSet(key, { healthData: 'test' })
      );
      await Promise.all(warmupPromises);

      // Test cache retrieval performance
      const startTime = performance.now();

      const lookupPromises = cacheKeys.map(key =>
        performanceTestFactory.simulateCacheGet(key)
      );

      const results = await Promise.all(lookupPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const lookupsPerSecond = cacheKeys.length / (totalTime / 1000);

      expect(lookupsPerSecond).toBeGreaterThan(10000); // 10K+ lookups/second
      expect(results.every(r => r.hit)).toBe(true);

      // Individual lookup times
      const avgLookupTime = results.reduce((sum, r) => sum + r.lookupTime, 0) / results.length;
      expect(avgLookupTime).toBeLessThan(1); // Under 1ms average
    });

    it('should handle cache invalidation efficiently', async () => {
      const cacheSize = 100000;
      const invalidationPatterns = ['health:*', 'workflow:*', 'alert:*'];

      // Populate cache
      const populatePromises = Array.from({ length: cacheSize }, (_, i) =>
        performanceTestFactory.simulateCacheSet(`test:key:${i}`, { data: i })
      );
      await Promise.all(populatePromises);

      // Test pattern-based invalidation
      const startTime = performance.now();

      const invalidationPromises = invalidationPatterns.map(pattern =>
        performanceTestFactory.simulateCacheInvalidation(pattern)
      );

      const results = await Promise.all(invalidationPromises);
      const endTime = performance.now();

      const invalidationTime = endTime - startTime;

      expect(invalidationTime).toBeLessThan(100); // Under 100ms for all patterns
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should maintain performance during cache warming', async () => {
      const cacheWarmingData = performanceTestFactory.generateHealthCacheData(50000);

      // Start cache warming
      const warmingPromise = performanceTestFactory.simulateCacheWarming(cacheWarmingData);

      // Perform regular operations during warming
      const regularOperations = Array.from({ length: 100 }, () =>
        performanceTestFactory.simulateHealthCheckRequest()
      );

      const startTime = performance.now();
      const [warmingResult, operationResults] = await Promise.all([
        warmingPromise,
        Promise.all(regularOperations)
      ]);
      const endTime = performance.now();

      // Cache warming should not significantly impact regular operations
      const avgOperationTime = operationResults.reduce((sum, r) => sum + r.responseTime, 0) / operationResults.length;
      expect(avgOperationTime).toBeLessThan(100); // Still under 100ms during warming

      expect(warmingResult.success).toBe(true);
      expect(warmingResult.itemsWarmed).toBe(cacheWarmingData.length);
    });
  });

  describe('WebSocket Performance', () => {
    it('should handle high-frequency real-time updates', async () => {
      const connectionCount = 1000;
      const messagesPerSecond = 100;
      const testDuration = 10000; // 10 seconds

      // Establish WebSocket connections
      const connections = await Promise.all(
        Array.from({ length: connectionCount }, () =>
          performanceTestFactory.simulateWebSocketConnection()
        )
      );

      const startTime = performance.now();

      // Send high-frequency updates
      const messagePromises = [];
      const interval = setInterval(() => {
        connections.forEach(conn => {
          messagePromises.push(
            performanceTestFactory.simulateWebSocketMessage(conn, {
              type: 'health-update',
              payload: { timestamp: Date.now() }
            })
          );
        });
      }, 1000 / messagesPerSecond);

      // Run test for specified duration
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(interval);

      const messageResults = await Promise.all(messagePromises);
      const endTime = performance.now();

      // Calculate performance metrics
      const totalMessages = messageResults.length;
      const actualDuration = endTime - startTime;
      const messagesPerSecondActual = totalMessages / (actualDuration / 1000);

      expect(messagesPerSecondActual).toBeGreaterThan(messagesPerSecond * connectionCount * 0.95); // 95% target
      expect(messageResults.every(r => r.delivered)).toBe(true);

      // Check message latency
      const avgLatency = messageResults.reduce((sum, r) => sum + r.latency, 0) / messageResults.length;
      expect(avgLatency).toBeLessThan(10); // Under 10ms average latency
    });

    it('should efficiently broadcast to multiple subscribers', async () => {
      const subscriberCount = 5000;
      const broadcastCount = 100;

      // Create subscribers
      const subscribers = await Promise.all(
        Array.from({ length: subscriberCount }, () =>
          performanceTestFactory.simulateWebSocketSubscriber(['health', 'alerts'])
        )
      );

      const startTime = performance.now();

      // Perform broadcasts
      const broadcasts = Array.from({ length: broadcastCount }, () =>
        performanceTestFactory.simulateWebSocketBroadcast({
          topics: ['health'],
          message: { type: 'health-update', data: { status: 'healthy' } }
        })
      );

      const results = await Promise.all(broadcasts);
      const endTime = performance.now();

      const broadcastTime = endTime - startTime;
      const avgBroadcastTime = broadcastTime / broadcastCount;

      // Broadcasting should be efficient even with many subscribers
      expect(avgBroadcastTime).toBeLessThan(50); // Under 50ms per broadcast
      expect(results.every(r => r.success)).toBe(true);

      // All subscribers should receive messages
      const deliveryStats = results.map(r => r.deliveredCount);
      const avgDeliveryRate = deliveryStats.reduce((sum, count) => sum + count, 0) / (deliveryStats.length * subscriberCount);
      expect(avgDeliveryRate).toBeGreaterThan(0.98); // 98% delivery rate
    });

    it('should handle connection churn gracefully', async () => {
      const initialConnections = 1000;
      const churnRate = 0.1; // 10% churn per second
      const testDuration = 30000; // 30 seconds

      let activeConnections = await Promise.all(
        Array.from({ length: initialConnections }, () =>
          performanceTestFactory.simulateWebSocketConnection()
        )
      );

      const startTime = performance.now();
      const connectionMetrics = [];

      // Simulate connection churn
      const churnInterval = setInterval(async () => {
        const connectionsToRemove = Math.floor(activeConnections.length * churnRate);
        const connectionsToAdd = connectionsToRemove;

        // Remove connections
        const removedConnections = activeConnections.splice(0, connectionsToRemove);
        await Promise.all(removedConnections.map(conn =>
          performanceTestFactory.simulateWebSocketDisconnection(conn)
        ));

        // Add new connections
        const newConnections = await Promise.all(
          Array.from({ length: connectionsToAdd }, () =>
            performanceTestFactory.simulateWebSocketConnection()
          )
        );

        activeConnections.push(...newConnections);

        connectionMetrics.push({
          timestamp: Date.now(),
          activeConnections: activeConnections.length,
          memoryUsage: process.memoryUsage().heapUsed
        });
      }, 1000);

      // Run test
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(churnInterval);

      const endTime = performance.now();

      // Performance should remain stable during churn
      const memoryUsages = connectionMetrics.map(m => m.memoryUsage);
      const maxMemory = Math.max(...memoryUsages);
      const minMemory = Math.min(...memoryUsages);
      const memoryVariation = (maxMemory - minMemory) / minMemory;

      expect(memoryVariation).toBeLessThan(0.5); // Memory should not vary by more than 50%
      expect(activeConnections.length).toBeGreaterThan(initialConnections * 0.8); // Should maintain most connections
    });
  });

  describe('Frontend Rendering Performance', () => {
    it('should render health dashboard efficiently', async () => {
      const healthData = performanceTestFactory.createLargeHealthDataset(100); // 100 services

      const startTime = performance.now();

      const renderResult = await performanceTestFactory.simulateHealthDashboardRender(healthData);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Dashboard should render quickly even with many services
      expect(renderTime).toBeLessThan(200); // Under 200ms
      expect(renderResult.componentsRendered).toBe(healthData.services.length);
      expect(renderResult.virtualizedComponents).toBeGreaterThan(0); // Should use virtualization
    });

    it('should handle real-time chart updates efficiently', async () => {
      const dataPoints = 1000;
      const updateFrequency = 50; // 50 updates per second
      const testDuration = 5000; // 5 seconds

      const chartInstance = await performanceTestFactory.createPerformanceChart(dataPoints);

      const startTime = performance.now();
      const frameRates = [];

      // Simulate real-time updates
      const updateInterval = setInterval(() => {
        const frameStart = performance.now();

        performanceTestFactory.simulateChartUpdate(chartInstance, {
          timestamp: Date.now(),
          value: Math.random() * 100
        });

        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        const fps = 1000 / frameTime;
        frameRates.push(fps);
      }, 1000 / updateFrequency);

      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(updateInterval);

      const endTime = performance.now();

      // Chart should maintain smooth frame rates
      const avgFps = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
      const minFps = Math.min(...frameRates);

      expect(avgFps).toBeGreaterThan(30); // Maintain 30+ FPS average
      expect(minFps).toBeGreaterThan(15); // Never drop below 15 FPS

      // Memory usage should not grow significantly
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryBefore = performanceTestFactory.getInitialMemory();
      const memoryIncrease = memoryAfter - memoryBefore;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    it('should virtualize large lists efficiently', async () => {
      const listSize = 10000;
      const viewportHeight = 600;
      const itemHeight = 60;

      const listData = performanceTestFactory.createLargeListData(listSize);

      const startTime = performance.now();

      const virtualList = await performanceTestFactory.simulateVirtualizedList({
        data: listData,
        viewportHeight,
        itemHeight,
        overscan: 5
      });

      const endTime = performance.now();
      const initializationTime = endTime - startTime;

      // Virtualized list should initialize quickly
      expect(initializationTime).toBeLessThan(100); // Under 100ms

      // Should only render visible items plus overscan
      const visibleItems = Math.ceil(viewportHeight / itemHeight) + 10; // 5 overscan on each side
      expect(virtualList.renderedItems).toBeLessThanOrEqual(visibleItems);
      expect(virtualList.renderedItems).toBeLessThan(listSize * 0.1); // Much less than total

      // Test scrolling performance
      const scrollStartTime = performance.now();

      for (let i = 0; i < 100; i++) {
        await performanceTestFactory.simulateListScroll(virtualList, i * itemHeight);
      }

      const scrollEndTime = performance.now();
      const avgScrollTime = (scrollEndTime - scrollStartTime) / 100;

      expect(avgScrollTime).toBeLessThan(16); // 60 FPS = 16ms per frame
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during continuous operation', async () => {
      const initialMemory = process.memoryUsage();
      const operationCount = 10000;

      // Perform many operations that could potentially leak memory
      for (let i = 0; i < operationCount; i++) {
        await performanceTestFactory.simulateHealthCheckRequest();

        if (i % 1000 === 0) {
          // Force garbage collection every 1000 operations
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerOp = memoryIncrease / operationCount;

      // Memory increase should be minimal
      expect(memoryIncreasePerOp).toBeLessThan(1024); // Less than 1KB per operation
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Total increase under 100MB
    });

    it('should efficiently clean up WebSocket connections', async () => {
      const connectionCount = 1000;
      const initialMemory = process.memoryUsage();

      // Create many WebSocket connections
      const connections = await Promise.all(
        Array.from({ length: connectionCount }, () =>
          performanceTestFactory.simulateWebSocketConnection()
        )
      );

      const connectionsMemory = process.memoryUsage();

      // Clean up all connections
      await Promise.all(connections.map(conn =>
        performanceTestFactory.simulateWebSocketDisconnection(conn)
      ));

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const cleanupMemory = process.memoryUsage();

      // Memory should return close to initial levels
      const netMemoryIncrease = cleanupMemory.heapUsed - initialMemory.heapUsed;
      const connectionMemoryUsage = connectionsMemory.heapUsed - initialMemory.heapUsed;
      const cleanupEfficiency = 1 - (netMemoryIncrease / connectionMemoryUsage);

      expect(cleanupEfficiency).toBeGreaterThan(0.9); // 90% memory cleanup
      expect(netMemoryIncrease).toBeLessThan(connectionMemoryUsage * 0.1); // Less than 10% remains
    });
  });
});
