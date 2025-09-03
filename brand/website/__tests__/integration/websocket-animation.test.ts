import { createServer } from 'http';
import { parse } from 'url';
import { Server as WebSocketServer } from 'ws';
import { AnimationEventFactory, PerformanceMetricsFactory } from '../factories/animation-updated.factory';

// Mock WebSocket client for testing
class MockWebSocketClient {
  private ws: WebSocket | null = null;
  private eventListeners: { [key: string]: Function[] } = {};
  
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          this.emit('open');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        };
        
        this.ws.onclose = (event) => {
          this.emit('close', event.code, event.reason);
        };
        
        this.ws.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
  
  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
  
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners[event] || [];
    listeners.forEach(callback => callback(...args));
  }
}

describe('WebSocket Real-time Animation Integration', () => {
  let server: any;
  let wsServer: WebSocketServer;
  let wsClient: MockWebSocketClient;
  let serverPort: number;
  
  beforeAll((done) => {
    // Create HTTP server
    server = createServer();
    
    // Create WebSocket server
    wsServer = new WebSocketServer({ server });
    
    // Start server on random port
    server.listen(0, () => {
      serverPort = server.address().port;
      done();
    });
  });
  
  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });
  
  beforeEach(() => {
    wsClient = new MockWebSocketClient();
  });
  
  afterEach(() => {
    wsClient.close();
  });

  describe('Real-time animation configuration updates', () => {
    it('should broadcast configuration changes to all connected clients', async () => {
      const receivedUpdates: any[] = [];
      
      // Set up server to handle configuration updates
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'config_update') {
            // Broadcast to all clients
            wsServer.clients.forEach((client) => {
              if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                  type: 'config_updated',
                  animationId: message.animationId,
                  config: message.config,
                  timestamp: Date.now()
                }));
              }
            });
          }
        });
      });
      
      // Connect client and listen for updates
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      wsClient.on('message', (data) => {
        if (data.type === 'config_updated') {
          receivedUpdates.push(data);
        }
      });
      
      // Send configuration update
      const configUpdate = {
        type: 'config_update',
        animationId: 'test-animation-123',
        config: {
          speed: 2.5,
          colors: { primary: '#ff0000' }
        }
      };
      
      wsClient.send(configUpdate);
      
      // Wait for update to be received
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(receivedUpdates).toHaveLength(1);
      expect(receivedUpdates[0]).toMatchObject({
        type: 'config_updated',
        animationId: 'test-animation-123',
        config: {
          speed: 2.5,
          colors: { primary: '#ff0000' }
        }
      });
    });

    it('should handle multiple simultaneous configuration updates', async () => {
      const client1Updates: any[] = [];
      const client2Updates: any[] = [];
      
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'config_update') {
            // Broadcast to all other clients (not sender)
            wsServer.clients.forEach((client) => {
              if (client !== ws && client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                  type: 'config_updated',
                  animationId: message.animationId,
                  config: message.config,
                  userId: message.userId,
                  timestamp: Date.now()
                }));
              }
            });
          }
        });
      });
      
      // Create two clients
      const wsClient1 = new MockWebSocketClient();
      const wsClient2 = new MockWebSocketClient();
      
      await Promise.all([
        wsClient1.connect(`ws://localhost:${serverPort}`),
        wsClient2.connect(`ws://localhost:${serverPort}`)
      ]);
      
      wsClient1.on('message', (data) => {
        if (data.type === 'config_updated') client1Updates.push(data);
      });
      
      wsClient2.on('message', (data) => {
        if (data.type === 'config_updated') client2Updates.push(data);
      });
      
      // Client 1 sends update
      wsClient1.send({
        type: 'config_update',
        animationId: 'animation-1',
        config: { speed: 1.5 },
        userId: 'user-1'
      });
      
      // Client 2 sends update
      wsClient2.send({
        type: 'config_update',
        animationId: 'animation-2',
        config: { speed: 2.0 },
        userId: 'user-2'
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Client 1 should receive Client 2's update
      expect(client1Updates).toHaveLength(1);
      expect(client1Updates[0]).toMatchObject({
        animationId: 'animation-2',
        userId: 'user-2'
      });
      
      // Client 2 should receive Client 1's update
      expect(client2Updates).toHaveLength(1);
      expect(client2Updates[0]).toMatchObject({
        animationId: 'animation-1',
        userId: 'user-1'
      });
      
      wsClient1.close();
      wsClient2.close();
    });
  });

  describe('Real-time performance monitoring', () => {
    it('should stream performance metrics in real-time', async () => {
      const receivedMetrics: any[] = [];
      
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'start_performance_monitoring') {
            // Simulate streaming performance metrics
            const interval = setInterval(() => {
              const metrics = PerformanceMetricsFactory.create();
              
              ws.send(JSON.stringify({
                type: 'performance_metrics',
                animationId: message.animationId,
                metrics,
                timestamp: Date.now()
              }));
            }, 100); // Send metrics every 100ms
            
            // Store interval for cleanup
            ws.metricsInterval = interval;
            
            // Stop after 1 second for testing
            setTimeout(() => {
              clearInterval(interval);
              ws.send(JSON.stringify({
                type: 'performance_monitoring_stopped',
                animationId: message.animationId
              }));
            }, 1000);
          }
        });
        
        ws.on('close', () => {
          if (ws.metricsInterval) {
            clearInterval(ws.metricsInterval);
          }
        });
      });
      
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      wsClient.on('message', (data) => {
        if (data.type === 'performance_metrics') {
          receivedMetrics.push(data);
        }
      });
      
      // Start performance monitoring
      wsClient.send({
        type: 'start_performance_monitoring',
        animationId: 'test-animation-perf'
      });
      
      // Wait for metrics to be streamed
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      expect(receivedMetrics.length).toBeGreaterThan(5); // Should receive multiple metrics
      expect(receivedMetrics[0]).toMatchObject({
        type: 'performance_metrics',
        animationId: 'test-animation-perf',
        metrics: expect.objectContaining({
          fps: expect.any(Number),
          memoryUsage: expect.any(Number)
        })
      });
    });

    it('should handle performance alerts and notifications', async () => {
      const receivedAlerts: any[] = [];
      
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'performance_metrics_batch') {
            // Simulate alert triggering based on metrics
            const metrics = message.metrics;
            
            if (metrics.fps < 30) {
              ws.send(JSON.stringify({
                type: 'performance_alert',
                alertType: 'fps_drop',
                severity: 'high',
                message: `FPS dropped to ${metrics.fps}`,
                animationId: message.animationId,
                timestamp: Date.now()
              }));
            }
            
            if (metrics.memoryUsage > 400) {
              ws.send(JSON.stringify({
                type: 'performance_alert',
                alertType: 'memory_leak',
                severity: 'medium',
                message: `Memory usage high: ${metrics.memoryUsage}MB`,
                animationId: message.animationId,
                timestamp: Date.now()
              }));
            }
          }
        });
      });
      
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      wsClient.on('message', (data) => {
        if (data.type === 'performance_alert') {
          receivedAlerts.push(data);
        }
      });
      
      // Send performance metrics that should trigger alerts
      wsClient.send({
        type: 'performance_metrics_batch',
        animationId: 'test-animation-alerts',
        metrics: {
          fps: 25, // Below threshold
          memoryUsage: 450, // Above threshold
          frameTime: 40
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(receivedAlerts).toHaveLength(2);
      
      const fpsAlert = receivedAlerts.find(alert => alert.alertType === 'fps_drop');
      const memoryAlert = receivedAlerts.find(alert => alert.alertType === 'memory_leak');
      
      expect(fpsAlert).toBeDefined();
      expect(fpsAlert.severity).toBe('high');
      
      expect(memoryAlert).toBeDefined();
      expect(memoryAlert.severity).toBe('medium');
    });
  });

  describe('Real-time analytics event streaming', () => {
    it('should stream analytics events to subscribers', async () => {
      const receivedEvents: any[] = [];
      
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'subscribe_to_events') {
            ws.subscribedToEvents = true;
            ws.subscriptionFilters = message.filters || {};
          }
          
          if (message.type === 'analytics_event') {
            // Broadcast event to subscribers
            wsServer.clients.forEach((client) => {
              if (client.subscribedToEvents && 
                  client.readyState === client.OPEN &&
                  client !== ws) {
                
                // Apply filters if any
                const filters = client.subscriptionFilters;
                let shouldSend = true;
                
                if (filters.animationId && 
                    message.event.animationId !== filters.animationId) {
                  shouldSend = false;
                }
                
                if (filters.eventType && 
                    message.event.eventType !== filters.eventType) {
                  shouldSend = false;
                }
                
                if (shouldSend) {
                  client.send(JSON.stringify({
                    type: 'analytics_event_received',
                    event: message.event,
                    timestamp: Date.now()
                  }));
                }
              }
            });
          }
        });
      });
      
      // Create subscriber client
      const subscriberClient = new MockWebSocketClient();
      await subscriberClient.connect(`ws://localhost:${serverPort}`);
      
      subscriberClient.on('message', (data) => {
        if (data.type === 'analytics_event_received') {
          receivedEvents.push(data.event);
        }
      });
      
      // Subscribe to events with filter
      subscriberClient.send({
        type: 'subscribe_to_events',
        filters: {
          animationId: 'test-animation-123',
          eventType: 'interaction'
        }
      });
      
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      // Send matching event
      const matchingEvent = AnimationEventFactory.create({
        animationId: 'test-animation-123',
        eventType: 'interaction'
      });
      
      wsClient.send({
        type: 'analytics_event',
        event: matchingEvent
      });
      
      // Send non-matching event
      const nonMatchingEvent = AnimationEventFactory.create({
        animationId: 'other-animation',
        eventType: 'view'
      });
      
      wsClient.send({
        type: 'analytics_event',
        event: nonMatchingEvent
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should only receive the matching event
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        animationId: 'test-animation-123',
        eventType: 'interaction'
      });
      
      subscriberClient.close();
    });
  });

  describe('Connection management and error handling', () => {
    it('should handle connection drops and reconnection', async () => {
      const connectionEvents: string[] = [];
      
      wsServer.on('connection', (ws) => {
        connectionEvents.push('connected');
        
        ws.on('close', () => {
          connectionEvents.push('disconnected');
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'ping') {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
          }
        });
      });
      
      // Initial connection
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      // Send ping to verify connection
      wsClient.send({ type: 'ping' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Close connection
      wsClient.close();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(connectionEvents).toContain('connected');
      expect(connectionEvents).toContain('disconnected');
    });

    it('should validate message formats and handle malformed data', async () => {
      const errorResponses: any[] = [];
      
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Validate required fields
            if (!message.type) {
              ws.send(JSON.stringify({
                type: 'error',
                code: 'INVALID_MESSAGE',
                message: 'Message type is required',
                timestamp: Date.now()
              }));
              return;
            }
            
            // Handle valid message types
            if (message.type === 'test_message') {
              ws.send(JSON.stringify({
                type: 'message_received',
                messageId: message.id
              }));
            }
            
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'MALFORMED_JSON',
              message: 'Invalid JSON format',
              timestamp: Date.now()
            }));
          }
        });
      });
      
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      wsClient.on('message', (data) => {
        if (data.type === 'error') {
          errorResponses.push(data);
        }
      });
      
      // Send malformed JSON
      if (wsClient['ws']) {
        wsClient['ws'].send('{ invalid json }');
      }
      
      // Send message without type
      wsClient.send({ id: 'test-123' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(errorResponses).toHaveLength(2);
      expect(errorResponses[0].code).toBe('MALFORMED_JSON');
      expect(errorResponses[1].code).toBe('INVALID_MESSAGE');
    });

    it('should handle high-frequency message bursts', async () => {
      const receivedCount = { count: 0 };
      
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'burst_message') {
            receivedCount.count++;
            
            // Send acknowledgment for every 10th message
            if (receivedCount.count % 10 === 0) {
              ws.send(JSON.stringify({
                type: 'batch_ack',
                processedCount: receivedCount.count
              }));
            }
          }
        });
      });
      
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      const ackResponses: any[] = [];
      wsClient.on('message', (data) => {
        if (data.type === 'batch_ack') {
          ackResponses.push(data);
        }
      });
      
      // Send burst of 50 messages
      for (let i = 0; i < 50; i++) {
        wsClient.send({
          type: 'burst_message',
          id: i,
          data: `message-${i}`
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(receivedCount.count).toBe(50);
      expect(ackResponses).toHaveLength(5); // Every 10th message
      expect(ackResponses[4].processedCount).toBe(50);
    });
  });

  describe('Authentication and authorization', () => {
    it('should require authentication for sensitive operations', async () => {
      const authErrors: any[] = [];
      
      wsServer.on('connection', (ws) => {
        ws.authenticated = false;
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'authenticate') {
            // Simple token validation
            if (message.token === 'valid-token') {
              ws.authenticated = true;
              ws.send(JSON.stringify({
                type: 'authentication_success',
                userId: 'test-user-123'
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'authentication_failed',
                message: 'Invalid token'
              }));
            }
            return;
          }
          
          // Check authentication for protected operations
          const protectedOperations = [
            'config_update',
            'start_performance_monitoring',
            'admin_command'
          ];
          
          if (protectedOperations.includes(message.type) && !ws.authenticated) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: 'Authentication required for this operation'
            }));
            return;
          }
          
          // Handle authenticated operations
          if (message.type === 'config_update' && ws.authenticated) {
            ws.send(JSON.stringify({
              type: 'config_update_success',
              animationId: message.animationId
            }));
          }
        });
      });
      
      await wsClient.connect(`ws://localhost:${serverPort}`);
      
      wsClient.on('message', (data) => {
        if (data.type === 'error' && data.code === 'UNAUTHORIZED') {
          authErrors.push(data);
        }
      });
      
      // Try protected operation without authentication
      wsClient.send({
        type: 'config_update',
        animationId: 'test-animation',
        config: { speed: 2.0 }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(authErrors).toHaveLength(1);
      
      // Authenticate and retry
      wsClient.send({
        type: 'authenticate',
        token: 'valid-token'
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Now the operation should succeed
      wsClient.send({
        type: 'config_update',
        animationId: 'test-animation',
        config: { speed: 2.0 }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should still only have the one unauthorized error
      expect(authErrors).toHaveLength(1);
    });
  });
});