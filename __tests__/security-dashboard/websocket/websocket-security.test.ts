import { io, Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateMockEvent, generateMockThreat, generateMockIncident } from '../mocks/security-data';

// Mock server setup for WebSocket testing
class MockSecurityWebSocketServer {
  private httpServer: any;
  private io: Server;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.httpServer = createServer();
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.use((socket, next) => {
      // JWT authentication middleware
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, 'test-secret');
        socket.userId = (decoded as any).sub;
        socket.organizationId = (decoded as any).organizationId;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected to organization ${socket.organizationId}`);

      // Join organization-specific room
      socket.join(`org:${socket.organizationId}`);
      socket.join(`user:${socket.userId}`);

      // Handle subscription to security events
      socket.on('subscribe:security-events', (filters) => {
        socket.join('security-events');
        socket.emit('subscribed', { channel: 'security-events', filters });
      });

      // Handle subscription to threat updates
      socket.on('subscribe:threats', (filters) => {
        socket.join('threats');
        socket.emit('subscribed', { channel: 'threats', filters });
      });

      // Handle subscription to incident updates
      socket.on('subscribe:incidents', (filters) => {
        socket.join('incidents');
        socket.emit('subscribed', { channel: 'incidents', filters });
      });

      // Handle dashboard subscription
      socket.on('subscribe:dashboard', () => {
        socket.join('dashboard');
        socket.emit('subscribed', { channel: 'dashboard' });
      });

      // Handle acknowledgment of security events
      socket.on('acknowledge-event', (eventId) => {
        // Broadcast acknowledgment to other users in the organization
        socket.to(`org:${socket.organizationId}`).emit('event-acknowledged', {
          eventId,
          acknowledgedBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
        
        socket.emit('ack-confirmed', { eventId });
      });

      // Handle incident status updates
      socket.on('update-incident-status', (data) => {
        const { incidentId, status } = data;
        // Broadcast status update to organization
        this.io.to(`org:${socket.organizationId}`).emit('incident-status-updated', {
          incidentId,
          status,
          updatedBy: socket.userId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.userId} disconnected: ${reason}`);
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`Mock WebSocket server running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          resolve();
        });
      });
    });
  }

  // Methods to emit events for testing
  emitSecurityEvent(organizationId: string, event: any) {
    this.io.to(`org:${organizationId}`).emit('new-security-event', event);
  }

  emitThreatUpdate(organizationId: string, threat: any) {
    this.io.to(`org:${organizationId}`).emit('threat-update', threat);
  }

  emitIncidentUpdate(organizationId: string, incident: any) {
    this.io.to(`org:${organizationId}`).emit('incident-update', incident);
  }

  emitDashboardUpdate(organizationId: string, data: any) {
    this.io.to(`org:${organizationId}`).emit('dashboard-update', data);
  }

  emitSystemAlert(message: string, severity: string = 'info') {
    this.io.emit('system-alert', { message, severity, timestamp: new Date().toISOString() });
  }

  // Get connection count for testing
  getConnectionCount(): number {
    return this.io.engine.clientsCount;
  }

  // Get clients in a specific room
  getClientsInRoom(room: string): Promise<string[]> {
    return new Promise((resolve) => {
      this.io.in(room).allSockets().then((sockets) => {
        resolve(Array.from(sockets));
      });
    });
  }
}

// Test client helper
class TestWebSocketClient {
  private socket: Socket;
  private events: Map<string, any[]> = new Map();

  constructor(port: number, token: string) {
    this.socket = io(`http://localhost:${port}`, {
      auth: { token },
    });
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Capture all events for testing
    const originalEmit = this.socket.emit;
    const originalOn = this.socket.on;
    
    this.socket.on = (event: string, listener: any) => {
      const wrappedListener = (...args: any[]) => {
        if (!this.events.has(event)) {
          this.events.set(event, []);
        }
        this.events.get(event)!.push(args);
        listener(...args);
      };
      return originalOn.call(this.socket, event, wrappedListener);
    };
  }

  subscribe(channel: string, filters?: any) {
    this.socket.emit(`subscribe:${channel}`, filters);
  }

  acknowledgeEvent(eventId: string) {
    this.socket.emit('acknowledge-event', eventId);
  }

  updateIncidentStatus(incidentId: string, status: string) {
    this.socket.emit('update-incident-status', { incidentId, status });
  }

  getReceivedEvents(eventName: string): any[] {
    return this.events.get(eventName) || [];
  }

  waitForEvent(eventName: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event '${eventName}' not received within ${timeout}ms`));
      }, timeout);

      this.socket.on(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  disconnect() {
    this.socket.disconnect();
  }
}

describe('WebSocket Security Dashboard Tests', () => {
  let server: MockSecurityWebSocketServer;
  let testClient: TestWebSocketClient;
  let adminClient: TestWebSocketClient;
  let userClient: TestWebSocketClient;
  const serverPort = 3001;

  const createTestToken = (payload: any) => {
    return jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
  };

  const adminToken = createTestToken({
    sub: 'admin-123',
    organizationId: 'org-123',
    role: 'admin',
    permissions: ['*'],
  });

  const userToken = createTestToken({
    sub: 'user-456',
    organizationId: 'org-123',
    role: 'security_analyst',
    permissions: ['security:read', 'incidents:read'],
  });

  beforeEach(async () => {
    server = new MockSecurityWebSocketServer(serverPort);
    await server.start();
  });

  afterEach(async () => {
    testClient?.disconnect();
    adminClient?.disconnect();
    userClient?.disconnect();
    await server.stop();
  });

  describe('Authentication and Connection', () => {
    it('should authenticate with valid JWT token', async () => {
      testClient = new TestWebSocketClient(serverPort, adminToken);
      
      await new Promise((resolve) => {
        testClient.socket.on('connect', resolve);
      });

      expect(testClient.isConnected()).toBe(true);
    });

    it('should reject connection with invalid token', async () => {
      const invalidToken = 'invalid-jwt-token';
      
      const client = new TestWebSocketClient(serverPort, invalidToken);
      
      await new Promise((resolve) => {
        client.socket.on('connect_error', (error) => {
          expect(error.message).toContain('Invalid token');
          resolve(undefined);
        });
      });
      
      expect(client.isConnected()).toBe(false);
      client.disconnect();
    });

    it('should reject connection without token', async () => {
      const client = new TestWebSocketClient(serverPort, '');
      
      await new Promise((resolve) => {
        client.socket.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication error');
          resolve(undefined);
        });
      });
      
      expect(client.isConnected()).toBe(false);
      client.disconnect();
    });

    it('should handle multiple concurrent connections', async () => {
      const clients = [];
      const numClients = 10;

      for (let i = 0; i < numClients; i++) {
        const token = createTestToken({
          sub: `user-${i}`,
          organizationId: 'org-123',
          role: 'user',
        });
        clients.push(new TestWebSocketClient(serverPort, token));
      }

      // Wait for all connections
      await Promise.all(
        clients.map(
          (client) => new Promise((resolve) => client.socket.on('connect', resolve))
        )
      );

      expect(server.getConnectionCount()).toBe(numClients);

      // Clean up
      clients.forEach((client) => client.disconnect());
    });
  });

  describe('Event Subscriptions', () => {
    beforeEach(async () => {
      adminClient = new TestWebSocketClient(serverPort, adminToken);
      await new Promise((resolve) => adminClient.socket.on('connect', resolve));
    });

    it('should subscribe to security events', async () => {
      adminClient.subscribe('security-events', { severity: 'high' });
      
      const subscriptionConfirm = await adminClient.waitForEvent('subscribed');
      expect(subscriptionConfirm.channel).toBe('security-events');
      expect(subscriptionConfirm.filters.severity).toBe('high');
    });

    it('should subscribe to threat updates', async () => {
      adminClient.subscribe('threats');
      
      const subscriptionConfirm = await adminClient.waitForEvent('subscribed');
      expect(subscriptionConfirm.channel).toBe('threats');
    });

    it('should subscribe to incident updates', async () => {
      adminClient.subscribe('incidents');
      
      const subscriptionConfirm = await adminClient.waitForEvent('subscribed');
      expect(subscriptionConfirm.channel).toBe('incidents');
    });

    it('should subscribe to dashboard updates', async () => {
      adminClient.subscribe('dashboard');
      
      const subscriptionConfirm = await adminClient.waitForEvent('subscribed');
      expect(subscriptionConfirm.channel).toBe('dashboard');
    });
  });

  describe('Real-time Event Broadcasting', () => {
    beforeEach(async () => {
      adminClient = new TestWebSocketClient(serverPort, adminToken);
      userClient = new TestWebSocketClient(serverPort, userToken);
      
      await Promise.all([
        new Promise((resolve) => adminClient.socket.on('connect', resolve)),
        new Promise((resolve) => userClient.socket.on('connect', resolve)),
      ]);

      // Subscribe both clients to events
      adminClient.subscribe('security-events');
      userClient.subscribe('security-events');
      
      await Promise.all([
        adminClient.waitForEvent('subscribed'),
        userClient.waitForEvent('subscribed'),
      ]);
    });

    it('should broadcast new security events to all subscribers', async () => {
      const newEvent = generateMockEvent({
        title: 'Real-time Security Event',
        severity: 'critical',
      });

      server.emitSecurityEvent('org-123', newEvent);

      const [adminReceived, userReceived] = await Promise.all([
        adminClient.waitForEvent('new-security-event'),
        userClient.waitForEvent('new-security-event'),
      ]);

      expect(adminReceived.title).toBe('Real-time Security Event');
      expect(userReceived.title).toBe('Real-time Security Event');
      expect(adminReceived.id).toBe(userReceived.id);
    });

    it('should broadcast threat updates', async () => {
      adminClient.subscribe('threats');
      userClient.subscribe('threats');

      await Promise.all([
        adminClient.waitForEvent('subscribed'),
        userClient.waitForEvent('subscribed'),
      ]);

      const threatUpdate = generateMockThreat({
        title: 'Updated Threat Status',
        status: 'investigating',
      });

      server.emitThreatUpdate('org-123', threatUpdate);

      const [adminReceived, userReceived] = await Promise.all([
        adminClient.waitForEvent('threat-update'),
        userClient.waitForEvent('threat-update'),
      ]);

      expect(adminReceived.title).toBe('Updated Threat Status');
      expect(userReceived.title).toBe('Updated Threat Status');
    });

    it('should broadcast incident updates', async () => {
      adminClient.subscribe('incidents');
      userClient.subscribe('incidents');

      await Promise.all([
        adminClient.waitForEvent('subscribed'),
        userClient.waitForEvent('subscribed'),
      ]);

      const incidentUpdate = generateMockIncident({
        title: 'Updated Incident',
        status: 'resolved',
      });

      server.emitIncidentUpdate('org-123', incidentUpdate);

      const [adminReceived, userReceived] = await Promise.all([
        adminClient.waitForEvent('incident-update'),
        userClient.waitForEvent('incident-update'),
      ]);

      expect(adminReceived.title).toBe('Updated Incident');
      expect(userReceived.status).toBe('resolved');
    });

    it('should broadcast dashboard updates', async () => {
      adminClient.subscribe('dashboard');
      userClient.subscribe('dashboard');

      await Promise.all([
        adminClient.waitForEvent('subscribed'),
        userClient.waitForEvent('subscribed'),
      ]);

      const dashboardData = {
        totalAssets: 30,
        criticalVulnerabilities: 5,
        activeAlerts: 12,
        complianceScore: 85.5,
      };

      server.emitDashboardUpdate('org-123', dashboardData);

      const [adminReceived, userReceived] = await Promise.all([
        adminClient.waitForEvent('dashboard-update'),
        userClient.waitForEvent('dashboard-update'),
      ]);

      expect(adminReceived.totalAssets).toBe(30);
      expect(userReceived.criticalVulnerabilities).toBe(5);
    });
  });

  describe('Interactive Features', () => {
    beforeEach(async () => {
      adminClient = new TestWebSocketClient(serverPort, adminToken);
      userClient = new TestWebSocketClient(serverPort, userToken);
      
      await Promise.all([
        new Promise((resolve) => adminClient.socket.on('connect', resolve)),
        new Promise((resolve) => userClient.socket.on('connect', resolve)),
      ]);
    });

    it('should handle event acknowledgments', async () => {
      const eventId = 'event-123';
      
      adminClient.acknowledgeEvent(eventId);
      
      const [ackConfirmed, eventAcknowledged] = await Promise.all([
        adminClient.waitForEvent('ack-confirmed'),
        userClient.waitForEvent('event-acknowledged'),
      ]);

      expect(ackConfirmed.eventId).toBe(eventId);
      expect(eventAcknowledged.eventId).toBe(eventId);
      expect(eventAcknowledged.acknowledgedBy).toBe('admin-123');
    });

    it('should handle incident status updates', async () => {
      const incidentId = 'incident-456';
      const newStatus = 'investigating';
      
      adminClient.updateIncidentStatus(incidentId, newStatus);
      
      const statusUpdate = await userClient.waitForEvent('incident-status-updated');
      
      expect(statusUpdate.incidentId).toBe(incidentId);
      expect(statusUpdate.status).toBe(newStatus);
      expect(statusUpdate.updatedBy).toBe('admin-123');
    });
  });

  describe('Organization Isolation', () => {
    it('should isolate events between different organizations', async () => {
      const org1Token = createTestToken({
        sub: 'user-org1',
        organizationId: 'org-1',
        role: 'admin',
      });

      const org2Token = createTestToken({
        sub: 'user-org2',
        organizationId: 'org-2',
        role: 'admin',
      });

      const org1Client = new TestWebSocketClient(serverPort, org1Token);
      const org2Client = new TestWebSocketClient(serverPort, org2Token);

      await Promise.all([
        new Promise((resolve) => org1Client.socket.on('connect', resolve)),
        new Promise((resolve) => org2Client.socket.on('connect', resolve)),
      ]);

      // Subscribe both to security events
      org1Client.subscribe('security-events');
      org2Client.subscribe('security-events');

      await Promise.all([
        org1Client.waitForEvent('subscribed'),
        org2Client.waitForEvent('subscribed'),
      ]);

      // Emit event to org-1 only
      const org1Event = generateMockEvent({ title: 'Org 1 Event' });
      server.emitSecurityEvent('org-1', org1Event);

      // org1Client should receive the event
      const org1Received = await org1Client.waitForEvent('new-security-event');
      expect(org1Received.title).toBe('Org 1 Event');

      // org2Client should NOT receive the event
      let org2EventReceived = false;
      org2Client.socket.on('new-security-event', () => {
        org2EventReceived = true;
      });

      // Wait a bit to ensure event doesn't arrive
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(org2EventReceived).toBe(false);

      org1Client.disconnect();
      org2Client.disconnect();
    });
  });

  describe('Connection Resilience', () => {
    it('should handle client disconnections gracefully', async () => {
      testClient = new TestWebSocketClient(serverPort, adminToken);
      await new Promise((resolve) => testClient.socket.on('connect', resolve));
      
      expect(server.getConnectionCount()).toBe(1);
      
      testClient.disconnect();
      
      // Wait for disconnect to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      expect(server.getConnectionCount()).toBe(0);
    });

    it('should handle server restarts', async () => {
      testClient = new TestWebSocketClient(serverPort, adminToken);
      await new Promise((resolve) => testClient.socket.on('connect', resolve));
      
      expect(testClient.isConnected()).toBe(true);
      
      // Simulate server restart
      await server.stop();
      
      let disconnected = false;
      testClient.socket.on('disconnect', () => {
        disconnected = true;
      });
      
      // Wait for disconnect
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(disconnected).toBe(true);
      
      // Restart server
      server = new MockSecurityWebSocketServer(serverPort);
      await server.start();
      
      // Client should auto-reconnect (depending on client configuration)
      // In a real implementation, you'd test reconnection logic
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid event broadcasting', async () => {
      testClient = new TestWebSocketClient(serverPort, adminToken);
      await new Promise((resolve) => testClient.socket.on('connect', resolve));
      
      testClient.subscribe('security-events');
      await testClient.waitForEvent('subscribed');
      
      const numEvents = 100;
      const receivedEvents: any[] = [];
      
      testClient.socket.on('new-security-event', (event) => {
        receivedEvents.push(event);
      });
      
      // Rapidly emit events
      for (let i = 0; i < numEvents; i++) {
        const event = generateMockEvent({ title: `Rapid Event ${i}` });
        server.emitSecurityEvent('org-123', event);
      }
      
      // Wait for all events to be received
      await new Promise((resolve) => {
        const checkEvents = () => {
          if (receivedEvents.length >= numEvents) {
            resolve(undefined);
          } else {
            setTimeout(checkEvents, 10);
          }
        };
        checkEvents();
      });
      
      expect(receivedEvents.length).toBe(numEvents);
      expect(receivedEvents[0].title).toBe('Rapid Event 0');
      expect(receivedEvents[numEvents - 1].title).toBe(`Rapid Event ${numEvents - 1}`);
    });

    it('should handle memory efficiently with many subscriptions', async () => {
      const clients = [];
      const numClients = 50;
      
      // Create many clients
      for (let i = 0; i < numClients; i++) {
        const token = createTestToken({
          sub: `user-${i}`,
          organizationId: 'org-123',
          role: 'user',
        });
        const client = new TestWebSocketClient(serverPort, token);
        clients.push(client);
        
        await new Promise((resolve) => client.socket.on('connect', resolve));
        client.subscribe('security-events');
      }
      
      expect(server.getConnectionCount()).toBe(numClients);
      
      // Emit a single event to all clients
      const event = generateMockEvent({ title: 'Broadcast Event' });
      server.emitSecurityEvent('org-123', event);
      
      // Wait for event to be received by all clients
      const promises = clients.map((client) => client.waitForEvent('new-security-event'));
      const results = await Promise.all(promises);
      
      // All clients should receive the event
      expect(results.length).toBe(numClients);
      results.forEach((result) => {
        expect(result.title).toBe('Broadcast Event');
      });
      
      // Clean up
      clients.forEach((client) => client.disconnect());
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JWT tokens', async () => {
      const malformedToken = 'not.a.jwt';
      
      testClient = new TestWebSocketClient(serverPort, malformedToken);
      
      let errorReceived = false;
      testClient.socket.on('connect_error', (error) => {
        expect(error.message).toContain('Invalid token');
        errorReceived = true;
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(errorReceived).toBe(true);
      expect(testClient.isConnected()).toBe(false);
    });

    it('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          organizationId: 'org-123',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        'test-secret'
      );
      
      testClient = new TestWebSocketClient(serverPort, expiredToken);
      
      let errorReceived = false;
      testClient.socket.on('connect_error', (error) => {
        expect(error.message).toContain('Invalid token');
        errorReceived = true;
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(errorReceived).toBe(true);
    });

    it('should handle system alerts', async () => {
      testClient = new TestWebSocketClient(serverPort, adminToken);
      await new Promise((resolve) => testClient.socket.on('connect', resolve));
      
      server.emitSystemAlert('System maintenance in progress', 'warning');
      
      const alert = await testClient.waitForEvent('system-alert');
      expect(alert.message).toBe('System maintenance in progress');
      expect(alert.severity).toBe('warning');
      expect(alert.timestamp).toBeDefined();
    });
  });
});