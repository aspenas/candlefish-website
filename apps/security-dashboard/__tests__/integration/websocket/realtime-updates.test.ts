import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { createTestServer } from '@/test/utils/test-server';
import { createMockSecurityEvents, createMockAlerts, createMockThreats } from '@/test/factories/ThreatFactory';

describe('WebSocket Real-time Updates Integration Tests', () => {
  let server: any;
  let clientSocket: Socket;
  let authToken: string;
  let serverUrl: string;

  beforeAll(async () => {
    server = await createTestServer();
    serverUrl = server.url.replace('http://', '');
    authToken = await server.generateTestToken();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    await server.resetDatabase();
    
    // Create authenticated WebSocket connection
    clientSocket = io(`ws://${serverUrl}`, {
      auth: {
        token: authToken,
      },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Authentication', () => {
    it('accepts connections with valid JWT token', (done) => {
      const authenticatedSocket = io(`ws://${serverUrl}`, {
        auth: { token: authToken },
        transports: ['websocket'],
      });

      authenticatedSocket.on('connect', () => {
        expect(authenticatedSocket.connected).toBe(true);
        authenticatedSocket.disconnect();
        done();
      });

      authenticatedSocket.on('connect_error', (error) => {
        done(new Error(`Should not receive connect_error: ${error.message}`));
      });
    });

    it('rejects connections without valid token', (done) => {
      const unauthenticatedSocket = io(`ws://${serverUrl}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      unauthenticatedSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });

      unauthenticatedSocket.on('connect', () => {
        unauthenticatedSocket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });
    });

    it('handles token expiration during connection', async () => {
      const expiredToken = server.generateExpiredToken();
      const socketWithExpiredToken = io(`ws://${serverUrl}`, {
        auth: { token: expiredToken },
        transports: ['websocket'],
      });

      const disconnectPromise = new Promise((resolve) => {
        socketWithExpiredToken.on('disconnect', (reason) => {
          expect(reason).toBe('token_expired');
          resolve(reason);
        });
      });

      // Simulate token expiration check
      await server.checkTokenExpiration(expiredToken);

      await disconnectPromise;
      socketWithExpiredToken.disconnect();
    });
  });

  describe('Security Event Subscriptions', () => {
    it('receives real-time security events', async () => {
      const receivedEvents: any[] = [];

      clientSocket.on('security_event', (event) => {
        receivedEvents.push(event);
      });

      // Join security events room
      clientSocket.emit('subscribe', { room: 'security_events' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger security event
      const mockEvent = createMockSecurityEvents(1)[0];
      await server.emitSecurityEvent(mockEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        id: mockEvent.id,
        event_type: mockEvent.event_type,
        severity: mockEvent.severity,
        timestamp: mockEvent.timestamp,
      });
    });

    it('filters events by severity level', async () => {
      const receivedEvents: any[] = [];

      clientSocket.on('security_event', (event) => {
        receivedEvents.push(event);
      });

      // Subscribe to only CRITICAL and HIGH severity events
      clientSocket.emit('subscribe', {
        room: 'security_events',
        filters: { severity: ['CRITICAL', 'HIGH'] }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Emit events with different severity levels
      const events = [
        { ...createMockSecurityEvents(1)[0], severity: 'CRITICAL' },
        { ...createMockSecurityEvents(1)[0], severity: 'LOW' },
        { ...createMockSecurityEvents(1)[0], severity: 'HIGH' },
        { ...createMockSecurityEvents(1)[0], severity: 'MEDIUM' },
      ];

      for (const event of events) {
        await server.emitSecurityEvent(event);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents.every(e => ['CRITICAL', 'HIGH'].includes(e.severity))).toBe(true);
    });

    it('unsubscribes from security events', async () => {
      const receivedEvents: any[] = [];

      clientSocket.on('security_event', (event) => {
        receivedEvents.push(event);
      });

      // Subscribe first
      clientSocket.emit('subscribe', { room: 'security_events' });
      await new Promise(resolve => setTimeout(resolve, 50));

      // Unsubscribe
      clientSocket.emit('unsubscribe', { room: 'security_events' });
      await new Promise(resolve => setTimeout(resolve, 50));

      // Emit event after unsubscribing
      const mockEvent = createMockSecurityEvents(1)[0];
      await server.emitSecurityEvent(mockEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe('Alert Subscriptions', () => {
    it('receives new alert notifications', async () => {
      const receivedAlerts: any[] = [];

      clientSocket.on('alert_created', (alert) => {
        receivedAlerts.push(alert);
      });

      clientSocket.emit('subscribe', { room: 'alerts' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const mockAlert = createMockAlerts(1)[0];
      await server.createAlert(mockAlert);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedAlerts).toHaveLength(1);
      expect(receivedAlerts[0]).toMatchObject({
        id: mockAlert.id,
        title: mockAlert.title,
        severity: mockAlert.severity,
        status: 'OPEN',
      });
    });

    it('receives alert status updates', async () => {
      const receivedUpdates: any[] = [];

      clientSocket.on('alert_updated', (alert) => {
        receivedUpdates.push(alert);
      });

      clientSocket.emit('subscribe', { room: 'alerts' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create alert first
      const mockAlert = createMockAlerts(1)[0];
      await server.createAlert(mockAlert);

      // Update alert status
      await server.updateAlert(mockAlert.id, {
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date().toISOString(),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedUpdates).toHaveLength(1);
      expect(receivedUpdates[0]).toMatchObject({
        id: mockAlert.id,
        status: 'ACKNOWLEDGED',
        acknowledged_at: expect.any(String),
      });
    });

    it('receives bulk alert operations', async () => {
      const receivedBulkOperations: any[] = [];

      clientSocket.on('alerts_bulk_updated', (operation) => {
        receivedBulkOperations.push(operation);
      });

      clientSocket.emit('subscribe', { room: 'alerts' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create multiple alerts
      const mockAlerts = createMockAlerts(3);
      for (const alert of mockAlerts) {
        await server.createAlert(alert);
      }

      // Perform bulk acknowledge operation
      await server.bulkUpdateAlerts(
        mockAlerts.map(a => a.id),
        { status: 'ACKNOWLEDGED' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedBulkOperations).toHaveLength(1);
      expect(receivedBulkOperations[0]).toMatchObject({
        operation: 'bulk_acknowledge',
        alertIds: mockAlerts.map(a => a.id),
        updatedCount: 3,
      });
    });
  });

  describe('Threat Intelligence Updates', () => {
    it('receives threat intelligence updates', async () => {
      const receivedThreatUpdates: any[] = [];

      clientSocket.on('threat_updated', (threat) => {
        receivedThreatUpdates.push(threat);
      });

      clientSocket.emit('subscribe', { room: 'threat_intelligence' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const mockThreat = createMockThreats(1)[0];
      await server.updateThreatIntelligence(mockThreat);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedThreatUpdates).toHaveLength(1);
      expect(receivedThreatUpdates[0]).toMatchObject({
        id: mockThreat.id,
        name: mockThreat.name,
        severity: mockThreat.severity,
        confidence: mockThreat.confidence,
      });
    });

    it('receives IOC updates', async () => {
      const receivedIOCUpdates: any[] = [];

      clientSocket.on('ioc_created', (ioc) => {
        receivedIOCUpdates.push(ioc);
      });

      clientSocket.emit('subscribe', { room: 'threat_intelligence' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const newIOC = {
        id: 'ioc-123',
        type: 'IP',
        value: '192.168.1.100',
        confidence: 0.85,
        threat_id: 'threat-456',
      };

      await server.createIOC(newIOC);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedIOCUpdates).toHaveLength(1);
      expect(receivedIOCUpdates[0]).toMatchObject(newIOC);
    });
  });

  describe('System Status Updates', () => {
    it('receives system health updates', async () => {
      const receivedHealthUpdates: any[] = [];

      clientSocket.on('system_health', (health) => {
        receivedHealthUpdates.push(health);
      });

      clientSocket.emit('subscribe', { room: 'system_status' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const healthUpdate = {
        status: 'degraded',
        services: {
          database: { status: 'healthy', responseTime: 45 },
          redis: { status: 'healthy', responseTime: 12 },
          api: { status: 'degraded', responseTime: 1200 },
        },
        timestamp: new Date().toISOString(),
      };

      await server.updateSystemHealth(healthUpdate);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedHealthUpdates).toHaveLength(1);
      expect(receivedHealthUpdates[0]).toMatchObject(healthUpdate);
    });

    it('receives service maintenance notifications', async () => {
      const receivedMaintenanceNotifications: any[] = [];

      clientSocket.on('maintenance_notification', (notification) => {
        receivedMaintenanceNotifications.push(notification);
      });

      clientSocket.emit('subscribe', { room: 'system_status' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const maintenanceNotification = {
        type: 'scheduled_maintenance',
        service: 'threat_intelligence',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        duration: 30, // minutes
        message: 'Scheduled maintenance for threat intelligence service',
      };

      await server.scheduleMaintenanceNotification(maintenanceNotification);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMaintenanceNotifications).toHaveLength(1);
      expect(receivedMaintenanceNotifications[0]).toMatchObject(maintenanceNotification);
    });
  });

  describe('Error Handling', () => {
    it('handles connection timeouts gracefully', async () => {
      const timeoutSocket = io(`ws://${serverUrl}`, {
        auth: { token: authToken },
        transports: ['websocket'],
        timeout: 100, // Very short timeout
      });

      const timeoutPromise = new Promise((resolve) => {
        timeoutSocket.on('connect_error', (error) => {
          expect(error.message).toContain('timeout');
          resolve(error);
        });
      });

      // Simulate slow server response
      await server.simulateSlowResponse(200);

      await timeoutPromise;
      timeoutSocket.disconnect();
    });

    it('reconnects automatically after connection loss', async () => {
      const reconnectEvents: string[] = [];

      clientSocket.on('disconnect', (reason) => {
        reconnectEvents.push(`disconnect: ${reason}`);
      });

      clientSocket.on('reconnect', () => {
        reconnectEvents.push('reconnect');
      });

      // Simulate server connection loss
      await server.simulateConnectionLoss();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Restore server connection
      await server.restoreConnection();
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(reconnectEvents).toContain('disconnect: io server disconnect');
      expect(reconnectEvents).toContain('reconnect');
    });

    it('handles invalid subscription requests', (done) => {
      clientSocket.on('subscription_error', (error) => {
        expect(error.message).toContain('Invalid subscription');
        expect(error.room).toBe('invalid_room');
        done();
      });

      clientSocket.emit('subscribe', { room: 'invalid_room' });
    });

    it('handles server errors gracefully', (done) => {
      clientSocket.on('server_error', (error) => {
        expect(error.type).toBe('internal_server_error');
        expect(error.message).toContain('Server error occurred');
        done();
      });

      // Trigger a server error
      server.triggerError('internal_server_error');
    });
  });

  describe('Performance and Load Testing', () => {
    it('handles multiple concurrent connections', async () => {
      const connections = [];
      const connectionPromises = [];

      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const socket = io(`ws://${serverUrl}`, {
          auth: { token: authToken },
          transports: ['websocket'],
        });

        const connectionPromise = new Promise((resolve) => {
          socket.on('connect', resolve);
        });

        connections.push(socket);
        connectionPromises.push(connectionPromise);
      }

      await Promise.all(connectionPromises);

      // All connections should be successful
      expect(connections.every(socket => socket.connected)).toBe(true);

      // Broadcast message to all connections
      const receivedMessages = [];
      connections.forEach(socket => {
        socket.on('broadcast_test', (data) => {
          receivedMessages.push(data);
        });
        socket.emit('subscribe', { room: 'test_room' });
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      await server.broadcastToRoom('test_room', 'broadcast_test', {
        message: 'Test broadcast',
        timestamp: new Date().toISOString(),
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(receivedMessages).toHaveLength(10);

      // Clean up connections
      connections.forEach(socket => socket.disconnect());
    });

    it('handles high-frequency message broadcasting', async () => {
      const receivedMessages: any[] = [];

      clientSocket.on('high_frequency_test', (data) => {
        receivedMessages.push(data);
      });

      clientSocket.emit('subscribe', { room: 'high_frequency_test' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send 100 messages rapidly
      const messagePromises = [];
      for (let i = 0; i < 100; i++) {
        messagePromises.push(
          server.broadcastToRoom('high_frequency_test', 'high_frequency_test', {
            messageId: i,
            timestamp: new Date().toISOString(),
          })
        );
      }

      await Promise.all(messagePromises);
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(receivedMessages).toHaveLength(100);
      expect(receivedMessages[0].messageId).toBe(0);
      expect(receivedMessages[99].messageId).toBe(99);
    });
  });

  describe('Data Consistency', () => {
    it('maintains message order during high load', async () => {
      const receivedMessages: any[] = [];

      clientSocket.on('ordered_message', (data) => {
        receivedMessages.push(data);
      });

      clientSocket.emit('subscribe', { room: 'ordered_messages' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send ordered messages
      for (let i = 0; i < 20; i++) {
        await server.broadcastToRoom('ordered_messages', 'ordered_message', {
          sequence: i,
          timestamp: new Date().toISOString(),
        });
        // Small delay to ensure order
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(receivedMessages).toHaveLength(20);
      
      // Verify message order
      for (let i = 0; i < 20; i++) {
        expect(receivedMessages[i].sequence).toBe(i);
      }
    });

    it('handles duplicate message prevention', async () => {
      const receivedMessages: any[] = [];

      clientSocket.on('duplicate_test', (data) => {
        receivedMessages.push(data);
      });

      clientSocket.emit('subscribe', { room: 'duplicate_test' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const messageId = 'unique-message-123';
      const messageData = {
        id: messageId,
        content: 'Test message',
        timestamp: new Date().toISOString(),
      };

      // Send the same message multiple times
      for (let i = 0; i < 5; i++) {
        await server.broadcastToRoom('duplicate_test', 'duplicate_test', messageData);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only receive one message due to deduplication
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].id).toBe(messageId);
    });
  });
});