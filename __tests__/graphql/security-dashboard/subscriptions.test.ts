import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import WebSocket from 'ws';
import { createMockContext, MockContext } from '../../utils/graphql-test-utils';
import { securityDashboardSchema } from '../../../graphql/schema/security-dashboard-schema';
import { securityDashboardResolvers } from '../../../graphql/resolvers/security-dashboard-resolvers';
import { ThreatLevel, AssetType, Environment } from '../../../graphql/types/security';

describe('Security Dashboard GraphQL Subscriptions', () => {
  let server: ApolloServer;
  let pubsub: PubSub;
  let mockContext: MockContext;
  let subscriptionServer: SubscriptionServer;

  beforeAll(async () => {
    // Use in-memory PubSub for testing
    pubsub = new PubSub();

    mockContext = createMockContext();
    mockContext.pubsub = pubsub;

    server = new ApolloServer({
      typeDefs: securityDashboardSchema,
      resolvers: securityDashboardResolvers,
      context: () => mockContext,
      subscriptions: {
        onConnect: (connectionParams, webSocket, context) => {
          // Mock authentication for testing
          return {
            user: { id: 'user-123', organizationId: 'org-123' },
            pubsub,
          };
        },
      },
    });

    const httpServer = await server.listen({ port: 0 });

    // Setup WebSocket server for subscriptions
    subscriptionServer = SubscriptionServer.create(
      {
        schema: server.schema,
        execute,
        subscribe,
        onConnect: server.subscriptions.onConnect,
      },
      {
        server: httpServer.server,
        path: server.graphqlPath,
      }
    );
  });

  afterAll(async () => {
    if (subscriptionServer) {
      subscriptionServer.close();
    }
    if (server) {
      await server.stop();
    }
  });

  beforeEach(() => {
    // Clear any previous subscriptions/publications
    jest.clearAllMocks();
  });

  describe('securityEventAdded Subscription', () => {
    it('should receive security events for organization', async (done) => {
      const organizationId = 'org-123';
      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
            title
            severity
            eventType
            organizationId
            createdAt
          }
        }
      `;

      const mockEvent = {
        id: 'event-123',
        assetId: 'asset-123',
        organizationId,
        title: 'Suspicious Login Attempt',
        severity: ThreatLevel.HIGH,
        eventType: 'LOGIN_ATTEMPT',
        description: 'Multiple failed login attempts detected',
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };

      // Subscribe to security events
      const iterator = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { organizationId },
        contextValue: mockContext,
      });

      expect(iterator).toBeDefined();

      if ('next' in iterator) {
        // Set up timeout to prevent test hanging
        const timeout = setTimeout(() => {
          done(new Error('Subscription timed out'));
        }, 5000);

        // Listen for the first event
        iterator.next().then((result) => {
          clearTimeout(timeout);

          expect(result.done).toBeFalsy();
          expect(result.value.data).toBeDefined();
          expect(result.value.data.securityEventAdded).toEqual({
            id: 'event-123',
            title: 'Suspicious Login Attempt',
            severity: 'HIGH',
            eventType: 'LOGIN_ATTEMPT',
            organizationId,
            createdAt: mockEvent.createdAt,
          });

          done();
        }).catch(done);

        // Publish a security event
        setTimeout(() => {
          pubsub.publish(`SECURITY_EVENT_ADDED:${organizationId}`, {
            securityEventAdded: mockEvent,
          });
        }, 100);
      } else {
        done(new Error('Failed to create subscription iterator'));
      }
    });

    it('should not receive events for other organizations', async (done) => {
      const organizationId = 'org-123';
      const otherOrgId = 'org-456';

      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
            organizationId
          }
        }
      `;

      const iterator = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { organizationId },
        contextValue: mockContext,
      });

      if ('next' in iterator) {
        // Set up timeout - should not receive any events
        const timeout = setTimeout(() => {
          done(); // Success - no events received
        }, 1000);

        // This should not trigger the subscription
        iterator.next().then(() => {
          clearTimeout(timeout);
          done(new Error('Should not have received event for other organization'));
        });

        // Publish event for different organization
        setTimeout(() => {
          pubsub.publish(`SECURITY_EVENT_ADDED:${otherOrgId}`, {
            securityEventAdded: {
              id: 'event-456',
              organizationId: otherOrgId,
              title: 'Other org event',
            },
          });
        }, 100);
      } else {
        done(new Error('Failed to create subscription iterator'));
      }
    });

    it('should handle multiple subscribers', async () => {
      const organizationId = 'org-123';
      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
            title
          }
        }
      `;

      // Create multiple subscribers
      const iterator1 = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { organizationId },
        contextValue: mockContext,
      });

      const iterator2 = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { organizationId },
        contextValue: mockContext,
      });

      const mockEvent = {
        id: 'event-broadcast',
        title: 'Broadcast Event',
        organizationId,
      };

      // Publish event
      pubsub.publish(`SECURITY_EVENT_ADDED:${organizationId}`, {
        securityEventAdded: mockEvent,
      });

      // Both iterators should receive the event
      if ('next' in iterator1 && 'next' in iterator2) {
        const [result1, result2] = await Promise.all([
          iterator1.next(),
          iterator2.next(),
        ]);

        expect(result1.value.data.securityEventAdded.id).toBe('event-broadcast');
        expect(result2.value.data.securityEventAdded.id).toBe('event-broadcast');
      }
    });
  });

  describe('vulnerabilityDetected Subscription', () => {
    it('should receive vulnerability notifications', async (done) => {
      const assetId = 'asset-123';
      const subscription = `
        subscription VulnerabilityDetected($assetId: ID!) {
          vulnerabilityDetected(assetId: $assetId) {
            id
            title
            severity
            assetId
            detectedAt
          }
        }
      `;

      const mockVulnerability = {
        id: 'vuln-123',
        assetId,
        title: 'Critical SQL Injection',
        severity: ThreatLevel.CRITICAL,
        description: 'SQL injection vulnerability detected',
        status: 'OPEN',
        detectedAt: new Date().toISOString(),
      };

      const iterator = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { assetId },
        contextValue: mockContext,
      });

      if ('next' in iterator) {
        const timeout = setTimeout(() => {
          done(new Error('Subscription timed out'));
        }, 5000);

        iterator.next().then((result) => {
          clearTimeout(timeout);

          expect(result.value.data.vulnerabilityDetected).toEqual({
            id: 'vuln-123',
            title: 'Critical SQL Injection',
            severity: 'CRITICAL',
            assetId,
            detectedAt: mockVulnerability.detectedAt,
          });

          done();
        }).catch(done);

        // Publish vulnerability
        setTimeout(() => {
          pubsub.publish(`VULNERABILITY_DETECTED:${assetId}`, {
            vulnerabilityDetected: mockVulnerability,
          });
        }, 100);
      } else {
        done(new Error('Failed to create subscription iterator'));
      }
    });
  });

  describe('alertTriggered Subscription', () => {
    it('should receive alert notifications', async (done) => {
      const organizationId = 'org-123';
      const subscription = `
        subscription AlertTriggered($organizationId: ID!) {
          alertTriggered(organizationId: $organizationId) {
            id
            title
            severity
            status
            triggeredAt
          }
        }
      `;

      const mockAlert = {
        id: 'alert-123',
        organizationId,
        title: 'High CPU Usage Detected',
        severity: ThreatLevel.HIGH,
        status: 'OPEN',
        description: 'CPU usage exceeded 90% for 5 minutes',
        triggeredAt: new Date().toISOString(),
      };

      const iterator = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { organizationId },
        contextValue: mockContext,
      });

      if ('next' in iterator) {
        const timeout = setTimeout(() => {
          done(new Error('Subscription timed out'));
        }, 5000);

        iterator.next().then((result) => {
          clearTimeout(timeout);

          expect(result.value.data.alertTriggered).toEqual({
            id: 'alert-123',
            title: 'High CPU Usage Detected',
            severity: 'HIGH',
            status: 'OPEN',
            triggeredAt: mockAlert.triggeredAt,
          });

          done();
        }).catch(done);

        // Publish alert
        setTimeout(() => {
          pubsub.publish(`ALERT_TRIGGERED:${organizationId}`, {
            alertTriggered: mockAlert,
          });
        }, 100);
      } else {
        done(new Error('Failed to create subscription iterator'));
      }
    });
  });

  describe('kongAdminApiStatusChanged Subscription', () => {
    it('should receive Kong Admin API status changes', async (done) => {
      const subscription = `
        subscription KongAdminApiStatusChanged {
          kongAdminApiStatusChanged {
            isSecure
            protocol
            isVulnerable
            riskLevel
            recommendedActions
            lastChecked
          }
        }
      `;

      const mockKongStatus = {
        id: 'kong-status-123',
        isSecure: false,
        protocol: 'HTTP',
        isVulnerable: true,
        riskLevel: ThreatLevel.CRITICAL,
        recommendedActions: [
          'Configure HTTPS for Admin API',
          'Restrict Admin API access to internal networks',
        ],
        lastChecked: new Date().toISOString(),
      };

      const iterator = await subscribe({
        schema: server.schema,
        document: subscription,
        contextValue: mockContext,
      });

      if ('next' in iterator) {
        const timeout = setTimeout(() => {
          done(new Error('Subscription timed out'));
        }, 5000);

        iterator.next().then((result) => {
          clearTimeout(timeout);

          expect(result.value.data.kongAdminApiStatusChanged).toEqual({
            isSecure: false,
            protocol: 'HTTP',
            isVulnerable: true,
            riskLevel: 'CRITICAL',
            recommendedActions: [
              'Configure HTTPS for Admin API',
              'Restrict Admin API access to internal networks',
            ],
            lastChecked: mockKongStatus.lastChecked,
          });

          done();
        }).catch(done);

        // Publish Kong status change
        setTimeout(() => {
          pubsub.publish('KONG_ADMIN_API_STATUS_CHANGED', {
            kongAdminApiStatusChanged: mockKongStatus,
          });
        }, 100);
      } else {
        done(new Error('Failed to create subscription iterator'));
      }
    });
  });

  describe('threatLevelChanged Subscription', () => {
    it('should receive threat level changes', async (done) => {
      const organizationId = 'org-123';
      const subscription = `
        subscription ThreatLevelChanged($organizationId: ID!) {
          threatLevelChanged(organizationId: $organizationId) {
            organizationId
            oldThreatLevel
            newThreatLevel
            reason
            changedAt
          }
        }
      `;

      const mockThreatLevelChange = {
        organizationId,
        oldThreatLevel: ThreatLevel.MEDIUM,
        newThreatLevel: ThreatLevel.HIGH,
        reason: 'Critical vulnerability detected in production asset',
        changedAt: new Date().toISOString(),
      };

      const iterator = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { organizationId },
        contextValue: mockContext,
      });

      if ('next' in iterator) {
        const timeout = setTimeout(() => {
          done(new Error('Subscription timed out'));
        }, 5000);

        iterator.next().then((result) => {
          clearTimeout(timeout);

          expect(result.value.data.threatLevelChanged).toEqual({
            organizationId,
            oldThreatLevel: 'MEDIUM',
            newThreatLevel: 'HIGH',
            reason: 'Critical vulnerability detected in production asset',
            changedAt: mockThreatLevelChange.changedAt,
          });

          done();
        }).catch(done);

        // Publish threat level change
        setTimeout(() => {
          pubsub.publish(`THREAT_LEVEL_CHANGED:${organizationId}`, {
            threatLevelChanged: mockThreatLevelChange,
          });
        }, 100);
      } else {
        done(new Error('Failed to create subscription iterator'));
      }
    });
  });

  describe('Subscription Authentication and Authorization', () => {
    it('should reject unauthenticated subscriptions', async () => {
      const unauthenticatedContext = {
        ...mockContext,
        user: null,
      };

      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
          }
        }
      `;

      try {
        await subscribe({
          schema: server.schema,
          document: subscription,
          variableValues: { organizationId: 'org-123' },
          contextValue: unauthenticatedContext,
        });
        fail('Should have rejected unauthenticated subscription');
      } catch (error) {
        expect(error.message).toContain('Authentication required');
      }
    });

    it('should reject subscriptions for unauthorized organizations', async () => {
      const unauthorizedContext = {
        ...mockContext,
        user: {
          id: 'user-456',
          organizationId: 'org-456', // Different organization
        },
      };

      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
          }
        }
      `;

      try {
        await subscribe({
          schema: server.schema,
          document: subscription,
          variableValues: { organizationId: 'org-123' }, // User not in this org
          contextValue: unauthorizedContext,
        });
        fail('Should have rejected unauthorized subscription');
      } catch (error) {
        expect(error.message).toContain('Access denied');
      }
    });
  });

  describe('Connection Management', () => {
    it('should handle subscription cleanup on disconnect', async () => {
      const organizationId = 'org-123';
      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
          }
        }
      `;

      const iterator = await subscribe({
        schema: server.schema,
        document: subscription,
        variableValues: { organizationId },
        contextValue: mockContext,
      });

      if ('return' in iterator) {
        // Simulate client disconnect
        await iterator.return();

        // Verify subscription is cleaned up
        expect(iterator.next).toBeDefined();

        const nextResult = await iterator.next();
        expect(nextResult.done).toBeTruthy();
      }
    });

    it('should handle subscription errors gracefully', async (done) => {
      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
            nonExistentField # This should cause an error
          }
        }
      `;

      try {
        await subscribe({
          schema: server.schema,
          document: subscription,
          variableValues: { organizationId: 'org-123' },
          contextValue: mockContext,
        });
        done(new Error('Should have thrown validation error'));
      } catch (error) {
        expect(error.message).toContain('Cannot query field "nonExistentField"');
        done();
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent subscriptions', async () => {
      const organizationId = 'org-123';
      const subscription = `
        subscription SecurityEventAdded($organizationId: ID!) {
          securityEventAdded(organizationId: $organizationId) {
            id
            title
          }
        }
      `;

      // Create multiple concurrent subscriptions
      const subscriptionCount = 50;
      const iterators = await Promise.all(
        Array.from({ length: subscriptionCount }, () =>
          subscribe({
            schema: server.schema,
            document: subscription,
            variableValues: { organizationId },
            contextValue: mockContext,
          })
        )
      );

      // Publish event to all subscribers
      const mockEvent = {
        id: 'concurrent-test-event',
        title: 'Concurrent Test Event',
        organizationId,
      };

      pubsub.publish(`SECURITY_EVENT_ADDED:${organizationId}`, {
        securityEventAdded: mockEvent,
      });

      // All iterators should receive the event
      const results = await Promise.all(
        iterators.map((iterator) => {
          if ('next' in iterator) {
            return iterator.next();
          }
          return Promise.resolve({ done: true, value: null });
        })
      );

      expect(results).toHaveLength(subscriptionCount);
      results.forEach((result) => {
        if (!result.done) {
          expect(result.value.data.securityEventAdded.id).toBe('concurrent-test-event');
        }
      });
    });
  });
});
