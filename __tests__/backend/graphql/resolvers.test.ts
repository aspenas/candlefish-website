import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserResolver } from '../../../graphql/resolvers/user.resolver';
import { DashboardResolver } from '../../../graphql/resolvers/dashboard.resolver';
import { AnalyticsResolver } from '../../../graphql/resolvers/analytics.resolver';
import { OrganizationResolver } from '../../../graphql/resolvers/organization.resolver';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../services/user/user.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { OrganizationService } from '../../../services/organization/organization.service';
import { PubSubService } from '../../../services/pubsub/pubsub.service';
import { ForbiddenException } from '@nestjs/common';

describe('GraphQL Resolvers', () => {
  let userResolver: UserResolver;
  let dashboardResolver: DashboardResolver;
  let analyticsResolver: AnalyticsResolver;
  let organizationResolver: OrganizationResolver;

  let authService: DeepMocked<AuthService>;
  let userService: DeepMocked<UserService>;
  let dashboardService: DeepMocked<DashboardService>;
  let analyticsService: DeepMocked<AnalyticsService>;
  let organizationService: DeepMocked<OrganizationService>;
  let pubSubService: DeepMocked<PubSubService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    role: 'USER',
    isActive: true,
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      plan: 'PREMIUM',
    },
  };

  const mockContext = {
    req: {
      user: mockUser,
      headers: {
        authorization: 'Bearer jwt-token',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        DashboardResolver,
        AnalyticsResolver,
        OrganizationResolver,
        {
          provide: AuthService,
          useValue: createMock<AuthService>(),
        },
        {
          provide: UserService,
          useValue: createMock<UserService>(),
        },
        {
          provide: DashboardService,
          useValue: createMock<DashboardService>(),
        },
        {
          provide: AnalyticsService,
          useValue: createMock<AnalyticsService>(),
        },
        {
          provide: OrganizationService,
          useValue: createMock<OrganizationService>(),
        },
        {
          provide: PubSubService,
          useValue: createMock<PubSubService>(),
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const ctx = GqlExecutionContext.create(context);
          ctx.getContext().req.user = mockUser;
          return true;
        },
      })
      .compile();

    userResolver = module.get<UserResolver>(UserResolver);
    dashboardResolver = module.get<DashboardResolver>(DashboardResolver);
    analyticsResolver = module.get<AnalyticsResolver>(AnalyticsResolver);
    organizationResolver = module.get<OrganizationResolver>(OrganizationResolver);

    authService = module.get(AuthService);
    userService = module.get(UserService);
    dashboardService = module.get(DashboardService);
    analyticsService = module.get(AnalyticsService);
    organizationService = module.get(OrganizationService);
    pubSubService = module.get(PubSubService);
  });

  describe('UserResolver', () => {
    describe('me', () => {
      it('should return current user', async () => {
        // Arrange
        userService.findById.mockResolvedValue(mockUser);

        // Act
        const result = await userResolver.me(mockContext);

        // Assert
        expect(result).toEqual(mockUser);
        expect(userService.findById).toHaveBeenCalledWith(mockUser.id);
      });
    });

    describe('updateProfile', () => {
      it('should update user profile', async () => {
        // Arrange
        const updateInput = {
          firstName: 'John',
          lastName: 'Doe',
          timezone: 'America/New_York',
        };
        const updatedUser = { ...mockUser, ...updateInput };

        userService.updateProfile.mockResolvedValue(updatedUser);

        // Act
        const result = await userResolver.updateProfile(updateInput, mockContext);

        // Assert
        expect(result).toEqual(updatedUser);
        expect(userService.updateProfile).toHaveBeenCalledWith(
          mockUser.id,
          updateInput
        );
      });
    });

    describe('changePassword', () => {
      it('should change user password', async () => {
        // Arrange
        const changePasswordInput = {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
        };

        authService.validateUser.mockResolvedValue(mockUser);
        userService.changePassword.mockResolvedValue(true);

        // Act
        const result = await userResolver.changePassword(changePasswordInput, mockContext);

        // Assert
        expect(result).toBe(true);
        expect(authService.validateUser).toHaveBeenCalledWith(
          mockUser.email,
          changePasswordInput.currentPassword
        );
        expect(userService.changePassword).toHaveBeenCalledWith(
          mockUser.id,
          changePasswordInput.newPassword
        );
      });

      it('should throw error for invalid current password', async () => {
        // Arrange
        const changePasswordInput = {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        };

        authService.validateUser.mockResolvedValue(null);

        // Act & Assert
        await expect(
          userResolver.changePassword(changePasswordInput, mockContext)
        ).rejects.toThrow('Invalid current password');
      });
    });
  });

  describe('DashboardResolver', () => {
    const mockDashboard = {
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

    describe('dashboards', () => {
      it('should return organization dashboards', async () => {
        // Arrange
        const dashboards = [mockDashboard];
        dashboardService.findByOrganization.mockResolvedValue(dashboards);

        // Act
        const result = await dashboardResolver.dashboards(mockContext);

        // Assert
        expect(result).toEqual(dashboards);
        expect(dashboardService.findByOrganization).toHaveBeenCalledWith(
          mockUser.organizationId,
          mockUser
        );
      });
    });

    describe('dashboard', () => {
      it('should return specific dashboard', async () => {
        // Arrange
        dashboardService.findById.mockResolvedValue(mockDashboard);

        // Act
        const result = await dashboardResolver.dashboard('dashboard-123', mockContext);

        // Assert
        expect(result).toEqual(mockDashboard);
        expect(dashboardService.findById).toHaveBeenCalledWith(
          'dashboard-123',
          mockUser
        );
      });

      it('should enforce organization access control', async () => {
        // Arrange
        dashboardService.findById.mockRejectedValue(
          new ForbiddenException('Access denied')
        );

        // Act & Assert
        await expect(
          dashboardResolver.dashboard('dashboard-456', mockContext)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('createDashboard', () => {
      it('should create new dashboard', async () => {
        // Arrange
        const createInput = {
          name: 'New Dashboard',
          config: {
            widgets: [],
          },
        };

        const createdDashboard = { ...mockDashboard, ...createInput };
        dashboardService.create.mockResolvedValue(createdDashboard);
        pubSubService.publish.mockResolvedValue(undefined);

        // Act
        const result = await dashboardResolver.createDashboard(createInput, mockContext);

        // Assert
        expect(result).toEqual(createdDashboard);
        expect(dashboardService.create).toHaveBeenCalledWith(createInput, mockUser);
        expect(pubSubService.publish).toHaveBeenCalledWith(
          'dashboardCreated',
          createdDashboard
        );
      });
    });

    describe('updateDashboard', () => {
      it('should update existing dashboard', async () => {
        // Arrange
        const updateInput = {
          name: 'Updated Dashboard',
          config: {
            widgets: [
              {
                id: 'widget-2',
                type: 'bar_chart',
                query: 'SELECT count() FROM clicks',
                position: { x: 0, y: 0, width: 6, height: 4 },
              },
            ],
          },
        };

        const updatedDashboard = { ...mockDashboard, ...updateInput };
        dashboardService.update.mockResolvedValue(updatedDashboard);
        pubSubService.publish.mockResolvedValue(undefined);

        // Act
        const result = await dashboardResolver.updateDashboard(
          'dashboard-123',
          updateInput,
          mockContext
        );

        // Assert
        expect(result).toEqual(updatedDashboard);
        expect(dashboardService.update).toHaveBeenCalledWith(
          'dashboard-123',
          updateInput,
          mockUser
        );
        expect(pubSubService.publish).toHaveBeenCalledWith(
          'dashboardUpdated',
          updatedDashboard
        );
      });
    });

    describe('deleteDashboard', () => {
      it('should delete dashboard', async () => {
        // Arrange
        dashboardService.delete.mockResolvedValue(true);
        pubSubService.publish.mockResolvedValue(undefined);

        // Act
        const result = await dashboardResolver.deleteDashboard(
          'dashboard-123',
          mockContext
        );

        // Assert
        expect(result).toBe(true);
        expect(dashboardService.delete).toHaveBeenCalledWith(
          'dashboard-123',
          mockUser
        );
        expect(pubSubService.publish).toHaveBeenCalledWith(
          'dashboardDeleted',
          { id: 'dashboard-123', organizationId: mockUser.organizationId }
        );
      });
    });
  });

  describe('AnalyticsResolver', () => {
    describe('query', () => {
      it('should execute analytics query', async () => {
        // Arrange
        const queryInput = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          eventTypes: ['page_view'],
          groupBy: ['date'],
          metrics: ['count'],
        };

        const queryResult = {
          data: [{ date: '2024-01-01', count: 100 }],
          totalRows: 1,
          executionTime: 150,
        };

        analyticsService.query.mockResolvedValue(queryResult);

        // Act
        const result = await analyticsResolver.query(queryInput, mockContext);

        // Assert
        expect(result).toEqual(queryResult);
        expect(analyticsService.query).toHaveBeenCalledWith(queryInput, mockUser);
      });
    });

    describe('trackEvent', () => {
      it('should track analytics event', async () => {
        // Arrange
        const eventInput = {
          eventType: 'button_click',
          properties: {
            buttonId: 'submit-btn',
            page: '/contact',
          },
          sessionId: 'session-123',
          deviceId: 'device-123',
        };

        analyticsService.trackEvent.mockResolvedValue(undefined);

        // Act
        const result = await analyticsResolver.trackEvent(eventInput, mockContext);

        // Assert
        expect(result).toBe(true);
        expect(analyticsService.trackEvent).toHaveBeenCalledWith(
          eventInput,
          mockUser
        );
      });
    });

    describe('realtimeMetrics', () => {
      it('should return real-time metrics', async () => {
        // Arrange
        const mockMetrics = {
          activeUsers: 45,
          pageViews: 1200,
          sessionsToday: 300,
          avgSessionDuration: 180,
          topPages: [
            { page: '/dashboard', views: 500 },
            { page: '/profile', views: 300 },
          ],
        };

        analyticsService.getRealtimeMetrics.mockResolvedValue(mockMetrics);

        // Act
        const result = await analyticsResolver.realtimeMetrics(mockContext);

        // Assert
        expect(result).toEqual(mockMetrics);
        expect(analyticsService.getRealtimeMetrics).toHaveBeenCalledWith(mockUser);
      });
    });

    describe('funnelAnalysis', () => {
      it('should return funnel analysis', async () => {
        // Arrange
        const funnelInput = {
          steps: ['page_view', 'button_click', 'conversion'],
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        };

        const funnelResult = {
          steps: [
            { step: 'page_view', users: 1000, conversionRate: 1.0 },
            { step: 'button_click', users: 500, conversionRate: 0.5 },
            { step: 'conversion', users: 100, conversionRate: 0.2 },
          ],
          totalDropoff: 0.9,
          overallConversionRate: 0.1,
        };

        analyticsService.getFunnelAnalysis.mockResolvedValue(funnelResult);

        // Act
        const result = await analyticsResolver.funnelAnalysis(funnelInput, mockContext);

        // Assert
        expect(result).toEqual(funnelResult);
        expect(analyticsService.getFunnelAnalysis).toHaveBeenCalledWith(
          funnelInput.steps,
          mockUser,
          funnelInput.startDate,
          funnelInput.endDate
        );
      });
    });
  });

  describe('OrganizationResolver', () => {
    const mockOrganization = {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
      plan: 'PREMIUM',
      maxUsers: 100,
      currentUsers: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('organization', () => {
      it('should return current organization', async () => {
        // Arrange
        organizationService.findById.mockResolvedValue(mockOrganization);

        // Act
        const result = await organizationResolver.organization(mockContext);

        // Assert
        expect(result).toEqual(mockOrganization);
        expect(organizationService.findById).toHaveBeenCalledWith(
          mockUser.organizationId
        );
      });
    });

    describe('updateOrganization', () => {
      it('should update organization (admin only)', async () => {
        // Arrange
        const adminUser = { ...mockUser, role: 'ADMIN' };
        const adminContext = {
          ...mockContext,
          req: { ...mockContext.req, user: adminUser },
        };

        const updateInput = {
          name: 'Updated Organization',
          settings: {
            timezone: 'America/Los_Angeles',
          },
        };

        const updatedOrg = { ...mockOrganization, ...updateInput };
        organizationService.update.mockResolvedValue(updatedOrg);

        // Act
        const result = await organizationResolver.updateOrganization(
          updateInput,
          adminContext
        );

        // Assert
        expect(result).toEqual(updatedOrg);
        expect(organizationService.update).toHaveBeenCalledWith(
          adminUser.organizationId,
          updateInput,
          adminUser
        );
      });

      it('should deny access for non-admin users', async () => {
        // Arrange
        const updateInput = { name: 'Updated Organization' };

        // Act & Assert
        await expect(
          organizationResolver.updateOrganization(updateInput, mockContext)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('usageStats', () => {
      it('should return organization usage statistics', async () => {
        // Arrange
        const mockStats = {
          users: 5,
          dashboards: 10,
          apiCalls: 1000,
          storageUsed: 1024 * 1024 * 100, // 100MB
        };

        organizationService.getUsageStats.mockResolvedValue(mockStats);

        // Act
        const result = await organizationResolver.usageStats(mockContext);

        // Assert
        expect(result).toEqual(mockStats);
        expect(organizationService.getUsageStats).toHaveBeenCalledWith(
          mockUser.organizationId
        );
      });
    });

    describe('inviteUser', () => {
      it('should invite user to organization', async () => {
        // Arrange
        const adminUser = { ...mockUser, role: 'ADMIN' };
        const adminContext = {
          ...mockContext,
          req: { ...mockContext.req, user: adminUser },
        };

        const inviteInput = {
          email: 'newuser@example.com',
          role: 'USER',
        };

        const invitation = {
          id: 'invite-123',
          email: inviteInput.email,
          role: inviteInput.role,
          organizationId: adminUser.organizationId,
          token: 'invite-token-123',
          expiresAt: new Date(),
        };

        userService.inviteUser.mockResolvedValue(invitation);

        // Act
        const result = await organizationResolver.inviteUser(
          inviteInput,
          adminContext
        );

        // Assert
        expect(result).toEqual(invitation);
        expect(userService.inviteUser).toHaveBeenCalledWith(
          inviteInput,
          adminUser
        );
      });
    });
  });

  describe('Subscriptions', () => {
    describe('dashboardUpdates', () => {
      it('should subscribe to dashboard updates for organization', async () => {
        // Arrange
        const asyncIterator = {
          [Symbol.asyncIterator]: jest.fn(),
        };

        pubSubService.asyncIterator.mockReturnValue(asyncIterator);

        // Act
        const result = await dashboardResolver.dashboardUpdates(mockContext);

        // Assert
        expect(result).toEqual(asyncIterator);
        expect(pubSubService.asyncIterator).toHaveBeenCalledWith([
          `dashboardCreated.${mockUser.organizationId}`,
          `dashboardUpdated.${mockUser.organizationId}`,
          `dashboardDeleted.${mockUser.organizationId}`,
        ]);
      });
    });

    describe('realtimeMetrics', () => {
      it('should subscribe to real-time metrics updates', async () => {
        // Arrange
        const asyncIterator = {
          [Symbol.asyncIterator]: jest.fn(),
        };

        pubSubService.asyncIterator.mockReturnValue(asyncIterator);

        // Act
        const result = await analyticsResolver.realtimeMetricsSubscription(mockContext);

        // Assert
        expect(result).toEqual(asyncIterator);
        expect(pubSubService.asyncIterator).toHaveBeenCalledWith(
          `realtimeMetrics.${mockUser.organizationId}`
        );
      });
    });
  });

  describe('Field Resolvers', () => {
    describe('User.organization', () => {
      it('should resolve user organization', async () => {
        // Arrange
        const mockOrganization = {
          id: 'org-123',
          name: 'Test Organization',
        };

        organizationService.findById.mockResolvedValue(mockOrganization);

        // Act
        const result = await userResolver.organization(mockUser);

        // Assert
        expect(result).toEqual(mockOrganization);
        expect(organizationService.findById).toHaveBeenCalledWith(
          mockUser.organizationId
        );
      });
    });

    describe('Dashboard.widgets', () => {
      it('should resolve dashboard widgets with data', async () => {
        // Arrange
        const mockDashboard = {
          id: 'dashboard-123',
          config: {
            widgets: [
              {
                id: 'widget-1',
                type: 'line_chart',
                query: 'SELECT count() FROM events',
              },
            ],
          },
        };

        const widgetData = [{ date: '2024-01-01', count: 100 }];
        analyticsService.executeWidgetQuery.mockResolvedValue(widgetData);

        // Act
        const result = await dashboardResolver.widgets(mockDashboard, mockContext);

        // Assert
        expect(result).toEqual([
          {
            id: 'widget-1',
            type: 'line_chart',
            query: 'SELECT count() FROM events',
            data: widgetData,
          },
        ]);
        expect(analyticsService.executeWidgetQuery).toHaveBeenCalledWith(
          'SELECT count() FROM events',
          mockUser
        );
      });
    });
  });
});
