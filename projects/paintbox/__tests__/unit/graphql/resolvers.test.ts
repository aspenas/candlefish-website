/**
 * Unit Tests for GraphQL Resolvers
 * Tests queries, mutations, subscriptions, and field resolvers
 */

import { resolvers, createDataLoaders, GraphQLContext } from '../../../lib/graphql/resolvers';
import { ServiceFactory, AlertFactory, MetricFactory, SystemAnalysisFactory } from '../../factories/systemAnalyzerFactory';
import { DiscoveryService } from '../../../lib/services/discovery-service';
import { MonitoringService } from '../../../lib/services/monitoring-service';
import { AnalysisService } from '../../../lib/services/analysis-service';
import { AlertService } from '../../../lib/services/alert-service';

// Mock services
jest.mock('../../../lib/services/discovery-service');
jest.mock('../../../lib/services/monitoring-service');
jest.mock('../../../lib/services/analysis-service');
jest.mock('../../../lib/services/alert-service');

describe('GraphQL Resolvers', () => {
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;
  let mockMonitoringService: jest.Mocked<MonitoringService>;
  let mockAnalysisService: jest.Mocked<AnalysisService>;
  let mockAlertService: jest.Mocked<AlertService>;
  let context: GraphQLContext;

  beforeEach(() => {
    // Create mock services
    mockDiscoveryService = {
      getServices: jest.fn(),
      getServiceById: jest.fn(),
      getServiceByName: jest.fn(),
      getServicesByIds: jest.fn(),
      registerService: jest.fn(),
      updateService: jest.fn(),
      removeService: jest.fn(),
      getServiceDependencies: jest.fn(),
    } as any;

    mockMonitoringService = {
      getMetrics: jest.fn(),
      getMetricSeries: jest.fn(),
      getContainers: jest.fn(),
      getProcesses: jest.fn(),
      performHealthCheck: jest.fn(),
      performHealthCheckAll: jest.fn(),
      getContainersByServiceId: jest.fn(),
      getProcessesByServiceId: jest.fn(),
      getMetricsByServiceId: jest.fn(),
      restartService: jest.fn(),
      restartContainer: jest.fn(),
      scaleService: jest.fn(),
      subscribeToServiceStatus: jest.fn(),
      subscribeToServicesStatus: jest.fn(),
      subscribeToMetrics: jest.fn(),
      subscribeToSystemMetrics: jest.fn(),
      subscribeToContainerStatus: jest.fn(),
      subscribeToProcessStatus: jest.fn(),
      getCachedUptime: jest.fn(),
      getProcessChildren: jest.fn(),
    } as any;

    mockAnalysisService = {
      getSystemAnalysis: jest.fn(),
      runFullAnalysis: jest.fn(),
      requestSystemAnalysis: jest.fn(),
      getAlertsByService: jest.fn(),
      getRecommendations: jest.fn(),
      subscribeToSystemAnalysis: jest.fn(),
    } as any;

    mockAlertService = {
      getAlerts: jest.fn(),
      getAlertById: jest.fn(),
      getAlertRules: jest.fn(),
      acknowledgeAlert: jest.fn(),
      resolveAlert: jest.fn(),
      suppressAlert: jest.fn(),
      createAlertRule: jest.fn(),
      updateAlertRule: jest.fn(),
      deleteAlertRule: jest.fn(),
      getAlertsByServiceId: jest.fn(),
      getRulesByServiceId: jest.fn(),
      getAlertRule: jest.fn(),
      getAlertNotifications: jest.fn(),
      subscribeToAlerts: jest.fn(),
      subscribeToAllAlerts: jest.fn(),
    } as any;

    const services = {
      discovery: mockDiscoveryService,
      monitoring: mockMonitoringService,
      analysis: mockAnalysisService,
      alert: mockAlertService,
    };

    context = {
      services,
      dataloaders: createDataLoaders(services),
      user: {
        id: 'test-user',
        email: 'test@example.com',
        roles: ['admin'],
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Resolvers', () => {
    describe('services', () => {
      it('should resolve services with filters', async () => {
        const mockServices = ServiceFactory.createMany(3);
        mockDiscoveryService.getServices.mockResolvedValue(mockServices);

        const result = await resolvers.Query.services(
          null,
          { status: 'HEALTHY', limit: 10, offset: 0 },
          context,
          {} as any
        );

        expect(mockDiscoveryService.getServices).toHaveBeenCalledWith({
          status: 'HEALTHY',
          environment: undefined,
          tags: undefined,
          limit: 10,
          offset: 0,
        });
        expect(result).toEqual(mockServices);
      });

      it('should use default limit and offset', async () => {
        const mockServices = ServiceFactory.createMany(2);
        mockDiscoveryService.getServices.mockResolvedValue(mockServices);

        await resolvers.Query.services(
          null,
          {},
          context,
          {} as any
        );

        expect(mockDiscoveryService.getServices).toHaveBeenCalledWith({
          status: undefined,
          environment: undefined,
          tags: undefined,
          limit: 50,
          offset: 0,
        });
      });

      it('should filter by environment and tags', async () => {
        const mockServices = ServiceFactory.createMany(2);
        mockDiscoveryService.getServices.mockResolvedValue(mockServices);

        await resolvers.Query.services(
          null,
          { environment: 'production', tags: ['api', 'backend'] },
          context,
          {} as any
        );

        expect(mockDiscoveryService.getServices).toHaveBeenCalledWith({
          status: undefined,
          environment: 'production',
          tags: ['api', 'backend'],
          limit: 50,
          offset: 0,
        });
      });
    });

    describe('service', () => {
      it('should resolve service by ID using DataLoader', async () => {
        const mockService = ServiceFactory.createHealthy();

        // Mock DataLoader behavior
        mockDiscoveryService.getServicesByIds.mockResolvedValue([mockService]);

        const result = await resolvers.Query.service(
          null,
          { id: mockService.id },
          context,
          {} as any
        );

        expect(result).toEqual(mockService);
      });
    });

    describe('serviceByName', () => {
      it('should resolve service by name', async () => {
        const mockService = ServiceFactory.createHealthy();
        mockDiscoveryService.getServiceByName.mockResolvedValue(mockService);

        const result = await resolvers.Query.serviceByName(
          null,
          { name: 'test-service', environment: 'production' },
          context,
          {} as any
        );

        expect(mockDiscoveryService.getServiceByName).toHaveBeenCalledWith(
          'test-service',
          'production'
        );
        expect(result).toEqual(mockService);
      });
    });

    describe('systemAnalysis', () => {
      it('should resolve system analysis', async () => {
        const mockAnalysis = SystemAnalysisFactory.createHealthy();
        mockAnalysisService.getSystemAnalysis.mockResolvedValue(mockAnalysis);

        const timeRange = { duration: '24h' };
        const result = await resolvers.Query.systemAnalysis(
          null,
          { timeRange },
          context,
          {} as any
        );

        expect(mockAnalysisService.getSystemAnalysis).toHaveBeenCalledWith(timeRange);
        expect(result).toEqual(mockAnalysis);
      });
    });

    describe('runFullAnalysis', () => {
      it('should require admin or operator role', async () => {
        const mockAnalysis = SystemAnalysisFactory.createHealthy();
        mockAnalysisService.runFullAnalysis.mockResolvedValue(mockAnalysis);

        const result = await resolvers.Query.runFullAnalysis(
          null,
          {},
          context,
          {} as any
        );

        expect(mockAnalysisService.runFullAnalysis).toHaveBeenCalled();
        expect(result).toEqual(mockAnalysis);
      });

      it('should reject unauthorized users', async () => {
        const unauthorizedContext = {
          ...context,
          user: { ...context.user!, roles: ['viewer'] },
        };

        await expect(
          resolvers.Query.runFullAnalysis(
            null,
            {},
            unauthorizedContext,
            {} as any
          )
        ).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('alerts', () => {
      it('should resolve alerts with filters', async () => {
        const mockAlerts = AlertFactory.createMany(3);
        mockAlertService.getAlerts.mockResolvedValue(mockAlerts);

        const result = await resolvers.Query.alerts(
          null,
          { severity: 'CRITICAL', status: 'ACTIVE', limit: 20 },
          context,
          {} as any
        );

        expect(mockAlertService.getAlerts).toHaveBeenCalledWith({
          serviceId: undefined,
          severity: 'CRITICAL',
          status: 'ACTIVE',
          limit: 20,
          offset: 0,
        });
        expect(result).toEqual(mockAlerts);
      });
    });

    describe('metrics', () => {
      it('should resolve metrics with filters', async () => {
        const mockMetrics = MetricFactory.createMany(5);
        mockMonitoringService.getMetrics.mockResolvedValue(mockMetrics);

        const result = await resolvers.Query.metrics(
          null,
          { serviceId: 'service-1', type: 'CPU', limit: 50 },
          context,
          {} as any
        );

        expect(mockMonitoringService.getMetrics).toHaveBeenCalledWith({
          serviceId: 'service-1',
          type: 'CPU',
          timeRange: undefined,
          limit: 50,
        });
        expect(result).toEqual(mockMetrics);
      });
    });

    describe('healthCheck', () => {
      it('should perform health check for specific service', async () => {
        const mockHealthResult = {
          service: ServiceFactory.createHealthy(),
          status: 'HEALTHY' as const,
          responseTime: '45ms',
          checks: [],
          timestamp: new Date(),
        };
        mockMonitoringService.performHealthCheck.mockResolvedValue(mockHealthResult);

        const result = await resolvers.Query.healthCheck(
          null,
          { serviceId: 'service-1' },
          context,
          {} as any
        );

        expect(mockMonitoringService.performHealthCheck).toHaveBeenCalledWith('service-1');
        expect(result).toEqual(mockHealthResult);
      });
    });

    describe('healthCheckAll', () => {
      it('should require admin or operator role', async () => {
        const mockHealthResults = [
          {
            service: ServiceFactory.createHealthy(),
            status: 'HEALTHY' as const,
            responseTime: '45ms',
            checks: [],
            timestamp: new Date(),
          },
        ];
        mockMonitoringService.performHealthCheckAll.mockResolvedValue(mockHealthResults);

        const result = await resolvers.Query.healthCheckAll(
          null,
          {},
          context,
          {} as any
        );

        expect(mockMonitoringService.performHealthCheckAll).toHaveBeenCalled();
        expect(result).toEqual(mockHealthResults);
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('registerService', () => {
      it('should register new service with admin role', async () => {
        const mockService = ServiceFactory.createHealthy();
        mockDiscoveryService.registerService.mockResolvedValue(mockService);

        const input = {
          name: 'new-service',
          environment: 'production',
          tags: ['api'],
        };

        const result = await resolvers.Mutation.registerService(
          null,
          { input },
          context,
          {} as any
        );

        expect(mockDiscoveryService.registerService).toHaveBeenCalledWith(input);
        expect(result).toEqual(mockService);
      });

      it('should reject unauthorized users', async () => {
        const unauthorizedContext = {
          ...context,
          user: { ...context.user!, roles: ['viewer'] },
        };

        const input = { name: 'service', environment: 'test', tags: [] };

        await expect(
          resolvers.Mutation.registerService(
            null,
            { input },
            unauthorizedContext,
            {} as any
          )
        ).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('updateService', () => {
      it('should update service with operator role', async () => {
        const mockService = ServiceFactory.createHealthy();
        mockDiscoveryService.updateService.mockResolvedValue(mockService);

        const input = { displayName: 'Updated Service' };

        const result = await resolvers.Mutation.updateService(
          null,
          { id: 'service-1', input },
          context,
          {} as any
        );

        expect(mockDiscoveryService.updateService).toHaveBeenCalledWith('service-1', input);
        expect(result).toEqual(mockService);
      });
    });

    describe('removeService', () => {
      it('should remove service with admin role only', async () => {
        mockDiscoveryService.removeService.mockResolvedValue(true);

        const result = await resolvers.Mutation.removeService(
          null,
          { id: 'service-1' },
          context,
          {} as any
        );

        expect(mockDiscoveryService.removeService).toHaveBeenCalledWith('service-1');
        expect(result).toBe(true);
      });

      it('should reject operator role', async () => {
        const operatorContext = {
          ...context,
          user: { ...context.user!, roles: ['operator'] },
        };

        await expect(
          resolvers.Mutation.removeService(
            null,
            { id: 'service-1' },
            operatorContext,
            {} as any
          )
        ).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('acknowledgeAlert', () => {
      it('should acknowledge alert for authenticated users', async () => {
        const mockAlert = AlertFactory.createActive();
        mockAlertService.acknowledgeAlert.mockResolvedValue({
          ...mockAlert,
          status: 'ACKNOWLEDGED' as const,
          acknowledgedBy: 'test-user',
          acknowledgedAt: new Date(),
        });

        const result = await resolvers.Mutation.acknowledgeAlert(
          null,
          { alertId: 'alert-1', userId: 'test-user' },
          context,
          {} as any
        );

        expect(mockAlertService.acknowledgeAlert).toHaveBeenCalledWith('alert-1', 'test-user');
        expect(result.status).toBe('ACKNOWLEDGED');
      });

      it('should reject unauthenticated users', async () => {
        const unauthenticatedContext = { ...context, user: undefined };

        await expect(
          resolvers.Mutation.acknowledgeAlert(
            null,
            { alertId: 'alert-1', userId: 'test-user' },
            unauthenticatedContext,
            {} as any
          )
        ).rejects.toThrow('Authentication required');
      });
    });

    describe('createAlertRule', () => {
      it('should create alert rule with proper permissions', async () => {
        const mockRule = {
          id: 'rule-1',
          name: 'CPU Alert',
          metric: 'cpu_usage',
          condition: 'GREATER_THAN' as const,
          threshold: 80,
          severity: 'HIGH' as const,
          enabled: true,
          serviceIds: ['service-1'],
        };
        mockAlertService.createAlertRule.mockResolvedValue(mockRule);

        const input = {
          name: 'CPU Alert',
          metric: 'cpu_usage',
          condition: 'GREATER_THAN' as const,
          threshold: 80,
          duration: '5m',
          severity: 'HIGH' as const,
          serviceIds: ['service-1'],
          tags: [],
          notificationChannels: ['slack'],
        };

        const result = await resolvers.Mutation.createAlertRule(
          null,
          { input },
          context,
          {} as any
        );

        expect(mockAlertService.createAlertRule).toHaveBeenCalledWith(input);
        expect(result).toEqual(mockRule);
      });
    });
  });

  describe('Subscription Resolvers', () => {
    describe('serviceStatusChanged', () => {
      it('should subscribe to service status changes', async () => {
        const mockSubscription = jest.fn();
        mockMonitoringService.subscribeToServiceStatus.mockReturnValue(mockSubscription);

        const result = resolvers.Subscription.serviceStatusChanged.subscribe(
          null,
          { serviceId: 'service-1' },
          context,
          {} as any
        );

        expect(mockMonitoringService.subscribeToServiceStatus).toHaveBeenCalledWith('service-1');
        expect(result).toBe(mockSubscription);
      });
    });

    describe('alertTriggered', () => {
      it('should subscribe to triggered alerts', async () => {
        const mockSubscription = jest.fn();
        mockAlertService.subscribeToAlerts.mockReturnValue(mockSubscription);

        const result = resolvers.Subscription.alertTriggered.subscribe(
          null,
          { serviceId: 'service-1' },
          context,
          {} as any
        );

        expect(mockAlertService.subscribeToAlerts).toHaveBeenCalledWith('service-1', 'TRIGGERED');
        expect(result).toBe(mockSubscription);
      });
    });

    describe('systemAnalysisUpdated', () => {
      it('should subscribe to system analysis updates', async () => {
        const mockSubscription = jest.fn();
        mockAnalysisService.subscribeToSystemAnalysis.mockReturnValue(mockSubscription);

        const result = resolvers.Subscription.systemAnalysisUpdated.subscribe(
          null,
          {},
          context,
          {} as any
        );

        expect(mockAnalysisService.subscribeToSystemAnalysis).toHaveBeenCalled();
        expect(result).toBe(mockSubscription);
      });
    });
  });

  describe('Type Resolvers', () => {
    describe('Service', () => {
      it('should resolve dependencies using DataLoader', async () => {
        const service = ServiceFactory.createHealthy();
        const dependencies = ServiceFactory.createMany(2);
        mockDiscoveryService.getServiceDependencies.mockResolvedValue(dependencies);

        const result = await resolvers.Service.dependencies(
          service,
          {},
          context,
          {} as any
        );

        expect(result).toEqual(dependencies);
      });

      it('should resolve containers using DataLoader', async () => {
        const service = ServiceFactory.createHealthy();
        const containers = [
          {
            id: 'container-1',
            name: 'test-container',
            image: 'node:16',
            tag: 'latest',
            status: 'RUNNING' as const,
            createdAt: new Date(),
            restartCount: 0,
          },
        ];
        mockMonitoringService.getContainersByServiceId.mockResolvedValue(containers);

        const result = await resolvers.Service.containers(
          service,
          {},
          context,
          {} as any
        );

        expect(result).toEqual(containers);
      });

      it('should resolve metrics using DataLoader', async () => {
        const service = ServiceFactory.createHealthy();
        const metrics = MetricFactory.createMany(3, { serviceId: service.id });
        mockMonitoringService.getMetricsByServiceId.mockResolvedValue(metrics);

        const result = await resolvers.Service.metrics(
          service,
          {},
          context,
          {} as any
        );

        expect(result).toEqual(metrics);
      });

      it('should resolve alerts using DataLoader', async () => {
        const service = ServiceFactory.createHealthy();
        const alerts = AlertFactory.createMany(2, { serviceId: service.id });
        mockAlertService.getAlertsByServiceId.mockResolvedValue(alerts);

        const result = await resolvers.Service.alerts(
          service,
          {},
          context,
          {} as any
        );

        expect(result).toEqual(alerts);
      });

      it('should resolve cached uptime', async () => {
        const service = ServiceFactory.createHealthy();
        const uptime = '5d 12h 30m';
        mockMonitoringService.getCachedUptime.mockResolvedValue(uptime);

        const result = await resolvers.Service.uptime(
          service,
          {},
          context,
          {} as any
        );

        expect(mockMonitoringService.getCachedUptime).toHaveBeenCalledWith(
          service.id,
          `uptime:${service.id}`,
          30
        );
        expect(result).toBe(uptime);
      });
    });

    describe('Alert', () => {
      it('should resolve service using DataLoader', async () => {
        const alert = AlertFactory.createActive();
        const service = ServiceFactory.createHealthy({ id: alert.serviceId });
        mockDiscoveryService.getServicesByIds.mockResolvedValue([service]);

        const result = await resolvers.Alert.service(
          alert,
          {},
          context,
          {} as any
        );

        expect(result).toEqual(service);
      });

      it('should resolve alert rule', async () => {
        const alert = { ...AlertFactory.createActive(), ruleId: 'rule-1' };
        const mockRule = {
          id: 'rule-1',
          name: 'Test Rule',
          metric: 'cpu_usage',
          condition: 'GREATER_THAN' as const,
          threshold: 80,
        };
        mockAlertService.getAlertRule.mockResolvedValue(mockRule);

        const result = await resolvers.Alert.rule(
          alert,
          {},
          context,
          {} as any
        );

        expect(mockAlertService.getAlertRule).toHaveBeenCalledWith('rule-1');
        expect(result).toEqual(mockRule);
      });

      it('should resolve alert notifications', async () => {
        const alert = AlertFactory.createActive();
        const notifications = [
          {
            id: 'notification-1',
            alert,
            channel: 'slack',
            sentAt: new Date(),
            acknowledged: false,
          },
        ];
        mockAlertService.getAlertNotifications.mockResolvedValue(notifications);

        const result = await resolvers.Alert.notifications(
          alert,
          {},
          context,
          {} as any
        );

        expect(mockAlertService.getAlertNotifications).toHaveBeenCalledWith(alert.id);
        expect(result).toEqual(notifications);
      });
    });

    describe('Metric', () => {
      it('should resolve service using DataLoader', async () => {
        const metric = MetricFactory.create();
        const service = ServiceFactory.createHealthy({ id: metric.serviceId });
        mockDiscoveryService.getServicesByIds.mockResolvedValue([service]);

        const result = await resolvers.Metric.service(
          metric,
          {},
          context,
          {} as any
        );

        expect(result).toEqual(service);
      });
    });

    describe('Process', () => {
      it('should resolve child processes', async () => {
        const process = {
          id: 'process-1',
          pid: 1234,
          name: 'node',
          command: 'node server.js',
          status: 'RUNNING' as const,
          startTime: new Date(),
        };

        const children = [
          {
            id: 'process-2',
            pid: 1235,
            name: 'worker',
            command: 'node worker.js',
            status: 'RUNNING' as const,
            startTime: new Date(),
          },
        ];

        mockMonitoringService.getProcessChildren.mockResolvedValue(children);

        const result = await resolvers.Process.children(
          process,
          {},
          context,
          {} as any
        );

        expect(mockMonitoringService.getProcessChildren).toHaveBeenCalledWith('process-1');
        expect(result).toEqual(children);
      });
    });
  });

  describe('Authorization', () => {
    it('should handle unauthenticated requests', async () => {
      const unauthenticatedContext = { ...context, user: undefined };

      await expect(
        resolvers.Mutation.acknowledgeAlert(
          null,
          { alertId: 'alert-1', userId: 'test-user' },
          unauthenticatedContext,
          {} as any
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should handle insufficient permissions', async () => {
      const viewerContext = {
        ...context,
        user: { ...context.user!, roles: ['viewer'] },
      };

      await expect(
        resolvers.Mutation.registerService(
          null,
          { input: { name: 'service', environment: 'test', tags: [] } },
          viewerContext,
          {} as any
        )
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should allow admin access to all operations', async () => {
      const adminContext = {
        ...context,
        user: { ...context.user!, roles: ['admin'] },
      };

      mockDiscoveryService.removeService.mockResolvedValue(true);

      const result = await resolvers.Mutation.removeService(
        null,
        { id: 'service-1' },
        adminContext,
        {} as any
      );

      expect(result).toBe(true);
    });

    it('should allow operator access to non-destructive operations', async () => {
      const operatorContext = {
        ...context,
        user: { ...context.user!, roles: ['operator'] },
      };

      const mockService = ServiceFactory.createHealthy();
      mockDiscoveryService.updateService.mockResolvedValue(mockService);

      const result = await resolvers.Mutation.updateService(
        null,
        { id: 'service-1', input: { displayName: 'Updated' } },
        operatorContext,
        {} as any
      );

      expect(result).toEqual(mockService);
    });
  });

  describe('DataLoader Integration', () => {
    it('should batch service requests efficiently', async () => {
      const services = ServiceFactory.createMany(3);
      mockDiscoveryService.getServicesByIds.mockResolvedValue(services);

      // Simulate multiple service requests
      const promises = services.map(service =>
        context.dataloaders.serviceById.load(service.id)
      );

      const results = await Promise.all(promises);

      // Should only make one batch request
      expect(mockDiscoveryService.getServicesByIds).toHaveBeenCalledTimes(1);
      expect(mockDiscoveryService.getServicesByIds).toHaveBeenCalledWith(
        services.map(s => s.id)
      );
      expect(results).toEqual(services);
    });

    it('should handle missing services in batch requests', async () => {
      const services = [ServiceFactory.createHealthy(), null, ServiceFactory.createHealthy()];
      const serviceIds = ['service-1', 'non-existent', 'service-3'];

      mockDiscoveryService.getServicesByIds.mockResolvedValue([services[0], services[2]]);

      const promises = serviceIds.map(id =>
        context.dataloaders.serviceById.load(id)
      );

      const results = await Promise.all(promises);

      expect(results[0]).toEqual(services[0]);
      expect(results[1]).toBeNull();
      expect(results[2]).toEqual(services[2]);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockDiscoveryService.getServices.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        resolvers.Query.services(null, {}, context, {} as any)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle DataLoader errors', async () => {
      mockDiscoveryService.getServicesByIds.mockRejectedValue(new Error('Service lookup failed'));

      await expect(
        context.dataloaders.serviceById.load('service-1')
      ).rejects.toThrow('Service lookup failed');
    });

    it('should handle subscription errors', async () => {
      mockMonitoringService.subscribeToServiceStatus.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      expect(() =>
        resolvers.Subscription.serviceStatusChanged.subscribe(
          null,
          { serviceId: 'service-1' },
          context,
          {} as any
        )
      ).toThrow('Subscription failed');
    });
  });
});
