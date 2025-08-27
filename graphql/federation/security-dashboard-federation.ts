// Security Dashboard Federation Strategy
// Apollo Federation v2 implementation for microservices integration

import {
  ApolloGateway,
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
  GatewayConfig,
} from '@apollo/gateway';
import { ApolloServer } from 'apollo-server-express';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLResolverMap } from 'apollo-graphql';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';
import axios from 'axios';
import CircuitBreaker from 'opossum';
import pino from 'pino';

import { securityDashboardResolvers } from '../resolvers/security-dashboard-resolvers';
import { securityDashboardTypeDefs } from '../schema/security-dashboard-schema';
import { SecurityDashboardContext } from '../types';

const logger = pino({ name: 'security-dashboard-federation' });

// Enhanced RemoteGraphQLDataSource with security and performance features
class SecurityDashboardRemoteDataSource extends RemoteGraphQLDataSource {
  private circuitBreaker: CircuitBreaker;
  private redis: Redis;
  private serviceName: string;
  private serviceUrl: string;

  constructor(options: { url: string; serviceName: string; redis: Redis }) {
    super({ url: options.url });

    this.redis = options.redis;
    this.serviceName = options.serviceName;
    this.serviceUrl = options.url;

    // Configure circuit breaker for resilience
    this.circuitBreaker = new CircuitBreaker(this.executeRequest.bind(this), {
      timeout: 10000, // 10 second timeout
      errorThresholdPercentage: 50, // Trip circuit at 50% error rate
      resetTimeout: 30000, // Try again after 30 seconds
      rollingCountTimeout: 60000, // 1 minute rolling window
      rollingCountBuckets: 10,
      name: `${this.serviceName}-circuit-breaker`,
    });

    // Circuit breaker event handlers
    this.circuitBreaker.on('open', () => {
      logger.error(`Circuit breaker opened for ${this.serviceName}`);
    });

    this.circuitBreaker.on('halfOpen', () => {
      logger.warn(`Circuit breaker half-open for ${this.serviceName}`);
    });

    this.circuitBreaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${this.serviceName}`);
    });
  }

  async willSendRequest({ request, context }: { request: any; context: SecurityDashboardContext }) {
    // Forward authentication headers
    if (context.authToken) {
      request.http.headers.set('authorization', `Bearer ${context.authToken}`);
    }

    // Add request tracing headers
    request.http.headers.set('x-trace-id', context.traceId);
    request.http.headers.set('x-organization-id', context.organizationId);
    request.http.headers.set('x-user-id', context.user?.id);

    // Add request timestamp for performance tracking
    request.http.headers.set('x-request-start', Date.now().toString());

    // Security headers
    request.http.headers.set('x-forwarded-for', context.clientIp);
    request.http.headers.set('user-agent', 'Security-Dashboard-Gateway/1.0');
  }

  async didReceiveResponse({ response, context }: { response: any; context: SecurityDashboardContext }) {
    const requestStart = parseInt(response.http.headers.get('x-request-start') || '0');
    const duration = Date.now() - requestStart;

    // Record service performance metrics
    await this.recordServiceMetrics(duration, response.http.status);

    // Log slow requests
    if (duration > 5000) {
      logger.warn({
        service: this.serviceName,
        duration,
        status: response.http.status,
        traceId: context.traceId,
      }, 'Slow service response detected');
    }

    // Handle service errors
    if (response.http.status >= 400) {
      logger.error({
        service: this.serviceName,
        status: response.http.status,
        traceId: context.traceId,
      }, 'Service error response');
    }

    return response;
  }

  async didEncounterError(error: any, context: SecurityDashboardContext) {
    logger.error({
      service: this.serviceName,
      error: error.message,
      traceId: context.traceId,
    }, 'Service request error');

    // Record error metrics
    await this.recordServiceError(error);

    // Return sanitized error to avoid exposing internal details
    throw new Error(`Service ${this.serviceName} is temporarily unavailable`);
  }

  private async executeRequest(request: any): Promise<any> {
    return super.process(request);
  }

  private async recordServiceMetrics(duration: number, status: number): Promise<void> {
    try {
      const metrics = {
        service: this.serviceName,
        duration,
        status,
        timestamp: new Date().toISOString(),
      };

      await this.redis.lpush('service:metrics', JSON.stringify(metrics));
      await this.redis.expire('service:metrics', 86400); // Keep for 24 hours
    } catch (error) {
      // Silently fail metrics recording
    }
  }

  private async recordServiceError(error: any): Promise<void> {
    try {
      const errorData = {
        service: this.serviceName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };

      await this.redis.lpush('service:errors', JSON.stringify(errorData));
      await this.redis.expire('service:errors', 86400); // Keep for 24 hours
    } catch (err) {
      // Silently fail error recording
    }
  }
}

// Health check service for subgraph monitoring
class ServiceHealthChecker {
  private redis: Redis;
  private healthCheckInterval: number;
  private services: Map<string, { url: string; healthy: boolean; lastCheck: Date }>;

  constructor(redis: Redis, healthCheckInterval: number = 30000) {
    this.redis = redis;
    this.healthCheckInterval = healthCheckInterval;
    this.services = new Map();
  }

  addService(name: string, url: string): void {
    this.services.set(name, {
      url: `${url}/health`,
      healthy: true,
      lastCheck: new Date(),
    });
  }

  startHealthChecks(): void {
    setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckInterval);

    // Perform initial health check
    setImmediate(() => this.performHealthChecks());
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.services.entries()).map(
      async ([serviceName, serviceInfo]) => {
        try {
          const startTime = performance.now();
          const response = await axios.get(serviceInfo.url, {
            timeout: 5000,
            headers: {
              'user-agent': 'Security-Dashboard-Health-Check/1.0',
            },
          });
          const endTime = performance.now();

          const isHealthy = response.status === 200;
          const duration = endTime - startTime;

          // Update service status
          this.services.set(serviceName, {
            ...serviceInfo,
            healthy: isHealthy,
            lastCheck: new Date(),
          });

          // Record health metrics
          await this.recordHealthMetrics(serviceName, isHealthy, duration);

          if (!isHealthy) {
            logger.warn({
              service: serviceName,
              status: response.status,
              duration,
            }, 'Service health check failed');
          }

        } catch (error) {
          // Mark service as unhealthy
          this.services.set(serviceName, {
            ...serviceInfo,
            healthy: false,
            lastCheck: new Date(),
          });

          await this.recordHealthMetrics(serviceName, false, 0);

          logger.error({
            service: serviceName,
            error: error.message,
          }, 'Service health check error');
        }
      }
    );

    await Promise.allSettled(promises);
  }

  private async recordHealthMetrics(serviceName: string, healthy: boolean, duration: number): Promise<void> {
    try {
      const metrics = {
        service: serviceName,
        healthy,
        duration,
        timestamp: new Date().toISOString(),
      };

      await this.redis.lpush('service:health', JSON.stringify(metrics));
      await this.redis.expire('service:health', 86400); // Keep for 24 hours
    } catch (error) {
      // Silently fail metrics recording
    }
  }

  getServiceHealth(serviceName: string): boolean {
    return this.services.get(serviceName)?.healthy ?? false;
  }

  getAllServicesHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    this.services.forEach((info, name) => {
      health[name] = info.healthy;
    });
    return health;
  }
}

// Security Dashboard Subgraph Configuration
export function createSecurityDashboardSubgraph(): any {
  return buildSubgraphSchema({
    typeDefs: securityDashboardTypeDefs,
    resolvers: securityDashboardResolvers as GraphQLResolverMap,
  });
}

// Federation Gateway Configuration
export function createSecurityDashboardGateway(
  redis: Redis,
  services: {
    authServiceUrl: string;
    monitorServiceUrl: string;
    assetServiceUrl: string;
    complianceServiceUrl: string;
    alertServiceUrl: string;
  }
): { gateway: ApolloGateway; healthChecker: ServiceHealthChecker } {

  const healthChecker = new ServiceHealthChecker(redis, 30000); // 30 second intervals

  // Add services to health checker
  Object.entries(services).forEach(([serviceName, serviceUrl]) => {
    healthChecker.addService(serviceName, serviceUrl);
  });

  // Start health monitoring
  healthChecker.startHealthChecks();

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        // Security Dashboard Service (this service)
        {
          name: 'security-dashboard',
          url: process.env.SECURITY_DASHBOARD_URL || 'http://localhost:4000/graphql',
        },
        // Auth Service
        {
          name: 'auth',
          url: services.authServiceUrl,
        },
        // Monitor Service
        {
          name: 'monitor',
          url: services.monitorServiceUrl,
        },
        // Asset Discovery Service
        {
          name: 'asset-discovery',
          url: services.assetServiceUrl,
        },
        // Compliance Service
        {
          name: 'compliance',
          url: services.complianceServiceUrl,
        },
        // Alert Service
        {
          name: 'alert',
          url: services.alertServiceUrl,
        },
      ],
      pollIntervalInMs: 30000, // Poll for schema changes every 30 seconds
    }),

    buildService: ({ url, name }) => {
      return new SecurityDashboardRemoteDataSource({
        url,
        serviceName: name,
        redis,
      });
    },

    // Enhanced error handling
    didEncounterError: (error, request) => {
      logger.error({
        error: error.message,
        operation: request.operationName,
        variables: request.variables,
      }, 'Gateway error encountered');
    },

    // Service health integration
    serviceHealthCheck: true,

    // Gateway composition update handlers
    didUpdateComposition: ({ compositionMetadata, graphRef }) => {
      logger.info({
        compositionId: compositionMetadata?.compositionId,
        graphRef,
      }, 'Gateway schema composition updated');
    },

    didUpdateSupergraph: ({ compositionId, supergraphSdl }) => {
      logger.info({
        compositionId,
        supergraphSize: supergraphSdl?.length,
      }, 'Supergraph schema updated');
    },

    // Development mode introspection (disable in production)
    introspectionEnabled: process.env.NODE_ENV !== 'production',
  });

  return { gateway, healthChecker };
}

// Federation directive definitions for the Security Dashboard subgraph
export const federationDirectives = `
  extend schema
    @link(url: "https://specs.apollographql.org/federation/v2.3"
          import: ["@key", "@tag", "@shareable", "@inaccessible", "@override", "@external", "@provides", "@requires"])

  # Security Dashboard entities that can be referenced by other subgraphs
  type Asset @key(fields: "id") {
    id: ID!
    # Other fields will be defined in the main schema
  }

  type SecurityEvent @key(fields: "id") {
    id: ID!
    # Other fields will be defined in the main schema
  }

  type Alert @key(fields: "id") {
    id: ID!
    # Other fields will be defined in the main schema
  }

  type Vulnerability @key(fields: "id") {
    id: ID!
    # Other fields will be defined in the main schema
  }

  type KongService @key(fields: "id") {
    id: ID!
    # Other fields will be defined in the main schema
  }

  type KongRoute @key(fields: "id") {
    id: ID!
    # Other fields will be defined in the main schema
  }

  # External entities from other subgraphs that we reference
  type User @key(fields: "id") @external {
    id: ID! @external
    email: String! @external
    fullName: String! @external
    role: String! @external
  }

  type Organization @key(fields: "id") @external {
    id: ID! @external
    name: String! @external
    slug: String! @external
  }
`;

// Gateway health endpoint for load balancers
export interface GatewayHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  timestamp: Date;
  version: string;
}

export function createHealthEndpoint(healthChecker: ServiceHealthChecker) {
  return (req: any, res: any) => {
    const servicesHealth = healthChecker.getAllServicesHealth();
    const healthyServices = Object.values(servicesHealth).filter(Boolean).length;
    const totalServices = Object.keys(servicesHealth).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices > totalServices / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const health: GatewayHealth = {
      status,
      services: servicesHealth,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 206 : 503;

    res.status(statusCode).json(health);
  };
}

// Performance monitoring middleware for the gateway
export function createPerformanceMonitoringPlugin(redis: Redis) {
  return {
    requestDidStart() {
      return {
        didResolveOperation(requestContext: any) {
          // Record operation metrics
          setImmediate(async () => {
            try {
              await redis.hincrby(
                'gateway:operations',
                requestContext.request.operationName || 'anonymous',
                1
              );
            } catch (error) {
              // Silently fail
            }
          });
        },

        willSendResponse(requestContext: any) {
          const duration = Date.now() - requestContext.request.http.startTime;

          // Record response time metrics
          setImmediate(async () => {
            try {
              await redis.lpush(
                'gateway:response_times',
                JSON.stringify({
                  operation: requestContext.request.operationName,
                  duration,
                  timestamp: new Date().toISOString(),
                })
              );
              await redis.expire('gateway:response_times', 86400);
            } catch (error) {
              // Silently fail
            }
          });
        },

        didEncounterErrors(requestContext: any) {
          const errors = requestContext.errors || [];

          // Record error metrics
          setImmediate(async () => {
            try {
              await redis.hincrby('gateway:errors', 'total', errors.length);

              errors.forEach(async (error: any) => {
                await redis.hincrby('gateway:errors:by_type', error.constructor.name, 1);
              });
            } catch (error) {
              // Silently fail
            }
          });
        },
      };
    },
  };
}
