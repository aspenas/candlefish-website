/**
 * Candlefish AI - Federated GraphQL Gateway
 * Philosophy: Unified API with intelligent routing and security
 */

import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';

// Import our security and caching modules
import { rateLimiter, createSecurityValidationRules } from '../security/query-security';
import { cacheManager } from '../caching/resolver-caching';
import { createWebSocketServer, EventPublisher } from '../subscriptions/realtime-subscriptions';
import { createDataLoadersContext } from '../dataloaders/federated-dataloaders';

// Subgraph service definitions
interface SubgraphConfig {
  name: string;
  url: string;
  healthCheckUrl?: string;
  auth?: {
    required: boolean;
    headers?: Record<string, string>;
  };
  timeout?: number;
  retries?: number;
}

const SUBGRAPH_CONFIGS: SubgraphConfig[] = [
  {
    name: 'auth',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql',
    healthCheckUrl: process.env.AUTH_SERVICE_URL ? `${process.env.AUTH_SERVICE_URL}/health` : 'http://localhost:4001/health',
    auth: { required: true },
    timeout: 10000,
    retries: 3,
  },
  {
    name: 'workshop',
    url: process.env.WORKSHOP_SERVICE_URL || 'http://localhost:4002/graphql',
    healthCheckUrl: process.env.WORKSHOP_SERVICE_URL ? `${process.env.WORKSHOP_SERVICE_URL}/health` : 'http://localhost:4002/health',
    auth: { required: true },
    timeout: 15000,
    retries: 2,
  },
  {
    name: 'partner',
    url: process.env.PARTNER_SERVICE_URL || 'http://localhost:4003/graphql',
    healthCheckUrl: process.env.PARTNER_SERVICE_URL ? `${process.env.PARTNER_SERVICE_URL}/health` : 'http://localhost:4003/health',
    auth: { required: false }, // Some partner data is public
    timeout: 10000,
    retries: 2,
  },
  {
    name: 'documentation',
    url: process.env.DOCS_SERVICE_URL || 'http://localhost:4004/graphql',
    healthCheckUrl: process.env.DOCS_SERVICE_URL ? `${process.env.DOCS_SERVICE_URL}/health` : 'http://localhost:4004/health',
    auth: { required: false }, // Documentation is mostly public
    timeout: 8000,
    retries: 2,
  },
  {
    name: 'monitoring',
    url: process.env.MONITORING_SERVICE_URL || 'http://localhost:4005/graphql',
    healthCheckUrl: process.env.MONITORING_SERVICE_URL ? `${process.env.MONITORING_SERVICE_URL}/health` : 'http://localhost:4005/health',
    auth: { required: true },
    timeout: 12000,
    retries: 1,
  },
];

// Enhanced data source for subgraph communication
class EnhancedRemoteGraphQLDataSource extends RemoteGraphQLDataSource {
  private config: SubgraphConfig;
  private redis: Redis;

  constructor(config: SubgraphConfig) {
    super({
      url: config.url,
      requestTimeout: config.timeout,
    });

    this.config = config;
    this.redis = new Redis(process.env.REDIS_URL);
  }

  willSendRequest({ request, context }: any) {
    // Add authentication headers
    if (context.user && context.token) {
      request.http.headers.set('authorization', `Bearer ${context.token}`);
    }

    // Add request ID for tracing
    if (context.requestId) {
      request.http.headers.set('x-request-id', context.requestId);
    }

    // Add user context for downstream services
    if (context.user) {
      request.http.headers.set('x-user-id', context.user.id);
      request.http.headers.set('x-user-role', context.user.role);
    }

    // Add service-specific headers
    if (this.config.auth?.headers) {
      Object.entries(this.config.auth.headers).forEach(([key, value]) => {
        request.http.headers.set(key, value);
      });
    }
  }

  async didReceiveResponse({ response, request, context }: any) {
    // Log response metrics
    const responseTime = performance.now() - (context.startTime || 0);

    // Cache successful responses if cacheable
    if (response.http.status === 200 && this.isCacheable(request)) {
      const cacheKey = this.generateCacheKey(request);
      try {
        await this.redis.setex(
          `subgraph:${this.config.name}:${cacheKey}`,
          300, // 5 minutes
          JSON.stringify(response.data)
        );
      } catch (error) {
        console.warn(`Failed to cache subgraph response: ${error.message}`);
      }
    }

    // Log performance metrics
    if (responseTime > 1000) {
      console.warn(`Slow subgraph response from ${this.config.name}: ${responseTime}ms`);
    }

    return response;
  }

  async didEncounterError(error: any, request: any) {
    console.error(`Subgraph error from ${this.config.name}:`, {
      error: error.message,
      operation: request.query,
      variables: request.variables,
    });

    // Implement circuit breaker logic here
    // For now, just log the error

    return error;
  }

  private isCacheable(request: any): boolean {
    // Only cache queries, not mutations or subscriptions
    return request.query?.includes('query ') &&
           !request.query?.includes('mutation ') &&
           !request.query?.includes('subscription ');
  }

  private generateCacheKey(request: any): string {
    const key = `${request.query}:${JSON.stringify(request.variables || {})}`;
    return require('crypto').createHash('md5').update(key).digest('hex');
  }
}

// Health check utilities
class SubgraphHealthChecker {
  private redis: Redis;
  private healthStatus: Map<string, { healthy: boolean; lastCheck: Date; error?: string }> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.startHealthChecks();
  }

  private startHealthChecks() {
    // Check health every 30 seconds
    setInterval(async () => {
      await this.checkAllSubgraphs();
    }, 30000);

    // Initial health check
    this.checkAllSubgraphs();
  }

  private async checkAllSubgraphs() {
    const checks = SUBGRAPH_CONFIGS.map(config => this.checkSubgraph(config));
    await Promise.allSettled(checks);
  }

  private async checkSubgraph(config: SubgraphConfig) {
    try {
      const healthUrl = config.healthCheckUrl || config.url.replace('/graphql', '/health');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const healthy = response.ok;
      this.healthStatus.set(config.name, {
        healthy,
        lastCheck: new Date(),
        error: healthy ? undefined : `HTTP ${response.status}`,
      });

      // Store in Redis for cross-instance visibility
      await this.redis.setex(
        `health:subgraph:${config.name}`,
        120, // 2 minutes TTL
        JSON.stringify({ healthy, lastCheck: new Date(), serviceName: config.name })
      );

    } catch (error) {
      this.healthStatus.set(config.name, {
        healthy: false,
        lastCheck: new Date(),
        error: error.message,
      });

      console.error(`Health check failed for ${config.name}:`, error.message);
    }
  }

  getHealthStatus() {
    const status = Array.from(this.healthStatus.entries()).reduce((acc, [name, health]) => {
      acc[name] = health;
      return acc;
    }, {} as Record<string, any>);

    return {
      overall: Object.values(status).every(s => s.healthy),
      services: status,
      timestamp: new Date(),
    };
  }

  isServiceHealthy(serviceName: string): boolean {
    return this.healthStatus.get(serviceName)?.healthy ?? false;
  }
}

// Gateway error handling
class GatewayErrorHandler {
  static formatError(error: GraphQLError) {
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      // Log full error for debugging
      console.error('Gateway error:', {
        message: error.message,
        path: error.path,
        source: error.source,
        positions: error.positions,
        extensions: error.extensions,
      });

      // Return sanitized error to client
      if (error.extensions?.code === 'INTERNAL_ERROR') {
        return new GraphQLError(
          'Internal server error',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { code: 'INTERNAL_ERROR' }
        );
      }
    }

    return error;
  }

  static async handleSubgraphError(error: any, serviceName: string) {
    // Implement fallback strategies here
    console.error(`Subgraph ${serviceName} error:`, error);

    // Could implement:
    // - Circuit breaker
    // - Fallback to cached data
    // - Partial response with warnings

    throw error;
  }
}

// Gateway metrics collection
class GatewayMetrics {
  private redis: Redis;
  private metrics = {
    requests: 0,
    errors: 0,
    responseTime: [] as number[],
    subgraphCalls: new Map<string, number>(),
  };

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    // Flush metrics to Redis every minute
    setInterval(() => this.flushMetrics(), 60000);
  }

  recordRequest(responseTime: number, subgraphs: string[], hadError: boolean) {
    this.metrics.requests++;
    if (hadError) this.metrics.errors++;

    this.metrics.responseTime.push(responseTime);

    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }

    subgraphs.forEach(subgraph => {
      const current = this.metrics.subgraphCalls.get(subgraph) || 0;
      this.metrics.subgraphCalls.set(subgraph, current + 1);
    });
  }

  private async flushMetrics() {
    try {
      const avgResponseTime = this.metrics.responseTime.length > 0
        ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
        : 0;

      const metricsData = {
        timestamp: new Date(),
        requests: this.metrics.requests,
        errors: this.metrics.errors,
        errorRate: this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0,
        avgResponseTime,
        subgraphCalls: Object.fromEntries(this.metrics.subgraphCalls),
      };

      await this.redis.lpush('gateway:metrics', JSON.stringify(metricsData));
      await this.redis.ltrim('gateway:metrics', 0, 1440); // Keep 24 hours (1 minute intervals)

      // Reset counters
      this.metrics.requests = 0;
      this.metrics.errors = 0;
      this.metrics.subgraphCalls.clear();
    } catch (error) {
      console.error('Failed to flush gateway metrics:', error);
    }
  }

  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0,
      avgResponseTime,
      subgraphCalls: Object.fromEntries(this.metrics.subgraphCalls),
    };
  }
}

// Create the federated gateway
export async function createFederatedGateway() {
  const healthChecker = new SubgraphHealthChecker();
  const metrics = new GatewayMetrics();

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: SUBGRAPH_CONFIGS.map(config => ({
        name: config.name,
        url: config.url,
      })),
      pollIntervalInMs: 30000, // Poll for schema changes every 30 seconds
    }),

    buildService: ({ name, url }) => {
      const config = SUBGRAPH_CONFIGS.find(c => c.name === name);
      return new EnhancedRemoteGraphQLDataSource(config!);
    },

    // Error handling
    serviceHealthCheck: true,

    // Custom error handling
    __exposeQueryPlanExperimental: process.env.NODE_ENV !== 'production',
  });

  return { gateway, healthChecker, metrics };
}

// Authentication middleware
export function createAuthMiddleware() {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        req.user = decoded;
        req.token = token;
      } catch (error) {
        console.warn('Invalid JWT token:', error.message);
        // Don't block request - some queries might be public
      }
    }

    // Generate request ID for tracing
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    next();
  };
}

// Context function for Apollo Server
export function createGraphQLContext({ req }: { req: any }) {
  return {
    user: req.user,
    token: req.token,
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    startTime: performance.now(),

    // Add data loaders
    ...createDataLoadersContext(),

    // Add cache manager
    cache: cacheManager,

    // Add rate limiter
    rateLimiter,

    // Add event publisher for real-time features
    eventPublisher: EventPublisher,
  };
}

// Apollo Server plugins
const gatewayPlugins = [
  // Request metrics plugin
  {
    requestDidStart() {
      return {
        willSendResponse(requestContext: any) {
          const { request, response, context } = requestContext;
          const responseTime = performance.now() - context.startTime;

          // Record metrics
          // This would need access to the metrics instance

          // Log slow queries
          if (responseTime > 5000) {
            console.warn('Slow GraphQL query:', {
              operationName: request.operationName,
              responseTime,
              userId: context.user?.id,
            });
          }
        },

        didEncounterErrors(requestContext: any) {
          const { errors, request, context } = requestContext;

          console.error('GraphQL errors:', {
            errors: errors.map((e: any) => ({
              message: e.message,
              path: e.path,
              extensions: e.extensions,
            })),
            operationName: request.operationName,
            userId: context.user?.id,
          });
        },
      };
    },
  },

  // Rate limiting plugin
  {
    requestDidStart() {
      return {
        async didResolveOperation(requestContext: any) {
          const { request, context } = requestContext;

          // Apply rate limiting
          const rateLimitResult = await rateLimiter.checkRateLimit({
            ip: context.ip,
            userId: context.user?.id,
            operationName: request.operationName,
          });

          if (!rateLimitResult.allowed) {
            throw new GraphQLError(
              rateLimitResult.error!,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              {
                code: 'RATE_LIMITED',
                retryAfter: rateLimitResult.retryAfter,
              }
            );
          }
        },
      };
    },
  },
];

// Main server creation function
export async function createServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Create federated gateway
  const { gateway, healthChecker, metrics } = await createFederatedGateway();

  // Create Apollo Server
  const server = new ApolloServer({
    gateway,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ...(process.env.NODE_ENV !== 'production' ? [
        ApolloServerPluginLandingPageLocalDefault({ embed: true })
      ] : []),
      ...gatewayPlugins,
    ],

    // Validation rules for security
    validationRules: createSecurityValidationRules(),

    // Error formatting
    formatError: GatewayErrorHandler.formatError,

    // Disable introspection in production
    introspection: process.env.NODE_ENV !== 'production',

    // Include stack trace in errors only in development
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  });

  await server.start();

  // Middleware setup
  app.use(
    '/graphql',
    cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }),
    json({ limit: '10mb' }),
    createAuthMiddleware(),
    expressMiddleware(server, {
      context: createGraphQLContext,
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    const health = healthChecker.getHealthStatus();
    const gatewayMetrics = metrics.getMetrics();

    res.json({
      status: health.overall ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      services: health.services,
      metrics: gatewayMetrics,
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // Metrics endpoint (protected)
  app.get('/metrics', (req, res) => {
    // In production, you'd want to protect this endpoint
    res.json({
      gateway: metrics.getMetrics(),
      cache: cacheManager.getStats(),
      timestamp: new Date(),
    });
  });

  // WebSocket server for subscriptions
  const wsCleanup = createWebSocketServer(httpServer, gateway.schema);

  return {
    app,
    httpServer,
    server,
    gateway,
    healthChecker,
    metrics,
    cleanup: () => {
      wsCleanup();
    },
  };
}

// Start the server
export async function startServer() {
  const { httpServer, healthChecker, metrics, cleanup } = await createServer();

  const port = parseInt(process.env.PORT || '4000');
  const host = process.env.HOST || 'localhost';

  await new Promise<void>((resolve) => {
    httpServer.listen({ port, host }, resolve);
  });

  console.log(`🚀 Federated GraphQL Gateway ready at http://${host}:${port}/graphql`);
  console.log(`📊 Health check available at http://${host}:${port}/health`);
  console.log(`📈 Metrics available at http://${host}:${port}/metrics`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    cleanup();
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  return {
    url: `http://${host}:${port}/graphql`,
    healthChecker,
    metrics,
  };
}

export default {
  createFederatedGateway,
  createServer,
  startServer,
  SUBGRAPH_CONFIGS,
};
