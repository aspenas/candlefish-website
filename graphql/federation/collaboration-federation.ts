/**
 * GraphQL Federation Configuration for Real-Time Collaboration Platform
 * Implements Apollo Federation for microservice architecture with enhanced DataLoaders
 */

import { buildFederatedSchema } from '@apollo/federation';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AuthContext, createContext } from '../types/context';
import { createCollaborationDataLoaders } from '../dataloaders/collaboration-dataloaders';
import { collaborationResolvers } from '../resolvers/collaboration-resolvers';

// =============================================================================
// FEDERATED SCHEMA CREATION
// =============================================================================

const typeDefs = `
  # =============================================================================
  # FEDERATION DIRECTIVES
  # =============================================================================
  
  directive @key(fields: String!) on OBJECT | INTERFACE
  directive @requires(fields: String!) on FIELD_DEFINITION
  directive @provides(fields: String!) on FIELD_DEFINITION
  directive @external on FIELD_DEFINITION
  directive @extends on OBJECT | INTERFACE
  
  # =============================================================================
  # CUSTOM DIRECTIVES
  # =============================================================================
  
  directive @auth(requires: Permission!) on FIELD_DEFINITION | OBJECT
  directive @rateLimit(max: Int!, window: Int!) on FIELD_DEFINITION
  directive @complexity(value: Int!) on FIELD_DEFINITION
  directive @tenant on OBJECT | FIELD_DEFINITION
  
  # =============================================================================
  # FEDERATION ENTITY EXTENSIONS
  # =============================================================================
  
  # User entity (owned by User Service)
  extend type User @key(fields: "id") {
    id: UUID! @external
    email: String! @external
    firstName: String! @external
    lastName: String! @external
    
    # Extended fields for collaboration
    collaborationPreferences: CollaborationPreferences!
    presenceSessions: [PresenceSession!]! @requires(fields: "id")
    recentDocuments: [Document!]! @requires(fields: "id") @complexity(value: 10)
    aiUsageStats: AIUsageStats @requires(fields: "id") @auth(requires: VIEW_ANALYTICS)
  }
  
  # Organization entity (owned by Organization Service)  
  extend type Organization @key(fields: "id") {
    id: UUID! @external
    name: String! @external
    
    # Extended fields for collaboration
    collaborationSettings: OrganizationCollaborationSettings!
    aiConfiguration: OrganizationAIConfiguration!
    workspaces: [Workspace!]! @requires(fields: "id")
    globalMetrics: OrganizationMetrics! @requires(fields: "id") @auth(requires: ORGANIZATION_ADMIN)
  }
  
  # =============================================================================
  # FEDERATION-SPECIFIC TYPES
  # =============================================================================
  
  type CollaborationPreferences {
    showOtherCursors: Boolean!
    enableAISuggestions: Boolean!
    notificationSettings: NotificationPreferences!
    defaultPermissions: DefaultPermissionSettings!
    theme: CollaborationTheme!
    language: String!
    timezone: String!
  }
  
  type NotificationPreferences {
    email: Boolean!
    push: Boolean!
    inApp: Boolean!
    slack: Boolean!
    quietHours: QuietHoursConfig
    digestFrequency: DigestFrequency!
    priorities: [NotificationPriority!]!
  }
  
  type DefaultPermissionSettings {
    newDocuments: DocumentPermission!
    sharedDocuments: DocumentPermission!
    comments: CommentPermission!
    integrations: IntegrationPermission!
  }
  
  type CollaborationTheme {
    cursorColors: [HexColorCode!]!
    highlightColors: [HexColorCode!]!
    darkMode: Boolean!
    compactMode: Boolean!
    animations: Boolean!
  }
  
  type OrganizationCollaborationSettings {
    allowGuestAccess: Boolean!
    defaultDocumentRetention: Duration!
    maxConcurrentSessions: NonNegativeInt!
    aiEnabledByDefault: Boolean!
    requireMFA: Boolean!
    allowExternalSharing: Boolean!
  }
  
  type OrganizationAIConfiguration {
    enabled: Boolean!
    models: [AIModelConfiguration!]!
    costLimits: AICostConfiguration!
    dataRetention: AIDataRetentionPolicy!
    complianceSettings: AIComplianceSettings!
  }
  
  type AIModelConfiguration {
    modelType: AIModelType!
    enabled: Boolean!
    maxTokens: NonNegativeInt!
    temperature: Float!
    rateLimit: RateLimit!
  }
  
  type AICostConfiguration {
    monthlyLimit: Decimal!
    alertThresholds: [Decimal!]!
    costCenter: String
    billingContact: String!
  }
  
  type AIDataRetentionPolicy {
    conversationHistory: Duration!
    modelOutputs: Duration!
    trainingData: Duration!
    deleteAfterInactivity: Duration!
  }
  
  type AIComplianceSettings {
    dataProcessingRegion: DataProcessingRegion!
    encryptionRequired: Boolean!
    auditLoggingEnabled: Boolean!
    thirdPartyDataSharing: Boolean!
  }
  
  type OrganizationMetrics {
    totalUsers: NonNegativeInt!
    activeUsers: NonNegativeInt!
    totalDocuments: NonNegativeInt!
    collaborationHours: BigInt!
    aiUsage: OrganizationAIUsage!
    topProjects: [ProjectMetricsSummary!]!
    costSummary: OrganizationCostSummary!
  }
  
  type OrganizationAIUsage {
    totalRequests: BigInt!
    totalTokens: BigInt!
    totalCost: Decimal!
    topModels: [AIModelUsage!]!
    efficiency: AIEfficiencyMetrics!
  }
  
  type ProjectMetricsSummary {
    project: Project!
    documentCount: NonNegativeInt!
    activeUsers: NonNegativeInt!
    collaborationScore: Float!
    aiUsageScore: Float!
  }
  
  type OrganizationCostSummary {
    totalCost: Decimal!
    aiCosts: Decimal!
    storageCosts: Decimal!
    bandwidthCosts: Decimal!
    projectedMonthlyCost: Decimal!
  }
  
  type AIModelUsage {
    modelType: AIModelType!
    requests: BigInt!
    tokens: BigInt!
    cost: Decimal!
    averageResponseTime: Duration!
  }
  
  type AIEfficiencyMetrics {
    acceptanceRate: Float!
    timesSaved: Duration!
    qualityImprovement: Float!
    userSatisfaction: Float!
  }
  
  # =============================================================================
  # FEDERATION-SPECIFIC ENUMERATIONS
  # =============================================================================
  
  enum DataProcessingRegion {
    US_EAST
    US_WEST  
    EU_CENTRAL
    EU_WEST
    ASIA_PACIFIC
    CANADA
    UK
    AUSTRALIA
  }
  
  enum CommentPermission {
    NONE
    VIEW_ONLY
    COMMENT
    MODERATE
  }
  
  enum IntegrationPermission {
    NONE
    VIEW_ONLY
    CONFIGURE
    MANAGE
  }
  
  enum CollaborationFeature {
    REAL_TIME_EDITING
    AI_SUGGESTIONS
    VERSION_CONTROL
    ADVANCED_COMMENTS
    PRESENCE_AWARENESS
    CONFLICT_RESOLUTION
    ANALYTICS
    INTEGRATIONS
  }
`;

// =============================================================================
// RESOLVER COMPOSITION
// =============================================================================

const resolvers = {
  // =============================================================================
  // FEDERATION ENTITY RESOLVERS
  # =============================================================================
  
  User: {
    // Reference resolver for federation
    __resolveReference: async (user: { id: string }, context: AuthContext) => {
      return context.dataLoaders.user.load(user.id);
    },
    
    // Extended collaboration fields
    collaborationPreferences: async (parent: any, args: any, context: AuthContext) => {
      return context.dataLoaders.collaboration.userPreferences.load(parent.id);
    },
    
    presenceSessions: async (parent: any, args: any, context: AuthContext) => {
      return context.dataLoaders.collaboration.userPresence.load(parent.id);
    },
    
    recentDocuments: async (parent: any, args: any, context: AuthContext) => {
      return context.dataLoaders.collaboration.documentsRecent.load(parent.id);
    },
    
    aiUsageStats: async (parent: any, args: any, context: AuthContext) => {
      const stats = await context.services.ai.getUserUsageStats(parent.id);
      return stats;
    }
  },
  
  Organization: {
    // Reference resolver for federation
    __resolveReference: async (org: { id: string }, context: AuthContext) => {
      return context.dataLoaders.organization.load(org.id);
    },
    
    // Extended collaboration fields
    collaborationSettings: async (parent: any, args: any, context: AuthContext) => {
      return context.dataLoaders.collaboration.organizationSettings.load(parent.id);
    },
    
    aiConfiguration: async (parent: any, args: any, context: AuthContext) => {
      return context.dataLoaders.collaboration.organizationAIConfig.load(parent.id);
    },
    
    workspaces: async (parent: any, args: any, context: AuthContext) => {
      return context.dataLoaders.collaboration.workspaces.load(parent.id);
    },
    
    globalMetrics: async (parent: any, args: any, context: AuthContext) => {
      const service = context.services.analytics;
      return service.getOrganizationMetrics(parent.id, {
        includeAI: true,
        includeCosts: true,
        timeRange: args.timeRange || { days: 30 }
      });
    }
  }
};

// =============================================================================
// FEDERATED SCHEMA CREATION
// =============================================================================

export const createFederatedSchema = () => {
  return buildFederatedSchema([
    {
      typeDefs,
      resolvers
    }
  ]);
};

// =============================================================================
// SUBGRAPH CONFIGURATION
// =============================================================================

export interface SubgraphConfig {
  name: string;
  url: string;
  healthCheckUrl?: string;
  retryAttempts?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export const subgraphConfigs: SubgraphConfig[] = [
  {
    name: 'collaboration',
    url: process.env.COLLABORATION_SERVICE_URL || 'http://localhost:4001/graphql',
    healthCheckUrl: process.env.COLLABORATION_SERVICE_URL || 'http://localhost:4001/health',
    retryAttempts: 3,
    timeout: 10000,
    headers: {
      'Service-Name': 'collaboration-service',
      'Service-Version': process.env.SERVICE_VERSION || '1.0.0'
    }
  },
  {
    name: 'users',
    url: process.env.USER_SERVICE_URL || 'http://localhost:4002/graphql',
    healthCheckUrl: process.env.USER_SERVICE_URL || 'http://localhost:4002/health'
  },
  {
    name: 'organizations',
    url: process.env.ORG_SERVICE_URL || 'http://localhost:4003/graphql',
    healthCheckUrl: process.env.ORG_SERVICE_URL || 'http://localhost:4003/health'
  },
  {
    name: 'ai-services',
    url: process.env.AI_SERVICE_URL || 'http://localhost:4004/graphql',
    healthCheckUrl: process.env.AI_SERVICE_URL || 'http://localhost:4004/health'
  },
  {
    name: 'integrations',
    url: process.env.INTEGRATION_SERVICE_URL || 'http://localhost:4005/graphql',
    healthCheckUrl: process.env.INTEGRATION_SERVICE_URL || 'http://localhost:4005/health'
  }
];

// =============================================================================
# FEDERATION GATEWAY UTILITIES
# =============================================================================

export const createFederationServiceList = () => {
  return subgraphConfigs.map(config => ({
    name: config.name,
    url: config.url
  }));
};

export const healthCheckSubgraphs = async (): Promise<{ healthy: SubgraphConfig[], unhealthy: SubgraphConfig[] }> => {
  const healthy: SubgraphConfig[] = [];
  const unhealthy: SubgraphConfig[] = [];
  
  for (const config of subgraphConfigs) {
    try {
      if (config.healthCheckUrl) {
        const response = await fetch(config.healthCheckUrl, {
          method: 'GET',
          timeout: config.timeout || 5000,
          headers: config.headers || {}
        });
        
        if (response.ok) {
          healthy.push(config);
        } else {
          unhealthy.push(config);
        }
      } else {
        // Skip health check if no URL provided
        healthy.push(config);
      }
    } catch (error) {
      console.error(`Health check failed for ${config.name}:`, error);
      unhealthy.push(config);
    }
  }
  
  return { healthy, unhealthy };
};

export interface FederationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  subgraphMetrics: Map<string, SubgraphMetrics>;
}

export interface SubgraphMetrics {
  name: string;
  requests: number;
  errors: number;
  averageResponseTime: number;
  lastError?: Error;
  isHealthy: boolean;
}

class FederationMonitor {
  private metrics: FederationMetrics;
  
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      subgraphMetrics: new Map()
    };
  }
  
  recordRequest(subgraphName: string, responseTime: number, error?: Error) {
    this.metrics.totalRequests++;
    
    if (error) {
      this.metrics.failedRequests++;
    } else {
      this.metrics.successfulRequests++;
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
    
    // Update subgraph metrics
    const subgraphMetrics = this.metrics.subgraphMetrics.get(subgraphName) || {
      name: subgraphName,
      requests: 0,
      errors: 0,
      averageResponseTime: 0,
      isHealthy: true
    };
    
    subgraphMetrics.requests++;
    
    if (error) {
      subgraphMetrics.errors++;
      subgraphMetrics.lastError = error;
      subgraphMetrics.isHealthy = subgraphMetrics.errors / subgraphMetrics.requests < 0.05; // 5% error threshold
    }
    
    subgraphMetrics.averageResponseTime = 
      (subgraphMetrics.averageResponseTime * (subgraphMetrics.requests - 1) + responseTime) / 
      subgraphMetrics.requests;
    
    this.metrics.subgraphMetrics.set(subgraphName, subgraphMetrics);
  }
  
  getMetrics(): FederationMetrics {
    return { ...this.metrics };
  }
  
  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const errorRate = this.metrics.failedRequests / this.metrics.totalRequests;
    
    if (errorRate === 0) return 'healthy';
    if (errorRate < 0.01) return 'healthy'; // Less than 1% error rate
    if (errorRate < 0.05) return 'degraded'; // Less than 5% error rate
    return 'unhealthy';
  }
}

export const federationMonitor = new FederationMonitor();

export default {
  createFederatedSchema,
  createFederationServiceList,
  healthCheckSubgraphs,
  federationMonitor
};