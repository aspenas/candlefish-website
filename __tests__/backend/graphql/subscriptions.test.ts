import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { GraphQLSubscriptionService } from '../../../services/graphql/subscription.service';
import { AuthService } from '../../../services/auth/auth.service';
import { WebSocketGateway } from '../../../gateways/websocket.gateway';
import { User, Dashboard, AnalyticsEvent } from '../../../types/entities';
import { UnauthorizedException } from '@nestjs/common';

describe('GraphQL Subscriptions', () => {
  let subscriptionService: GraphQLSubscriptionService;
  let webSocketGateway: WebSocketGateway;
  let authService: DeepMocked<AuthService>;
  let pubSub: DeepMocked<PubSub>;
  let redisPubSub: DeepMocked<RedisPubSub>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDashboard: Dashboard = {
    id: 'dashboard-123',
    organizationId: 'org-123',
    name: 'Test Dashboard',
    config: {
      widgets: [
        {
          id: 'widget-1',
          type: 'line_chart',
          query: 'SELECT count() FROM events',
          position: { x: 0, y: 0, width: 6, height: 4 },
        },
      ],
    },
    isActive: true,
    createdBy: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConnection = {
    id: 'connection-123',
    user: mockUser,
    subscriptions: new Set(),
    isAlive: true,
    lastPing: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphQLSubscriptionService,
        WebSocketGateway,
        {
          provide: AuthService,
          useValue: createMock<AuthService>(),
        },
        {
          provide: 'PUB_SUB',
          useValue: createMock<PubSub>(),
        },
        {
          provide: 'REDIS_PUB_SUB',
          useValue: createMock<RedisPubSub>(),
        },
      ],
    }).compile();

    subscriptionService = module.get<GraphQLSubscriptionService>(GraphQLSubscriptionService);
    webSocketGateway = module.get<WebSocketGateway>(WebSocketGateway);
    authService = module.get(AuthService);
    pubSub = module.get('PUB_SUB');
    redisPubSub = module.get('REDIS_PUB_SUB');
  });

  describe('Connection Management', () => {
    describe('handleConnection', () => {
      it('should authenticate and register new connection', async () => {
        // Arrange
        const socket = {
          id: 'socket-123',
          handshake: {
            auth: {
              token: 'valid-jwt-token',
            },
          },
          join: jest.fn(),
          emit: jest.fn(),
          disconnect: jest.fn(),
        };

        authService.validateToken.mockResolvedValue(mockUser);

        // Act
        await webSocketGateway.handleConnection(socket);

        // Assert
        expect(authService.validateToken).toHaveBeenCalledWith('valid-jwt-token');
        expect(socket.join).toHaveBeenCalledWith(`org:${mockUser.organizationId}`);
        expect(socket.emit).toHaveBeenCalledWith('authenticated', {
          userId: mockUser.id,
          organizationId: mockUser.organizationId,
        });
      });

      it('should reject connection with invalid token', async () => {
        // Arrange
        const socket = {
          id: 'socket-123',
          handshake: {
            auth: {
              token: 'invalid-token',
            },
          },
          emit: jest.fn(),
          disconnect: jest.fn(),
        };

        authService.validateToken.mockRejectedValue(new UnauthorizedException());

        // Act
        await webSocketGateway.handleConnection(socket);

        // Assert
        expect(socket.emit).toHaveBeenCalledWith('error', {
          message: 'Authentication failed',
        });
        expect(socket.disconnect).toHaveBeenCalled();
      });

      it('should reject connection without token', async () => {
        // Arrange
        const socket = {
          id: 'socket-123',
          handshake: {
            auth: {},
          },
          emit: jest.fn(),
          disconnect: jest.fn(),
        };

        // Act
        await webSocketGateway.handleConnection(socket);

        // Assert
        expect(socket.emit).toHaveBeenCalledWith('error', {
          message: 'Authentication token required',
        });
        expect(socket.disconnect).toHaveBeenCalled();
      });
    });

    describe('handleDisconnect', () => {
      it('should cleanup connection on disconnect', async () => {
        // Arrange
        const socket = {
          id: 'socket-123',
          userId: mockUser.id,
          organizationId: mockUser.organizationId,
          leave: jest.fn(),
        };

        webSocketGateway['connections'].set('socket-123', mockConnection);

        // Act
        await webSocketGateway.handleDisconnect(socket);

        // Assert
        expect(socket.leave).toHaveBeenCalledWith(`org:${mockUser.organizationId}`);
        expect(webSocketGateway['connections'].has('socket-123')).toBe(false);
      });
    });
  });

  describe('Dashboard Subscriptions', () => {
    describe('dashboardUpdates', () => {
      it('should publish dashboard creation to subscribers', async () => {
        // Arrange
        const createdDashboard = { ...mockDashboard };
        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishDashboardCreated(createdDashboard);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `dashboardCreated.${createdDashboard.organizationId}`,
          {
            dashboardCreated: createdDashboard,
          }
        );
      });

      it('should publish dashboard updates to subscribers', async () => {
        // Arrange
        const updatedDashboard = {
          ...mockDashboard,
          name: 'Updated Dashboard',
          updatedAt: new Date(),
        };

        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishDashboardUpdated(updatedDashboard);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `dashboardUpdated.${updatedDashboard.organizationId}`,
          {
            dashboardUpdated: updatedDashboard,
          }
        );
      });

      it('should publish dashboard deletion to subscribers', async () => {
        // Arrange
        const deletedDashboard = {
          id: mockDashboard.id,
          organizationId: mockDashboard.organizationId,
        };

        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishDashboardDeleted(deletedDashboard);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `dashboardDeleted.${deletedDashboard.organizationId}`,
          {
            dashboardDeleted: deletedDashboard,
          }
        );
      });

      it('should filter dashboard updates by organization', async () => {
        // Arrange
        const dashboardFromDifferentOrg = {
          ...mockDashboard,
          organizationId: 'org-456',
        };

        // Act
        const shouldReceive = await subscriptionService.filterDashboardUpdates(
          { dashboardUpdated: dashboardFromDifferentOrg },
          { organizationId: 'org-123' }
        );

        // Assert
        expect(shouldReceive).toBe(false);
      });

      it('should allow dashboard updates from same organization', async () => {
        // Arrange
        const dashboardFromSameOrg = {
          ...mockDashboard,
          organizationId: 'org-123',
        };

        // Act
        const shouldReceive = await subscriptionService.filterDashboardUpdates(
          { dashboardUpdated: dashboardFromSameOrg },
          { organizationId: 'org-123' }
        );

        // Assert
        expect(shouldReceive).toBe(true);
      });
    });

    describe('widgetDataUpdates', () => {
      it('should publish widget data updates', async () => {
        // Arrange
        const widgetUpdate = {
          dashboardId: 'dashboard-123',
          widgetId: 'widget-1',
          data: [
            { timestamp: '2024-01-01T00:00:00Z', value: 100 },
            { timestamp: '2024-01-01T01:00:00Z', value: 120 },
          ],
          organizationId: 'org-123',
        };

        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishWidgetDataUpdate(widgetUpdate);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `widgetData.${widgetUpdate.organizationId}.${widgetUpdate.dashboardId}`,
          {
            widgetDataUpdated: widgetUpdate,
          }
        );
      });

      it('should batch multiple widget updates', async () => {
        // Arrange
        const widgetUpdates = [
          {
            dashboardId: 'dashboard-123',
            widgetId: 'widget-1',
            data: [{ timestamp: '2024-01-01T00:00:00Z', value: 100 }],
            organizationId: 'org-123',
          },
          {
            dashboardId: 'dashboard-123',
            widgetId: 'widget-2',
            data: [{ timestamp: '2024-01-01T00:00:00Z', value: 200 }],
            organizationId: 'org-123',
          },
        ];

        redisPubSub.publishBatch = jest.fn().mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishWidgetDataBatch(widgetUpdates);

        // Assert
        expect(redisPubSub.publishBatch).toHaveBeenCalledWith(
          widgetUpdates.map(update => ({
            channel: `widgetData.${update.organizationId}.${update.dashboardId}`,
            payload: { widgetDataUpdated: update },
          }))
        );
      });
    });
  });

  describe('Analytics Subscriptions', () => {
    describe('realtimeMetrics', () => {
      it('should publish real-time metrics updates', async () => {
        // Arrange
        const metrics = {
          activeUsers: 45,
          pageViews: 1200,
          sessionsToday: 300,
          avgSessionDuration: 180,
          timestamp: new Date(),
          organizationId: 'org-123',
        };

        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishRealtimeMetrics(metrics);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `realtimeMetrics.${metrics.organizationId}`,
          {
            realtimeMetricsUpdated: metrics,
          }
        );
      });

      it('should throttle frequent metrics updates', async () => {
        // Arrange
        const metrics = {
          activeUsers: 45,
          organizationId: 'org-123',
          timestamp: new Date(),
        };

        // Mock throttling mechanism
        subscriptionService['lastMetricsUpdate'] = new Map();
        subscriptionService['lastMetricsUpdate'].set('org-123', Date.now());

        // Act
        const shouldPublish = await subscriptionService.shouldPublishMetrics(
          metrics.organizationId
        );

        // Assert
        expect(shouldPublish).toBe(false);
      });

      it('should allow metrics updates after throttle period', async () => {
        // Arrange
        const metrics = {
          activeUsers: 45,
          organizationId: 'org-123',
          timestamp: new Date(),
        };

        // Mock throttling mechanism with old timestamp
        subscriptionService['lastMetricsUpdate'] = new Map();
        subscriptionService['lastMetricsUpdate'].set('org-123', Date.now() - 61000); // 61 seconds ago

        // Act
        const shouldPublish = await subscriptionService.shouldPublishMetrics(
          metrics.organizationId
        );

        // Assert
        expect(shouldPublish).toBe(true);
      });
    });

    describe('eventStream', () => {
      it('should publish analytics events to stream', async () => {
        // Arrange
        const event: AnalyticsEvent = {
          id: 'event-123',
          organizationId: 'org-123',
          userId: 'user-123',
          eventType: 'page_view',
          properties: {
            page: '/dashboard',
            url: 'https://app.example.com/dashboard',
          },
          timestamp: new Date(),
          sessionId: 'session-123',
          deviceId: 'device-123',
        };

        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishAnalyticsEvent(event);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `analyticsEvents.${event.organizationId}`,
          {
            analyticsEvent: event,
          }
        );
      });

      it('should filter events by event type', async () => {
        // Arrange
        const event: AnalyticsEvent = {
          id: 'event-123',
          organizationId: 'org-123',
          userId: 'user-123',
          eventType: 'button_click',
          properties: {},
          timestamp: new Date(),
          sessionId: 'session-123',
          deviceId: 'device-123',
        };

        const variables = {
          eventTypes: ['page_view', 'form_submit'],
        };

        // Act
        const shouldReceive = await subscriptionService.filterAnalyticsEvents(
          { analyticsEvent: event },
          variables
        );

        // Assert
        expect(shouldReceive).toBe(false);
      });

      it('should allow events matching filter criteria', async () => {
        // Arrange
        const event: AnalyticsEvent = {
          id: 'event-123',
          organizationId: 'org-123',
          userId: 'user-123',
          eventType: 'page_view',
          properties: {},
          timestamp: new Date(),
          sessionId: 'session-123',
          deviceId: 'device-123',
        };

        const variables = {
          eventTypes: ['page_view', 'button_click'],
        };

        // Act
        const shouldReceive = await subscriptionService.filterAnalyticsEvents(
          { analyticsEvent: event },
          variables
        );

        // Assert
        expect(shouldReceive).toBe(true);
      });
    });
  });

  describe('User Activity Subscriptions', () => {
    describe('userActivity', () => {
      it('should publish user online status', async () => {
        // Arrange
        const userActivity = {
          userId: 'user-123',
          organizationId: 'org-123',
          status: 'online',
          lastSeen: new Date(),
          currentPage: '/dashboard',
        };

        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishUserActivity(userActivity);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `userActivity.${userActivity.organizationId}`,
          {
            userActivity: userActivity,
          }
        );
      });

      it('should track user presence', async () => {
        // Arrange
        const socket = {
          id: 'socket-123',
          userId: mockUser.id,
          organizationId: mockUser.organizationId,
          emit: jest.fn(),
        };

        // Act
        await webSocketGateway.updateUserPresence(socket, {
          currentPage: '/analytics',
          isActive: true,
        });

        // Assert
        expect(socket.emit).toHaveBeenCalledWith('presenceUpdated', {
          userId: mockUser.id,
          currentPage: '/analytics',
          isActive: true,
          timestamp: expect.any(Date),
        });
      });

      it('should handle user going offline', async () => {
        // Arrange
        const userActivity = {
          userId: 'user-123',
          organizationId: 'org-123',
          status: 'offline',
          lastSeen: new Date(),
        };

        redisPubSub.publish.mockResolvedValue(undefined);

        // Act
        await subscriptionService.publishUserActivity(userActivity);

        // Assert
        expect(redisPubSub.publish).toHaveBeenCalledWith(
          `userActivity.${userActivity.organizationId}`,
          {
            userActivity: userActivity,
          }
        );
      });
    });
  });

  describe('Subscription Security', () => {
    describe('authorization', () => {
      it('should validate user access to organization subscriptions', async () => {
        // Arrange
        const context = {
          connection: {
            user: mockUser,
          },
        };

        const variables = {
          organizationId: 'org-123',
        };

        // Act
        const hasAccess = await subscriptionService.validateSubscriptionAccess(
          context,
          variables
        );

        // Assert
        expect(hasAccess).toBe(true);
      });

      it('should deny access to different organization subscriptions', async () => {
        // Arrange
        const context = {
          connection: {
            user: mockUser,
          },
        };

        const variables = {
          organizationId: 'org-456', // Different organization
        };

        // Act
        const hasAccess = await subscriptionService.validateSubscriptionAccess(
          context,
          variables
        );

        // Assert
        expect(hasAccess).toBe(false);
      });

      it('should allow super admin access to any organization', async () => {
        // Arrange
        const superAdminUser = { ...mockUser, role: 'SUPER_ADMIN' };
        const context = {
          connection: {
            user: superAdminUser,
          },
        };

        const variables = {
          organizationId: 'any-org-id',
        };

        // Act
        const hasAccess = await subscriptionService.validateSubscriptionAccess(
          context,
          variables
        );

        // Assert
        expect(hasAccess).toBe(true);
      });
    });

    describe('rateLimiting', () => {
      it('should apply rate limiting to subscription messages', async () => {
        // Arrange
        const connectionId = 'connection-123';
        subscriptionService['rateLimiter'] = new Map();

        // Act - Send multiple messages quickly
        for (let i = 0; i < 101; i++) {
          await subscriptionService.checkRateLimit(connectionId);
        }

        // Assert
        const isRateLimited = await subscriptionService.isRateLimited(connectionId);
        expect(isRateLimited).toBe(true);
      });

      it('should reset rate limit after window expires', async () => {
        // Arrange
        const connectionId = 'connection-123';
        subscriptionService['rateLimiter'] = new Map();

        // Set old timestamp
        subscriptionService['rateLimiter'].set(connectionId, {
          count: 100,
          resetTime: Date.now() - 61000, // 61 seconds ago
        });

        // Act
        const isRateLimited = await subscriptionService.isRateLimited(connectionId);

        // Assert
        expect(isRateLimited).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    describe('connection errors', () => {
      it('should handle Redis connection failures gracefully', async () => {
        // Arrange
        redisPubSub.publish.mockRejectedValue(new Error('Redis connection failed'));

        const metrics = {
          activeUsers: 45,
          organizationId: 'org-123',
          timestamp: new Date(),
        };

        // Act & Assert - Should not throw
        await expect(
          subscriptionService.publishRealtimeMetrics(metrics)
        ).resolves.not.toThrow();
      });

      it('should fallback to in-memory pub/sub on Redis failure', async () => {
        // Arrange
        redisPubSub.publish.mockRejectedValue(new Error('Redis unavailable'));
        pubSub.publish.mockResolvedValue(undefined);

        const dashboard = { ...mockDashboard };

        // Act
        await subscriptionService.publishDashboardCreated(dashboard);

        // Assert
        expect(pubSub.publish).toHaveBeenCalledWith(
          `dashboardCreated.${dashboard.organizationId}`,
          {
            dashboardCreated: dashboard,
          }
        );
      });
    });

    describe('subscription errors', () => {
      it('should handle subscription filter errors', async () => {
        // Arrange
        const event = { analyticsEvent: null }; // Invalid event
        const variables = { eventTypes: ['page_view'] };

        // Act & Assert
        await expect(
          subscriptionService.filterAnalyticsEvents(event, variables)
        ).resolves.toBe(false);
      });

      it('should handle malformed subscription payloads', async () => {
        // Arrange
        const malformedPayload = { invalidStructure: true };

        // Act & Assert
        const isValid = await subscriptionService.validatePayload(malformedPayload);
        expect(isValid).toBe(false);
      });
    });
  });
});
