// GraphQL Resolver Architecture for Tyler Setup Platform
// Main resolver index with federation support and DataLoader patterns

import { createDataLoaderContext } from './dataloaders/index.js';
import { createAuthDirective, createRateLimitDirective, createCacheDirective } from './directives/index.js';
import { userResolvers } from './user-resolvers.js';
import { contractorResolvers } from './contractor-resolvers.js';
import { secretResolvers } from './secret-resolvers.js';
import { auditResolvers } from './audit-resolvers.js';
import { configResolvers } from './config-resolvers.js';
import { webSocketResolvers } from './websocket-resolvers.js';
import { authResolvers } from './auth-resolvers.js';
import { healthResolvers } from './health-resolvers.js';
import { analyticsResolvers } from './analytics-resolvers.js';
import { DateResolver, JSONResolver, UploadResolver } from './scalar-resolvers.js';
import { federationResolvers } from './federation-resolvers.js';
import { subscriptionResolvers } from './subscription-resolvers.js';

/**
 * Main resolver composition with federation support
 * Combines all service resolvers with shared utilities
 */
export const resolvers = {
  // Scalar type resolvers
  Date: DateResolver,
  JSON: JSONResolver,
  Upload: UploadResolver,

  // Query resolvers - composed from all services
  Query: {
    // Health and system
    ...healthResolvers.Query,

    // Authentication
    ...authResolvers.Query,

    // User management
    ...userResolvers.Query,

    // Contractor management
    ...contractorResolvers.Query,

    // Secret management
    ...secretResolvers.Query,

    // Audit logging
    ...auditResolvers.Query,

    // Configuration
    ...configResolvers.Query,

    // WebSocket management
    ...webSocketResolvers.Query,

    // Analytics and reporting
    ...analyticsResolvers.Query,
  },

  // Mutation resolvers - composed from all services
  Mutation: {
    // Authentication
    ...authResolvers.Mutation,

    // User management
    ...userResolvers.Mutation,

    // Contractor management
    ...contractorResolvers.Mutation,

    // Secret management
    ...secretResolvers.Mutation,

    // Configuration
    ...configResolvers.Mutation,

    // WebSocket management
    ...webSocketResolvers.Mutation,
  },

  // Subscription resolvers - real-time events
  Subscription: {
    ...subscriptionResolvers,
  },

  // Type resolvers with federation keys
  User: {
    ...userResolvers.User,
    ...federationResolvers.User,
  },

  Contractor: {
    ...contractorResolvers.Contractor,
    ...federationResolvers.Contractor,
  },

  Secret: {
    ...secretResolvers.Secret,
    ...federationResolvers.Secret,
  },

  AuditLog: {
    ...auditResolvers.AuditLog,
    ...federationResolvers.AuditLog,
  },

  Config: {
    ...configResolvers.Config,
    ...federationResolvers.Config,
  },

  WebSocketConnection: {
    ...webSocketResolvers.WebSocketConnection,
    ...federationResolvers.WebSocketConnection,
  },

  WebSocketEvent: {
    ...webSocketResolvers.WebSocketEvent,
    ...federationResolvers.WebSocketEvent,
  },

  RefreshToken: {
    ...authResolvers.RefreshToken,
    ...federationResolvers.RefreshToken,
  },

  SecretRotation: {
    ...secretResolvers.SecretRotation,
    ...federationResolvers.SecretRotation,
  },

  // Analytics type resolvers
  DashboardAnalytics: analyticsResolvers.DashboardAnalytics,
  UserStats: analyticsResolvers.UserStats,
  ContractorStats: analyticsResolvers.ContractorStats,
  SecretStats: analyticsResolvers.SecretStats,
};

/**
 * Create GraphQL context with DataLoader, auth, and utilities
 */
export const createGraphQLContext = async ({ req, connectionParams, connection }) => {
  // WebSocket subscription context
  if (connection) {
    return {
      ...connectionParams,
      isWebSocket: true,
      connectionId: connection.id,
    };
  }

  // HTTP request context
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  const user = authToken ? await verifyAuthToken(authToken) : null;

  // Create DataLoader context for efficient data fetching
  const dataloaders = createDataLoaderContext();

  // Create service clients
  const services = await createServiceClients();

  return {
    // Authentication context
    user,
    authToken,
    isAuthenticated: !!user,

    // DataLoaders for N+1 query prevention
    dataloaders,

    // Service clients
    services,

    // Request context
    req,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'],

    // Utilities
    logger: createContextLogger(user?.id),
    metrics: createMetricsCollector(),

    // Rate limiting
    rateLimiter: createRateLimiter(),

    // Caching
    cache: createCacheManager(),

    // Audit logging
    audit: createAuditLogger(user?.id),
  };
};

/**
 * Authentication token verification
 */
async function verifyAuthToken(token) {
  try {
    const { verifyJwtToken } = await import('../services/auth-service/security.js');
    return await verifyJwtToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Create service clients for microservices communication
 */
async function createServiceClients() {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
  const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');

  const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(dynamoClient);
  const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

  return {
    dynamodb: docClient,
    secretsManager: secretsClient,
    // Add other service clients as needed
  };
}

/**
 * Extract client IP from request
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Create context-aware logger
 */
function createContextLogger(userId) {
  return {
    info: (message, meta = {}) => console.log({ level: 'info', message, userId, ...meta }),
    warn: (message, meta = {}) => console.warn({ level: 'warn', message, userId, ...meta }),
    error: (message, meta = {}) => console.error({ level: 'error', message, userId, ...meta }),
    debug: (message, meta = {}) => console.debug({ level: 'debug', message, userId, ...meta }),
  };
}

/**
 * Create metrics collector for performance monitoring
 */
function createMetricsCollector() {
  return {
    increment: (metric, tags = {}) => {
      // Implement your metrics collection here (e.g., StatsD, CloudWatch)
      console.debug(`METRIC: ${metric}`, tags);
    },
    timing: (metric, duration, tags = {}) => {
      console.debug(`TIMING: ${metric} ${duration}ms`, tags);
    },
    gauge: (metric, value, tags = {}) => {
      console.debug(`GAUGE: ${metric} ${value}`, tags);
    },
  };
}

/**
 * Create rate limiter for API protection
 */
function createRateLimiter() {
  const limitStore = new Map();

  return {
    checkLimit: (key, limit, windowMs) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!limitStore.has(key)) {
        limitStore.set(key, []);
      }

      const requests = limitStore.get(key);
      const validRequests = requests.filter(time => time > windowStart);

      if (validRequests.length >= limit) {
        return false;
      }

      validRequests.push(now);
      limitStore.set(key, validRequests);
      return true;
    },

    resetLimit: (key) => {
      limitStore.delete(key);
    },

    getRemainingLimit: (key, limit, windowMs) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      const requests = limitStore.get(key) || [];
      const validRequests = requests.filter(time => time > windowStart);
      return Math.max(0, limit - validRequests.length);
    }
  };
}

/**
 * Create cache manager for performance optimization
 */
function createCacheManager() {
  const cache = new Map();

  return {
    get: async (key) => {
      const item = cache.get(key);
      if (!item) return null;

      if (item.expiresAt && Date.now() > item.expiresAt) {
        cache.delete(key);
        return null;
      }

      return item.value;
    },

    set: async (key, value, ttlSeconds = 300) => {
      const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
      cache.set(key, { value, expiresAt });
    },

    delete: async (key) => {
      cache.delete(key);
    },

    clear: async () => {
      cache.clear();
    }
  };
}

/**
 * Create audit logger for compliance tracking
 */
function createAuditLogger(userId) {
  return {
    log: async (action, resource, details = {}) => {
      const auditEntry = {
        action,
        userId,
        resource,
        details,
        timestamp: new Date().toISOString(),
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown',
      };

      // Log to console for now - implement proper audit storage
      console.log('AUDIT:', auditEntry);

      // In production, save to audit table
      // await saveAuditLog(auditEntry);
    }
  };
}

/**
 * GraphQL schema directives
 */
export const schemaDirectives = {
  auth: createAuthDirective,
  rateLimit: createRateLimitDirective,
  cache: createCacheDirective,
};

/**
 * Error handling for GraphQL resolvers
 */
export class GraphQLError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, extensions = {}) {
    super(message);
    this.extensions = {
      code,
      statusCode,
      ...extensions,
    };
  }
}

/**
 * Wrap resolver with error handling and logging
 */
export function withErrorHandling(resolver) {
  return async (parent, args, context, info) => {
    try {
      const startTime = Date.now();
      const result = await resolver(parent, args, context, info);
      const duration = Date.now() - startTime;

      context.metrics?.timing('resolver.duration', duration, {
        resolver: info.fieldName,
        parentType: info.parentType.name,
      });

      return result;
    } catch (error) {
      context.logger?.error('Resolver error', {
        resolver: info.fieldName,
        parentType: info.parentType.name,
        error: error.message,
        stack: error.stack,
      });

      context.metrics?.increment('resolver.error', {
        resolver: info.fieldName,
        parentType: info.parentType.name,
        errorType: error.constructor.name,
      });

      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError(
        'Internal server error',
        'INTERNAL_ERROR',
        500,
        { originalError: error.message }
      );
    }
  };
}

/**
 * Wrap resolver with authentication check
 */
export function requireAuth(resolver, requiredRole = 'USER') {
  return withErrorHandling(async (parent, args, context, info) => {
    if (!context.isAuthenticated) {
      throw new GraphQLError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    if (requiredRole === 'ADMIN' && context.user.role !== 'admin') {
      throw new GraphQLError('Admin access required', 'FORBIDDEN', 403);
    }

    return resolver(parent, args, context, info);
  });
}

/**
 * Wrap resolver with rate limiting
 */
export function withRateLimit(resolver, maxRequests = 100, windowMs = 60000) {
  return withErrorHandling(async (parent, args, context, info) => {
    const key = `rateLimit:${context.user?.id || context.ip}:${info.fieldName}`;

    if (!context.rateLimiter.checkLimit(key, maxRequests, windowMs)) {
      throw new GraphQLError(
        'Rate limit exceeded',
        'RATE_LIMITED',
        429,
        {
          maxRequests,
          windowMs,
          retryAfter: Math.ceil(windowMs / 1000),
        }
      );
    }

    return resolver(parent, args, context, info);
  });
}

/**
 * Wrap resolver with caching
 */
export function withCache(resolver, ttlSeconds = 300, keyGenerator = null) {
  return withErrorHandling(async (parent, args, context, info) => {
    const cacheKey = keyGenerator
      ? keyGenerator(parent, args, context, info)
      : `cache:${info.parentType.name}:${info.fieldName}:${JSON.stringify(args)}`;

    // Try to get from cache first
    const cachedResult = await context.cache.get(cacheKey);
    if (cachedResult !== null) {
      context.metrics?.increment('resolver.cache.hit', {
        resolver: info.fieldName,
      });
      return cachedResult;
    }

    // Execute resolver and cache result
    const result = await resolver(parent, args, context, info);
    await context.cache.set(cacheKey, result, ttlSeconds);

    context.metrics?.increment('resolver.cache.miss', {
      resolver: info.fieldName,
    });

    return result;
  });
}
