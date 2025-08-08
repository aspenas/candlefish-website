/**
 * Performance Tests for System Analyzer
 * Tests system performance under various load conditions
 */

import { performance } from 'perf_hooks';
import { GraphQLClient } from 'graphql-request';
import axios from 'axios';
import WebSocket from 'ws';
import { SystemMockFactory, ServiceFactory, MetricFactory } from '../factories/systemAnalyzerFactory';

// Test configuration
const API_BASE_URL = process.env.PERF_API_URL || 'http://localhost:4000';
const GRAPHQL_ENDPOINT = `${API_BASE_URL}/graphql`;
const WS_ENDPOINT = `ws://localhost:4000/graphql`;

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  systemAnalysis: 5000,     // 5 seconds max
  serviceQuery: 1000,       // 1 second max
  metricIngestion: 100,     // 100ms max per metric
  alertProcessing: 500,     // 500ms max
  webSocketConnection: 2000, // 2 seconds max
  dataFetch: 2000,          // 2 seconds max for data queries
  bulkOperations: 10000,    // 10 seconds for bulk operations
};

describe('System Analyzer Performance Tests', () => {
  let graphqlClient: GraphQLClient;
  const testResults: Array<{
    test: string;
    duration: number;
    threshold: number;
    passed: boolean;
  }> = [];

  beforeAll(async () => {
    graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
      headers: { authorization: 'Bearer test-token' },
    });

    // Warm up the system
    await warmUpSystem();
  });

  afterAll(async () => {
    // Log performance summary
    console.log('\n📊 Performance Test Summary:');
    console.table(testResults.map(result => ({
      Test: result.test,
      'Duration (ms)': result.duration,
      'Threshold (ms)': result.threshold,
      Status: result.passed ? '✅ PASS' : '❌ FAIL',
    })));

    // Calculate overall performance score
    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;
    const performanceScore = Math.round((passedTests / totalTests) * 100);

    console.log(`\n🎯 Overall Performance Score: ${performanceScore}% (${passedTests}/${totalTests} tests passed)`);
  });

  describe('System Analysis Performance', () => {
    it('should complete system analysis within threshold', async () => {
      const startTime = performance.now();

      const query = `
        query SystemAnalysis {
          systemAnalysis {
            id
            timestamp
            overallHealth
            healthScore
            totalServices
            healthyServices
            degradedServices
            unhealthyServices
            activeAlerts
            performanceInsights {
              type
              severity
              title
              description
            }
            recommendations {
              type
              priority
              title
              description
            }
          }
        }
      `;

      await graphqlClient.request(query);

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.systemAnalysis;

      testResults.push({
        test: 'System Analysis',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.systemAnalysis,
        passed,
      });

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.systemAnalysis);
    });

    it('should handle concurrent system analysis requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const query = `
        query SystemAnalysis {
          systemAnalysis {
            id
            healthScore
            totalServices
          }
        }
      `;

      // Execute concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        graphqlClient.request(query)
      );

      await Promise.all(promises);

      const duration = performance.now() - startTime;
      const avgDuration = duration / concurrentRequests;
      const passed = avgDuration <= PERFORMANCE_THRESHOLDS.systemAnalysis;

      testResults.push({
        test: 'Concurrent System Analysis',
        duration: Math.round(avgDuration),
        threshold: PERFORMANCE_THRESHOLDS.systemAnalysis,
        passed,
      });

      expect(avgDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.systemAnalysis);
    });
  });

  describe('Service Query Performance', () => {
    it('should query services list within threshold', async () => {
      const startTime = performance.now();

      const query = `
        query GetServices {
          services(limit: 100) {
            id
            name
            displayName
            status
            environment
            tags
            lastHealthCheck
            uptime
          }
        }
      `;

      const result = await graphqlClient.request(query);

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.serviceQuery;

      testResults.push({
        test: 'Services List Query',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.serviceQuery,
        passed,
      });

      expect(result.services).toBeDefined();
      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.serviceQuery);
    });

    it('should handle service filtering efficiently', async () => {
      const startTime = performance.now();

      const query = `
        query GetFilteredServices {
          services(
            status: HEALTHY,
            environment: "production",
            tags: ["api"],
            limit: 50
          ) {
            id
            name
            status
            environment
            tags
          }
        }
      `;

      await graphqlClient.request(query);

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.serviceQuery;

      testResults.push({
        test: 'Service Filtering',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.serviceQuery,
        passed,
      });

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.serviceQuery);
    });

    it('should load service details with related data efficiently', async () => {
      // First get a service ID
      const servicesQuery = `
        query GetServices {
          services(limit: 1) {
            id
          }
        }
      `;

      const servicesResult = await graphqlClient.request(servicesQuery);
      const serviceId = servicesResult.services[0]?.id;

      if (!serviceId) {
        console.warn('No services found for detail query test');
        return;
      }

      const startTime = performance.now();

      const detailQuery = `
        query GetServiceDetail($id: ID!) {
          service(id: $id) {
            id
            name
            status
            containers {
              id
              name
              status
              cpuUsage
              memoryUsage
            }
            metrics {
              id
              name
              type
              value
              timestamp
            }
            alerts {
              id
              severity
              status
              triggeredAt
            }
            dependencies {
              id
              name
              status
            }
          }
        }
      `;

      await graphqlClient.request(detailQuery, { id: serviceId });

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.dataFetch;

      testResults.push({
        test: 'Service Detail Query',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.dataFetch,
        passed,
      });

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.dataFetch);
    });
  });

  describe('Metric Ingestion Performance', () => {
    it('should ingest individual metrics within threshold', async () => {
      const metric = MetricFactory.create();
      const startTime = performance.now();

      await axios.post(`${API_BASE_URL}/api/metrics`, {
        name: metric.name,
        type: metric.type,
        value: metric.value,
        serviceId: metric.serviceId,
        timestamp: metric.timestamp.toISOString(),
        labels: metric.labels,
      });

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.metricIngestion;

      testResults.push({
        test: 'Single Metric Ingestion',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.metricIngestion,
        passed,
      });

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.metricIngestion);
    });

    it('should handle batch metric ingestion efficiently', async () => {
      const batchSize = 100;
      const metrics = MetricFactory.createMany(batchSize);
      const startTime = performance.now();

      // Send metrics in parallel
      const promises = metrics.map(metric =>
        axios.post(`${API_BASE_URL}/api/metrics`, {
          name: metric.name,
          type: metric.type,
          value: metric.value,
          serviceId: metric.serviceId,
          timestamp: metric.timestamp.toISOString(),
          labels: metric.labels,
        })
      );

      await Promise.all(promises);

      const duration = performance.now() - startTime;
      const avgDuration = duration / batchSize;
      const passed = avgDuration <= PERFORMANCE_THRESHOLDS.metricIngestion;

      testResults.push({
        test: 'Batch Metric Ingestion',
        duration: Math.round(avgDuration),
        threshold: PERFORMANCE_THRESHOLDS.metricIngestion,
        passed,
      });

      expect(avgDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.metricIngestion);
    });

    it('should query metric series efficiently', async () => {
      const serviceId = 'test-service-metrics';
      const startTime = performance.now();

      const query = `
        query GetMetricSeries($serviceId: ID!) {
          metricSeries(
            serviceId: $serviceId,
            metricName: "cpu_usage",
            timeRange: { duration: "1h" },
            aggregation: AVG
          ) {
            name
            type
            unit
            dataPoints {
              timestamp
              value
            }
            aggregation
          }
        }
      `;

      await graphqlClient.request(query, { serviceId });

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.dataFetch;

      testResults.push({
        test: 'Metric Series Query',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.dataFetch,
        passed,
      });

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.dataFetch);
    });
  });

  describe('Alert Processing Performance', () => {
    it('should process alerts within threshold', async () => {
      const startTime = performance.now();

      const query = `
        query GetAlerts {
          alerts(limit: 50) {
            id
            name
            severity
            status
            triggeredAt
            service {
              id
              name
            }
          }
        }
      `;

      await graphqlClient.request(query);

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.alertProcessing;

      testResults.push({
        test: 'Alert Processing',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.alertProcessing,
        passed,
      });

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.alertProcessing);
    });

    it('should create alert rules efficiently', async () => {
      const startTime = performance.now();

      const mutation = `
        mutation CreateAlertRule($input: CreateAlertRuleInput!) {
          createAlertRule(input: $input) {
            id
            name
            enabled
          }
        }
      `;

      const input = {
        name: `Performance Test Rule ${Date.now()}`,
        metric: 'cpu_usage',
        condition: 'GREATER_THAN',
        threshold: 80,
        duration: '5m',
        severity: 'HIGH',
        serviceIds: [],
        tags: ['performance-test'],
        notificationChannels: ['test'],
      };

      const result = await graphqlClient.request(mutation, { input });

      const duration = performance.now() - startTime;
      const passed = duration <= PERFORMANCE_THRESHOLDS.alertProcessing;

      testResults.push({
        test: 'Alert Rule Creation',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.alertProcessing,
        passed,
      });

      expect(result.createAlertRule).toBeDefined();
      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.alertProcessing);

      // Clean up - delete the rule
      const deleteRule = await graphqlClient.request(`
        mutation DeleteAlertRule($id: ID!) {
          deleteAlertRule(id: $id)
        }
      `, { id: result.createAlertRule.id });

      expect(deleteRule.deleteAlertRule).toBe(true);
    });
  });

  describe('WebSocket Performance', () => {
    it('should establish WebSocket connection within threshold', async () => {
      const startTime = performance.now();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_ENDPOINT, 'graphql-ws');
        let connected = false;

        const timeout = setTimeout(() => {
          if (!connected) {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, PERFORMANCE_THRESHOLDS.webSocketConnection);

        ws.on('open', () => {
          connected = true;
          const duration = performance.now() - startTime;
          const passed = duration <= PERFORMANCE_THRESHOLDS.webSocketConnection;

          testResults.push({
            test: 'WebSocket Connection',
            duration: Math.round(duration),
            threshold: PERFORMANCE_THRESHOLDS.webSocketConnection,
            passed,
          });

          clearTimeout(timeout);
          ws.close();

          if (passed) {
            resolve();
          } else {
            reject(new Error(`WebSocket connection took ${duration}ms, expected <= ${PERFORMANCE_THRESHOLDS.webSocketConnection}ms`));
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it('should handle multiple concurrent WebSocket connections', async () => {
      const connectionCount = 10;
      const startTime = performance.now();

      const connections = Array.from({ length: connectionCount }, () => {
        return new Promise<number>((resolve, reject) => {
          const connStartTime = performance.now();
          const ws = new WebSocket(WS_ENDPOINT, 'graphql-ws');

          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Connection timeout'));
          }, PERFORMANCE_THRESHOLDS.webSocketConnection);

          ws.on('open', () => {
            const connDuration = performance.now() - connStartTime;
            clearTimeout(timeout);
            ws.close();
            resolve(connDuration);
          });

          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      });

      const durations = await Promise.all(connections);
      const totalDuration = performance.now() - startTime;
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / connectionCount;
      const passed = avgDuration <= PERFORMANCE_THRESHOLDS.webSocketConnection;

      testResults.push({
        test: 'Concurrent WebSocket Connections',
        duration: Math.round(avgDuration),
        threshold: PERFORMANCE_THRESHOLDS.webSocketConnection,
        passed,
      });

      expect(avgDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.webSocketConnection);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk service registration efficiently', async () => {
      const bulkSize = 50;
      const services = Array.from({ length: bulkSize }, (_, i) => ({
        name: `bulk-test-service-${i}`,
        environment: 'test',
        tags: ['bulk-test'],
      }));

      const startTime = performance.now();

      const mutation = `
        mutation RegisterService($input: RegisterServiceInput!) {
          registerService(input: $input) {
            id
            name
          }
        }
      `;

      // Register services in parallel
      const promises = services.map(service =>
        graphqlClient.request(mutation, { input: service })
      );

      const results = await Promise.all(promises);

      const duration = performance.now() - startTime;
      const avgDuration = duration / bulkSize;
      const passed = duration <= PERFORMANCE_THRESHOLDS.bulkOperations;

      testResults.push({
        test: 'Bulk Service Registration',
        duration: Math.round(duration),
        threshold: PERFORMANCE_THRESHOLDS.bulkOperations,
        passed,
      });

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.bulkOperations);

      // Clean up - remove all created services
      const removeMutation = `
        mutation RemoveService($id: ID!) {
          removeService(id: $id)
        }
      `;

      const removePromises = results.map(result =>
        graphqlClient.request(removeMutation, { id: result.registerService.id })
      );

      await Promise.all(removePromises);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not create memory leaks during sustained load', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      const query = `
        query GetServices {
          services(limit: 10) {
            id
            name
            status
          }
        }
      `;

      // Run many queries to test for memory leaks
      for (let i = 0; i < iterations; i++) {
        await graphqlClient.request(query);

        // Occasionally force garbage collection if available
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerIteration = memoryIncrease / iterations;

      // Memory increase per iteration should be minimal (< 1KB)
      const passed = memoryIncreasePerIteration < 1024;

      testResults.push({
        test: 'Memory Leak Check',
        duration: Math.round(memoryIncreasePerIteration),
        threshold: 1024,
        passed,
      });

      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024)}KB total, ${Math.round(memoryIncreasePerIteration)}B per iteration`);

      expect(memoryIncreasePerIteration).toBeLessThan(1024);
    });
  });

  // Helper functions
  async function warmUpSystem(): Promise<void> {
    try {
      // Make a few warm-up requests to ensure system is ready
      const warmUpQuery = `
        query WarmUp {
          services(limit: 1) {
            id
          }
        }
      `;

      for (let i = 0; i < 3; i++) {
        await graphqlClient.request(warmUpQuery);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ System warmed up');
    } catch (error) {
      console.warn('⚠️  System warm-up failed:', error);
    }
  }
});
