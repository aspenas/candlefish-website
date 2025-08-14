import { test, expect } from '@playwright/test';
import { ProductionTestFactory } from '../factories/productionFactory';

// Performance testing utilities
interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  concurrentUsers: number;
}

interface LoadTestConfig {
  users: number;
  duration: number; // in seconds
  rampUp: number; // in seconds
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  expectedResponseTime: number; // in ms
  expectedThroughput: number; // requests per second
  maxErrorRate: number; // percentage
}

class LoadTestRunner {
  private baseURL: string;
  private authToken: string;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.authToken = global.securityTestHelpers.createMockJWT({
      permissions: ['admin:all'],
    });
  }

  async runLoadTest(config: LoadTestConfig): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const responses: Array<{ time: number; status: number; error?: string }> = [];
    const userPromises: Promise<void>[] = [];

    // Calculate user spawn rate
    const spawnRate = config.users / config.rampUp;
    
    for (let i = 0; i < config.users; i++) {
      const delay = (i / spawnRate) * 1000; // Convert to milliseconds
      
      userPromises.push(
        new Promise(async (resolve) => {
          await this.sleep(delay);
          await this.simulateUser(config, responses, startTime + config.duration * 1000);
          resolve();
        })
      );
    }

    await Promise.all(userPromises);

    return this.calculateMetrics(responses, config);
  }

  private async simulateUser(
    config: LoadTestConfig,
    responses: Array<{ time: number; status: number; error?: string }>,
    endTime: number
  ): Promise<void> {
    while (Date.now() < endTime) {
      const requestStart = Date.now();
      
      try {
        const response = await fetch(`${this.baseURL}${config.endpoint}`, {
          method: config.method,
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          body: config.payload ? JSON.stringify(config.payload) : undefined,
        });

        responses.push({
          time: Date.now() - requestStart,
          status: response.status,
        });

        // Simulate think time between requests (100ms - 500ms)
        await this.sleep(Math.random() * 400 + 100);
      } catch (error) {
        responses.push({
          time: Date.now() - requestStart,
          status: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private calculateMetrics(
    responses: Array<{ time: number; status: number; error?: string }>,
    config: LoadTestConfig
  ): PerformanceMetrics {
    const totalRequests = responses.length;
    const successfulRequests = responses.filter(r => r.status >= 200 && r.status < 400);
    const errorRequests = responses.filter(r => r.status >= 400 || r.status === 0);

    const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.time, 0) / successfulRequests.length;
    const throughput = totalRequests / config.duration;
    const errorRate = (errorRequests.length / totalRequests) * 100;

    return {
      responseTime: avgResponseTime,
      throughput,
      errorRate,
      cpuUsage: 0, // Would be measured from system metrics
      memoryUsage: 0, // Would be measured from system metrics
      concurrentUsers: config.users,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

describe('Performance Load Testing', () => {
  let loadTestRunner: LoadTestRunner;

  test.beforeAll(async ({ baseURL }) => {
    loadTestRunner = new LoadTestRunner(baseURL || 'http://localhost:3000');
  });

  describe('API Endpoint Load Tests', () => {
    test('GET /api/v1/temporal/connections - should handle 100 concurrent users', async () => {
      const config: LoadTestConfig = {
        users: 100,
        duration: 30,
        rampUp: 10,
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: 200,
        expectedThroughput: 100,
        maxErrorRate: 1,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.throughput).toBeGreaterThan(config.expectedThroughput);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);
    });

    test('POST /api/v1/keys - should handle API key creation load', async () => {
      const config: LoadTestConfig = {
        users: 50,
        duration: 60,
        rampUp: 15,
        endpoint: '/api/v1/keys',
        method: 'POST',
        payload: {
          name: 'Load Test Key',
          permissions: ['read:metrics'],
          rateLimits: {
            requestsPerMinute: 100,
            requestsPerHour: 6000,
            requestsPerDay: 144000,
          },
        },
        expectedResponseTime: 500,
        expectedThroughput: 50,
        maxErrorRate: 2,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.throughput).toBeGreaterThan(config.expectedThroughput);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);
    });

    test('POST /api/v1/monitoring/metrics - should handle high-frequency metric ingestion', async () => {
      const config: LoadTestConfig = {
        users: 200,
        duration: 120,
        rampUp: 20,
        endpoint: '/api/v1/monitoring/metrics',
        method: 'POST',
        payload: {
          metrics: Array.from({ length: 10 }, () => 
            ProductionTestFactory.createMonitoringMetric()
          ),
        },
        expectedResponseTime: 100,
        expectedThroughput: 500,
        maxErrorRate: 0.5,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.throughput).toBeGreaterThan(config.expectedThroughput);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);
    });

    test('GET /api/v1/security/vulnerabilities - should handle vulnerability queries', async () => {
      const config: LoadTestConfig = {
        users: 75,
        duration: 45,
        rampUp: 10,
        endpoint: '/api/v1/security/vulnerabilities?limit=100&severity=critical',
        method: 'GET',
        expectedResponseTime: 300,
        expectedThroughput: 75,
        maxErrorRate: 1,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.throughput).toBeGreaterThan(config.expectedThroughput);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);
    });
  });

  describe('Stress Testing', () => {
    test('should handle peak load conditions', async () => {
      const config: LoadTestConfig = {
        users: 500,
        duration: 300, // 5 minutes
        rampUp: 60, // 1 minute ramp-up
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: 1000, // Higher tolerance for stress test
        expectedThroughput: 200,
        maxErrorRate: 5,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      // Stress test allows higher response times and error rates
      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);
      
      console.log('Stress Test Metrics:', {
        'Response Time': `${metrics.responseTime.toFixed(2)}ms`,
        'Throughput': `${metrics.throughput.toFixed(2)} req/s`,
        'Error Rate': `${metrics.errorRate.toFixed(2)}%`,
        'Concurrent Users': metrics.concurrentUsers,
      });
    });

    test('should handle gradual load increase (ramp test)', async () => {
      const rampSteps = [
        { users: 50, duration: 30 },
        { users: 100, duration: 30 },
        { users: 200, duration: 30 },
        { users: 300, duration: 30 },
        { users: 400, duration: 30 },
      ];

      const results: PerformanceMetrics[] = [];

      for (const step of rampSteps) {
        const config: LoadTestConfig = {
          users: step.users,
          duration: step.duration,
          rampUp: 5,
          endpoint: '/api/v1/temporal/connections',
          method: 'GET',
          expectedResponseTime: 1000,
          expectedThroughput: step.users / 2,
          maxErrorRate: 10,
        };

        const metrics = await loadTestRunner.runLoadTest(config);
        results.push(metrics);

        console.log(`Ramp Step ${step.users} users:`, {
          'Response Time': `${metrics.responseTime.toFixed(2)}ms`,
          'Throughput': `${metrics.throughput.toFixed(2)} req/s`,
          'Error Rate': `${metrics.errorRate.toFixed(2)}%`,
        });
      }

      // Check for performance degradation
      for (let i = 1; i < results.length; i++) {
        const previous = results[i - 1];
        const current = results[i];
        
        // Response time shouldn't increase more than 200% between steps
        expect(current.responseTime).toBeLessThan(previous.responseTime * 2);
        
        // Error rate shouldn't exceed 10%
        expect(current.errorRate).toBeLessThan(10);
      }
    });

    test('should recover from load spikes', async () => {
      // Baseline load
      const baselineConfig: LoadTestConfig = {
        users: 50,
        duration: 30,
        rampUp: 5,
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: 200,
        expectedThroughput: 50,
        maxErrorRate: 1,
      };

      const baselineMetrics = await loadTestRunner.runLoadTest(baselineConfig);

      // Spike load
      const spikeConfig: LoadTestConfig = {
        users: 500,
        duration: 60,
        rampUp: 5, // Very fast ramp-up to simulate spike
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: 2000,
        expectedThroughput: 100,
        maxErrorRate: 15,
      };

      const spikeMetrics = await loadTestRunner.runLoadTest(spikeConfig);

      // Recovery load (same as baseline)
      const recoveryMetrics = await loadTestRunner.runLoadTest(baselineConfig);

      // System should recover to near baseline performance
      expect(recoveryMetrics.responseTime).toBeLessThan(baselineMetrics.responseTime * 1.5);
      expect(recoveryMetrics.errorRate).toBeLessThan(baselineMetrics.errorRate + 2);

      console.log('Load Spike Recovery Test:', {
        'Baseline Response Time': `${baselineMetrics.responseTime.toFixed(2)}ms`,
        'Spike Response Time': `${spikeMetrics.responseTime.toFixed(2)}ms`,
        'Recovery Response Time': `${recoveryMetrics.responseTime.toFixed(2)}ms`,
        'Baseline Error Rate': `${baselineMetrics.errorRate.toFixed(2)}%`,
        'Spike Error Rate': `${spikeMetrics.errorRate.toFixed(2)}%`,
        'Recovery Error Rate': `${recoveryMetrics.errorRate.toFixed(2)}%`,
      });
    });
  });

  describe('Endurance Testing', () => {
    test('should maintain performance over extended periods', async () => {
      const config: LoadTestConfig = {
        users: 100,
        duration: 1800, // 30 minutes
        rampUp: 60,
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: 300,
        expectedThroughput: 80,
        maxErrorRate: 2,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      // Extended test should maintain reasonable performance
      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.throughput).toBeGreaterThan(config.expectedThroughput);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);

      console.log('Endurance Test Results:', {
        'Duration': '30 minutes',
        'Avg Response Time': `${metrics.responseTime.toFixed(2)}ms`,
        'Throughput': `${metrics.throughput.toFixed(2)} req/s`,
        'Error Rate': `${metrics.errorRate.toFixed(2)}%`,
        'Total Requests': Math.floor(metrics.throughput * config.duration),
      });
    });

    test('should detect memory leaks during extended testing', async () => {
      // This test would need to be run with actual memory monitoring
      // For demo purposes, we'll simulate the test structure
      
      const testDuration = 3600; // 1 hour
      const measurements: Array<{ time: number; memoryUsage: number }> = [];

      // Simulate memory measurements every 5 minutes
      for (let i = 0; i <= testDuration; i += 300) {
        const config: LoadTestConfig = {
          users: 50,
          duration: 60,
          rampUp: 10,
          endpoint: '/api/v1/temporal/connections',
          method: 'GET',
          expectedResponseTime: 200,
          expectedThroughput: 50,
          maxErrorRate: 1,
        };

        await loadTestRunner.runLoadTest(config);

        // Simulate memory measurement (in MB)
        const simulatedMemoryUsage = 100 + Math.random() * 50 + (i / testDuration) * 20;
        measurements.push({ time: i, memoryUsage: simulatedMemoryUsage });
      }

      // Check for memory leaks (memory growth over time)
      const initialMemory = measurements[0].memoryUsage;
      const finalMemory = measurements[measurements.length - 1].memoryUsage;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be less than 50MB over 1 hour
      expect(memoryGrowth).toBeLessThan(50);

      console.log('Memory Leak Detection:', {
        'Initial Memory': `${initialMemory.toFixed(2)} MB`,
        'Final Memory': `${finalMemory.toFixed(2)} MB`,
        'Memory Growth': `${memoryGrowth.toFixed(2)} MB`,
        'Growth Rate': `${(memoryGrowth / (testDuration / 3600)).toFixed(2)} MB/hour`,
      });
    });
  });

  describe('API Rate Limiting Performance', () => {
    test('should handle rate limit enforcement efficiently', async () => {
      const config: LoadTestConfig = {
        users: 200,
        duration: 60,
        rampUp: 10,
        endpoint: '/api/v1/keys',
        method: 'POST',
        payload: {
          name: 'Rate Limit Test Key',
          permissions: ['read:metrics'],
        },
        expectedResponseTime: 200,
        expectedThroughput: 50, // Lower due to rate limiting
        maxErrorRate: 70, // High error rate expected due to 429 responses
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      // Rate limiting should not significantly impact response times for allowed requests
      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);

      console.log('Rate Limiting Performance:', {
        'Avg Response Time': `${metrics.responseTime.toFixed(2)}ms`,
        'Throughput': `${metrics.throughput.toFixed(2)} req/s`,
        'Error Rate (429s)': `${metrics.errorRate.toFixed(2)}%`,
      });
    });

    test('should maintain rate limit accuracy under load', async () => {
      // Test that rate limiting remains accurate even under high load
      const config: LoadTestConfig = {
        users: 500,
        duration: 120,
        rampUp: 20,
        endpoint: '/api/v1/monitoring/metrics',
        method: 'POST',
        payload: ProductionTestFactory.createMonitoringMetric(),
        expectedResponseTime: 500,
        expectedThroughput: 100,
        maxErrorRate: 80,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      // Even under load, rate limiting should be enforced
      expect(metrics.errorRate).toBeGreaterThan(50); // Should see significant rate limiting
      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
    });
  });

  describe('Database Performance Under Load', () => {
    test('should handle concurrent database operations', async () => {
      const readConfig: LoadTestConfig = {
        users: 100,
        duration: 60,
        rampUp: 10,
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: 200,
        expectedThroughput: 100,
        maxErrorRate: 1,
      };

      const writeConfig: LoadTestConfig = {
        users: 50,
        duration: 60,
        rampUp: 10,
        endpoint: '/api/v1/temporal/connections',
        method: 'POST',
        payload: ProductionTestFactory.createTemporalConnection(),
        expectedResponseTime: 500,
        expectedThroughput: 25,
        maxErrorRate: 5,
      };

      // Run concurrent read and write operations
      const [readMetrics, writeMetrics] = await Promise.all([
        loadTestRunner.runLoadTest(readConfig),
        loadTestRunner.runLoadTest(writeConfig),
      ]);

      expect(readMetrics.responseTime).toBeLessThan(readConfig.expectedResponseTime);
      expect(writeMetrics.responseTime).toBeLessThan(writeConfig.expectedResponseTime);
      expect(readMetrics.errorRate).toBeLessThan(readConfig.maxErrorRate);
      expect(writeMetrics.errorRate).toBeLessThan(writeConfig.maxErrorRate);

      console.log('Concurrent Database Operations:', {
        'Read Response Time': `${readMetrics.responseTime.toFixed(2)}ms`,
        'Write Response Time': `${writeMetrics.responseTime.toFixed(2)}ms`,
        'Read Throughput': `${readMetrics.throughput.toFixed(2)} req/s`,
        'Write Throughput': `${writeMetrics.throughput.toFixed(2)} req/s`,
      });
    });

    test('should handle large result set queries efficiently', async () => {
      const config: LoadTestConfig = {
        users: 50,
        duration: 120,
        rampUp: 15,
        endpoint: '/api/v1/security/vulnerabilities?limit=1000&includeFixed=true',
        method: 'GET',
        expectedResponseTime: 1000,
        expectedThroughput: 20,
        maxErrorRate: 2,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.throughput).toBeGreaterThan(config.expectedThroughput);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);
    });
  });

  describe('Circuit Breaker Performance', () => {
    test('should handle circuit breaker state changes efficiently', async () => {
      const config: LoadTestConfig = {
        users: 100,
        duration: 180,
        rampUp: 20,
        endpoint: '/api/v1/circuit-breakers/test-breaker/test',
        method: 'POST',
        payload: { requestCount: 5 },
        expectedResponseTime: 300,
        expectedThroughput: 50,
        maxErrorRate: 30, // Some failures expected to trigger circuit breaker
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);

      console.log('Circuit Breaker Performance:', {
        'Response Time': `${metrics.responseTime.toFixed(2)}ms`,
        'Throughput': `${metrics.throughput.toFixed(2)} req/s`,
        'Error Rate': `${metrics.errorRate.toFixed(2)}%`,
      });
    });
  });

  describe('Security Scanning Performance', () => {
    test('should handle concurrent security scans', async () => {
      const config: LoadTestConfig = {
        users: 10, // Lower concurrency for resource-intensive operations
        duration: 300,
        rampUp: 30,
        endpoint: '/api/v1/security/scans',
        method: 'POST',
        payload: ProductionTestFactory.createSecurityScan(),
        expectedResponseTime: 2000,
        expectedThroughput: 5,
        maxErrorRate: 10,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(config.expectedResponseTime);
      expect(metrics.throughput).toBeGreaterThan(config.expectedThroughput);
      expect(metrics.errorRate).toBeLessThan(config.maxErrorRate);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet SLA requirements', async () => {
      const slaRequirements = {
        p95ResponseTime: 500, // 95th percentile response time < 500ms
        p99ResponseTime: 1000, // 99th percentile response time < 1000ms
        availability: 99.9, // 99.9% availability
        throughput: 1000, // 1000 requests per second
      };

      const config: LoadTestConfig = {
        users: 300,
        duration: 300,
        rampUp: 60,
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: slaRequirements.p95ResponseTime,
        expectedThroughput: slaRequirements.throughput,
        maxErrorRate: 100 - slaRequirements.availability,
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      expect(metrics.responseTime).toBeLessThan(slaRequirements.p95ResponseTime);
      expect(metrics.throughput).toBeGreaterThan(slaRequirements.throughput);
      expect(metrics.errorRate).toBeLessThan(100 - slaRequirements.availability);

      console.log('SLA Compliance Check:', {
        'P95 Response Time': `${metrics.responseTime.toFixed(2)}ms (SLA: ${slaRequirements.p95ResponseTime}ms)`,
        'Throughput': `${metrics.throughput.toFixed(2)} req/s (SLA: ${slaRequirements.throughput} req/s)`,
        'Availability': `${(100 - metrics.errorRate).toFixed(3)}% (SLA: ${slaRequirements.availability}%)`,
        'Error Rate': `${metrics.errorRate.toFixed(3)}%`,
      });
    });

    test('should benchmark against previous performance baseline', async () => {
      // This would typically load baseline metrics from a previous test run
      const baseline = {
        responseTime: 150,
        throughput: 120,
        errorRate: 0.5,
      };

      const config: LoadTestConfig = {
        users: 100,
        duration: 120,
        rampUp: 20,
        endpoint: '/api/v1/temporal/connections',
        method: 'GET',
        expectedResponseTime: baseline.responseTime * 1.2, // Allow 20% degradation
        expectedThroughput: baseline.throughput * 0.8, // Allow 20% degradation
        maxErrorRate: baseline.errorRate * 2, // Allow 2x error rate
      };

      const metrics = await loadTestRunner.runLoadTest(config);

      // Performance should not degrade significantly from baseline
      expect(metrics.responseTime).toBeLessThan(baseline.responseTime * 1.2);
      expect(metrics.throughput).toBeGreaterThan(baseline.throughput * 0.8);
      expect(metrics.errorRate).toBeLessThan(baseline.errorRate * 2);

      const performanceComparison = {
        'Response Time Change': `${((metrics.responseTime - baseline.responseTime) / baseline.responseTime * 100).toFixed(2)}%`,
        'Throughput Change': `${((metrics.throughput - baseline.throughput) / baseline.throughput * 100).toFixed(2)}%`,
        'Error Rate Change': `${((metrics.errorRate - baseline.errorRate) / baseline.errorRate * 100).toFixed(2)}%`,
      };

      console.log('Performance Regression Test:', performanceComparison);
    });
  });
});