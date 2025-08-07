import { Resolvers } from 'apollo-server-express';
import DataLoader from 'dataloader';
import { GraphQLScalarType } from 'graphql';
import { DateTimeResolver, JSONResolver, DurationResolver } from 'graphql-scalars';

// Import services
import { DiscoveryService } from '../services/discovery-service';
import { MonitoringService } from '../services/monitoring-service';
import { AnalysisService } from '../services/analysis-service';
import { AlertService } from '../services/alert-service';

// Types
import {
  Service,
  Container,
  Process,
  Metric,
  Alert,
  AlertRule,
  SystemAnalysis,
  ServiceHealthResult,
} from '../types/system-analyzer';

// Context type with DataLoaders
export interface GraphQLContext {
  services: {
    discovery: DiscoveryService;
    monitoring: MonitoringService;
    analysis: AnalysisService;
    alert: AlertService;
  };
  dataloaders: {
    serviceById: DataLoader<string, Service>;
    servicesByIds: DataLoader<string[], Service[]>;
    containersByServiceId: DataLoader<string, Container[]>;
    processesByServiceId: DataLoader<string, Process[]>;
    metricsByServiceId: DataLoader<string, Metric[]>;
    alertsByServiceId: DataLoader<string, Alert[]>;
    alertRulesByServiceId: DataLoader<string, AlertRule[]>;
    serviceDependencies: DataLoader<string, Service[]>;
  };
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

// DataLoader factory functions
const createServiceByIdLoader = (discoveryService: DiscoveryService) =>
  new DataLoader<string, Service>(async (ids) => {
    const services = await discoveryService.getServicesByIds([...ids]);
    return ids.map(id => services.find(s => s.id === id) || null);
  });

const createContainersByServiceIdLoader = (monitoringService: MonitoringService) =>
  new DataLoader<string, Container[]>(async (serviceIds) => {
    const results = await Promise.all(
      serviceIds.map(id => monitoringService.getContainersByServiceId(id))
    );
    return results;
  });

const createProcessesByServiceIdLoader = (monitoringService: MonitoringService) =>
  new DataLoader<string, Process[]>(async (serviceIds) => {
    const results = await Promise.all(
      serviceIds.map(id => monitoringService.getProcessesByServiceId(id))
    );
    return results;
  });

const createMetricsByServiceIdLoader = (monitoringService: MonitoringService) =>
  new DataLoader<string, Metric[]>(async (serviceIds) => {
    const results = await Promise.all(
      serviceIds.map(id => monitoringService.getMetricsByServiceId(id))
    );
    return results;
  });

const createAlertsByServiceIdLoader = (alertService: AlertService) =>
  new DataLoader<string, Alert[]>(async (serviceIds) => {
    const results = await Promise.all(
      serviceIds.map(id => alertService.getAlertsByServiceId(id))
    );
    return results;
  });

const createAlertRulesByServiceIdLoader = (alertService: AlertService) =>
  new DataLoader<string, AlertRule[]>(async (serviceIds) => {
    const results = await Promise.all(
      serviceIds.map(id => alertService.getRulesByServiceId(id))
    );
    return results;
  });

const createServiceDependenciesLoader = (discoveryService: DiscoveryService) =>
  new DataLoader<string, Service[]>(async (serviceIds) => {
    const results = await Promise.all(
      serviceIds.map(id => discoveryService.getServiceDependencies(id))
    );
    return results;
  });

// Create DataLoaders
export const createDataLoaders = (services: GraphQLContext['services']) => ({
  serviceById: createServiceByIdLoader(services.discovery),
  servicesByIds: new DataLoader(async (requests: readonly string[][]) => {
    return Promise.all(
      requests.map(ids => services.discovery.getServicesByIds(ids))
    );
  }),
  containersByServiceId: createContainersByServiceIdLoader(services.monitoring),
  processesByServiceId: createProcessesByServiceIdLoader(services.monitoring),
  metricsByServiceId: createMetricsByServiceIdLoader(services.monitoring),
  alertsByServiceId: createAlertsByServiceIdLoader(services.alert),
  alertRulesByServiceId: createAlertRulesByServiceIdLoader(services.alert),
  serviceDependencies: createServiceDependenciesLoader(services.discovery),
});

// Field-level authorization
const requireAuth = (context: GraphQLContext) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }
};

const requireRole = (context: GraphQLContext, roles: string[]) => {
  requireAuth(context);
  if (!context.user?.roles.some(role => roles.includes(role))) {
    throw new Error('Insufficient permissions');
  }
};

// Main resolvers
export const resolvers: Resolvers<GraphQLContext> = {
  // Scalar resolvers
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Duration: DurationResolver,

  // Query resolvers
  Query: {
    services: async (_, args, context) => {
      const { status, environment, tags, limit = 50, offset = 0 } = args;
      return context.services.discovery.getServices({
        status,
        environment,
        tags,
        limit,
        offset,
      });
    },

    service: async (_, { id }, context) => {
      return context.dataloaders.serviceById.load(id);
    },

    serviceByName: async (_, { name, environment }, context) => {
      return context.services.discovery.getServiceByName(name, environment);
    },

    systemAnalysis: async (_, { timeRange }, context) => {
      return context.services.analysis.getSystemAnalysis(timeRange);
    },

    runFullAnalysis: async (_, __, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.analysis.runFullAnalysis();
    },

    metrics: async (_, args, context) => {
      const { serviceId, type, timeRange, limit = 100 } = args;
      return context.services.monitoring.getMetrics({
        serviceId,
        type,
        timeRange,
        limit,
      });
    },

    metricSeries: async (_, args, context) => {
      const { serviceId, metricName, timeRange, aggregation, granularity } = args;
      return context.services.monitoring.getMetricSeries({
        serviceId,
        metricName,
        timeRange,
        aggregation,
        granularity,
      });
    },

    alerts: async (_, args, context) => {
      const { serviceId, severity, status, limit = 50, offset = 0 } = args;
      return context.services.alert.getAlerts({
        serviceId,
        severity,
        status,
        limit,
        offset,
      });
    },

    alert: async (_, { id }, context) => {
      return context.services.alert.getAlertById(id);
    },

    alertRules: async (_, args, context) => {
      const { serviceId, enabled, severity } = args;
      return context.services.alert.getAlertRules({
        serviceId,
        enabled,
        severity,
      });
    },

    containers: async (_, { serviceId, status }, context) => {
      return context.services.monitoring.getContainers({ serviceId, status });
    },

    processes: async (_, { serviceId, status }, context) => {
      return context.services.monitoring.getProcesses({ serviceId, status });
    },

    healthCheck: async (_, { serviceId }, context) => {
      return context.services.monitoring.performHealthCheck(serviceId);
    },

    healthCheckAll: async (_, __, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.monitoring.performHealthCheckAll();
    },
  },

  // Mutation resolvers
  Mutation: {
    registerService: async (_, { input }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.discovery.registerService(input);
    },

    updateService: async (_, { id, input }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.discovery.updateService(id, input);
    },

    removeService: async (_, { id }, context) => {
      requireRole(context, ['admin']);
      return context.services.discovery.removeService(id);
    },

    triggerHealthCheck: async (_, { serviceId }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.monitoring.performHealthCheck(serviceId);
    },

    triggerHealthCheckAll: async (_, __, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.monitoring.performHealthCheckAll();
    },

    acknowledgeAlert: async (_, { alertId, userId }, context) => {
      requireAuth(context);
      return context.services.alert.acknowledgeAlert(alertId, userId);
    },

    resolveAlert: async (_, { alertId, userId }, context) => {
      requireAuth(context);
      return context.services.alert.resolveAlert(alertId, userId);
    },

    suppressAlert: async (_, { alertId, duration }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.alert.suppressAlert(alertId, duration);
    },

    createAlertRule: async (_, { input }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.alert.createAlertRule(input);
    },

    updateAlertRule: async (_, { id, input }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.alert.updateAlertRule(id, input);
    },

    deleteAlertRule: async (_, { id }, context) => {
      requireRole(context, ['admin']);
      return context.services.alert.deleteAlertRule(id);
    },

    restartService: async (_, { serviceId }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.monitoring.restartService(serviceId);
    },

    restartContainer: async (_, { containerId }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.monitoring.restartContainer(containerId);
    },

    scaleService: async (_, { serviceId, replicas }, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.monitoring.scaleService(serviceId, replicas);
    },

    requestSystemAnalysis: async (_, __, context) => {
      requireRole(context, ['admin', 'operator']);
      return context.services.analysis.requestSystemAnalysis();
    },
  },

  // Subscription resolvers
  Subscription: {
    serviceStatusChanged: {
      subscribe: (_, { serviceId }, context) => {
        return context.services.monitoring.subscribeToServiceStatus(serviceId);
      },
    },

    servicesStatusChanged: {
      subscribe: (_, { serviceIds }, context) => {
        return context.services.monitoring.subscribeToServicesStatus(serviceIds);
      },
    },

    metricsUpdated: {
      subscribe: (_, { serviceId }, context) => {
        return context.services.monitoring.subscribeToMetrics(serviceId);
      },
    },

    systemMetricsUpdated: {
      subscribe: (_, __, context) => {
        return context.services.monitoring.subscribeToSystemMetrics();
      },
    },

    alertTriggered: {
      subscribe: (_, { serviceId }, context) => {
        return context.services.alert.subscribeToAlerts(serviceId, 'TRIGGERED');
      },
    },

    alertResolved: {
      subscribe: (_, { serviceId }, context) => {
        return context.services.alert.subscribeToAlerts(serviceId, 'RESOLVED');
      },
    },

    alertsChanged: {
      subscribe: (_, __, context) => {
        return context.services.alert.subscribeToAllAlerts();
      },
    },

    systemAnalysisUpdated: {
      subscribe: (_, __, context) => {
        return context.services.analysis.subscribeToSystemAnalysis();
      },
    },

    containerStatusChanged: {
      subscribe: (_, { serviceId }, context) => {
        return context.services.monitoring.subscribeToContainerStatus(serviceId);
      },
    },

    processStatusChanged: {
      subscribe: (_, { serviceId }, context) => {
        return context.services.monitoring.subscribeToProcessStatus(serviceId);
      },
    },
  },

  // Type resolvers with DataLoader optimization
  Service: {
    dependencies: async (service, _, context) => {
      return context.dataloaders.serviceDependencies.load(service.id);
    },

    containers: async (service, _, context) => {
      return context.dataloaders.containersByServiceId.load(service.id);
    },

    processes: async (service, _, context) => {
      return context.dataloaders.processesByServiceId.load(service.id);
    },

    metrics: async (service, _, context) => {
      return context.dataloaders.metricsByServiceId.load(service.id);
    },

    alerts: async (service, _, context) => {
      return context.dataloaders.alertsByServiceId.load(service.id);
    },

    // Field-level caching for expensive operations
    uptime: async (service, _, context) => {
      // Cache uptime calculations for 30 seconds
      const cacheKey = `uptime:${service.id}`;
      return context.services.monitoring.getCachedUptime(service.id, cacheKey, 30);
    },
  },

  ServiceDependency: {
    service: async (dependency, _, context) => {
      return context.dataloaders.serviceById.load(dependency.serviceId);
    },

    dependsOn: async (dependency, _, context) => {
      return context.dataloaders.serviceById.load(dependency.dependsOnId);
    },
  },

  Container: {
    service: async (container, _, context) => {
      return container.serviceId 
        ? context.dataloaders.serviceById.load(container.serviceId)
        : null;
    },
  },

  Process: {
    service: async (process, _, context) => {
      return process.serviceId 
        ? context.dataloaders.serviceById.load(process.serviceId)
        : null;
    },

    children: async (process, _, context) => {
      return context.services.monitoring.getProcessChildren(process.id);
    },
  },

  Metric: {
    service: async (metric, _, context) => {
      return context.dataloaders.serviceById.load(metric.serviceId);
    },
  },

  Alert: {
    service: async (alert, _, context) => {
      return context.dataloaders.serviceById.load(alert.serviceId);
    },

    rule: async (alert, _, context) => {
      return context.services.alert.getAlertRule(alert.ruleId);
    },

    notifications: async (alert, _, context) => {
      return context.services.alert.getAlertNotifications(alert.id);
    },
  },

  AlertRule: {
    services: async (rule, _, context) => {
      return context.dataloaders.servicesByIds.load(rule.serviceIds);
    },
  },

  SystemAnalysis: {
    alertsByService: async (analysis, _, context) => {
      return context.services.analysis.getAlertsByService(analysis.id);
    },

    recommendations: async (analysis, _, context) => {
      return context.services.analysis.getRecommendations(analysis.id);
    },
  },

  PerformanceInsight: {
    service: async (insight, _, context) => {
      return insight.serviceId 
        ? context.dataloaders.serviceById.load(insight.serviceId)
        : null;
    },
  },

  ServiceAlertSummary: {
    service: async (summary, _, context) => {
      return context.dataloaders.serviceById.load(summary.serviceId);
    },
  },

  SystemRecommendation: {
    service: async (recommendation, _, context) => {
      return recommendation.serviceId 
        ? context.dataloaders.serviceById.load(recommendation.serviceId)
        : null;
    },
  },
};

// Query complexity analysis
export const createComplexityAnalysis = () => {
  return {
    maximumComplexity: 1000,
    scalarCost: 1,
    objectCost: 2,
    listFactor: 10,
    introspectionCost: 1000,
    fieldExtensions: {
      // Expensive operations
      runFullAnalysis: { cost: 100 },
      healthCheckAll: { cost: 50 },
      systemAnalysis: { cost: 30 },
      
      // Moderate operations
      services: { cost: 5 },
      alerts: { cost: 5 },
      metrics: { cost: 10 },
      
      // Light operations
      service: { cost: 1 },
      alert: { cost: 1 },
    },
  };
};

// Rate limiting configuration
export const createRateLimitConfig = () => {
  return {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    
    // Operation-specific limits
    operationLimits: {
      runFullAnalysis: { max: 5, windowMs: 5 * 60 * 1000 }, // 5 per 5 minutes
      healthCheckAll: { max: 10, windowMs: 60 * 1000 }, // 10 per minute
      systemAnalysis: { max: 20, windowMs: 60 * 1000 }, // 20 per minute
    },
  };
};