// Security Hardening for GraphQL API
// Comprehensive security measures including rate limiting, query complexity analysis, and threat prevention

import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from 'apollo-server-plugin-base';
import { GraphQLError, GraphQLSchema, ValidationContext, DocumentNode } from 'graphql';
import { DepthLimitRule, createComplexityLimitRule } from 'graphql-depth-limit';
import { costAnalysis, CostAnalysisOptions, createRateLimiterDirective } from 'graphql-cost-analysis';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import pino from 'pino';
import LRU from 'lru-cache';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';

import { SecurityDashboardContext } from '../types';
import { AuditService } from '../services/audit-service';

const logger = pino({ name: 'graphql-security' });

// Security configuration for different environments
export const SECURITY_CONFIG = {
  development: {
    maxQueryDepth: 15,
    maxQueryComplexity: 2000,
    maxQueryNodes: 1000,
    introspectionEnabled: true,
    queryTimeoutMs: 60000,
    persistedQueriesEnabled: false,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 1000,
    slowDownThreshold: 500,
  },
  staging: {
    maxQueryDepth: 12,
    maxQueryComplexity: 1500,
    maxQueryNodes: 800,
    introspectionEnabled: true,
    queryTimeoutMs: 45000,
    persistedQueriesEnabled: true,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 500,
    slowDownThreshold: 200,
  },
  production: {
    maxQueryDepth: 10,
    maxQueryComplexity: 1000,
    maxQueryNodes: 500,
    introspectionEnabled: false,
    queryTimeoutMs: 30000,
    persistedQueriesEnabled: true,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
    slowDownThreshold: 50,
  },
} as const;

// Get configuration based on environment
const getSecurityConfig = () => {
  const env = process.env.NODE_ENV as keyof typeof SECURITY_CONFIG;
  return SECURITY_CONFIG[env] || SECURITY_CONFIG.production;
};

// Query complexity analysis with custom type costs
const complexityAnalysisOptions: CostAnalysisOptions = {
  createError: (max: number, actual: number) => {
    logger.warn({
      maxComplexity: max,
      actualComplexity: actual,
    }, 'Query complexity limit exceeded');

    return new GraphQLError(
      `Query complexity limit exceeded: ${actual} > ${max}. Please simplify your query.`,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { code: 'QUERY_COMPLEXITY_TOO_HIGH' }
    );
  },

  // Custom field cost calculation
  fieldExtensions: true,

  // Type-specific complexity costs
  typeComplexity: {
    // High-cost security operations
    SecurityEvent: 5,
    Vulnerability: 5,
    Alert: 3,
    Asset: 2,

    // Connection types are more expensive due to pagination
    SecurityEventConnection: 10,
    VulnerabilityConnection: 10,
    AlertConnection: 8,

    // Real-time subscriptions have higher costs
    Subscription: 20,

    // Kong monitoring operations
    KongService: 4,
    KongRoute: 3,
    KongAdminApiStatus: 10, // Critical security check

    // Compliance operations
    ComplianceStatus: 8,
    ComplianceAssessment: 5,
  },

  // Field-specific complexity costs
  fieldComplexity: {
    // Expensive aggregation operations
    'Query.securityOverview': 25,
    'Query.threatTrends': 30,
    'Query.securityMetrics': 20,

    // Real-time data operations
    'Subscription.liveMetrics': 50,
    'Subscription.kongAdminApiStatusChanged': 40,

    // Bulk operations
    'Mutation.createIncident': 15,
    'Mutation.updateMonitoringConfig': 20,

    // Search operations
    'Query.assets': 10,
    'Query.vulnerabilities': 15,
    'Query.securityEvents': 12,
  },
};

// Advanced rate limiting with multiple tiers
export class SecurityRateLimiter {
  private redis: Redis;
  private queryCache: LRU<string, number>;
  private userQueries: Map<string, Array<{ timestamp: number; complexity: number }>> = new Map();

  constructor(redis: Redis) {
    this.redis = redis;
    this.queryCache = new LRU({
      max: 10000,
      ttl: 1000 * 60 * 60, // 1 hour
    });

    // Clean up old query data every 5 minutes
    setInterval(() => {
      this.cleanupOldQueries();
    }, 5 * 60 * 1000);
  }

  async checkRateLimit(
    context: SecurityDashboardContext,
    queryComplexity: number,
    operationName?: string
  ): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    const config = getSecurityConfig();
    const userId = context.user?.id;
    const organizationId = context.organizationId;
    const clientIp = context.clientIp;

    if (!userId) {
      return { allowed: false, reason: 'Authentication required' };
    }

    // Check multiple rate limit tiers
    const checks = await Promise.all([
      this.checkUserRateLimit(userId, queryComplexity),
      this.checkOrganizationRateLimit(organizationId, queryComplexity),
      this.checkIPRateLimit(clientIp, queryComplexity),
      this.checkComplexityBudget(userId, queryComplexity),
      this.checkOperationRateLimit(userId, operationName),
    ]);

    const failed = checks.find(check => !check.allowed);
    if (failed) {
      // Log rate limit violation
      await this.logRateLimitViolation(userId, organizationId, clientIp, failed.reason, queryComplexity);
      return failed;
    }

    // Record successful request
    await this.recordSuccessfulRequest(userId, organizationId, clientIp, queryComplexity);

    return { allowed: true };
  }

  private async checkUserRateLimit(userId: string, complexity: number): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    const key = `rate_limit:user:${userId}`;
    const window = 60; // 1 minute window
    const limit = 100; // 100 requests per minute per user

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }

    if (current > limit) {
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl,
        reason: 'User rate limit exceeded'
      };
    }

    return { allowed: true };
  }

  private async checkOrganizationRateLimit(organizationId: string, complexity: number): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    const key = `rate_limit:org:${organizationId}`;
    const window = 60; // 1 minute window
    const limit = 1000; // 1000 requests per minute per organization

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }

    if (current > limit) {
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl,
        reason: 'Organization rate limit exceeded'
      };
    }

    return { allowed: true };
  }

  private async checkIPRateLimit(clientIp: string, complexity: number): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    const key = `rate_limit:ip:${clientIp}`;
    const window = 60; // 1 minute window
    const limit = 200; // 200 requests per minute per IP

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }

    if (current > limit) {
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl,
        reason: 'IP rate limit exceeded'
      };
    }

    return { allowed: true };
  }

  private async checkComplexityBudget(userId: string, complexity: number): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    const key = `complexity_budget:${userId}`;
    const window = 300; // 5 minute window
    const maxComplexityBudget = 50000; // Total complexity budget per 5 minutes

    const currentBudget = await this.redis.incr(key, complexity);
    if (currentBudget === complexity) {
      await this.redis.expire(key, window);
    }

    if (currentBudget > maxComplexityBudget) {
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl,
        reason: 'Query complexity budget exceeded'
      };
    }

    return { allowed: true };
  }

  private async checkOperationRateLimit(userId: string, operationName?: string): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
    if (!operationName) return { allowed: true };

    // Special limits for expensive operations
    const expensiveOperations = {
      'securityOverview': { limit: 10, window: 60 },
      'threatTrends': { limit: 5, window: 60 },
      'securityMetrics': { limit: 20, window: 60 },
      'kongAdminApiStatus': { limit: 30, window: 60 },
    };

    const operationLimits = expensiveOperations[operationName as keyof typeof expensiveOperations];
    if (!operationLimits) return { allowed: true };

    const key = `operation_limit:${userId}:${operationName}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, operationLimits.window);
    }

    if (current > operationLimits.limit) {
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl,
        reason: `Operation '${operationName}' rate limit exceeded`
      };
    }

    return { allowed: true };
  }

  private async logRateLimitViolation(
    userId: string,
    organizationId: string,
    clientIp: string,
    reason: string,
    complexity: number
  ): Promise<void> {
    const violation = {
      userId,
      organizationId,
      clientIp,
      reason,
      complexity,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.redis.lpush('security:rate_limit_violations', JSON.stringify(violation));
      await this.redis.expire('security:rate_limit_violations', 86400); // Keep for 24 hours

      logger.warn(violation, 'Rate limit violation detected');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to log rate limit violation');
    }
  }

  private async recordSuccessfulRequest(
    userId: string,
    organizationId: string,
    clientIp: string,
    complexity: number
  ): Promise<void> {
    // Record in local memory for quick access
    if (!this.userQueries.has(userId)) {
      this.userQueries.set(userId, []);
    }

    this.userQueries.get(userId)!.push({
      timestamp: Date.now(),
      complexity,
    });
  }

  private cleanupOldQueries(): void {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour ago

    this.userQueries.forEach((queries, userId) => {
      const filtered = queries.filter(query => query.timestamp > cutoff);
      if (filtered.length === 0) {
        this.userQueries.delete(userId);
      } else {
        this.userQueries.set(userId, filtered);
      }
    });
  }
}

// Persisted Queries for enhanced security and performance
export class PersistedQueryManager {
  private redis: Redis;
  private allowedQueries: Set<string> = new Set();
  private queryCache: LRU<string, DocumentNode>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.queryCache = new LRU({
      max: 5000,
      ttl: 1000 * 60 * 60, // 1 hour
    });
  }

  async initialize(): Promise<void> {
    // Load allowed query hashes from Redis
    const allowedHashes = await this.redis.smembers('security:allowed_queries');
    allowedHashes.forEach(hash => this.allowedQueries.add(hash));

    logger.info({
      allowedQueryCount: this.allowedQueries.size,
    }, 'Persisted queries initialized');
  }

  async addAllowedQuery(query: string): Promise<string> {
    const hash = this.createQueryHash(query);

    await this.redis.sadd('security:allowed_queries', hash);
    await this.redis.hset('security:query_documents', hash, query);

    this.allowedQueries.add(hash);

    logger.info({
      queryHash: hash,
      queryLength: query.length,
    }, 'Query added to allowed list');

    return hash;
  }

  async isQueryAllowed(query: string): Promise<boolean> {
    const hash = this.createQueryHash(query);
    return this.allowedQueries.has(hash);
  }

  async getQueryByHash(hash: string): Promise<string | null> {
    // Check local cache first
    const cached = this.queryCache.get(hash);
    if (cached) {
      return cached.toString();
    }

    // Get from Redis
    const query = await this.redis.hget('security:query_documents', hash);
    return query;
  }

  private createQueryHash(query: string): string {
    return createHash('sha256').update(query.trim()).digest('hex');
  }
}

// Query timeout middleware
export class QueryTimeoutManager {
  private activeQueries: Map<string, NodeJS.Timeout> = new Map();

  createTimeoutForQuery(queryId: string, timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        this.activeQueries.delete(queryId);
        reject(new GraphQLError(
          `Query timeout: Query exceeded ${timeoutMs}ms limit`,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { code: 'QUERY_TIMEOUT' }
        ));
      }, timeoutMs);

      this.activeQueries.set(queryId, timeout);
    });
  }

  clearQueryTimeout(queryId: string): void {
    const timeout = this.activeQueries.get(queryId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeQueries.delete(queryId);
    }
  }
}

// Main security plugin
export function createSecurityHardeningPlugin(
  redis: Redis,
  auditService: AuditService
): ApolloServerPlugin<SecurityDashboardContext> {
  const config = getSecurityConfig();
  const rateLimiter = new SecurityRateLimiter(redis);
  const persistedQueries = new PersistedQueryManager(redis);
  const timeoutManager = new QueryTimeoutManager();

  // Initialize persisted queries
  persistedQueries.initialize();

  return {
    requestDidStart(): GraphQLRequestListener<SecurityDashboardContext> {
      return {
        didResolveSource: async (requestContext) => {
          const queryId = `query_${Date.now()}_${Math.random()}`;
          (requestContext as any).queryId = queryId;
        },

        didResolveOperation: async (requestContext) => {
          const { request, document, operationName } = requestContext;
          const query = request.query;
          const config = getSecurityConfig();

          // Check for introspection queries in production
          if (!config.introspectionEnabled && query?.includes('__schema')) {
            throw new GraphQLError(
              'Schema introspection is disabled',
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              { code: 'INTROSPECTION_DISABLED' }
            );
          }

          // Validate persisted queries in production
          if (config.persistedQueriesEnabled) {
            const isAllowed = await persistedQueries.isQueryAllowed(query || '');
            if (!isAllowed) {
              await auditService.logSecurityViolation(
                requestContext.context.user?.id,
                'UNAUTHORIZED_QUERY',
                {
                  query: query?.substring(0, 200) + '...',
                  operationName,
                  clientIp: requestContext.context.clientIp,
                }
              );

              throw new GraphQLError(
                'Query not in allowed list. Please use pre-approved queries only.',
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                { code: 'QUERY_NOT_PERSISTED' }
              );
            }
          }

          // Calculate query complexity
          const complexity = costAnalysis(document, requestContext.schema, {
            maximumCost: config.maxQueryComplexity,
            ...complexityAnalysisOptions,
          });

          // Check rate limits
          const rateLimitResult = await rateLimiter.checkRateLimit(
            requestContext.context,
            complexity,
            operationName || undefined
          );

          if (!rateLimitResult.allowed) {
            const error = new GraphQLError(
              rateLimitResult.reason || 'Rate limit exceeded',
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              {
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: rateLimitResult.retryAfter,
              }
            );

            // Log security incident
            await auditService.logSecurityViolation(
              requestContext.context.user?.id,
              'RATE_LIMIT_VIOLATION',
              {
                reason: rateLimitResult.reason,
                complexity,
                retryAfter: rateLimitResult.retryAfter,
                operationName,
              }
            );

            throw error;
          }

          // Set up query timeout
          const queryId = (requestContext as any).queryId;
          const timeoutPromise = timeoutManager.createTimeoutForQuery(queryId, config.queryTimeoutMs);

          // Race the query execution against the timeout
          requestContext.context.queryTimeout = timeoutPromise;

          logger.debug({
            operationName,
            complexity,
            userId: requestContext.context.user?.id,
            organizationId: requestContext.context.organizationId,
          }, 'Query security validation passed');
        },

        willSendResponse: async (requestContext) => {
          const queryId = (requestContext as any).queryId;
          if (queryId) {
            timeoutManager.clearQueryTimeout(queryId);
          }

          // Add security headers
          const response = requestContext.response;
          if (response.http) {
            response.http.headers.set('X-Content-Type-Options', 'nosniff');
            response.http.headers.set('X-Frame-Options', 'DENY');
            response.http.headers.set('X-XSS-Protection', '1; mode=block');
            response.http.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
            response.http.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
          }
        },

        didEncounterErrors: async (requestContext) => {
          const errors = requestContext.errors;
          const isProduction = process.env.NODE_ENV === 'production';

          // Log security-related errors
          errors?.forEach(async (error) => {
            if (error.extensions?.code === 'RATE_LIMIT_EXCEEDED' ||
                error.extensions?.code === 'QUERY_COMPLEXITY_TOO_HIGH' ||
                error.extensions?.code === 'QUERY_TIMEOUT' ||
                error.extensions?.code === 'QUERY_NOT_PERSISTED') {

              await auditService.logSecurityEvent(
                requestContext.context.user?.id,
                error.extensions.code,
                {
                  error: error.message,
                  operationName: requestContext.operationName,
                  variables: requestContext.request.variables,
                  clientIp: requestContext.context.clientIp,
                }
              );
            }
          });

          // Sanitize error messages in production
          if (isProduction) {
            requestContext.errors = errors?.map(error => {
              // Only allow specific safe error codes in production
              const safeCodes = [
                'RATE_LIMIT_EXCEEDED',
                'QUERY_COMPLEXITY_TOO_HIGH',
                'QUERY_TIMEOUT',
                'AUTHENTICATION_ERROR',
                'AUTHORIZATION_ERROR',
                'VALIDATION_ERROR',
              ];

              if (safeCodes.includes(error.extensions?.code)) {
                return error;
              }

              // Return generic error for everything else
              return new GraphQLError(
                'An error occurred while processing your request',
                error.nodes,
                error.source,
                error.positions,
                error.path,
                undefined,
                { code: 'INTERNAL_ERROR' }
              );
            });
          }
        },
      };
    },
  };
}

// Express middleware for additional HTTP-level security
export function createSecurityMiddleware(redis: Redis) {
  const limiter = rateLimit({
    store: new (require('rate-limit-redis'))({
      client: redis,
      prefix: 'http_rate_limit:',
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const speedLimiter = slowDown({
    store: new (require('rate-limit-redis'))({
      client: redis,
      prefix: 'http_slow_down:',
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 10000, // Maximum delay of 10 seconds
  });

  const helmetConfig = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  return [helmetConfig, limiter, speedLimiter];
}

export {
  SecurityRateLimiter,
  PersistedQueryManager,
  QueryTimeoutManager,
};
