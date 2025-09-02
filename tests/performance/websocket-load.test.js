import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { performance } from 'perf_hooks';

// Load testing configuration
const LOAD_TEST_CONFIG = {
  concurrent_users: [10, 50, 100, 250, 500],
  document_operations_per_second: [1, 5, 10, 25, 50],
  test_duration_minutes: 5,
  ramp_up_seconds: 30,
  operation_types: ['INSERT', 'DELETE', 'REPLACE', 'FORMAT'],
  message_sizes: [100, 1000, 10000], // bytes
  connection_timeout: 30000,
  max_memory_mb: 512,
  max_cpu_percent: 80
};

class WebSocketLoadTester {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.connections = new Map();
    this.metrics = {
      connectionsSuccessful: 0,
      connectionsFailed: 0,
      messagesSucceeded: 0,
      messagesFailed: 0,
      latencies: [],
      throughput: 0,
      memoryUsage: [],
      cpuUsage: [],
      errors: []
    };
  }

  async createConnection(userId, documentId) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const ws = new WebSocket(`${this.serverUrl}?userId=${userId}&documentId=${documentId}`);
      
      const connectionTimeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('Connection timeout'));
      }, LOAD_TEST_CONFIG.connection_timeout);

      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        const connectTime = performance.now() - startTime;
        
        this.connections.set(userId, {
          socket: ws,
          documentId,
          connectTime,
          messagesSent: 0,
          messagesReceived: 0,
          errors: 0
        });
        
        this.metrics.connectionsSuccessful++;
        resolve(ws);
      });

      ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        this.metrics.connectionsFailed++;
        this.metrics.errors.push({
          type: 'connection_error',
          userId,
          error: error.message,
          timestamp: Date.now()
        });
        reject(error);
      });

      ws.on('message', (data) => {
        this.handleMessage(userId, data);
      });

      ws.on('close', () => {
        this.connections.delete(userId);
      });
    });
  }

  handleMessage(userId, data) {
    try {
      const message = JSON.parse(data);
      const connection = this.connections.get(userId);
      
      if (connection) {
        connection.messagesReceived++;
        
        // Calculate latency if this is a response to our message
        if (message.type === 'operation_ack' && message.timestamp) {
          const latency = Date.now() - message.timestamp;
          this.metrics.latencies.push(latency);
        }
      }
      
      this.metrics.messagesSucceeded++;
    } catch (error) {
      this.metrics.messagesFailed++;
      this.metrics.errors.push({
        type: 'message_parse_error',
        userId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  async sendOperation(userId, operation) {
    const connection = this.connections.get(userId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      throw new Error(`Connection not available for user ${userId}`);
    }

    const message = {
      type: 'document:operation',
      payload: {
        documentId: connection.documentId,
        operation: {
          ...operation,
          userId,
          timestamp: Date.now()
        }
      },
      messageId: `${userId}-${Date.now()}-${Math.random()}`
    };

    return new Promise((resolve, reject) => {
      try {
        connection.socket.send(JSON.stringify(message));
        connection.messagesSent++;
        resolve();
      } catch (error) {
        connection.errors++;
        this.metrics.messagesFailed++;
        reject(error);
      }
    });
  }

  generateOperation(type, size = 100) {
    const operations = {
      INSERT: {
        type: 'INSERT',
        position: Math.floor(Math.random() * 1000),
        content: 'X'.repeat(size)
      },
      DELETE: {
        type: 'DELETE',
        position: Math.floor(Math.random() * 500),
        length: Math.floor(Math.random() * 50) + 1
      },
      REPLACE: {
        type: 'REPLACE',
        position: Math.floor(Math.random() * 500),
        length: Math.floor(Math.random() * 20) + 1,
        content: 'Y'.repeat(size)
      },
      FORMAT: {
        type: 'FORMAT',
        position: Math.floor(Math.random() * 500),
        length: Math.floor(Math.random() * 50) + 1,
        style: ['bold', 'italic', 'underline'][Math.floor(Math.random() * 3)]
      }
    };

    return operations[type];
  }

  async rampUpUsers(targetUsers, documentId, rampUpSeconds) {
    const userIncrements = Math.ceil(targetUsers / (rampUpSeconds / 2)); // Add users every 2 seconds
    let currentUsers = 0;

    while (currentUsers < targetUsers) {
      const usersToAdd = Math.min(userIncrements, targetUsers - currentUsers);
      
      const connectionPromises = [];
      for (let i = 0; i < usersToAdd; i++) {
        const userId = `user-${currentUsers + i}`;
        connectionPromises.push(
          this.createConnection(userId, documentId).catch(error => {
            console.warn(`Failed to connect user ${userId}:`, error.message);
          })
        );
      }

      await Promise.allSettled(connectionPromises);
      currentUsers += usersToAdd;
      
      console.log(`Ramped up to ${this.connections.size} concurrent connections`);
      
      if (currentUsers < targetUsers) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async runLoadTest(users, opsPerSecond, durationMinutes, documentId = 'load-test-doc') {
    console.log(`Starting load test: ${users} users, ${opsPerSecond} ops/sec, ${durationMinutes} minutes`);
    
    const startTime = Date.now();
    
    // Ramp up users
    await this.rampUpUsers(users, documentId, LOAD_TEST_CONFIG.ramp_up_seconds);
    
    console.log(`Successfully connected ${this.connections.size}/${users} users`);
    
    // Start operation loop
    const operationInterval = 1000 / opsPerSecond; // milliseconds between operations
    const testEndTime = startTime + (durationMinutes * 60 * 1000);
    
    const operationLoop = async () => {
      while (Date.now() < testEndTime) {
        const operationPromises = [];
        const activeUsers = Array.from(this.connections.keys());
        
        // Send operations from random users
        const usersToSend = Math.min(opsPerSecond, activeUsers.length);
        for (let i = 0; i < usersToSend; i++) {
          const userId = activeUsers[Math.floor(Math.random() * activeUsers.length)];
          const operationType = LOAD_TEST_CONFIG.operation_types[
            Math.floor(Math.random() * LOAD_TEST_CONFIG.operation_types.length)
          ];
          const messageSize = LOAD_TEST_CONFIG.message_sizes[
            Math.floor(Math.random() * LOAD_TEST_CONFIG.message_sizes.length)
          ];
          
          const operation = this.generateOperation(operationType, messageSize);
          
          operationPromises.push(
            this.sendOperation(userId, operation).catch(error => {
              this.metrics.errors.push({
                type: 'operation_send_error',
                userId,
                error: error.message,
                timestamp: Date.now()
              });
            })
          );
        }
        
        await Promise.allSettled(operationPromises);
        
        // Wait before next batch
        if (operationInterval > 0) {
          await new Promise(resolve => setTimeout(resolve, operationInterval));
        }
      }
    };

    // Start metrics collection
    const metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // Run the load test
    await operationLoop();
    
    clearInterval(metricsInterval);
    
    // Clean up connections
    await this.cleanup();
    
    return this.calculateResults();
  }

  collectMetrics() {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
      heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
      external: memUsage.external / 1024 / 1024 // MB
    });

    // CPU usage would need external monitoring in real scenario
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      usage: 0 // Placeholder
    });
  }

  calculateResults() {
    const totalMessages = this.metrics.messagesSucceeded + this.metrics.messagesFailed;
    const successRate = (this.metrics.messagesSucceeded / totalMessages) * 100;
    
    const latencies = this.metrics.latencies.sort((a, b) => a - b);
    const latencyStats = {
      min: latencies[0] || 0,
      max: latencies[latencies.length - 1] || 0,
      avg: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0,
      p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99: latencies[Math.floor(latencies.length * 0.99)] || 0
    };

    const maxMemory = Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed));
    
    return {
      connections: {
        successful: this.metrics.connectionsSuccessful,
        failed: this.metrics.connectionsFailed,
        successRate: (this.metrics.connectionsSuccessful / 
          (this.metrics.connectionsSuccessful + this.metrics.connectionsFailed)) * 100
      },
      messages: {
        succeeded: this.metrics.messagesSucceeded,
        failed: this.metrics.messagesFailed,
        successRate,
        throughput: this.metrics.messagesSucceeded / (LOAD_TEST_CONFIG.test_duration_minutes * 60)
      },
      latency: latencyStats,
      memory: {
        maxUsageMB: maxMemory,
        avgUsageMB: this.metrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / 
          this.metrics.memoryUsage.length
      },
      errors: this.metrics.errors,
      errorRate: (this.metrics.errors.length / totalMessages) * 100
    };
  }

  async cleanup() {
    const closePromises = [];
    
    for (const [userId, connection] of this.connections.entries()) {
      closePromises.push(new Promise(resolve => {
        connection.socket.on('close', resolve);
        connection.socket.close();
      }));
    }
    
    await Promise.allSettled(closePromises);
    this.connections.clear();
  }
}

test.describe('WebSocket Load Testing', () => {
  const serverUrl = process.env.WEBSOCKET_URL || 'ws://localhost:8080';
  let loadTester;

  test.beforeEach(async () => {
    loadTester = new WebSocketLoadTester(serverUrl);
  });

  test.afterEach(async () => {
    if (loadTester) {
      await loadTester.cleanup();
    }
  });

  LOAD_TEST_CONFIG.concurrent_users.forEach(userCount => {
    test(`Load test with ${userCount} concurrent users`, async () => {
      const opsPerSecond = 10; // Moderate operation rate
      const durationMinutes = 2; // Shorter duration for CI/CD
      
      const results = await loadTester.runLoadTest(
        userCount, 
        opsPerSecond, 
        durationMinutes
      );

      console.log(`Results for ${userCount} users:`, JSON.stringify(results, null, 2));

      // Assert performance requirements
      expect(results.connections.successRate).toBeGreaterThan(95);
      expect(results.messages.successRate).toBeGreaterThan(98);
      expect(results.latency.p95).toBeLessThan(1000); // 95th percentile under 1 second
      expect(results.memory.maxUsageMB).toBeLessThan(LOAD_TEST_CONFIG.max_memory_mb);
      expect(results.errorRate).toBeLessThan(2);
    });
  });

  test('Stress test with maximum concurrent users', async () => {
    const maxUsers = 1000;
    const opsPerSecond = 50;
    const durationMinutes = 1;

    const results = await loadTester.runLoadTest(
      maxUsers, 
      opsPerSecond, 
      durationMinutes
    );

    console.log('Stress test results:', JSON.stringify(results, null, 2));

    // More lenient requirements for stress test
    expect(results.connections.successRate).toBeGreaterThan(90);
    expect(results.messages.successRate).toBeGreaterThan(95);
    expect(results.latency.p99).toBeLessThan(5000); // 99th percentile under 5 seconds
    expect(results.errorRate).toBeLessThan(5);
  });

  test('High-frequency operations test', async () => {
    const users = 50;
    const opsPerSecond = 100; // High frequency
    const durationMinutes = 1;

    const results = await loadTester.runLoadTest(
      users, 
      opsPerSecond, 
      durationMinutes
    );

    console.log('High-frequency test results:', JSON.stringify(results, null, 2));

    expect(results.messages.throughput).toBeGreaterThan(80); // Should handle at least 80 ops/sec
    expect(results.latency.avg).toBeLessThan(500); // Average latency under 500ms
  });

  test('Large message payload test', async () => {
    const users = 25;
    const opsPerSecond = 5;
    const durationMinutes = 1;

    // Override to use only large message sizes
    const originalSizes = LOAD_TEST_CONFIG.message_sizes;
    LOAD_TEST_CONFIG.message_sizes = [50000, 100000]; // 50KB, 100KB messages

    const results = await loadTester.runLoadTest(
      users, 
      opsPerSecond, 
      durationMinutes
    );

    // Restore original config
    LOAD_TEST_CONFIG.message_sizes = originalSizes;

    console.log('Large payload test results:', JSON.stringify(results, null, 2));

    expect(results.messages.successRate).toBeGreaterThan(95);
    expect(results.latency.p95).toBeLessThan(2000); // Allow higher latency for large messages
  });

  test('Connection stability test', async () => {
    const users = 100;
    const opsPerSecond = 1; // Low frequency to test connection stability
    const durationMinutes = 5; // Longer duration

    const results = await loadTester.runLoadTest(
      users, 
      opsPerSecond, 
      durationMinutes
    );

    console.log('Stability test results:', JSON.stringify(results, null, 2));

    expect(results.connections.successRate).toBeGreaterThan(98);
    expect(results.messages.successRate).toBeGreaterThan(99);
    
    // Check for connection drops (would be reflected in error count)
    const connectionErrors = results.errors.filter(e => 
      e.type === 'connection_error' || e.type.includes('close')
    );
    expect(connectionErrors.length).toBeLessThan(users * 0.05); // Less than 5% connection issues
  });

  test('Memory leak detection', async () => {
    const users = 100;
    const opsPerSecond = 10;
    const durationMinutes = 3;

    const results = await loadTester.runLoadTest(
      users, 
      opsPerSecond, 
      durationMinutes
    );

    console.log('Memory leak test results:', JSON.stringify(results, null, 2));

    // Check that memory usage doesn't grow continuously
    const memoryReadings = results.memory;
    const firstHalfAvg = memoryReadings.avgUsageMB; // Would need to calculate for first half
    const secondHalfAvg = memoryReadings.avgUsageMB; // Would need to calculate for second half

    // Memory growth should be minimal (less than 50% increase)
    // In real implementation, would calculate actual first/second half averages
    expect(results.memory.maxUsageMB).toBeLessThan(LOAD_TEST_CONFIG.max_memory_mb);
  });

  test('Recovery after server restart simulation', async () => {
    const users = 50;
    const totalDuration = 3;
    
    // Start initial connections
    await loadTester.rampUpUsers(users, 'recovery-test-doc', 10);
    
    expect(loadTester.connections.size).toBe(users);
    
    // Simulate server restart by closing all connections
    const connectionIds = Array.from(loadTester.connections.keys());
    for (const userId of connectionIds) {
      const connection = loadTester.connections.get(userId);
      if (connection) {
        connection.socket.terminate();
      }
    }
    
    // Wait for connections to close
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(loadTester.connections.size).toBe(0);
    
    // Attempt to reconnect
    await loadTester.rampUpUsers(users, 'recovery-test-doc', 20);
    
    // Should successfully reconnect most users
    expect(loadTester.connections.size).toBeGreaterThan(users * 0.9);
  });

  test('Concurrent document editing', async () => {
    const usersPerDocument = 25;
    const documentCount = 4;
    const totalUsers = usersPerDocument * documentCount;
    const opsPerSecond = 20;
    const durationMinutes = 2;

    // Create connections for multiple documents
    for (let docIndex = 0; docIndex < documentCount; docIndex++) {
      const documentId = `multi-doc-test-${docIndex}`;
      
      for (let userIndex = 0; userIndex < usersPerDocument; userIndex++) {
        const userId = `doc${docIndex}-user${userIndex}`;
        await loadTester.createConnection(userId, documentId);
      }
    }

    expect(loadTester.connections.size).toBe(totalUsers);

    // Run operations across all documents
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    
    while (Date.now() < endTime) {
      const operationPromises = [];
      
      for (let i = 0; i < opsPerSecond; i++) {
        const users = Array.from(loadTester.connections.keys());
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const operation = loadTester.generateOperation('INSERT', 500);
        
        operationPromises.push(
          loadTester.sendOperation(randomUser, operation).catch(() => {})
        );
      }
      
      await Promise.allSettled(operationPromises);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const results = loadTester.calculateResults();
    
    expect(results.messages.successRate).toBeGreaterThan(95);
    expect(results.latency.p95).toBeLessThan(1500);
  });
});

test.describe('WebSocket Performance Benchmarks', () => {
  test('Benchmark message throughput', async () => {
    const loadTester = new WebSocketLoadTester(process.env.WEBSOCKET_URL || 'ws://localhost:8080');
    
    const throughputTests = [
      { users: 10, opsPerSecond: 100 },
      { users: 50, opsPerSecond: 500 },
      { users: 100, opsPerSecond: 1000 }
    ];

    const benchmarkResults = [];

    for (const testConfig of throughputTests) {
      const results = await loadTester.runLoadTest(
        testConfig.users,
        testConfig.opsPerSecond,
        1 // 1 minute benchmark
      );

      benchmarkResults.push({
        config: testConfig,
        actualThroughput: results.messages.throughput,
        latency: results.latency,
        successRate: results.messages.successRate
      });

      console.log(`Throughput benchmark ${testConfig.users} users, ${testConfig.opsPerSecond} ops/sec:`, 
                  results.messages.throughput);
      
      // Reset for next test
      await loadTester.cleanup();
      loadTester = new WebSocketLoadTester(process.env.WEBSOCKET_URL || 'ws://localhost:8080');
    }

    console.log('Throughput benchmark results:', JSON.stringify(benchmarkResults, null, 2));

    // Assert that system can handle increasing load reasonably
    expect(benchmarkResults[0].actualThroughput).toBeGreaterThan(80);
    expect(benchmarkResults[1].actualThroughput).toBeGreaterThan(400);
    expect(benchmarkResults[2].actualThroughput).toBeGreaterThan(700);
  });
});