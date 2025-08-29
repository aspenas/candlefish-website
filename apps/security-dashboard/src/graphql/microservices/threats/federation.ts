import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { threatResolvers, createThreatContext } from './resolvers';
import { ThreatDataSources } from './datasources';
import { createComplexityLimitRule } from 'graphql-query-complexity';
import depthLimit from 'graphql-depth-limit';
import { shield, rule, and, or } from 'graphql-shield';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

// Load GraphQL schema files
const loadSchema = () => {
  const schemaPath = resolve(__dirname, 'schema.graphql');
  const inputsPath = resolve(__dirname, 'schema-inputs.graphql');
  const typesPath = resolve(__dirname, 'schema-types.graphql');
  
  const mainSchema = readFileSync(schemaPath, 'utf8');
  const inputsSchema = readFileSync(inputsPath, 'utf8');
  const typesSchema = readFileSync(typesPath, 'utf8');
  
  return `${mainSchema}\n\n${inputsSchema}\n\n${typesSchema}`;
};

// Rate limiting configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const rateLimiters = {
  // Standard API rate limiting
  api: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'threat_api_limit',
    points: 1000, // Number of requests
    duration: 60, // Per 60 seconds
  }),
  
  // Enrichment API rate limiting (more restrictive)
  enrichment: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'threat_enrichment_limit',
    points: 100,
    duration: 60,
  }),
  
  // Bulk operations rate limiting
  bulk: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'threat_bulk_limit',
    points: 5,
    duration: 300, // 5 operations per 5 minutes
  }),
  
  // Subscription rate limiting
  subscription: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'threat_sub_limit',
    points: 50,
    duration: 60,
  }),
};

// Authorization rules using graphql-shield
const permissions = shield(
  {
    Query: {
      threatIntelligence: and(isAuthenticated, hasRole('ANALYST')),
      threat: and(isAuthenticated, hasRole('ANALYST')),
      searchThreats: and(isAuthenticated, hasRole('ANALYST')),
      iocs: and(isAuthenticated, hasRole('ANALYST')),
      ioc: and(isAuthenticated, hasRole('ANALYST')),
      searchIOCs: and(isAuthenticated, hasRole('ANALYST')),
      enrichIOC: and(isAuthenticated, hasRole('ANALYST'), rateLimitEnrichment),
      threatActors: and(isAuthenticated, hasRole('ANALYST')),
      threatCampaigns: and(isAuthenticated, hasRole('ANALYST')),
      threatFeeds: and(isAuthenticated, hasRole('ADMIN')),
      threatCorrelations: and(isAuthenticated, hasRole('ANALYST')),
      threatReports: and(isAuthenticated, hasRole('ANALYST')),
      threatAnalytics: and(isAuthenticated, hasRole('ANALYST')),
      threatLandscape: and(isAuthenticated, hasRole('ANALYST')),
      threatIntelligenceDashboard: and(isAuthenticated, hasRole('ANALYST')),
      attributionAnalysis: and(isAuthenticated, hasRole('ANALYST')),
      recommendedMitigations: and(isAuthenticated, hasRole('ANALYST')),
    },
    
    Mutation: {
      // Threat Intelligence mutations
      createThreatIntelligence: and(isAuthenticated, hasRole('ADMIN')),
      updateThreatIntelligence: and(isAuthenticated, hasRole('ADMIN')),
      deleteThreatIntelligence: and(isAuthenticated, hasRole('ADMIN')),
      
      // IOC mutations
      createIOC: and(isAuthenticated, hasRole('ANALYST')),
      updateIOC: and(isAuthenticated, hasRole('ANALYST')),
      deleteIOC: and(isAuthenticated, hasRole('ANALYST')),
      whitelistIOC: and(isAuthenticated, hasRole('ANALYST')),
      removeIOCWhitelist: and(isAuthenticated, hasRole('ANALYST')),
      bulkImportIOCs: and(isAuthenticated, hasRole('ADMIN'), rateLimitBulk),
      
      // Actor and Campaign mutations
      createThreatActor: and(isAuthenticated, hasRole('ADMIN')),
      updateThreatActor: and(isAuthenticated, hasRole('ADMIN')),
      createThreatCampaign: and(isAuthenticated, hasRole('ADMIN')),
      updateThreatCampaign: and(isAuthenticated, hasRole('ADMIN')),
      
      // Feed mutations
      createThreatFeed: and(isAuthenticated, hasRole('ADMIN')),
      updateThreatFeed: and(isAuthenticated, hasRole('ADMIN')),
      deleteThreatFeed: and(isAuthenticated, hasRole('ADMIN')),
      syncThreatFeed: and(isAuthenticated, hasRole('ADMIN')),
      testThreatFeed: and(isAuthenticated, hasRole('ADMIN')),
      
      // Correlation mutations
      createThreatCorrelation: and(isAuthenticated, hasRole('ADMIN')),
      updateThreatCorrelation: and(isAuthenticated, hasRole('ADMIN')),
      deleteThreatCorrelation: and(isAuthenticated, hasRole('ADMIN')),
      
      // Enrichment mutations
      enrichIndicators: and(isAuthenticated, hasRole('ANALYST'), rateLimitEnrichment),
      
      // Report mutations
      createThreatReport: and(isAuthenticated, hasRole('ANALYST')),
      updateThreatReport: and(isAuthenticated, hasRole('ANALYST')),
      publishThreatReport: and(isAuthenticated, hasRole('ADMIN')),
      
      // Attribution mutations
      submitAttribution: and(isAuthenticated, hasRole('ANALYST')),
      
      // Mitigation mutations
      recommendMitigations: and(isAuthenticated, hasRole('ANALYST')),
      implementMitigation: and(isAuthenticated, hasRole('INCIDENT_RESPONDER')),
    },
    
    Subscription: {
      threatIntelligenceUpdates: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
      iocMatches: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
      newIOCs: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
      threatFeedUpdates: and(isAuthenticated, hasRole('ADMIN'), rateLimitSubscription),
      correlationMatches: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
      attributionUpdates: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
      threatActorActivity: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
      campaignUpdates: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
      threatLandscapeUpdates: and(isAuthenticated, hasRole('ANALYST'), rateLimitSubscription),
    },
  },
  {
    allowExternalErrors: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV === 'development',
    fallbackRule: rule()(async () => false), // Deny by default
  }
);

// Authorization rules
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    return !!context.userId && !!context.organizationId;
  }
);

const hasRole = (requiredRole: string) => rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    const roleHierarchy = {
      VIEWER: 0,
      ANALYST: 1,
      INCIDENT_RESPONDER: 2,
      ADMIN: 3,
      SUPER_ADMIN: 4,
    };
    
    const userLevel = roleHierarchy[context.userRole] || -1;
    const requiredLevel = roleHierarchy[requiredRole] || 999;
    
    return userLevel >= requiredLevel;
  }
);

// Rate limiting rules
const rateLimitEnrichment = rule({ cache: 'no_cache' })(
  async (parent, args, context) => {
    try {
      await rateLimiters.enrichment.consume(`${context.userId}:${context.organizationId}`);
      return true;
    } catch {
      return new Error('Rate limit exceeded for enrichment operations');
    }
  }
);

const rateLimitBulk = rule({ cache: 'no_cache' })(
  async (parent, args, context) => {
    try {
      await rateLimiters.bulk.consume(`${context.userId}:${context.organizationId}`);
      return true;
    } catch {
      return new Error('Rate limit exceeded for bulk operations');
    }
  }
);

const rateLimitSubscription = rule({ cache: 'no_cache' })(
  async (parent, args, context) => {
    try {
      await rateLimiters.subscription.consume(`${context.userId}:${context.organizationId}`);
      return true;
    } catch {
      return new Error('Rate limit exceeded for subscriptions');
    }
  }
);

// Query complexity analysis
const createComplexityRule = () => createComplexityLimitRule(2000, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  introspectionCost: 1000,
  maximumCost: 2000,
  
  // Field-specific complexity costs
  fieldExtensionOptions: {
    // High-cost operations
    searchThreats: { complexity: 100 },
    searchIOCs: { complexity: 80 },
    enrichIOC: { complexity: 200 },
    threatAnalytics: { complexity: 300 },
    threatLandscape: { complexity: 250 },
    attributionAnalysis: { complexity: 400 },
    bulkImportIOCs: { complexity: 500 },
    
    // Medium-cost operations
    threatIntelligence: { complexity: 50 },
    iocs: { complexity: 40 },
    threatActors: { complexity: 30 },
    threatCampaigns: { complexity: 30 },
    
    // Relationship fields
    relatedThreats: { complexity: 25 },
    relatedIOCs: { complexity: 20 },
    indicators: { complexity: 15 },
    mitigations: { complexity: 10 },
    
    // Aggregations
    aggregations: { complexity: 20 },
    analytics: { complexity: 50 },
    dashboard: { complexity: 100 },
  },
  
  onComplete: (complexity: number, context: any) => {
    // Log high complexity queries for monitoring
    if (complexity > 1000) {
      console.warn('High complexity query executed', {
        complexity,
        userId: context.userId,
        organizationId: context.organizationId,
        requestId: context.requestId,
      });
    }
  },
});

// Create federated subgraph server
export const createThreatIntelligenceSubgraph = async () => {
  const typeDefs = loadSchema();
  
  const server = new ApolloServer({
    schema: buildSubgraphSchema({
      typeDefs,
      resolvers: [permissions, threatResolvers] as any,
    }),
    
    // Validation rules for security and performance
    validationRules: [
      depthLimit(15), // Maximum query depth
      createComplexityRule(),
    ],
    
    // Context creation with data sources and DataLoaders
    context: async ({ req }) => {
      // Extract authentication info from headers
      const token = req.headers.authorization?.replace('Bearer ', '');
      const organizationId = req.headers['x-organization-id'] as string;
      const userId = req.headers['x-user-id'] as string;
      const userRole = req.headers['x-user-role'] as string;
      const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}`;
      
      // Create data sources
      const dataSources = new ThreatDataSources({
        organizationId,
        userId,
        userRole,
      });
      
      // Create context with DataLoaders
      const baseContext = {
        dataSources,
        organizationId,
        userId,
        userRole,
        requestId,
        token,
      };
      
      return createThreatContext(baseContext);
    },
    
    // Error formatting
    formatError: (error) => {
      // Log errors for monitoring
      console.error('GraphQL Error:', {
        message: error.message,
        code: error.extensions?.code,
        path: error.path,
        source: error.source?.body,
      });
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (error.message.includes('Database') || error.message.includes('Redis')) {
          return new Error('Internal server error');
        }
      }
      
      return error;
    },
    
    // Response formatting with metadata
    formatResponse: (response, requestContext) => {
      const context = requestContext.context as any;
      
      if (response.extensions) {
        response.extensions.requestId = context.requestId;
        response.extensions.organizationId = context.organizationId;
        response.extensions.processingTime = Date.now() - context.startTime;
      }
      
      return response;
    },
    
    plugins: [
      // Request timing plugin
      {
        requestDidStart() {
          return {
            willSendResponse(requestContext) {
              const context = requestContext.context as any;
              context.startTime = Date.now();
            },
          };
        },
      },
      
      // Metrics collection plugin
      {
        requestDidStart() {
          return {
            didResolveOperation(requestContext) {
              // Log operation for monitoring
              const context = requestContext.context as any;
              const operationName = requestContext.request.operationName;
              
              console.log('GraphQL Operation', {
                operationName,
                organizationId: context.organizationId,
                userId: context.userId,
                requestId: context.requestId,
              });
            },
            
            didEncounterErrors(requestContext) {
              // Log errors for monitoring
              const context = requestContext.context as any;
              
              requestContext.errors.forEach(error => {
                console.error('GraphQL Error in Request', {
                  error: error.message,
                  operationName: requestContext.request.operationName,
                  organizationId: context.organizationId,
                  userId: context.userId,
                  requestId: context.requestId,
                });
              });
            },
          };
        },
      },
    ],
  });
  
  return server;
};

// Start standalone threat intelligence service (for testing)
export const startThreatIntelligenceService = async (port: number = 4006) => {
  const server = await createThreatIntelligenceSubgraph();
  
  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }) => {
      // Context creation is handled in server creation
      return {};
    },
  });
  
  console.log(`🔍 Threat Intelligence GraphQL Service ready at ${url}`);
  console.log(`📊 Federation enabled with @apollo/subgraph`);
  
  return { server, url };
};

// Health check for the threat intelligence service
export const threatIntelligenceHealthCheck = async (): Promise<{
  service: 'healthy' | 'unhealthy';
  dataSources: Record<string, 'healthy' | 'unhealthy'>;
  cache: 'healthy' | 'unhealthy';
  subscriptions: 'healthy' | 'unhealthy';
}> => {
  const health = {
    service: 'healthy' as const,
    dataSources: {} as Record<string, 'healthy' | 'unhealthy'>,
    cache: 'healthy' as const,
    subscriptions: 'healthy' as const,
  };
  
  try {
    // Check data source connections
    const dataSources = new ThreatDataSources({});
    
    // Check database connectivity
    try {
      await dataSources.threatIntelligence.healthCheck();
      health.dataSources.database = 'healthy';
    } catch {
      health.dataSources.database = 'unhealthy';
      health.service = 'unhealthy';
    }
    
    // Check Redis connectivity
    try {
      await redis.ping();
      health.cache = 'healthy';
      health.subscriptions = 'healthy';
    } catch {
      health.cache = 'unhealthy';
      health.subscriptions = 'unhealthy';
      health.service = 'unhealthy';
    }
    
    // Check external enrichment services
    try {
      // This would ping external threat intelligence APIs
      health.dataSources.enrichment = 'healthy';
    } catch {
      health.dataSources.enrichment = 'unhealthy';
      // Don't mark entire service as unhealthy for external dependencies
    }
    
  } catch (error) {
    console.error('Health check failed:', error);
    health.service = 'unhealthy';
  }
  
  return health;
};

// Graceful shutdown
export const shutdownThreatIntelligenceService = async () => {
  console.log('Shutting down Threat Intelligence service...');
  
  try {
    await redis.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
  
  // Close other connections
  // await dataSources.close();
  
  console.log('Threat Intelligence service shutdown complete');
};

// Export configuration for gateway integration
export const threatIntelligenceSubgraphConfig = {
  name: 'threats',
  url: process.env.THREAT_SERVICE_URL || 'http://localhost:4006/graphql',
  sdl: loadSchema(),
};
