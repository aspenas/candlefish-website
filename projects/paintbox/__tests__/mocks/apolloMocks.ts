/**
 * Apollo Client Mocks for GraphQL Testing
 * Provides mock responses for system analyzer GraphQL operations
 */

import { MockedResponse } from '@apollo/client/testing';
import {
  ServiceFactory,
  MetricFactory,
  AlertFactory,
  SystemAnalysisFactory,
  SystemMockFactory,
} from '../factories/systemAnalyzerFactory';

// Mock GraphQL queries (these would match your actual queries)
const SYSTEM_ANALYSIS_QUERY = `
  query SystemAnalysis($timeRange: TimeRangeInput) {
    systemAnalysis(timeRange: $timeRange) {
      id
      timestamp
      overallHealth
      healthScore
      totalServices
      healthyServices
      degradedServices
      unhealthyServices
      activeAlerts
    }
  }
`;

const SERVICES_QUERY = `
  query Services($status: ServiceStatus, $environment: String, $limit: Int, $offset: Int) {
    services(status: $status, environment: $environment, limit: $limit, offset: $offset) {
      id
      name
      displayName
      version
      environment
      status
      baseUrl
      tags
      uptime
      lastHealthCheck
    }
  }
`;

const SERVICE_DETAILS_QUERY = `
  query ServiceDetails($id: ID!) {
    service(id: $id) {
      id
      name
      displayName
      description
      version
      environment
      status
      baseUrl
      healthEndpoint
      tags
      uptime
      lastHealthCheck
      lastStatusChange
      monitoringEnabled
      alertingEnabled
      containers {
        id
        name
        status
        cpuUsage
        memoryUsage
      }
      metrics {
        id
        name
        type
        value
        unit
        timestamp
      }
      alerts {
        id
        name
        severity
        status
        triggeredAt
      }
    }
  }
`;

const ALERTS_QUERY = `
  query Alerts($serviceId: ID, $severity: AlertSeverity, $status: AlertStatus, $limit: Int) {
    alerts(serviceId: $serviceId, severity: $severity, status: $status, limit: $limit) {
      id
      name
      description
      severity
      status
      triggeredAt
      resolvedAt
      triggerValue
      thresholdValue
      service {
        id
        name
      }
    }
  }
`;

const METRICS_QUERY = `
  query Metrics($serviceId: ID, $type: ResourceType, $timeRange: TimeRangeInput, $limit: Int) {
    metrics(serviceId: $serviceId, type: $type, timeRange: $timeRange, limit: $limit) {
      id
      name
      type
      value
      unit
      timestamp
      service {
        id
        name
      }
    }
  }
`;

// Subscription mocks
const SERVICE_STATUS_SUBSCRIPTION = `
  subscription ServiceStatusChanged($serviceId: ID) {
    serviceStatusChanged(serviceId: $serviceId) {
      service {
        id
        name
        status
      }
      previousStatus
      currentStatus
      timestamp
      reason
    }
  }
`;

const ALERTS_SUBSCRIPTION = `
  subscription AlertsChanged {
    alertsChanged {
      id
      name
      severity
      status
      triggeredAt
      service {
        id
        name
      }
    }
  }
`;

const SYSTEM_ANALYSIS_SUBSCRIPTION = `
  subscription SystemAnalysisUpdated {
    systemAnalysisUpdated {
      id
      timestamp
      overallHealth
      healthScore
      totalServices
      healthyServices
      activeAlerts
    }
  }
`;

// Mutation mocks
const ACKNOWLEDGE_ALERT_MUTATION = `
  mutation AcknowledgeAlert($alertId: ID!, $userId: String!) {
    acknowledgeAlert(alertId: $alertId, userId: $userId) {
      id
      status
      acknowledgedAt
      acknowledgedBy
    }
  }
`;

const TRIGGER_HEALTH_CHECK_MUTATION = `
  mutation TriggerHealthCheck($serviceId: ID!) {
    triggerHealthCheck(serviceId: $serviceId) {
      service {
        id
        name
      }
      status
      responseTime
      timestamp
      checks {
        name
        status
        message
      }
    }
  }
`;

/**
 * Apollo Mock Factory
 */
export class ApolloMockFactory {
  /**
   * Creates mock responses for system analysis queries
   */
  static createSystemAnalysisMocks(): MockedResponse[] {
    const mockSystem = SystemMockFactory.createCompleteSystem(15);

    return [
      {
        request: {
          query: SYSTEM_ANALYSIS_QUERY,
          variables: {},
        },
        result: {
          data: {
            systemAnalysis: mockSystem.analysis,
          },
        },
      },
      {
        request: {
          query: SYSTEM_ANALYSIS_QUERY,
          variables: { timeRange: { duration: '24h' } },
        },
        result: {
          data: {
            systemAnalysis: SystemAnalysisFactory.createHealthy(),
          },
        },
      },
    ];
  }

  /**
   * Creates mock responses for services queries
   */
  static createServicesMocks(): MockedResponse[] {
    const services = ServiceFactory.createMany(10);
    const healthyServices = services.filter(s => s.status === 'HEALTHY');
    const unhealthyServices = services.filter(s => s.status === 'UNHEALTHY');

    return [
      {
        request: {
          query: SERVICES_QUERY,
          variables: { limit: 50, offset: 0 },
        },
        result: {
          data: {
            services,
          },
        },
      },
      {
        request: {
          query: SERVICES_QUERY,
          variables: { status: 'HEALTHY', limit: 50, offset: 0 },
        },
        result: {
          data: {
            services: healthyServices,
          },
        },
      },
      {
        request: {
          query: SERVICES_QUERY,
          variables: { status: 'UNHEALTHY', limit: 50, offset: 0 },
        },
        result: {
          data: {
            services: unhealthyServices,
          },
        },
      },
    ];
  }

  /**
   * Creates mock responses for service details
   */
  static createServiceDetailsMocks(): MockedResponse[] {
    const service = ServiceFactory.createHealthy();
    const containers = SystemMockFactory.createCompleteSystem(1).containers;
    const metrics = MetricFactory.createMany(5, { serviceId: service.id });
    const alerts = AlertFactory.createMany(2, { serviceId: service.id });

    return [
      {
        request: {
          query: SERVICE_DETAILS_QUERY,
          variables: { id: service.id },
        },
        result: {
          data: {
            service: {
              ...service,
              containers,
              metrics,
              alerts,
            },
          },
        },
      },
    ];
  }

  /**
   * Creates mock responses for alerts queries
   */
  static createAlertsMocks(): MockedResponse[] {
    const alerts = AlertFactory.createMany(8);
    const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');

    return [
      {
        request: {
          query: ALERTS_QUERY,
          variables: { limit: 50 },
        },
        result: {
          data: {
            alerts: alerts.map(alert => ({
              ...alert,
              service: { id: alert.serviceId, name: `Service ${alert.serviceId.slice(-4)}` },
            })),
          },
        },
      },
      {
        request: {
          query: ALERTS_QUERY,
          variables: { status: 'ACTIVE', limit: 50 },
        },
        result: {
          data: {
            alerts: activeAlerts.map(alert => ({
              ...alert,
              service: { id: alert.serviceId, name: `Service ${alert.serviceId.slice(-4)}` },
            })),
          },
        },
      },
      {
        request: {
          query: ALERTS_QUERY,
          variables: { severity: 'CRITICAL', limit: 50 },
        },
        result: {
          data: {
            alerts: criticalAlerts.map(alert => ({
              ...alert,
              service: { id: alert.serviceId, name: `Service ${alert.serviceId.slice(-4)}` },
            })),
          },
        },
      },
    ];
  }

  /**
   * Creates mock responses for metrics queries
   */
  static createMetricsMocks(): MockedResponse[] {
    const serviceId = 'test-service-id';
    const metrics = MetricFactory.createMany(20, { serviceId });
    const cpuMetrics = metrics.filter(m => m.type === 'CPU');
    const memoryMetrics = metrics.filter(m => m.type === 'MEMORY');

    return [
      {
        request: {
          query: METRICS_QUERY,
          variables: { serviceId, limit: 100 },
        },
        result: {
          data: {
            metrics: metrics.map(metric => ({
              ...metric,
              service: { id: serviceId, name: 'Test Service' },
            })),
          },
        },
      },
      {
        request: {
          query: METRICS_QUERY,
          variables: { serviceId, type: 'CPU', limit: 100 },
        },
        result: {
          data: {
            metrics: cpuMetrics.map(metric => ({
              ...metric,
              service: { id: serviceId, name: 'Test Service' },
            })),
          },
        },
      },
      {
        request: {
          query: METRICS_QUERY,
          variables: { serviceId, type: 'MEMORY', limit: 100 },
        },
        result: {
          data: {
            metrics: memoryMetrics.map(metric => ({
              ...metric,
              service: { id: serviceId, name: 'Test Service' },
            })),
          },
        },
      },
    ];
  }

  /**
   * Creates mock responses for mutations
   */
  static createMutationMocks(): MockedResponse[] {
    const alertId = 'test-alert-id';
    const serviceId = 'test-service-id';

    return [
      {
        request: {
          query: ACKNOWLEDGE_ALERT_MUTATION,
          variables: { alertId, userId: 'test-user' },
        },
        result: {
          data: {
            acknowledgeAlert: {
              id: alertId,
              status: 'ACKNOWLEDGED',
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: 'test-user',
            },
          },
        },
      },
      {
        request: {
          query: TRIGGER_HEALTH_CHECK_MUTATION,
          variables: { serviceId },
        },
        result: {
          data: {
            triggerHealthCheck: {
              service: { id: serviceId, name: 'Test Service' },
              status: 'HEALTHY',
              responseTime: '45ms',
              timestamp: new Date().toISOString(),
              checks: [
                { name: 'Database', status: 'HEALTHY', message: 'Connection OK' },
                { name: 'Cache', status: 'HEALTHY', message: 'Redis responding' },
              ],
            },
          },
        },
      },
    ];
  }

  /**
   * Creates mock responses for subscriptions
   */
  static createSubscriptionMocks(): MockedResponse[] {
    const service = ServiceFactory.createHealthy();
    const alert = AlertFactory.createActive();
    const analysis = SystemAnalysisFactory.createHealthy();

    return [
      {
        request: {
          query: SERVICE_STATUS_SUBSCRIPTION,
          variables: { serviceId: service.id },
        },
        result: {
          data: {
            serviceStatusChanged: {
              service: {
                id: service.id,
                name: service.name,
                status: 'HEALTHY',
              },
              previousStatus: 'DEGRADED',
              currentStatus: 'HEALTHY',
              timestamp: new Date().toISOString(),
              reason: 'Health check passed',
            },
          },
        },
      },
      {
        request: {
          query: ALERTS_SUBSCRIPTION,
          variables: {},
        },
        result: {
          data: {
            alertsChanged: {
              ...alert,
              service: {
                id: alert.serviceId,
                name: `Service ${alert.serviceId.slice(-4)}`,
              },
            },
          },
        },
      },
      {
        request: {
          query: SYSTEM_ANALYSIS_SUBSCRIPTION,
          variables: {},
        },
        result: {
          data: {
            systemAnalysisUpdated: analysis,
          },
        },
      },
    ];
  }

  /**
   * Creates error mocks for testing error handling
   */
  static createErrorMocks(): MockedResponse[] {
    return [
      {
        request: {
          query: SERVICES_QUERY,
          variables: { status: 'INVALID_STATUS' },
        },
        error: new Error('Invalid service status'),
      },
      {
        request: {
          query: SERVICE_DETAILS_QUERY,
          variables: { id: 'non-existent-service' },
        },
        error: new Error('Service not found'),
      },
      {
        request: {
          query: ACKNOWLEDGE_ALERT_MUTATION,
          variables: { alertId: 'invalid-alert', userId: 'test-user' },
        },
        error: new Error('Alert not found or already acknowledged'),
      },
    ];
  }

  /**
   * Creates loading state mocks for testing loading UI
   */
  static createLoadingMocks(): MockedResponse[] {
    return [
      {
        request: {
          query: SYSTEM_ANALYSIS_QUERY,
          variables: {},
        },
        delay: 2000, // 2 second delay
        result: {
          data: {
            systemAnalysis: SystemAnalysisFactory.createHealthy(),
          },
        },
      },
    ];
  }

  /**
   * Creates comprehensive mock set for full system testing
   */
  static createComprehensiveMocks(): MockedResponse[] {
    return [
      ...this.createSystemAnalysisMocks(),
      ...this.createServicesMocks(),
      ...this.createServiceDetailsMocks(),
      ...this.createAlertsMocks(),
      ...this.createMetricsMocks(),
      ...this.createMutationMocks(),
      ...this.createSubscriptionMocks(),
    ];
  }
}

// Export commonly used mock data
export const mockSystemData = SystemMockFactory.createCompleteSystem(12);
export const mockLoadTestData = SystemMockFactory.createLoadTestScenario(50);

// Export query strings for use in tests
export {
  SYSTEM_ANALYSIS_QUERY,
  SERVICES_QUERY,
  SERVICE_DETAILS_QUERY,
  ALERTS_QUERY,
  METRICS_QUERY,
  SERVICE_STATUS_SUBSCRIPTION,
  ALERTS_SUBSCRIPTION,
  SYSTEM_ANALYSIS_SUBSCRIPTION,
  ACKNOWLEDGE_ALERT_MUTATION,
  TRIGGER_HEALTH_CHECK_MUTATION,
};
