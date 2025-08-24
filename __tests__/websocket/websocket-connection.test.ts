/**
 * WebSocket connection tests for real-time deployment updates
 * Tests WebSocket connectivity, message handling, and reconnection logic
 */

import WebSocket from 'ws';
import { createServer } from 'http';
import { app } from '../../src/deployment-api/app';
import { WebSocketManager } from '../../src/deployment-api/websocket/manager';
import { generateTestJWT } from '../utils/jwt-helpers';
import { EventEmitter } from 'events';

// Test utilities
import { startTestServices, stopTestServices } from '../utils/service-helpers';
import { createTestDeployment } from '../utils/deployment-helpers';

describe('WebSocket Connection Tests', () => {
  let server: any;
  let wsManager: WebSocketManager;
  let testPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    await startTestServices();

    // Start test server
    testPort = 3001;
    server = createServer(app);
    wsManager = new WebSocketManager(server);

    await new Promise<void>((resolve) => {
      server.listen(testPort, () => {
        baseUrl = `ws://localhost:${testPort}`;
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await stopTestServices();
  }, 30000);

  describe('WebSocket Authentication', () => {
    it('should establish connection with valid JWT token', async () => {
      const validToken = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${validToken}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          resolve();
        });

        ws.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      ws.close();
    });

    it('should reject connection without token', async () => {
      const ws = new WebSocket(`${baseUrl}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          reject(new Error('Connection should have been rejected'));
        });

        ws.on('close', (code, reason) => {
          expect(code).toBe(1008); // Policy violation
          expect(reason.toString()).toContain('authentication required');
          resolve();
        });

        ws.on('error', () => {
          // Expected for rejected connections
          resolve();
        });

        setTimeout(() => reject(new Error('Test timeout')), 5000);
      });
    });

    it('should reject connection with invalid token', async () => {
      const ws = new WebSocket(`${baseUrl}/ws?token=invalid-token`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          reject(new Error('Connection should have been rejected'));
        });

        ws.on('close', (code, reason) => {
          expect(code).toBe(1008); // Policy violation
          expect(reason.toString()).toContain('invalid token');
          resolve();
        });

        ws.on('error', () => {
          // Expected for rejected connections
          resolve();
        });

        setTimeout(() => reject(new Error('Test timeout')), 5000);
      });
    });

    it('should reject connection with expired token', async () => {
      const expiredToken = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${expiredToken}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          reject(new Error('Connection should have been rejected'));
        });

        ws.on('close', (code, reason) => {
          expect(code).toBe(1008);
          expect(reason.toString()).toContain('expired');
          resolve();
        });

        ws.on('error', () => {
          resolve();
        });

        setTimeout(() => reject(new Error('Test timeout')), 5000);
      });
    });
  });

  describe('Real-time Deployment Updates', () => {
    it('should receive deployment status updates', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Subscribe to deployment updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'deployments',
        filters: { site_name: 'docs' }
      }));

      // Create a deployment to trigger updates
      const deployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'websocket123456789012345678901234567890123',
        branch: 'main'
      });

      // Listen for deployment updates
      const messages: any[] = [];

      const messagePromise = new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          messages.push(message);

          if (message.type === 'deployment.status_changed' &&
              message.payload.deployment_id === deployment.id) {
            resolve();
          }
        });

        setTimeout(() => reject(new Error('Message timeout')), 10000);
      });

      await messagePromise;

      expect(messages).toContainEqual(
        expect.objectContaining({
          type: 'deployment.status_changed',
          payload: expect.objectContaining({
            deployment_id: deployment.id,
            status: expect.stringMatching(/pending|building|deploying|success|failed/)
          })
        })
      );

      ws.close();
    }, 15000);

    it('should receive deployment step updates', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'deployments',
        filters: { environment: 'staging' }
      }));

      const deployment = await createTestDeployment({
        site_name: 'partners',
        environment: 'staging',
        commit_sha: 'stepupdates123456789012345678901234567890',
        branch: 'main'
      });

      const stepMessages: any[] = [];

      const stepPromise = new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'deployment.step_updated' &&
              message.payload.deployment_id === deployment.id) {
            stepMessages.push(message);

            // Wait for build step completion
            if (message.payload.step_name === 'build' &&
                message.payload.status === 'success') {
              resolve();
            }
          }
        });

        setTimeout(() => reject(new Error('Step update timeout')), 20000);
      });

      await stepPromise;

      expect(stepMessages).toContainEqual(
        expect.objectContaining({
          type: 'deployment.step_updated',
          payload: expect.objectContaining({
            deployment_id: deployment.id,
            step_name: 'build',
            status: 'success'
          })
        })
      );

      ws.close();
    }, 25000);

    it('should receive rollback updates', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read', 'deployments:rollback']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'rollbacks'
      }));

      // Create deployments for rollback
      const v1 = await createTestDeployment({
        site_name: 'api',
        environment: 'staging',
        commit_sha: 'rollbackv1234567890123456789012345678901234',
        branch: 'main'
      });

      const v2 = await createTestDeployment({
        site_name: 'api',
        environment: 'staging',
        commit_sha: 'rollbackv2234567890123456789012345678901234',
        branch: 'main'
      });

      // Initiate rollback via API
      const rollbackResponse = await fetch(`http://localhost:${testPort}/api/rollbacks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          site_name: 'api',
          environment: 'staging',
          rollback_target: v1.id,
          reason: 'WebSocket test rollback'
        })
      });

      const rollback = await rollbackResponse.json();

      const rollbackMessages: any[] = [];

      const rollbackPromise = new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'rollback.status_changed' &&
              message.payload.rollback_id === rollback.id) {
            rollbackMessages.push(message);

            if (message.payload.status === 'completed') {
              resolve();
            }
          }
        });

        setTimeout(() => reject(new Error('Rollback update timeout')), 30000);
      });

      await rollbackPromise;

      expect(rollbackMessages).toContainEqual(
        expect.objectContaining({
          type: 'rollback.status_changed',
          payload: expect.objectContaining({
            rollback_id: rollback.id,
            status: 'completed'
          })
        })
      );

      ws.close();
    }, 35000);
  });

  describe('Subscription Management', () => {
    it('should handle multiple subscriptions per connection', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Subscribe to multiple channels
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'deployments',
        filters: { site_name: 'docs' }
      }));

      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'deployments',
        filters: { site_name: 'partners' }
      }));

      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'health'
      }));

      // Verify subscription confirmations
      const confirmations: any[] = [];

      const subscriptionPromise = new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscription.confirmed') {
            confirmations.push(message);

            if (confirmations.length === 3) {
              resolve();
            }
          }
        });

        setTimeout(() => reject(new Error('Subscription timeout')), 5000);
      });

      await subscriptionPromise;

      expect(confirmations).toHaveLength(3);
      expect(confirmations.map(c => c.payload.channel)).toContain('deployments');
      expect(confirmations.map(c => c.payload.channel)).toContain('health');

      ws.close();
    });

    it('should handle unsubscribe requests', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Subscribe first
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'deployments',
        subscription_id: 'test-sub-1'
      }));

      // Wait for subscription confirmation
      await new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'subscription.confirmed') {
            resolve();
          }
        });
        setTimeout(() => reject(new Error('Subscription timeout')), 5000);
      });

      // Now unsubscribe
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        subscription_id: 'test-sub-1'
      }));

      // Wait for unsubscribe confirmation
      await new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'subscription.removed' &&
              message.payload.subscription_id === 'test-sub-1') {
            resolve();
          }
        });
        setTimeout(() => reject(new Error('Unsubscribe timeout')), 5000);
      });

      ws.close();
    });

    it('should enforce permission-based subscription filtering', async () => {
      const limitedToken = generateTestJWT({
        sub: 'user-123',
        role: 'viewer',
        permissions: ['deployments:read'] // No admin permissions
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${limitedToken}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Try to subscribe to admin-only channel
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'audit-logs'
      }));

      // Should receive error message
      await new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'error' &&
              message.payload.message.includes('insufficient permissions')) {
            resolve();
          }
        });
        setTimeout(() => reject(new Error('Permission error timeout')), 5000);
      });

      ws.close();
    });
  });

  describe('Connection Management', () => {
    it('should handle connection heartbeat/ping-pong', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      let pongReceived = false;

      ws.on('pong', () => {
        pongReceived = true;
      });

      // Send ping
      ws.ping();

      // Wait for pong
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          if (pongReceived) {
            clearInterval(interval);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Pong timeout'));
        }, 5000);
      });

      expect(pongReceived).toBe(true);
      ws.close();
    });

    it('should clean up subscriptions on disconnect', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Subscribe to deployments
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'deployments',
        subscription_id: 'cleanup-test'
      }));

      // Wait for subscription
      await new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'subscription.confirmed') {
            resolve();
          }
        });
        setTimeout(() => reject(new Error('Subscription timeout')), 5000);
      });

      // Close connection abruptly
      ws.terminate();

      // Give time for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify subscription was cleaned up (would need access to wsManager state)
      // This is more of an integration test to ensure no memory leaks
      expect(wsManager.getActiveConnections()).not.toContain(
        expect.objectContaining({ subscription_id: 'cleanup-test' })
      );
    });

    it('should handle multiple concurrent connections', async () => {
      const tokens = [1, 2, 3, 4, 5].map(i =>
        generateTestJWT({
          sub: `user-${i}`,
          role: 'admin',
          permissions: ['deployments:read']
        })
      );

      const connections = await Promise.all(
        tokens.map(token => {
          const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);
          return new Promise<WebSocket>((resolve, reject) => {
            ws.on('open', () => resolve(ws));
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          });
        })
      );

      expect(connections).toHaveLength(5);
      expect(connections.every(ws => ws.readyState === WebSocket.OPEN)).toBe(true);

      // Close all connections
      connections.forEach(ws => ws.close());

      // Wait for all to close
      await Promise.all(
        connections.map(ws =>
          new Promise<void>((resolve) => {
            if (ws.readyState === WebSocket.CLOSED) {
              resolve();
            } else {
              ws.on('close', () => resolve());
            }
          })
        )
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed message gracefully', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Send malformed JSON
      ws.send('invalid json message');

      // Should receive error message but connection should stay open
      await new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'error' &&
              message.payload.message.includes('invalid message format')) {
            resolve();
          }
        });

        ws.on('close', () => {
          reject(new Error('Connection should not close'));
        });

        setTimeout(() => reject(new Error('Error message timeout')), 5000);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should handle unknown message types', async () => {
      const token = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read']
      });

      const ws = new WebSocket(`${baseUrl}/ws?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Send unknown message type
      ws.send(JSON.stringify({
        type: 'unknown_message_type',
        payload: { test: 'data' }
      }));

      // Should receive error message
      await new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'error' &&
              message.payload.message.includes('unknown message type')) {
            resolve();
          }
        });
        setTimeout(() => reject(new Error('Error message timeout')), 5000);
      });

      ws.close();
    });
  });
});
