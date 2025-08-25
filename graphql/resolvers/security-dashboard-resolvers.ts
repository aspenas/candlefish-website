// Security Dashboard Resolvers with DataLoader Pattern
// Optimized for high-performance queries with N+1 prevention

import {
  IResolvers,
  AuthenticationError,
  ForbiddenError,
  UserInputError,
  ApolloError,
} from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';

import {
  SecurityDashboardContext,
  SecurityEvent,
  Asset,
  Alert,
  Vulnerability,
  User,
  ComplianceAssessment,
  KongService,
  KongRoute,
  SecurityMetrics,
} from '../types';

import {
  SecurityEventService,
  AssetService,
  AlertService,
  VulnerabilityService,
  ComplianceService,
  KongMonitoringService,
  MetricsService,
  NotificationService,
} from '../services';

import {
  createSecurityEventDataLoader,
  createAssetDataLoader,
  createAlertDataLoader,
  createVulnerabilityDataLoader,
  createUserDataLoader,
  createComplianceDataLoader,
  createKongServiceDataLoader,
  createMetricsDataLoader,
} from '../dataloaders/security-dataloaders';

import {
  validateQueryComplexity,
  checkRateLimit,
  auditSecurityAccess,
  sanitizeError,
} from '../utils/security-utils';

import { CacheManager } from '../cache/cache-manager';
import { pubsub } from '../pubsub';

// Constants for performance optimization
const CACHE_TTL = {
  SECURITY_EVENTS: 60, // 1 minute
  ASSETS: 300, // 5 minutes
  ALERTS: 30, // 30 seconds
  VULNERABILITIES: 600, // 10 minutes
  COMPLIANCE: 1800, // 30 minutes
  KONG_SERVICES: 120, // 2 minutes
  METRICS: 60, // 1 minute
  OVERVIEW: 30, // 30 seconds
};

const SUBSCRIPTION_CHANNELS = {
  SECURITY_EVENT_ADDED: 'SECURITY_EVENT_ADDED',
  SECURITY_EVENT_UPDATED: 'SECURITY_EVENT_UPDATED',
  ALERT_TRIGGERED: 'ALERT_TRIGGERED',
  ALERT_UPDATED: 'ALERT_UPDATED',
  ASSET_HEALTH_CHANGED: 'ASSET_HEALTH_CHANGED',
  KONG_ADMIN_API_STATUS_CHANGED: 'KONG_ADMIN_API_STATUS_CHANGED',
  VULNERABILITY_DISCOVERED: 'VULNERABILITY_DISCOVERED',
  COMPLIANCE_STATUS_CHANGED: 'COMPLIANCE_STATUS_CHANGED',
  LIVE_METRICS: 'LIVE_METRICS',
};

// Enhanced resolver with performance monitoring
const createTimedResolver = (resolverFn: Function, resolverName: string) => {
  return async (parent: any, args: any, context: SecurityDashboardContext, info: any) => {
    const startTime = performance.now();
    
    try {
      // Security checks
      await checkRateLimit(context.user, context.redis);
      validateQueryComplexity(info);
      
      const result = await resolverFn(parent, args, context, info);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log performance metrics
      await context.metricsService.recordResolverPerformance(
        resolverName,
        duration,
        context.organizationId
      );
      
      // Audit access for sensitive operations
      if (resolverName.includes('security') || resolverName.includes('vulnerability')) {
        await auditSecurityAccess(context.user, resolverName, args, context.auditService);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log error metrics
      await context.metricsService.recordResolverError(
        resolverName,
        error.message,
        duration,
        context.organizationId
      );
      
      throw sanitizeError(error, context.nodeEnv);
    }
  };
};

export const securityDashboardResolvers: IResolvers<any, SecurityDashboardContext> = {
  // Custom scalars
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  Query: {
    // Security Overview - High-level dashboard data
    securityOverview: createTimedResolver(
      async (_: any, { organizationId }: { organizationId: string }, context: SecurityDashboardContext) => {
        const cacheKey = `security-overview:${organizationId}`;
        
        return context.cacheManager.getOrSet(
          cacheKey,
          async () => {
            const [
              totalAssets,
              criticalVulnerabilities,
              activeAlerts,
              complianceScore,
              threatLevel,
              kongVulnerabilityStatus,
              vulnerabilitiesBySeverity,
              alertsBySeverity,
              recentEvents,
            ] = await Promise.all([
              context.assetService.getTotalAssets(organizationId),
              context.vulnerabilityService.getCriticalVulnerabilitiesCount(organizationId),
              context.alertService.getActiveAlertsCount(organizationId),
              context.complianceService.getOverallComplianceScore(organizationId),
              context.securityEventService.getCurrentThreatLevel(organizationId),
              context.kongMonitoringService.getAdminApiVulnerabilityStatus(),
              context.vulnerabilityService.getVulnerabilitiesBySeverity(organizationId),
              context.alertService.getAlertsBySeverity(organizationId),
              context.securityEventService.getRecentEvents(organizationId, 10),
            ]);

            return {
              organizationId,
              totalAssets,
              criticalVulnerabilities,
              activeAlerts,
              complianceScore,
              threatLevel,
              kongAdminApiVulnerability: kongVulnerabilityStatus,
              vulnerabilitiesBySeverity,
              alertsBySeverity,
              recentEvents,
              lastUpdated: new Date(),
            };
          },
          CACHE_TTL.OVERVIEW
        );
      },
      'securityOverview'
    ),

    // Assets with filtering and pagination
    assets: createTimedResolver(
      async (_: any, { filter }: { filter?: any }, context: SecurityDashboardContext) => {
        const cacheKey = `assets:${JSON.stringify(filter)}`;
        
        return context.cacheManager.getOrSet(
          cacheKey,
          () => context.assetService.getAssets(filter),
          CACHE_TTL.ASSETS
        );
      },
      'assets'
    ),

    asset: createTimedResolver(
      async (_: any, { id }: { id: string }, context: SecurityDashboardContext) => {
        return context.dataloaders.assets.load(id);
      },
      'asset'
    ),

    // Security Events with connection pattern for pagination
    securityEvents: createTimedResolver(
      async (_: any, { filter }: { filter?: any }, context: SecurityDashboardContext) => {
        return context.securityEventService.getSecurityEventsConnection(filter);
      },
      'securityEvents'
    ),

    securityEvent: createTimedResolver(
      async (_: any, { id }: { id: string }, context: SecurityDashboardContext) => {
        return context.dataloaders.securityEvents.load(id);
      },
      'securityEvent'
    ),

    // Alerts
    alerts: createTimedResolver(
      async (_: any, { filter }: { filter?: any }, context: SecurityDashboardContext) => {
        return context.alertService.getAlertsConnection(filter);
      },
      'alerts'
    ),

    alert: createTimedResolver(
      async (_: any, { id }: { id: string }, context: SecurityDashboardContext) => {
        return context.dataloaders.alerts.load(id);
      },
      'alert'
    ),

    // Vulnerabilities
    vulnerabilities: createTimedResolver(
      async (_: any, { filter }: { filter?: any }, context: SecurityDashboardContext) => {
        return context.vulnerabilityService.getVulnerabilitiesConnection(filter);
      },
      'vulnerabilities'
    ),

    vulnerability: createTimedResolver(
      async (_: any, { id }: { id: string }, context: SecurityDashboardContext) => {
        return context.dataloaders.vulnerabilities.load(id);
      },
      'vulnerability'
    ),

    // Compliance Status
    complianceStatus: createTimedResolver(
      async (_: any, { organizationId }: { organizationId: string }, context: SecurityDashboardContext) => {
        const cacheKey = `compliance-status:${organizationId}`;
        
        return context.cacheManager.getOrSet(
          cacheKey,
          () => context.complianceService.getComplianceStatus(organizationId),
          CACHE_TTL.COMPLIANCE
        );
      },
      'complianceStatus'
    ),

    complianceControls: createTimedResolver(
      async (_: any, { frameworkId }: { frameworkId: string }, context: SecurityDashboardContext) => {
        return context.complianceService.getComplianceControls(frameworkId);
      },
      'complianceControls'
    ),

    // Kong Gateway Monitoring (Critical Priority)
    kongServices: createTimedResolver(
      async (_: any, { filter }: { filter?: any }, context: SecurityDashboardContext) => {
        const cacheKey = `kong-services:${JSON.stringify(filter)}`;
        
        return context.cacheManager.getOrSet(
          cacheKey,
          () => context.kongMonitoringService.getKongServices(filter),
          CACHE_TTL.KONG_SERVICES
        );
      },
      'kongServices'
    ),

    kongRoutes: createTimedResolver(
      async (_: any, { serviceId }: { serviceId?: string }, context: SecurityDashboardContext) => {
        return context.kongMonitoringService.getKongRoutes(serviceId);
      },
      'kongRoutes'
    ),

    // Critical: Kong Admin API Status Monitoring
    kongAdminApiStatus: createTimedResolver(
      async (_: any, __: any, context: SecurityDashboardContext) => {
        const cacheKey = 'kong-admin-api-status';
        
        return context.cacheManager.getOrSet(
          cacheKey,
          async () => {
            const status = await context.kongMonitoringService.getAdminApiStatus();
            
            // If vulnerable, trigger immediate alert
            if (status.isVulnerable) {
              await context.notificationService.sendCriticalAlert({
                type: 'KONG_ADMIN_API_VULNERABLE',
                severity: 'CRITICAL',
                message: 'Kong Admin API is using HTTP protocol - immediate security risk',
                organizationId: context.organizationId,
                metadata: status,
              });
            }
            
            return status;
          },
          30 // 30 second cache for critical security status
        );
      },
      'kongAdminApiStatus'
    ),

    // Security Metrics and Analytics
    securityMetrics: createTimedResolver(
      async (_: any, { query }: { query: any }, context: SecurityDashboardContext) => {
        return context.metricsService.getSecurityMetrics(query);
      },
      'securityMetrics'
    ),

    threatTrends: createTimedResolver(
      async (_: any, { timeRange }: { timeRange: any }, context: SecurityDashboardContext) => {
        const cacheKey = `threat-trends:${JSON.stringify(timeRange)}`;
        
        return context.cacheManager.getOrSet(
          cacheKey,
          () => context.metricsService.getThreatTrends(timeRange),
          CACHE_TTL.METRICS
        );
      },
      'threatTrends'
    ),
  },

  Mutation: {
    // Asset Management
    createAsset: createTimedResolver(
      async (_: any, { input }: { input: any }, context: SecurityDashboardContext) => {
        const asset = await context.assetService.createAsset(input);
        
        // Invalidate related caches
        await context.cacheManager.invalidatePattern(`assets:*`);
        await context.cacheManager.invalidatePattern(`security-overview:*`);
        
        return asset;
      },
      'createAsset'
    ),

    updateAsset: createTimedResolver(
      async (_: any, { id, input }: { id: string; input: any }, context: SecurityDashboardContext) => {
        const asset = await context.assetService.updateAsset(id, input);
        
        // Clear specific asset from cache and related caches
        context.dataloaders.assets.clear(id);
        await context.cacheManager.invalidatePattern(`assets:*`);
        await context.cacheManager.invalidatePattern(`security-overview:*`);
        
        return asset;
      },
      'updateAsset'
    ),

    deleteAsset: createTimedResolver(
      async (_: any, { id }: { id: string }, context: SecurityDashboardContext) => {
        const success = await context.assetService.deleteAsset(id);
        
        if (success) {
          // Clear asset from cache and related caches
          context.dataloaders.assets.clear(id);
          await context.cacheManager.invalidatePattern(`assets:*`);
          await context.cacheManager.invalidatePattern(`security-overview:*`);
        }
        
        return success;
      },
      'deleteAsset'
    ),

    // Alert Management
    acknowledgeAlert: createTimedResolver(
      async (_: any, { id }: { id: string }, context: SecurityDashboardContext) => {
        const alert = await context.alertService.acknowledgeAlert(id, context.user.id);
        
        // Publish real-time update
        pubsub.publish(SUBSCRIPTION_CHANNELS.ALERT_UPDATED, {
          alertUpdated: alert,
          organizationId: context.organizationId,
        });
        
        // Clear cache
        context.dataloaders.alerts.clear(id);
        await context.cacheManager.invalidatePattern(`alerts:*`);
        
        return alert;
      },
      'acknowledgeAlert'
    ),

    resolveAlert: createTimedResolver(
      async (_: any, { id, resolution }: { id: string; resolution: string }, context: SecurityDashboardContext) => {
        const alert = await context.alertService.resolveAlert(id, resolution, context.user.id);
        
        // Publish real-time update
        pubsub.publish(SUBSCRIPTION_CHANNELS.ALERT_UPDATED, {
          alertUpdated: alert,
          organizationId: context.organizationId,
        });
        
        // Clear cache
        context.dataloaders.alerts.clear(id);
        await context.cacheManager.invalidatePattern(`alerts:*`);
        await context.cacheManager.invalidatePattern(`security-overview:*`);
        
        return alert;
      },
      'resolveAlert'
    ),

    createAlertRule: createTimedResolver(
      async (_: any, { input }: { input: any }, context: SecurityDashboardContext) => {
        const rule = await context.alertService.createAlertRule(input, context.user.id);
        return rule;
      },
      'createAlertRule'
    ),

    updateAlertRule: createTimedResolver(
      async (_: any, { id, input }: { id: string; input: any }, context: SecurityDashboardContext) => {
        const rule = await context.alertService.updateAlertRule(id, input);
        return rule;
      },
      'updateAlertRule'
    ),

    deleteAlertRule: createTimedResolver(
      async (_: any, { id }: { id: string }, context: SecurityDashboardContext) => {
        return context.alertService.deleteAlertRule(id);
      },
      'deleteAlertRule'
    ),

    // Security Event Management
    resolveSecurityEvent: createTimedResolver(
      async (_: any, { id, resolution }: { id: string; resolution: string }, context: SecurityDashboardContext) => {
        const event = await context.securityEventService.resolveSecurityEvent(id, resolution, context.user.id);
        
        // Publish real-time update
        pubsub.publish(SUBSCRIPTION_CHANNELS.SECURITY_EVENT_UPDATED, {
          securityEventUpdated: event,
          organizationId: context.organizationId,
        });
        
        // Clear cache
        context.dataloaders.securityEvents.clear(id);
        await context.cacheManager.invalidatePattern(`security-events:*`);
        await context.cacheManager.invalidatePattern(`security-overview:*`);
        
        return event;
      },
      'resolveSecurityEvent'
    ),

    escalateSecurityEvent: createTimedResolver(
      async (_: any, { id, assignTo }: { id: string; assignTo?: string }, context: SecurityDashboardContext) => {
        const event = await context.securityEventService.escalateSecurityEvent(id, assignTo, context.user.id);
        
        // Publish real-time update
        pubsub.publish(SUBSCRIPTION_CHANNELS.SECURITY_EVENT_UPDATED, {
          securityEventUpdated: event,
          organizationId: context.organizationId,
        });
        
        // Send notification to assignee
        if (assignTo) {
          await context.notificationService.sendEscalationNotification(assignTo, event);
        }
        
        // Clear cache
        context.dataloaders.securityEvents.clear(id);
        
        return event;
      },
      'escalateSecurityEvent'
    ),

    // Vulnerability Management
    updateVulnerability: createTimedResolver(
      async (_: any, { id, input }: { id: string; input: any }, context: SecurityDashboardContext) => {
        const vulnerability = await context.vulnerabilityService.updateVulnerability(id, input);
        
        // Clear cache
        context.dataloaders.vulnerabilities.clear(id);
        await context.cacheManager.invalidatePattern(`vulnerabilities:*`);
        await context.cacheManager.invalidatePattern(`security-overview:*`);
        
        return vulnerability;
      },
      'updateVulnerability'
    ),

    acceptVulnerabilityRisk: createTimedResolver(
      async (_: any, { id, reason }: { id: string; reason: string }, context: SecurityDashboardContext) => {
        const vulnerability = await context.vulnerabilityService.acceptRisk(id, reason, context.user.id);
        
        // Audit risk acceptance
        await context.auditService.logRiskAcceptance(vulnerability, context.user, reason);
        
        // Clear cache
        context.dataloaders.vulnerabilities.clear(id);
        await context.cacheManager.invalidatePattern(`vulnerabilities:*`);
        await context.cacheManager.invalidatePattern(`security-overview:*`);
        
        return vulnerability;
      },
      'acceptVulnerabilityRisk'
    ),

    // Compliance Management
    updateComplianceAssessment: createTimedResolver(
      async (_: any, { input }: { input: any }, context: SecurityDashboardContext) => {
        const assessment = await context.complianceService.updateAssessment(input, context.user.id);
        
        // Clear compliance cache
        await context.cacheManager.invalidatePattern(`compliance-*`);
        
        // Check if this triggers compliance status change
        const newStatus = await context.complianceService.getComplianceStatus(context.organizationId);
        
        pubsub.publish(SUBSCRIPTION_CHANNELS.COMPLIANCE_STATUS_CHANGED, {
          complianceStatusChanged: {
            organizationId: context.organizationId,
            // Add diff logic here
            timestamp: new Date(),
          },
        });
        
        return assessment;
      },
      'updateComplianceAssessment'
    ),

    // Incident Response
    createIncident: createTimedResolver(
      async (_: any, { input }: { input: any }, context: SecurityDashboardContext) => {
        const incident = await context.incidentService.createIncident(input, context.user.id);
        
        // Send immediate notifications for critical incidents
        if (input.severity === 'CRITICAL') {
          await context.notificationService.sendCriticalIncidentAlert(incident);
        }
        
        return incident;
      },
      'createIncident'
    ),

    updateIncident: createTimedResolver(
      async (_: any, { id, input }: { id: string; input: any }, context: SecurityDashboardContext) => {
        return context.incidentService.updateIncident(id, input, context.user.id);
      },
      'updateIncident'
    ),

    // Monitoring Configuration
    updateMonitoringConfig: createTimedResolver(
      async (_: any, { input }: { input: any }, context: SecurityDashboardContext) => {
        const config = await context.monitoringService.updateConfig(input, context.user.id);
        
        // Restart monitoring services with new configuration
        await context.kongMonitoringService.updateConfiguration(config.kongMonitoring);
        
        return config;
      },
      'updateMonitoringConfig'
    ),
  },

  Subscription: {
    // Security Events
    securityEventAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.SECURITY_EVENT_ADDED]),
        (payload, variables, context) => {
          return payload.organizationId === variables.organizationId &&
                 context.user.hasAccessToOrganization(variables.organizationId);
        }
      ),
    },

    securityEventUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.SECURITY_EVENT_UPDATED]),
        (payload, variables, context) => {
          return payload.organizationId === variables.organizationId &&
                 context.user.hasAccessToOrganization(variables.organizationId);
        }
      ),
    },

    // Alerts
    alertTriggered: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.ALERT_TRIGGERED]),
        (payload, variables, context) => {
          return payload.organizationId === variables.organizationId &&
                 context.user.hasAccessToOrganization(variables.organizationId);
        }
      ),
    },

    alertUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.ALERT_UPDATED]),
        (payload, variables, context) => {
          return payload.organizationId === variables.organizationId &&
                 context.user.hasAccessToOrganization(variables.organizationId);
        }
      ),
    },

    // Asset Health
    assetHealthChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.ASSET_HEALTH_CHANGED]),
        (payload, variables, context) => {
          return (!variables.assetId || payload.assetId === variables.assetId) &&
                 context.user.hasAccessToAsset(payload.assetId);
        }
      ),
    },

    // Critical: Kong Admin API Status
    kongAdminApiStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.KONG_ADMIN_API_STATUS_CHANGED]),
        (payload, variables, context) => {
          return context.user.hasSecurityRole();
        }
      ),
    },

    // Vulnerabilities
    vulnerabilityDiscovered: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.VULNERABILITY_DISCOVERED]),
        (payload, variables, context) => {
          return payload.organizationId === variables.organizationId &&
                 context.user.hasAccessToOrganization(variables.organizationId);
        }
      ),
    },

    // Compliance
    complianceStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.COMPLIANCE_STATUS_CHANGED]),
        (payload, variables, context) => {
          return payload.organizationId === variables.organizationId &&
                 context.user.hasAccessToOrganization(variables.organizationId);
        }
      ),
    },

    // Live Metrics
    liveMetrics: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_CHANNELS.LIVE_METRICS]),
        (payload, variables, context) => {
          return payload.organizationId === variables.organizationId &&
                 variables.metricTypes.includes(payload.metricType) &&
                 context.user.hasAccessToOrganization(variables.organizationId);
        }
      ),
    },
  },

  // Field Resolvers with DataLoader optimization
  Asset: {
    vulnerabilities: async (parent: Asset, _: any, context: SecurityDashboardContext) => {
      return context.vulnerabilityService.getVulnerabilitiesByAssetId(parent.id);
    },

    securityEvents: async (parent: Asset, { limit = 10 }: { limit?: number }, context: SecurityDashboardContext) => {
      return context.securityEventService.getEventsByAssetId(parent.id, limit);
    },

    alerts: async (parent: Asset, { status }: { status?: string }, context: SecurityDashboardContext) => {
      return context.alertService.getAlertsByAssetId(parent.id, status);
    },

    complianceAssessments: async (parent: Asset, _: any, context: SecurityDashboardContext) => {
      return context.complianceService.getAssessmentsByAssetId(parent.id);
    },
  },

  SecurityEvent: {
    asset: async (parent: SecurityEvent, _: any, context: SecurityDashboardContext) => {
      if (!parent.assetId) return null;
      return context.dataloaders.assets.load(parent.assetId);
    },

    resolvedBy: async (parent: SecurityEvent, _: any, context: SecurityDashboardContext) => {
      if (!parent.resolvedById) return null;
      return context.dataloaders.users.load(parent.resolvedById);
    },

    escalatedBy: async (parent: SecurityEvent, _: any, context: SecurityDashboardContext) => {
      if (!parent.escalatedById) return null;
      return context.dataloaders.users.load(parent.escalatedById);
    },
  },

  Alert: {
    asset: async (parent: Alert, _: any, context: SecurityDashboardContext) => {
      if (!parent.assetId) return null;
      return context.dataloaders.assets.load(parent.assetId);
    },

    acknowledgedBy: async (parent: Alert, _: any, context: SecurityDashboardContext) => {
      if (!parent.acknowledgedById) return null;
      return context.dataloaders.users.load(parent.acknowledgedById);
    },

    resolvedBy: async (parent: Alert, _: any, context: SecurityDashboardContext) => {
      if (!parent.resolvedById) return null;
      return context.dataloaders.users.load(parent.resolvedById);
    },
  },

  Vulnerability: {
    asset: async (parent: Vulnerability, _: any, context: SecurityDashboardContext) => {
      return context.dataloaders.assets.load(parent.assetId);
    },
  },

  KongService: {
    routes: async (parent: KongService, _: any, context: SecurityDashboardContext) => {
      return context.kongMonitoringService.getRoutesByServiceId(parent.id);
    },

    vulnerabilities: async (parent: KongService, _: any, context: SecurityDashboardContext) => {
      return context.vulnerabilityService.getVulnerabilitiesByAssetId(parent.id);
    },
  },

  KongRoute: {
    service: async (parent: KongRoute, _: any, context: SecurityDashboardContext) => {
      return context.dataloaders.kongServices.load(parent.serviceId);
    },
  },
};

export default securityDashboardResolvers;