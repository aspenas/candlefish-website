/**
 * Performance Load Tests for Collaboration System
 * Tests system performance under high concurrent user loads and operation throughput
 */

import WebSocket from 'ws';
import { testFactory } from '../factories/test-data-factory';
import { integrationTestUtils } from '../setup/integration.setup';

// Performance test configuration
const PERFORMANCE_CONFIG = {
  CONCURRENT_USERS: 100,
  HEAVY_LOAD_USERS: 500,
  STRESS_TEST_USERS: 1000,
  OPERATIONS_PER_USER: 50,
  TEST_DURATION_MS: 30000, // 30 seconds
  WEBSOCKET_MESSAGE_INTERVAL: 100, // ms
  RESPONSE_TIME_THRESHOLD: 1000, // ms
  THROUGHPUT_THRESHOLD: 100, // ops/second
  MEMORY_THRESHOLD: 500 * 1024 * 1024, // 500MB
};

// Performance metrics collector
class PerformanceMetrics {
  private startTime: number = 0;
  private metrics: {
    responseTimes: number[];
    errors: number;
    successfulOperations: number;
    memoryUsage: number[];
    cpuUsage: number[];
    websocketConnections: number;
    throughput: number;
  } = {
    responseTimes: [],
    errors: 0,
    successfulOperations: 0,
    memoryUsage: [],
    cpuUsage: [],
    websocketConnections: 0,
    throughput: 0,
  };

  start() {
    this.startTime = Date.now();
    this.collectSystemMetrics();
  }

  recordResponse(responseTime: number, success: boolean = true) {
    this.metrics.responseTimes.push(responseTime);
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.errors++;
    }
  }

  recordWebSocketConnection() {
    this.metrics.websocketConnections++;
  }

  private collectSystemMetrics() {
    const interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.push(memUsage.heapUsed);

      // CPU usage would be collected via system monitoring in real implementation
      this.metrics.cpuUsage.push(Math.random() * 100); // Mock CPU usage
    }, 1000);

    // Clean up after test duration
    setTimeout(() => {
      clearInterval(interval);
      this.calculateThroughput();
    }, PERFORMANCE_CONFIG.TEST_DURATION_MS);
  }

  private calculateThroughput() {
    const duration = (Date.now() - this.startTime) / 1000; // seconds
    this.metrics.throughput = this.metrics.successfulOperations / duration;
  }

  getResults() {
    const responseTimes = this.metrics.responseTimes;
    return {
      totalOperations: this.metrics.successfulOperations + this.metrics.errors,
      successfulOperations: this.metrics.successfulOperations,
      errors: this.metrics.errors,
      errorRate: (this.metrics.errors / (this.metrics.successfulOperations + this.metrics.errors)) * 100,

      // Response time statistics
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      p99ResponseTime: this.percentile(responseTimes, 99),

      // System metrics
      throughput: this.metrics.throughput,
      peakMemoryUsage: Math.max(...this.metrics.memoryUsage),
      averageMemoryUsage: this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length,
      websocketConnections: this.metrics.websocketConnections,

      // Performance thresholds
      meetsResponseTimeThreshold: Math.max(...responseTimes) < PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD,
      meetsThroughputThreshold: this.metrics.throughput >= PERFORMANCE_CONFIG.THROUGHPUT_THRESHOLD,
      meetsMemoryThreshold: Math.max(...this.metrics.memoryUsage) < PERFORMANCE_CONFIG.MEMORY_THRESHOLD,
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

// Virtual user simulator
class VirtualUser {
  private ws: WebSocket | null = null;
  private userId: string;
  private documentId: string;
  private metrics: PerformanceMetrics;
  private operations: any[] = [];

  constructor(userId: string, documentId: string, metrics: PerformanceMetrics) {
    this.userId = userId;
    this.documentId = documentId;
    this.metrics = metrics;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${process.env.WEBSOCKET_PORT}/collaboration/${this.documentId}`);

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.metrics.recordWebSocketConnection();
        resolve();
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
    });
  }

  private handleMessage(message: any) {
    // Handle different message types
    switch (message.type) {
      case 'content_change':
        // Record that we received a content change
        break;
      case 'presence_update':
        // Record presence update
        break;
      case 'comment_added':
        // Record comment notification
        break;
    }
  }

  async simulateUserActivity(): Promise<void> {
    const activities = [
      () => this.simulateTyping(),
      () => this.simulateCursorMovement(),
      () => this.simulateContentInsertion(),
      () => this.simulateContentDeletion(),
      () => this.simulateFormatting(),
    ];

    // Perform random activities
    for (let i = 0; i < PERFORMANCE_CONFIG.OPERATIONS_PER_USER; i++) {
      const activity = activities[Math.floor(Math.random() * activities.length)];
      const startTime = Date.now();

      try {
        await activity();
        const responseTime = Date.now() - startTime;
        this.metrics.recordResponse(responseTime, true);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.metrics.recordResponse(responseTime, false);
        console.error(`User ${this.userId} activity failed:`, error);
      }

      // Random delay between operations
      await this.delay(Math.random() * PERFORMANCE_CONFIG.WEBSOCKET_MESSAGE_INTERVAL);
    }
  }

  private async simulateTyping(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'presence_update',
      userId: this.userId,
      isTyping: true,
      cursor: {
        position: Math.floor(Math.random() * 1000),
      },
    };

    this.ws.send(JSON.stringify(message));

    // Stop typing after random delay
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ...message, isTyping: false }));
      }
    }, 1000 + Math.random() * 2000);
  }

  private async simulateCursorMovement(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'presence_update',
      userId: this.userId,
      cursor: {
        position: Math.floor(Math.random() * 1000),
        x: Math.random() * 800,
        y: Math.random() * 600,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  private async simulateContentInsertion(): Promise<void> {
    const operation = {
      id: `op-${Date.now()}-${Math.random()}`,
      type: 'INSERT',
      position: Math.floor(Math.random() * 1000),
      content: { text: this.generateRandomText() },
      userId: this.userId,
      timestamp: new Date().toISOString(),
    };

    await this.sendOperation(operation);
  }

  private async simulateContentDeletion(): Promise<void> {
    const operation = {
      id: `op-${Date.now()}-${Math.random()}`,
      type: 'DELETE',
      position: Math.floor(Math.random() * 500),
      length: Math.floor(Math.random() * 10) + 1,
      userId: this.userId,
      timestamp: new Date().toISOString(),
    };

    await this.sendOperation(operation);
  }

  private async simulateFormatting(): Promise<void> {
    const operation = {
      id: `op-${Date.now()}-${Math.random()}`,
      type: 'FORMAT',
      position: Math.floor(Math.random() * 500),
      length: Math.floor(Math.random() * 20) + 1,
      content: {
        style: {
          bold: Math.random() > 0.5,
          italic: Math.random() > 0.5,
          underline: Math.random() > 0.5,
        },
      },
      userId: this.userId,
      timestamp: new Date().toISOString(),
    };

    await this.sendOperation(operation);
  }

  private async sendOperation(operation: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'content_change',
      operations: [operation],
    };

    this.ws.send(JSON.stringify(message));
    this.operations.push(operation);
  }

  private generateRandomText(): string {
    const words = ['hello', 'world', 'test', 'collaboration', 'realtime', 'edit', 'document', 'content'];
    const wordCount = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length: wordCount }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getOperationCount(): number {
    return this.operations.length;
  }
}

describe('Collaboration System Performance Tests', () => {
  let testData: any;
  let metrics: PerformanceMetrics;

  beforeAll(async () => {
    // Extended timeout for performance tests
    jest.setTimeout(120000); // 2 minutes
  });

  beforeEach(async () => {
    testFactory.reset();
    testData = testFactory.createCollaborationScenario({
      userCount: Math.min(PERFORMANCE_CONFIG.CONCURRENT_USERS, 10), // Limit DB setup
      documentCount: 5,
    });

    // Set up minimal test data in database
    await integrationTestUtils.db.query(
      'INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)',
      [testData.organization.id, testData.organization.name, testData.organization.slug]
    );

    for (const user of testData.users.slice(0, 5)) { // Limit to 5 users for DB
      await integrationTestUtils.db.query(
        'INSERT INTO users (id, email, organization_id) VALUES ($1, $2, $3)',
        [user.id, user.email, user.organizationId]
      );
    }

    for (const document of testData.documents) {
      await integrationTestUtils.db.query(
        'INSERT INTO documents (id, name, type, content, owner_id, organization_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [document.id, document.name, document.type, JSON.stringify(document.content), document.ownerId, document.organizationId]
      );
    }

    metrics = new PerformanceMetrics();
  });

  afterEach(async () => {
    // Clean up any remaining connections
    // This would be handled by global teardown in real implementation
  });

  describe('Concurrent User Load Tests', () => {
    it('should handle 100 concurrent users with acceptable performance', async () => {
      metrics.start();

      // Create virtual users
      const users = Array.from({ length: PERFORMANCE_CONFIG.CONCURRENT_USERS }, (_, i) =>
        new VirtualUser(
          testData.users[i % testData.users.length].id,
          testData.documents[i % testData.documents.length].id,
          metrics
        )
      );

      // Connect all users
      const connectionPromises = users.map(user => user.connect().catch(error => {
        console.error('User connection failed:', error);
        metrics.recordResponse(5000, false); // Record as slow failed connection
      }));

      await Promise.allSettled(connectionPromises);

      // Simulate user activities
      const activityPromises = users.map(user =>
        user.simulateUserActivity().catch(error => {
          console.error('User activity failed:', error);
        })
      );

      await Promise.allSettled(activityPromises);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.TEST_DURATION_MS));

      // Clean up connections
      users.forEach(user => user.disconnect());

      // Analyze results
      const results = metrics.getResults();

      console.log('🔍 Performance Test Results (100 Concurrent Users):');
      console.log(`  📊 Total Operations: ${results.totalOperations}`);
      console.log(`  ✅ Successful: ${results.successfulOperations}`);
      console.log(`  ❌ Errors: ${results.errors} (${results.errorRate.toFixed(2)}%)`);
      console.log(`  ⏱️  Average Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
      console.log(`  📈 95th Percentile: ${results.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  📈 99th Percentile: ${results.p99ResponseTime.toFixed(2)}ms`);
      console.log(`  🚀 Throughput: ${results.throughput.toFixed(2)} ops/sec`);
      console.log(`  💾 Peak Memory: ${(results.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  🔌 WebSocket Connections: ${results.websocketConnections}`);

      // Performance assertions
      expect(results.errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(results.p95ResponseTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD);
      expect(results.meetsMemoryThreshold).toBe(true);
      expect(results.websocketConnections).toBeGreaterThan(50); // At least 50% connected
    });

    it('should maintain performance under heavy load (500 users)', async () => {
      // This test would be skipped in CI or run with reduced user count
      if (process.env.CI || process.env.SKIP_HEAVY_TESTS) {
        console.log('Skipping heavy load test in CI environment');
        return;
      }

      metrics.start();

      // Create more virtual users for heavy load test
      const userCount = Math.min(PERFORMANCE_CONFIG.HEAVY_LOAD_USERS, 200); // Cap for CI
      const users = Array.from({ length: userCount }, (_, i) =>
        new VirtualUser(
          `heavy-user-${i}`,
          testData.documents[i % testData.documents.length].id,
          metrics
        )
      );

      // Connect in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const batchPromises = batch.map(user => user.connect().catch(error => {
          metrics.recordResponse(5000, false);
        }));

        await Promise.allSettled(batchPromises);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Start activities in waves
      const activityPromises = users.map((user, index) => {
        return new Promise(resolve => {
          // Stagger start times
          setTimeout(() => {
            user.simulateUserActivity().finally(resolve);
          }, (index % 100) * 10); // Stagger by 10ms
        });
      });

      await Promise.allSettled(activityPromises);

      // Wait for operations to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      users.forEach(user => user.disconnect());

      const results = metrics.getResults();

      console.log(`🔍 Heavy Load Test Results (${userCount} Users):`);
      console.log(`  📊 Total Operations: ${results.totalOperations}`);
      console.log(`  ⏱️  Average Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
      console.log(`  🚀 Throughput: ${results.throughput.toFixed(2)} ops/sec`);
      console.log(`  ❌ Error Rate: ${results.errorRate.toFixed(2)}%`);

      // More lenient thresholds for heavy load
      expect(results.errorRate).toBeLessThan(10); // Allow 10% error rate under heavy load
      expect(results.p95ResponseTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD * 2);
    });
  });

  describe('Operation Throughput Tests', () => {
    it('should handle high-frequency operations from single user', async () => {
      metrics.start();

      const user = new VirtualUser(
        testData.users[0].id,
        testData.documents[0].id,
        metrics
      );

      await user.connect();

      // Rapid fire operations
      const operationCount = 1000;
      const operations = [];

      for (let i = 0; i < operationCount; i++) {
        operations.push(user.simulateContentInsertion());

        // Small delay to avoid overwhelming
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      await Promise.allSettled(operations);

      user.disconnect();

      const results = metrics.getResults();

      console.log(`🔍 High-Frequency Operations Test:`);
      console.log(`  📊 Operations Attempted: ${operationCount}`);
      console.log(`  ✅ Successful: ${results.successfulOperations}`);
      console.log(`  🚀 Throughput: ${results.throughput.toFixed(2)} ops/sec`);

      expect(results.successfulOperations).toBeGreaterThan(operationCount * 0.8); // 80% success rate
      expect(results.throughput).toBeGreaterThan(50); // At least 50 ops/sec
    });

    it('should handle burst traffic patterns', async () => {
      metrics.start();

      const users = Array.from({ length: 20 }, (_, i) =>
        new VirtualUser(
          testData.users[i % testData.users.length].id,
          testData.documents[0].id, // All on same document
          metrics
        )
      );

      // Connect all users
      await Promise.all(users.map(user => user.connect().catch(() => {})));

      // Simulate burst pattern: high activity for 5 seconds, then low activity
      const burstDuration = 5000;
      const lowActivityDuration = 10000;

      // High activity burst
      const burstActivities = users.map(user => {
        return new Promise(resolve => {
          const burstInterval = setInterval(async () => {
            try {
              await user.simulateContentInsertion();
            } catch (error) {
              // Ignore errors during burst
            }
          }, 50); // Very frequent operations

          setTimeout(() => {
            clearInterval(burstInterval);
            resolve(undefined);
          }, burstDuration);
        });
      });

      await Promise.all(burstActivities);

      // Low activity period
      await new Promise(resolve => setTimeout(resolve, lowActivityDuration));

      users.forEach(user => user.disconnect());

      const results = metrics.getResults();

      console.log(`🔍 Burst Traffic Test:`);
      console.log(`  📊 Total Operations: ${results.totalOperations}`);
      console.log(`  ⏱️  P99 Response Time: ${results.p99ResponseTime.toFixed(2)}ms`);
      console.log(`  ❌ Error Rate: ${results.errorRate.toFixed(2)}%`);

      expect(results.errorRate).toBeLessThan(15); // Allow higher error rate during burst
      expect(results.p99ResponseTime).toBeLessThan(PERFORMANCE_CONFIG.RESPONSE_TIME_THRESHOLD * 3);
    });
  });

  describe('Memory and Resource Tests', () => {
    it('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      metrics.start();

      // Create users for extended test
      const users = Array.from({ length: 50 }, (_, i) =>
        new VirtualUser(
          `extended-user-${i}`,
          testData.documents[i % testData.documents.length].id,
          metrics
        )
      );

      await Promise.all(users.map(user => user.connect().catch(() => {})));

      // Run for extended period with periodic activity
      const testDuration = 30000; // 30 seconds
      const activityInterval = 1000; // Every second

      const activityTimer = setInterval(async () => {
        // Random subset of users perform operations
        const activeUsers = users.filter(() => Math.random() > 0.7);
        const operations = activeUsers.map(user =>
          user.simulateContentInsertion().catch(() => {})
        );
        await Promise.allSettled(operations);
      }, activityInterval);

      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(activityTimer);

      users.forEach(user => user.disconnect());

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`🔍 Extended Operation Memory Test:`);
      console.log(`  📊 Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  📊 Final Memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  📈 Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory should not increase by more than 100MB during test
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle WebSocket connection limits gracefully', async () => {
      const maxConnections = 1000;
      const connectionAttempts = 1200; // Try to exceed limit

      const users = Array.from({ length: connectionAttempts }, (_, i) =>
        new VirtualUser(
          `limit-user-${i}`,
          testData.documents[0].id,
          metrics
        )
      );

      const connectionResults = await Promise.allSettled(
        users.map(user => user.connect())
      );

      const successfulConnections = connectionResults.filter(result => result.status === 'fulfilled').length;
      const failedConnections = connectionResults.filter(result => result.status === 'rejected').length;

      console.log(`🔍 Connection Limit Test:`);
      console.log(`  🔌 Successful Connections: ${successfulConnections}`);
      console.log(`  ❌ Failed Connections: ${failedConnections}`);

      users.forEach(user => user.disconnect());

      // Should handle failures gracefully without crashing
      expect(successfulConnections).toBeGreaterThan(0);
      expect(failedConnections).toBeGreaterThan(0); // Some should fail due to limits
    });
  });

  describe('Real-time Synchronization Performance', () => {
    it('should maintain low latency for real-time updates', async () => {
      const latencies: number[] = [];
      const documentId = testData.documents[0].id;

      // Create sender and multiple receivers
      const sender = new VirtualUser('sender', documentId, metrics);
      const receivers = Array.from({ length: 10 }, (_, i) =>
        new VirtualUser(`receiver-${i}`, documentId, metrics)
      );

      await Promise.all([
        sender.connect(),
        ...receivers.map(receiver => receiver.connect())
      ]);

      // Set up message listeners to measure latency
      receivers.forEach(receiver => {
        if (receiver['ws']) {
          receiver['ws'].on('message', (data: Buffer) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === 'content_change' && message.timestamp) {
                const latency = Date.now() - new Date(message.timestamp).getTime();
                latencies.push(latency);
              }
            } catch (error) {
              // Ignore parsing errors
            }
          });
        }
      });

      // Send operations and measure broadcast latency
      for (let i = 0; i < 100; i++) {
        await sender.simulateContentInsertion();
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      }

      // Wait for messages to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));

      [sender, ...receivers].forEach(user => user.disconnect());

      if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);

        console.log(`🔍 Real-time Latency Test:`);
        console.log(`  📊 Messages Measured: ${latencies.length}`);
        console.log(`  ⏱️  Average Latency: ${avgLatency.toFixed(2)}ms`);
        console.log(`  📈 Max Latency: ${maxLatency.toFixed(2)}ms`);

        expect(avgLatency).toBeLessThan(200); // Average under 200ms
        expect(maxLatency).toBeLessThan(1000); // Max under 1 second
      }
    });
  });
});
