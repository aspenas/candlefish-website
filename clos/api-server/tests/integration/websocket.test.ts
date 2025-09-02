import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { Pool } from 'pg';
import Redis from 'ioredis';
import express from 'express';
import { setupWebSocketServer } from '../../src/websocket/server';

describe('WebSocket Integration Tests', () => {
  let httpServer: any;
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  let pool: Pool;
  let redis: Redis;
  let port: number;

  beforeAll(async () => {
    // Setup database and cache
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5
    });
    
    redis = new Redis(process.env.REDIS_URL!);
    
    // Create HTTP server
    const app = express();
    httpServer = createServer(app);
    
    // Setup Socket.IO server
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Setup WebSocket handlers
    setupWebSocketServer(io, pool, redis);
    
    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  beforeEach(async () => {
    // Create client connection
    clientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket']
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => {
        resolve();
      });
    });

    // Capture server socket
    await new Promise<void>((resolve) => {
      io.on('connection', (socket) => {
        serverSocket = socket;
        resolve();
      });
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (serverSocket) {
      serverSocket.disconnect();
    }
  });

  afterAll(async () => {
    if (httpServer) {
      httpServer.close();
    }
    if (pool) {
      await pool.end();
    }
    if (redis) {
      await redis.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', () => {
      expect(clientSocket.connected).toBe(true);
      expect(serverSocket.connected).toBe(true);
    });

    it('should authenticate user on connection', async () => {
      const authData = {
        token: 'valid-test-token',
        userId: 'test-user-123'
      };

      const responsePromise = new Promise<any>((resolve) => {
        clientSocket.on('auth:success', resolve);
      });

      clientSocket.emit('authenticate', authData);
      const response = await responsePromise;

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('userId', authData.userId);
    });

    it('should handle authentication failure', async () => {
      const authData = {
        token: 'invalid-token'
      };

      const responsePromise = new Promise<any>((resolve) => {
        clientSocket.on('auth:error', resolve);
      });

      clientSocket.emit('authenticate', authData);
      const response = await responsePromise;

      expect(response).toHaveProperty('error');
      expect(response.error).toContain('authentication failed');
    });

    it('should handle user disconnection gracefully', async () => {
      // Track connection state
      let disconnected = false;
      serverSocket.on('disconnect', () => {
        disconnected = true;
      });

      // Disconnect client
      clientSocket.close();

      // Wait for disconnect event
      await testUtils.delay(100);
      expect(disconnected).toBe(true);
    });
  });

  describe('Real-time Analytics Events', () => {
    beforeEach(async () => {
      // Authenticate client for analytics events
      const authPromise = new Promise<void>((resolve) => {
        clientSocket.on('auth:success', () => resolve());
      });

      clientSocket.emit('authenticate', {
        token: 'test-analytics-token',
        userId: 'analytics-user'
      });

      await authPromise;
    });

    it('should broadcast agent performance updates', async () => {
      const performanceData = {
        agent_id: 'test-agent-ws',
        agent_name: 'WebSocket Test Agent',
        metric_type: 'response_time',
        value: 125.7,
        unit: 'ms',
        timestamp: new Date().toISOString()
      };

      const updatePromise = new Promise<any>((resolve) => {
        clientSocket.on('analytics:agent:update', resolve);
      });

      // Simulate server sending analytics update
      io.emit('analytics:agent:update', performanceData);

      const receivedData = await updatePromise;
      expect(receivedData).toMatchObject(performanceData);
    });

    it('should handle service health notifications', async () => {
      const serviceHealth = {
        service_name: 'api-server',
        status: 'degraded',
        response_time_ms: 500,
        error_rate: 5.2,
        timestamp: new Date().toISOString()
      };

      const healthPromise = new Promise<any>((resolve) => {
        clientSocket.on('analytics:service:health', resolve);
      });

      io.emit('analytics:service:health', serviceHealth);

      const receivedHealth = await healthPromise;
      expect(receivedHealth.service_name).toBe(serviceHealth.service_name);
      expect(receivedHealth.status).toBe(serviceHealth.status);
    });

    it('should send system alerts for critical metrics', async () => {
      const criticalAlert = {
        metric_name: 'cpu_usage',
        current_value: 95.8,
        threshold: 90.0,
        severity: 'critical',
        component: 'system',
        message: 'CPU usage critically high',
        timestamp: new Date().toISOString()
      };

      const alertPromise = new Promise<any>((resolve) => {
        clientSocket.on('analytics:system:alert', resolve);
      });

      io.emit('analytics:system:alert', criticalAlert);

      const receivedAlert = await alertPromise;
      expect(receivedAlert.severity).toBe('critical');
      expect(receivedAlert.metric_name).toBe('cpu_usage');
      expect(receivedAlert.current_value).toBe(95.8);
    });

    it('should provide real-time performance trends', async () => {
      const trendData = {
        agent_id: 'trend-agent',
        metric_type: 'response_time',
        trend: 'increasing',
        change_percentage: 15.2,
        period: '1h',
        data_points: [
          { timestamp: '2024-01-01T10:00:00Z', value: 100 },
          { timestamp: '2024-01-01T10:15:00Z', value: 110 },
          { timestamp: '2024-01-01T10:30:00Z', value: 115 }
        ]
      };

      const trendPromise = new Promise<any>((resolve) => {
        clientSocket.on('analytics:trends:update', resolve);
      });

      io.emit('analytics:trends:update', trendData);

      const receivedTrend = await trendPromise;
      expect(receivedTrend.trend).toBe('increasing');
      expect(receivedTrend.change_percentage).toBe(15.2);
      expect(receivedTrend.data_points).toHaveLength(3);
    });
  });

  describe('Real-time Data Subscription', () => {
    it('should handle subscription to agent metrics', async () => {
      const subscriptionRequest = {
        type: 'agent_metrics',
        agent_id: 'subscription-agent',
        interval: 5000 // 5 seconds
      };

      const subscriptionPromise = new Promise<any>((resolve) => {
        clientSocket.on('subscription:confirmed', resolve);
      });

      clientSocket.emit('subscribe', subscriptionRequest);

      const confirmation = await subscriptionPromise;
      expect(confirmation.type).toBe('agent_metrics');
      expect(confirmation.agent_id).toBe('subscription-agent');
      expect(confirmation.interval).toBe(5000);
    });

    it('should handle subscription to service health', async () => {
      const subscriptionRequest = {
        type: 'service_health',
        services: ['api-server', 'web-dashboard'],
        include_details: true
      };

      const subscriptionPromise = new Promise<any>((resolve) => {
        clientSocket.on('subscription:confirmed', resolve);
      });

      clientSocket.emit('subscribe', subscriptionRequest);

      const confirmation = await subscriptionPromise;
      expect(confirmation.type).toBe('service_health');
      expect(confirmation.services).toEqual(['api-server', 'web-dashboard']);
    });

    it('should unsubscribe from metrics streams', async () => {
      // First, subscribe
      clientSocket.emit('subscribe', {
        type: 'agent_metrics',
        agent_id: 'test-unsubscribe'
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('subscription:confirmed', () => resolve());
      });

      // Then unsubscribe
      const unsubscribePromise = new Promise<any>((resolve) => {
        clientSocket.on('subscription:removed', resolve);
      });

      clientSocket.emit('unsubscribe', {
        type: 'agent_metrics',
        agent_id: 'test-unsubscribe'
      });

      const removal = await unsubscribePromise;
      expect(removal.type).toBe('agent_metrics');
      expect(removal.agent_id).toBe('test-unsubscribe');
    });

    it('should handle subscription errors gracefully', async () => {
      const invalidSubscription = {
        type: 'invalid_type'
      };

      const errorPromise = new Promise<any>((resolve) => {
        clientSocket.on('subscription:error', resolve);
      });

      clientSocket.emit('subscribe', invalidSubscription);

      const error = await errorPromise;
      expect(error).toHaveProperty('error');
      expect(error.error).toContain('invalid subscription type');
    });
  });

  describe('Broadcasting and Room Management', () => {
    it('should join analytics room based on user role', async () => {
      const rolePromise = new Promise<any>((resolve) => {
        clientSocket.on('room:joined', resolve);
      });

      clientSocket.emit('join:analytics', {
        role: 'admin',
        departments: ['engineering', 'operations']
      });

      const roomInfo = await rolePromise;
      expect(roomInfo.room).toBe('analytics:admin');
      expect(roomInfo.permissions).toContain('view_all_metrics');
    });

    it('should broadcast to specific rooms only', async () => {
      // Create another client for testing room isolation
      const client2 = Client(`http://localhost:${port}`);
      let client2Messages: any[] = [];

      await new Promise<void>((resolve) => {
        client2.on('connect', () => resolve());
      });

      // Client 1 joins admin room
      clientSocket.emit('join:analytics', { role: 'admin' });

      // Client 2 joins viewer room  
      client2.emit('join:analytics', { role: 'viewer' });

      // Set up message capture
      client2.on('analytics:admin:message', (data: any) => {
        client2Messages.push(data);
      });

      await testUtils.delay(100);

      // Send admin-only message
      io.to('analytics:admin').emit('analytics:admin:message', {
        message: 'Admin only content'
      });

      await testUtils.delay(100);

      // Viewer should not receive admin messages
      expect(client2Messages).toHaveLength(0);

      client2.close();
    });

    it('should handle room leave operations', async () => {
      // Join room first
      clientSocket.emit('join:analytics', { role: 'admin' });

      await new Promise<void>((resolve) => {
        clientSocket.on('room:joined', () => resolve());
      });

      // Leave room
      const leavePromise = new Promise<any>((resolve) => {
        clientSocket.on('room:left', resolve);
      });

      clientSocket.emit('leave:analytics');

      const leaveInfo = await leavePromise;
      expect(leaveInfo.room).toBe('analytics:admin');
      expect(leaveInfo.status).toBe('left');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed event data', async () => {
      const errorPromise = new Promise<any>((resolve) => {
        clientSocket.on('error:malformed', resolve);
      });

      // Send malformed data
      clientSocket.emit('subscribe', 'invalid-data');

      const error = await errorPromise;
      expect(error.error).toContain('malformed request');
    });

    it('should reconnect automatically after disconnection', async () => {
      // Enable auto-reconnection
      clientSocket.io.opts.autoConnect = true;
      clientSocket.io.opts.reconnection = true;
      clientSocket.io.opts.reconnectionAttempts = 3;
      clientSocket.io.opts.reconnectionDelay = 100;

      let reconnected = false;
      clientSocket.on('reconnect', () => {
        reconnected = true;
      });

      // Force disconnect
      serverSocket.disconnect(true);

      // Wait for reconnection
      await testUtils.delay(500);
      expect(reconnected).toBe(true);
    });

    it('should handle rate limiting on events', async () => {
      const rateLimitPromise = new Promise<any>((resolve) => {
        clientSocket.on('rate_limit:exceeded', resolve);
      });

      // Send many requests rapidly
      for (let i = 0; i < 100; i++) {
        clientSocket.emit('subscribe', { type: 'test', id: i });
      }

      const rateLimitResponse = await rateLimitPromise;
      expect(rateLimitResponse.error).toContain('rate limit exceeded');
    });

    it('should validate event payload structure', async () => {
      const validationPromise = new Promise<any>((resolve) => {
        clientSocket.on('validation:error', resolve);
      });

      clientSocket.emit('analytics:submit', {
        // Missing required fields
        incomplete: true
      });

      const validation = await validationPromise;
      expect(validation.error).toContain('validation failed');
      expect(validation.missing_fields).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent connections', async () => {
      const clients: any[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const client = Client(`http://localhost:${port}`);
        clients.push(client);

        connectionPromises.push(
          new Promise<void>((resolve) => {
            client.on('connect', () => resolve());
          })
        );
      }

      // Wait for all connections
      await Promise.all(connectionPromises);

      // Verify all connected
      expect(clients.every(client => client.connected)).toBe(true);

      // Clean up
      clients.forEach(client => client.close());
    });

    it('should maintain performance under event load', async () => {
      const startTime = Date.now();
      const messageCount = 1000;
      let receivedCount = 0;

      clientSocket.on('performance:test', () => {
        receivedCount++;
      });

      // Send many events
      for (let i = 0; i < messageCount; i++) {
        io.emit('performance:test', { id: i });
      }

      // Wait for all messages
      while (receivedCount < messageCount && Date.now() - startTime < 5000) {
        await testUtils.delay(10);
      }

      const duration = Date.now() - startTime;
      const messagesPerSecond = messageCount / (duration / 1000);

      expect(receivedCount).toBe(messageCount);
      expect(messagesPerSecond).toBeGreaterThan(100); // At least 100 msg/sec
    });

    it('should handle memory efficiently with large payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB string
        metrics: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random() * 1000,
          timestamp: new Date().toISOString()
        }))
      };

      const receivePromise = new Promise<any>((resolve) => {
        clientSocket.on('large:payload', resolve);
      });

      io.emit('large:payload', largePayload);

      const received = await receivePromise;
      expect(received.data).toHaveLength(10000);
      expect(received.metrics).toHaveLength(1000);
    });
  });
});