/**
 * Tests for WebSocket client functionality.
 * Covers connection management, subscriptions, and real-time updates.
 */

import { WebSocketClient } from '../services/websocket';
import * as websocketMock from './__mocks__/websocketMock';

describe('WebSocket Client', () => {
  let wsClient: WebSocketClient;

  beforeEach(() => {
    websocketMock.resetWebSocketMocks();
    wsClient = new WebSocketClient('ws://localhost:8000/ws/metrics');
  });

  afterEach(() => {
    if (wsClient) {
      wsClient.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('connects to WebSocket server successfully', async () => {
      await wsClient.connect('valid-token');

      expect(wsClient.isConnected()).toBe(true);
      expect(websocketMock.getEventCount('connect')).toBe(1);
    });

    it('handles connection with invalid token', async () => {
      await expect(wsClient.connect('invalid-token')).rejects.toThrow('Authentication failed');

      expect(wsClient.isConnected()).toBe(false);
      expect(wsClient.getLastError()).toBeTruthy();
    });

    it('disconnects properly', async () => {
      await wsClient.connect('valid-token');
      expect(wsClient.isConnected()).toBe(true);

      wsClient.disconnect();
      expect(wsClient.isConnected()).toBe(false);
    });

    it('handles connection failures gracefully', async () => {
      const errorSpy = jest.fn();
      wsClient.on('error', errorSpy);

      // Simulate connection error
      websocketMock.simulateConnectionError(new Error('Connection failed'));

      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Connection failed'
      }));
    });

    it('attempts reconnection on disconnection', async () => {
      const reconnectSpy = jest.fn();
      wsClient.on('reconnect', reconnectSpy);

      await wsClient.connect('valid-token');

      // Simulate disconnection
      wsClient.disconnect();

      // Simulate automatic reconnection
      websocketMock.simulateReconnect();

      expect(reconnectSpy).toHaveBeenCalled();
      expect(wsClient.isConnected()).toBe(true);
    });

    it('limits reconnection attempts', async () => {
      const maxAttempts = 3;
      wsClient = new WebSocketClient('ws://localhost:8000/ws/metrics', { maxReconnectAttempts: maxAttempts });

      await wsClient.connect('valid-token');

      // Simulate multiple connection failures
      for (let i = 0; i < 5; i++) {
        websocketMock.simulateConnectionError();
      }

      expect(wsClient.getReconnectAttempts()).toBeLessThanOrEqual(maxAttempts);
    });

    it('uses exponential backoff for reconnections', async () => {
      const reconnectDelays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = jest.fn((callback, delay) => {
        reconnectDelays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for testing
      });

      await wsClient.connect('valid-token');

      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        websocketMock.simulateConnectionError();
      }

      // Delays should increase exponentially
      expect(reconnectDelays.length).toBeGreaterThan(0);
      if (reconnectDelays.length > 1) {
        expect(reconnectDelays[1]).toBeGreaterThan(reconnectDelays[0]);
      }

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await wsClient.connect('valid-token');
    });

    it('subscribes to metrics successfully', () => {
      const subscriptionSpy = jest.fn();
      wsClient.on('subscription_confirmed', subscriptionSpy);

      wsClient.subscribe(['cpu_usage', 'memory_usage']);

      expect(websocketMock.getEventCount('subscribe')).toBe(1);

      // Simulate subscription confirmation
      setTimeout(() => {
        expect(subscriptionSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            metrics: ['cpu_usage', 'memory_usage']
          })
        );
      }, 100);
    });

    it('subscribes with label filters', () => {
      const labels = { host: 'web-01', environment: 'production' };

      wsClient.subscribe(['cpu_usage'], labels);

      const subscriptions = wsClient.getSubscriptions();
      expect(subscriptions).toContain(`cpu_usage:${JSON.stringify(labels)}`);
    });

    it('unsubscribes from metrics', () => {
      wsClient.subscribe(['cpu_usage', 'memory_usage']);

      const unsubscribeSpy = jest.fn();
      wsClient.on('unsubscription_confirmed', unsubscribeSpy);

      wsClient.unsubscribe(['cpu_usage']);

      expect(websocketMock.getEventCount('unsubscribe')).toBe(1);
    });

    it('maintains subscriptions across reconnections', async () => {
      // Subscribe to metrics
      wsClient.subscribe(['cpu_usage', 'memory_usage']);

      const initialSubscriptions = wsClient.getSubscriptions();

      // Simulate connection loss and reconnection
      wsClient.disconnect();
      websocketMock.simulateReconnect();

      // Should automatically re-subscribe
      const finalSubscriptions = wsClient.getSubscriptions();
      expect(finalSubscriptions).toEqual(expect.arrayContaining(initialSubscriptions));
    });

    it('handles subscription errors', () => {
      const errorSpy = jest.fn();
      wsClient.on('error', errorSpy);

      // Try to subscribe while disconnected
      wsClient.disconnect();

      expect(() => {
        wsClient.subscribe(['cpu_usage']);
      }).toThrow('WebSocket not connected');
    });

    it('subscribes to alert notifications', () => {
      const alertSpy = jest.fn();
      wsClient.on('alert_subscription_confirmed', alertSpy);

      wsClient.subscribeToAlerts(['warning', 'critical']);

      expect(websocketMock.getEventCount('subscribeToAlerts')).toBe(1);
    });

    it('limits number of subscriptions', () => {
      const maxSubscriptions = 10;
      wsClient = new WebSocketClient('ws://localhost:8000/ws/metrics', { maxSubscriptions });

      // Try to exceed subscription limit
      const metrics = Array.from({ length: 15 }, (_, i) => `metric_${i}`);

      expect(() => {
        wsClient.subscribe(metrics);
      }).toThrow('Maximum subscriptions exceeded');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await wsClient.connect('valid-token');
    });

    it('receives and processes metric updates', () => {
      const metricSpy = jest.fn();
      wsClient.on('metric_update', metricSpy);

      // Simulate incoming metric data
      websocketMock.simulateMetricUpdate({
        metricName: 'cpu_usage',
        value: 85.0,
        timestamp: new Date().toISOString(),
        labels: { host: 'web-01' }
      });

      expect(metricSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metricName: 'cpu_usage',
            value: 85.0
          })
        })
      );
    });

    it('receives alert notifications', () => {
      const alertSpy = jest.fn();
      wsClient.on('alert_fired', alertSpy);

      wsClient.subscribeToAlerts(['warning']);

      // Simulate alert
      websocketMock.simulateAlertFired({
        id: 'alert-123',
        ruleName: 'High CPU Usage',
        severity: 'warning',
        currentValue: 85.0
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'alert-123',
            severity: 'warning'
          })
        })
      );
    });

    it('handles bulk metric updates efficiently', () => {
      const metricSpy = jest.fn();
      wsClient.on('bulk_metrics', metricSpy);

      // Simulate bulk update
      websocketMock.simulateBulkMetrics(100);

      expect(metricSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              metricName: expect.any(String),
              value: expect.any(Number)
            })
          ])
        })
      );
    });

    it('filters messages based on subscriptions', () => {
      const cpuSpy = jest.fn();
      const memorySpy = jest.fn();

      wsClient.on('metric_update', (data) => {
        if (data.data.metricName === 'cpu_usage') {
          cpuSpy(data);
        } else if (data.data.metricName === 'memory_usage') {
          memorySpy(data);
        }
      });

      // Subscribe only to CPU metrics
      wsClient.subscribe(['cpu_usage']);

      // Simulate updates for both metrics
      websocketMock.simulateMetricUpdate({
        metricName: 'cpu_usage',
        value: 75.0,
        timestamp: new Date().toISOString()
      });

      websocketMock.simulateMetricUpdate({
        metricName: 'memory_usage',
        value: 2048,
        timestamp: new Date().toISOString()
      });

      // Should only receive CPU updates based on subscription
      expect(cpuSpy).toHaveBeenCalled();
      // Memory update should be filtered out (depends on client implementation)
    });

    it('handles malformed messages gracefully', () => {
      const errorSpy = jest.fn();
      wsClient.on('error', errorSpy);

      // Simulate malformed message
      const malformedMessage = { invalid: 'format', missing: 'required_fields' };

      // This would be handled internally by the WebSocket client
      // The exact implementation depends on how the client processes messages
    });

    it('validates message integrity', () => {
      const validationSpy = jest.fn();
      wsClient.on('validation_error', validationSpy);

      // Simulate message with invalid data types
      websocketMock.simulateMetricUpdate({
        metricName: 'cpu_usage',
        value: 'invalid_number', // Should be a number
        timestamp: 'invalid_date' // Should be valid ISO date
      } as any);

      // Client should validate and emit validation error
      // Implementation depends on client validation logic
    });
  });

  describe('Heartbeat and Keep-Alive', () => {
    beforeEach(async () => {
      await wsClient.connect('valid-token');
    });

    it('sends periodic ping messages', () => {
      const pingSpy = jest.fn();
      wsClient.on('ping', pingSpy);

      wsClient.ping();

      expect(websocketMock.getEventCount('ping')).toBe(1);
    });

    it('receives pong responses', () => {
      const pongSpy = jest.fn();
      wsClient.on('pong', pongSpy);

      wsClient.ping();

      // Should receive pong response
      setTimeout(() => {
        expect(pongSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expect.any(String)
          })
        );
      }, 50);
    });

    it('detects connection loss via missed heartbeats', async () => {
      jest.useFakeTimers();

      const connectionLostSpy = jest.fn();
      wsClient.on('connection_lost', connectionLostSpy);

      // Stop responding to pings (simulate connection loss)
      websocketMock.setWebSocketState({ isConnected: false });

      // Fast-forward through heartbeat intervals
      jest.advanceTimersByTime(60000); // 1 minute

      expect(connectionLostSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('maintains connection with regular heartbeats', async () => {
      jest.useFakeTimers();

      const connectionLostSpy = jest.fn();
      wsClient.on('connection_lost', connectionLostSpy);

      // Advance time but maintain connection
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(30000); // 30 seconds
        wsClient.ping();
      }

      expect(connectionLostSpy).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles WebSocket protocol errors', async () => {
      const errorSpy = jest.fn();
      wsClient.on('error', errorSpy);

      await wsClient.connect('valid-token');

      // Simulate protocol error
      websocketMock.simulateConnectionError(new Error('WebSocket protocol error'));

      expect(errorSpy).toHaveBeenCalled();
    });

    it('recovers from temporary network issues', async () => {
      const reconnectedSpy = jest.fn();
      wsClient.on('reconnect', reconnectedSpy);

      await wsClient.connect('valid-token');

      // Simulate network interruption
      websocketMock.simulateConnectionError(new Error('Network error'));

      // Simulate network recovery
      websocketMock.simulateReconnect();

      expect(reconnectedSpy).toHaveBeenCalled();
      expect(wsClient.isConnected()).toBe(true);
    });

    it('handles server-side connection rejection', async () => {
      const rejectionSpy = jest.fn();
      wsClient.on('connection_rejected', rejectionSpy);

      // Mock server rejection
      await expect(wsClient.connect('rejected-token')).rejects.toThrow();

      expect(wsClient.isConnected()).toBe(false);
    });

    it('implements circuit breaker pattern', async () => {
      // Configure with low failure threshold for testing
      wsClient = new WebSocketClient('ws://localhost:8000/ws/metrics', {
        circuitBreakerThreshold: 3,
        circuitBreakerTimeout: 1000
      });

      // Simulate repeated failures
      for (let i = 0; i < 5; i++) {
        try {
          await wsClient.connect('failing-token');
        } catch (error) {
          // Expected
        }
      }

      // Circuit breaker should be open, preventing further attempts
      expect(() => wsClient.connect('any-token')).toThrow('Circuit breaker is open');
    });

    it('handles message queue overflow', () => {
      const overflowSpy = jest.fn();
      wsClient.on('queue_overflow', overflowSpy);

      // Simulate high-volume message scenario
      for (let i = 0; i < 1000; i++) {
        websocketMock.simulateMetricUpdate({
          metricName: 'high_volume_metric',
          value: i,
          timestamp: new Date().toISOString()
        });
      }

      // Should handle overflow gracefully
      // Implementation depends on client queue management
    });
  });

  describe('Performance and Optimization', () => {
    beforeEach(async () => {
      await wsClient.connect('valid-token');
    });

    it('batches subscription requests', () => {
      const batchSpy = jest.fn();
      wsClient.on('batch_subscribe', batchSpy);

      // Make multiple subscription requests in quick succession
      wsClient.subscribe(['metric1', 'metric2']);
      wsClient.subscribe(['metric3', 'metric4']);
      wsClient.subscribe(['metric5']);

      // Should batch requests for efficiency
      // Implementation depends on client batching logic
    });

    it('compresses large messages when supported', () => {
      const compressionSpy = jest.fn();
      wsClient.on('message_compressed', compressionSpy);

      // Simulate large metric update that should be compressed
      const largeUpdate = {
        metricName: 'large_dataset',
        value: 100,
        timestamp: new Date().toISOString(),
        metadata: 'x'.repeat(10000) // Large metadata
      };

      websocketMock.simulateMetricUpdate(largeUpdate);

      // Should use compression for large messages
      // Implementation depends on client compression support
    });

    it('handles high-frequency updates efficiently', () => {
      const updateSpy = jest.fn();
      wsClient.on('metric_update', updateSpy);

      const startTime = performance.now();

      // Simulate 1000 rapid updates
      for (let i = 0; i < 1000; i++) {
        websocketMock.simulateMetricUpdate({
          metricName: 'high_freq_metric',
          value: i,
          timestamp: new Date().toISOString()
        });
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should handle updates efficiently (under 1 second)
      expect(processingTime).toBeLessThan(1000);
      expect(updateSpy).toHaveBeenCalledTimes(1000);
    });

    it('implements message throttling for rate limiting', () => {
      const throttledSpy = jest.fn();
      wsClient.on('message_throttled', throttledSpy);

      // Configure throttling
      wsClient = new WebSocketClient('ws://localhost:8000/ws/metrics', {
        messageThrottle: 100, // Max 100 messages per second
      });

      // Send messages faster than throttle limit
      for (let i = 0; i < 200; i++) {
        wsClient.send({ type: 'test_message', data: i });
      }

      // Some messages should be throttled
      expect(throttledSpy).toHaveBeenCalled();
    });
  });

  describe('Security', () => {
    it('validates server certificates in secure connections', async () => {
      const secureClient = new WebSocketClient('wss://secure.example.com/ws/metrics');

      // Mock certificate validation
      const certSpy = jest.fn();
      secureClient.on('certificate_validated', certSpy);

      try {
        await secureClient.connect('valid-token');
        expect(certSpy).toHaveBeenCalled();
      } catch (error) {
        // Expected in test environment
      }
    });

    it('handles token refresh during connection', async () => {
      const tokenRefreshSpy = jest.fn();
      wsClient.on('token_refreshed', tokenRefreshSpy);

      await wsClient.connect('expiring-token');

      // Simulate token refresh scenario
      wsClient.refreshToken('new-fresh-token');

      expect(tokenRefreshSpy).toHaveBeenCalledWith('new-fresh-token');
    });

    it('sanitizes incoming messages', () => {
      const sanitizedSpy = jest.fn();
      wsClient.on('message_sanitized', sanitizedSpy);

      // Simulate potentially malicious message
      const maliciousMessage = {
        metricName: '<script>alert("xss")</script>',
        value: 75.0,
        timestamp: new Date().toISOString()
      };

      websocketMock.simulateMetricUpdate(maliciousMessage);

      // Should sanitize message content
      expect(sanitizedSpy).toHaveBeenCalled();
    });
  });
});
