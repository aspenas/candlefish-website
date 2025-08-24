/**
 * Candlefish AI - GraphQL Security Hardening
 * Philosophy: Defense in depth with intelligent query analysis
 */

import {
  createComplexityLimitRule,
  fieldExtensionsEstimator,
  simpleEstimator,
  getComplexity,
} from 'graphql-query-complexity';
import { depthLimit } from 'graphql-depth-limit';
import { GraphQLError, ValidationRule, DocumentNode } from 'graphql';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

// Security configuration
interface SecurityConfig {
  maxQueryComplexity: number;
  maxQueryDepth: number;
  maxQueryNodes: number;
  introspectionEnabled: boolean;
  persistedQueriesEnabled: boolean;
  rateLimitEnabled: boolean;
  costAnalysisEnabled: boolean;
  queryTimeoutMs: number;
}

const PRODUCTION_CONFIG: SecurityConfig = {
  maxQueryComplexity: 1000,
  maxQueryDepth: 10,
  maxQueryNodes: 500,
  introspectionEnabled: false,
  persistedQueriesEnabled: true,
  rateLimitEnabled: true,
  costAnalysisEnabled: true,
  queryTimeoutMs: 30000, // 30 seconds
};

const DEVELOPMENT_CONFIG: SecurityConfig = {
  maxQueryComplexity: 2000,
  maxQueryDepth: 15,
  maxQueryNodes: 1000,
  introspectionEnabled: true,
  persistedQueriesEnabled: false,
  rateLimitEnabled: false,
  costAnalysisEnabled: true,
  queryTimeoutMs: 60000, // 60 seconds
};

const config = process.env.NODE_ENV === 'production' ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;

// Query complexity estimators with field-specific costs
const complexityEstimators = {
  // Simple fields have cost 1
  simple: simpleEstimator({ maximumCost: config.maxQueryComplexity }),

  // Field-based estimators for expensive operations
  field: fieldExtensionsEstimator(),

  // Custom estimator for specific field patterns
  custom: ({
    type,
    field,
    args,
    childComplexity,
  }: {
    type: any;
    field: any;
    args: any;
    childComplexity: number;
  }) => {
    // Connection fields with pagination are more expensive
    if (field.name.endsWith('Connection')) {
      const first = args.first || 20;
      return childComplexity * Math.min(first, 100); // Cap at 100 items
    }

    // Search operations are expensive
    if (field.name === 'search') {
      return 50 + childComplexity;
    }

    // Analytics and metrics operations
    if (field.name.includes('analytics') || field.name.includes('metrics')) {
      return 25 + childComplexity;
    }

    // Nested user relationships can be expensive
    if (type.name === 'User' && (field.name === 'createdDocuments' || field.name === 'partnerProfile')) {
      return 10 + childComplexity;
    }

    // Default cost
    return 1 + childComplexity;
  },
};

// Create complexity analysis rule
export const queryComplexityRule = createComplexityLimitRule(config.maxQueryComplexity, {
  estimators: [complexityEstimators.custom, complexityEstimators.field, complexityEstimators.simple],
  onComplete: (complexity: number, context: any) => {
    // Log high-complexity queries for monitoring
    if (complexity > config.maxQueryComplexity * 0.8) {
      console.warn(`High complexity query executed: ${complexity} (user: ${context.user?.id})`);
    }

    // Store complexity for rate limiting
    if (context.queryMetrics) {
      context.queryMetrics.complexity = complexity;
    }
  },
});

// Query depth limiting
export const queryDepthRule = depthLimit(config.maxQueryDepth, {
  ignore: [
    '__schema',
    '__type',
    // Allow deeper introspection in development
    ...(config.introspectionEnabled ? ['__field', '__inputValue', '__enumValue', '__directive'] : []),
  ],
});

// Query node count limiter
export const queryNodeLimitRule: ValidationRule = (context) => {
  let nodeCount = 0;

  return {
    enter() {
      nodeCount++;
      if (nodeCount > config.maxQueryNodes) {
        context.reportError(
          new GraphQLError(
            `Query exceeds maximum node limit of ${config.maxQueryNodes}`,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { code: 'QUERY_TOO_COMPLEX' }
          )
        );
      }
    },
  };
};

// Introspection disabling for production
export const disableIntrospectionRule: ValidationRule = (context) => {
  if (config.introspectionEnabled) {
    return {};
  }

  return {
    Field(node) {
      if (node.name.value === '__schema' || node.name.value === '__type') {
        context.reportError(
          new GraphQLError(
            'Introspection is disabled in production',
            [node],
            undefined,
            undefined,
            undefined,
            undefined,
            { code: 'INTROSPECTION_DISABLED' }
          )
        );
      }
    },
  };
};

// Rate limiting configuration
class GraphQLRateLimiter {
  private redis?: Redis;
  private globalLimiter: RateLimiterRedis | RateLimiterMemory;
  private complexityLimiter: RateLimiterRedis | RateLimiterMemory;
  private userLimiter: RateLimiterRedis | RateLimiterMemory;

  constructor() {
    if (config.rateLimitEnabled && process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);

      // Global rate limiter (requests per minute)
      this.globalLimiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: 'gql_global',
        points: 1000, // requests
        duration: 60, // per minute
        blockDuration: 60, // block for 1 minute
      });

      // Complexity-based limiter (complexity points per hour)
      this.complexityLimiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: 'gql_complexity',
        points: 50000, // complexity points
        duration: 3600, // per hour
        blockDuration: 300, // block for 5 minutes
      });

      // Per-user limiter (requests per user per minute)
      this.userLimiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: 'gql_user',
        points: 100, // requests
        duration: 60, // per minute
        blockDuration: 60, // block for 1 minute
      });
    } else {
      // Use in-memory rate limiters for development
      this.globalLimiter = new RateLimiterMemory({
        keyPrefix: 'gql_global',
        points: 1000,
        duration: 60,
        blockDuration: 60,
      });

      this.complexityLimiter = new RateLimiterMemory({
        keyPrefix: 'gql_complexity',
        points: 50000,
        duration: 3600,
        blockDuration: 300,
      });

      this.userLimiter = new RateLimiterMemory({
        keyPrefix: 'gql_user',
        points: 100,
        duration: 60,
        blockDuration: 60,
      });
    }
  }

  async checkRateLimit(request: {
    ip: string;
    userId?: string;
    complexity?: number;
    operationName?: string;
  }): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
    if (!config.rateLimitEnabled) {
      return { allowed: true };
    }

    const checks: Promise<any>[] = [];

    // Global rate limit check
    checks.push(
      this.globalLimiter.consume(request.ip).catch(res => ({ type: 'global', res }))
    );

    // User-specific rate limit check
    if (request.userId) {
      checks.push(
        this.userLimiter.consume(request.userId).catch(res => ({ type: 'user', res }))
      );
    }

    // Complexity-based rate limit check
    if (request.complexity) {
      const key = request.userId || request.ip;
      checks.push(
        this.complexityLimiter.consume(key, request.complexity).catch(res => ({ type: 'complexity', res }))
      );
    }

    try {
      const results = await Promise.allSettled(checks);

      // Check if any rate limit was exceeded
      for (const result of results) {
        if (result.status === 'rejected') {
          const rejection = result.reason;
          if (rejection.res) {
            const retryAfter = Math.round(rejection.res.msBeforeNext / 1000);
            return {
              allowed: false,
              error: `Rate limit exceeded (${rejection.type}). Try again in ${retryAfter} seconds.`,
              retryAfter,
            };
          }
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the request if rate limiting fails
      return { allowed: true };
    }
  }

  async getRateLimitStatus(request: { ip: string; userId?: string }) {
    const status: any = {
      global: null,
      user: null,
      complexity: null,
    };

    try {
      // Get global rate limit status
      const globalRes = await this.globalLimiter.get(request.ip);
      status.global = {
        limit: this.globalLimiter.points,
        remaining: globalRes ? globalRes.remainingHits : this.globalLimiter.points,
        resetTime: globalRes ? new Date(Date.now() + globalRes.msBeforeNext) : null,
      };

      // Get user rate limit status
      if (request.userId) {
        const userRes = await this.userLimiter.get(request.userId);
        status.user = {
          limit: this.userLimiter.points,
          remaining: userRes ? userRes.remainingHits : this.userLimiter.points,
          resetTime: userRes ? new Date(Date.now() + userRes.msBeforeNext) : null,
        };
      }

      // Get complexity rate limit status
      const complexityKey = request.userId || request.ip;
      const complexityRes = await this.complexityLimiter.get(complexityKey);
      status.complexity = {
        limit: this.complexityLimiter.points,
        remaining: complexityRes ? complexityRes.remainingHits : this.complexityLimiter.points,
        resetTime: complexityRes ? new Date(Date.now() + complexityRes.msBeforeNext) : null,
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
    }

    return status;
  }
}

export const rateLimiter = new GraphQLRateLimiter();

// Query timeout middleware
export function createQueryTimeoutRule(timeoutMs: number = config.queryTimeoutMs): ValidationRule {
  return (context) => {
    const startTime = performance.now();
    let timeoutId: NodeJS.Timeout;

    const checkTimeout = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed > timeoutMs) {
        context.reportError(
          new GraphQLError(
            `Query timeout: exceeded ${timeoutMs}ms limit`,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { code: 'QUERY_TIMEOUT' }
          )
        );
      }
    };

    // Set up timeout check
    timeoutId = setTimeout(checkTimeout, timeoutMs);

    return {
      Document: {
        leave() {
          clearTimeout(timeoutId);
        },
      },
    };
  };
}

// Persisted queries for enhanced security
class PersistedQueryStore {
  private redis?: Redis;
  private localCache = new Map<string, string>();

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  async getQuery(queryId: string): Promise<string | null> {
    // Try local cache first
    if (this.localCache.has(queryId)) {
      return this.localCache.get(queryId)!;
    }

    // Try Redis cache
    if (this.redis) {
      try {
        const query = await this.redis.get(`pq:${queryId}`);
        if (query) {
          // Cache locally for future requests
          this.localCache.set(queryId, query);
          return query;
        }
      } catch (error) {
        console.error('Failed to retrieve persisted query from Redis:', error);
      }
    }

    return null;
  }

  async storeQuery(query: string): Promise<string> {
    const queryId = this.generateQueryId(query);

    // Store locally
    this.localCache.set(queryId, query);

    // Store in Redis
    if (this.redis) {
      try {
        await this.redis.setex(`pq:${queryId}`, 86400, query); // 24 hours TTL
      } catch (error) {
        console.error('Failed to store persisted query in Redis:', error);
      }
    }

    return queryId;
  }

  private generateQueryId(query: string): string {
    return crypto.createHash('sha256').update(query).digest('hex');
  }
}

export const persistedQueryStore = new PersistedQueryStore();

// Security middleware factory
export function createSecurityValidationRules(): ValidationRule[] {
  const rules: ValidationRule[] = [];

  // Always include basic security rules
  rules.push(
    queryComplexityRule,
    queryDepthRule,
    queryNodeLimitRule
  );

  // Add production-specific rules
  if (config.introspectionEnabled === false) {
    rules.push(disableIntrospectionRule);
  }

  // Add query timeout rule
  rules.push(createQueryTimeoutRule());

  return rules;
}

// Query metrics collection
interface QueryMetrics {
  operationName?: string;
  complexity: number;
  depth: number;
  nodeCount: number;
  executionTime: number;
  cacheHit: boolean;
  userId?: string;
  ip: string;
  timestamp: Date;
}

export class QueryMetricsCollector {
  private metrics: QueryMetrics[] = [];
  private redis?: Redis;

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  recordQuery(metrics: QueryMetrics) {
    this.metrics.push(metrics);

    // Store in Redis for aggregation
    if (this.redis) {
      const key = `metrics:query:${new Date().toISOString().split('T')[0]}`;
      this.redis.lpush(key, JSON.stringify(metrics));
      this.redis.expire(key, 86400 * 7); // Keep for 7 days
    }

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getRecentMetrics(limit = 100): QueryMetrics[] {
    return this.metrics.slice(-limit);
  }

  getAggregatedMetrics() {
    if (this.metrics.length === 0) {
      return null;
    }

    const totalQueries = this.metrics.length;
    const avgComplexity = this.metrics.reduce((sum, m) => sum + m.complexity, 0) / totalQueries;
    const avgExecutionTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const cacheHitRate = this.metrics.filter(m => m.cacheHit).length / totalQueries;

    const complexityDistribution = {
      low: this.metrics.filter(m => m.complexity < 100).length,
      medium: this.metrics.filter(m => m.complexity >= 100 && m.complexity < 500).length,
      high: this.metrics.filter(m => m.complexity >= 500).length,
    };

    return {
      totalQueries,
      avgComplexity,
      avgExecutionTime,
      cacheHitRate,
      complexityDistribution,
      timeRange: {
        start: this.metrics[0]?.timestamp,
        end: this.metrics[this.metrics.length - 1]?.timestamp,
      },
    };
  }
}

export const metricsCollector = new QueryMetricsCollector();

// Security context factory
export function createSecurityContext(req: any) {
  return {
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    rateLimiter,
    persistedQueryStore,
    metricsCollector,
    queryMetrics: {} as Partial<QueryMetrics>,
  };
}

// Export all security rules and utilities
export default {
  config,
  validationRules: createSecurityValidationRules(),
  rateLimiter,
  persistedQueryStore,
  metricsCollector,
  createSecurityContext,
};
