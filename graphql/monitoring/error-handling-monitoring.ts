// Comprehensive Error Handling and Monitoring for Security Dashboard GraphQL API
// Production-ready error handling, logging, metrics, and observability

import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from 'apollo-server-plugin-base';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { Redis } from 'ioredis';
import pino, { Logger } from 'pino';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';
import { Histogram, Counter, Gauge, register } from 'prom-client';
import { EventEmitter } from 'events';

import { SecurityDashboardContext } from '../types';
import { AuditService } from '../services/audit-service';
import { NotificationService } from '../services/notification-service';

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
    new Sentry.Integrations.GraphQL(),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend: (event) => {
    // Filter out sensitive data
    if (event.request?.data) {
      event.request.data = '[Filtered]';
    }
    if (event.contexts?.graphql?.variables) {
      event.contexts.graphql.variables = '[Filtered]';
    }
    return event;
  },
});

// Structured logger configuration
const logger = pino({
  name: 'security-dashboard-api',
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.variables.password',
      'req.body.variables.token',
      'variables.password',
      'variables.token',
    ],
    censor: '[REDACTED]',
  },
});

// Prometheus metrics for monitoring
const metrics = {
  // Request metrics
  requestDuration: new Histogram({
    name: 'graphql_request_duration_seconds',
    help: 'Duration of GraphQL requests in seconds',
    labelNames: ['operation_name', 'operation_type', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),

  requestsTotal: new Counter({
    name: 'graphql_requests_total',
    help: 'Total number of GraphQL requests',
    labelNames: ['operation_name', 'operation_type', 'status'],
  }),

  errorsTotal: new Counter({
    name: 'graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['error_type', 'error_code', 'operation_name'],
  }),

  // Resolver metrics
  resolverDuration: new Histogram({
    name: 'graphql_resolver_duration_seconds',
    help: 'Duration of GraphQL resolvers in seconds',
    labelNames: ['field_name', 'parent_type', 'return_type'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  }),

  resolverErrors: new Counter({
    name: 'graphql_resolver_errors_total',
    help: 'Total number of resolver errors',
    labelNames: ['field_name', 'parent_type', 'error_type'],
  }),

  // DataLoader metrics
  dataloaderCacheHits: new Counter({
    name: 'dataloader_cache_hits_total',
    help: 'Total number of DataLoader cache hits',
    labelNames: ['loader_name'],
  }),

  dataloaderCacheMisses: new Counter({
    name: 'dataloader_cache_misses_total',
    help: 'Total number of DataLoader cache misses',
    labelNames: ['loader_name'],
  }),

  dataloaderBatchSize: new Histogram({
    name: 'dataloader_batch_size',
    help: 'Size of DataLoader batches',
    labelNames: ['loader_name'],
    buckets: [1, 2, 5, 10, 25, 50, 100],
  }),

  // Subscription metrics
  activeSubscriptions: new Gauge({
    name: 'graphql_active_subscriptions',
    help: 'Number of active GraphQL subscriptions',
    labelNames: ['subscription_name'],
  }),

  subscriptionMessages: new Counter({
    name: 'graphql_subscription_messages_total',
    help: 'Total number of subscription messages sent',
    labelNames: ['subscription_name', 'status'],
  }),

  // Security metrics
  rateLimitExceeded: new Counter({
    name: 'graphql_rate_limit_exceeded_total',
    help: 'Total number of rate limit violations',
    labelNames: ['user_id', 'limit_type'],
  }),

  queryComplexityExceeded: new Counter({
    name: 'graphql_query_complexity_exceeded_total',
    help: 'Total number of query complexity violations',
    labelNames: ['operation_name', 'complexity'],
  }),

  authenticationFailures: new Counter({
    name: 'graphql_authentication_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['failure_type'],
  }),
};

// Error classification system
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  INTERNAL = 'internal',
  SECURITY = 'security',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  internalMessage: string;
  metadata: Record<string, any>;
}

// Custom error classes
export class SecurityDashboardError extends Error {
  public readonly context: ErrorContext;
  public readonly traceId: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    context: Partial<ErrorContext> = {},
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.traceId = uuidv4();
    this.timestamp = new Date();

    this.context = {
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'An error occurred while processing your request',
      internalMessage: message,
      metadata: {},
      ...context,
    };

    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export class AuthenticationError extends SecurityDashboardError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      userMessage: 'Authentication failed',
      metadata,
    });
  }
}

export class AuthorizationError extends SecurityDashboardError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      userMessage: 'You do not have permission to perform this action',
      metadata,
    });
  }
}

export class ValidationError extends SecurityDashboardError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      userMessage: 'Invalid input provided',
      metadata,
    });
  }
}

export class ExternalServiceError extends SecurityDashboardError {
  constructor(service: string, message: string, metadata: Record<string, any> = {}) {
    super(`External service error: ${service} - ${message}`, {
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      userMessage: 'A dependent service is temporarily unavailable',
      metadata: { service, ...metadata },
    });
  }
}

export class DatabaseError extends SecurityDashboardError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      userMessage: 'Database operation failed',
      metadata,
    });
  }
}

export class SecurityViolationError extends SecurityDashboardError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, {
      category: ErrorCategory.SECURITY,
      severity: ErrorSeverity.CRITICAL,
      retryable: false,
      userMessage: 'Security violation detected',
      metadata,
    });
  }
}

// Error handler and formatter
export class ErrorHandler extends EventEmitter {
  private redis: Redis;
  private auditService: AuditService;
  private notificationService: NotificationService;
  private logger: Logger;

  constructor(
    redis: Redis,
    auditService: AuditService,
    notificationService: NotificationService
  ) {
    super();
    this.redis = redis;
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.logger = logger.child({ component: 'ErrorHandler' });
  }

  async handleError(
    error: Error,
    context: SecurityDashboardContext,
    operationName?: string
  ): Promise<GraphQLFormattedError> {
    const isProduction = process.env.NODE_ENV === 'production';
    const traceId = context.traceId || uuidv4();

    // Classify and enrich the error
    const enrichedError = this.enrichError(error, context, traceId);

    // Log the error with appropriate level
    await this.logError(enrichedError, context, operationName);

    // Record metrics
    this.recordErrorMetrics(enrichedError, operationName);

    // Send to Sentry for production errors
    if (isProduction && enrichedError.context.severity !== ErrorSeverity.LOW) {
      this.sendToSentry(enrichedError, context, operationName);
    }

    // Handle critical errors
    if (enrichedError.context.severity === ErrorSeverity.CRITICAL) {
      await this.handleCriticalError(enrichedError, context, operationName);
    }

    // Audit security violations
    if (enrichedError.context.category === ErrorCategory.SECURITY) {
      await this.auditSecurityViolation(enrichedError, context, operationName);
    }

    // Emit error event for real-time monitoring
    this.emit('error', {
      error: enrichedError,
      context,
      operationName,
      traceId,
    });

    // Format error for GraphQL response
    return this.formatErrorForResponse(enrichedError, isProduction);
  }

  private enrichError(
    error: Error,
    context: SecurityDashboardContext,
    traceId: string
  ): SecurityDashboardError {
    // If already a SecurityDashboardError, return as-is
    if (error instanceof SecurityDashboardError) {
      return error;
    }

    // Classify common error types
    if (error.message.includes('jwt') || error.message.includes('token')) {
      return new AuthenticationError(error.message, { originalError: error.name });
    }

    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return new AuthorizationError(error.message, { originalError: error.name });
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new ValidationError(error.message, { originalError: error.name });
    }

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new SecurityDashboardError(error.message, {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        userMessage: 'Request timed out. Please try again.',
        metadata: { originalError: error.name },
      });
    }

    if (error.message.includes('database') || error.message.includes('sql')) {
      return new DatabaseError(error.message, { originalError: error.name });
    }

    // Default to internal error
    return new SecurityDashboardError(error.message, {
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'An unexpected error occurred',
      internalMessage: error.message,
      metadata: { originalError: error.name, stack: error.stack },
    });
  }

  private async logError(
    error: SecurityDashboardError,
    context: SecurityDashboardContext,
    operationName?: string
  ): Promise<void> {
    const logLevel = this.getLogLevel(error.context.severity);

    const logData = {
      traceId: error.traceId,
      errorCategory: error.context.category,
      errorSeverity: error.context.severity,
      operationName,
      userId: context.user?.id,
      organizationId: context.organizationId,
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      timestamp: error.timestamp,
      retryable: error.context.retryable,
      metadata: error.context.metadata,
    };

    this.logger[logLevel](logData, error.message);

    // Store error in Redis for real-time monitoring
    try {
      await this.redis.lpush(
        'errors:recent',
        JSON.stringify({
          ...logData,
          message: error.message,
          internalMessage: error.context.internalMessage,
        })
      );
      await this.redis.expire('errors:recent', 3600); // Keep for 1 hour
    } catch (redisError) {
      this.logger.warn({ error: redisError.message }, 'Failed to store error in Redis');
    }
  }

  private recordErrorMetrics(error: SecurityDashboardError, operationName?: string): void {
    // Increment error counter
    metrics.errorsTotal.inc({
      error_type: error.context.category,
      error_code: error.name,
      operation_name: operationName || 'unknown',
    });

    // Record specific security metrics
    switch (error.context.category) {
      case ErrorCategory.RATE_LIMIT:
        metrics.rateLimitExceeded.inc({
          user_id: error.context.metadata.userId || 'unknown',
          limit_type: error.context.metadata.limitType || 'unknown',
        });
        break;

      case ErrorCategory.AUTHENTICATION:
        metrics.authenticationFailures.inc({
          failure_type: error.context.metadata.failureType || 'unknown',
        });
        break;
    }
  }

  private sendToSentry(
    error: SecurityDashboardError,
    context: SecurityDashboardContext,
    operationName?: string
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('error_category', error.context.category);
      scope.setLevel(this.getSentryLevel(error.context.severity));
      scope.setContext('error_details', {
        traceId: error.traceId,
        severity: error.context.severity,
        retryable: error.context.retryable,
        timestamp: error.timestamp,
      });
      scope.setContext('operation', {
        name: operationName,
        userId: context.user?.id,
        organizationId: context.organizationId,
      });
      scope.setContext('request', {
        ip: context.clientIp,
        userAgent: context.userAgent,
      });

      Sentry.captureException(error);
    });
  }

  private async handleCriticalError(
    error: SecurityDashboardError,
    context: SecurityDashboardContext,
    operationName?: string
  ): Promise<void> {
    try {
      // Send immediate alert to security team
      await this.notificationService.sendCriticalAlert({
        type: 'CRITICAL_ERROR',
        severity: 'CRITICAL',
        message: `Critical error in Security Dashboard: ${error.message}`,
        organizationId: context.organizationId,
        metadata: {
          traceId: error.traceId,
          operationName,
          userId: context.user?.id,
          errorCategory: error.context.category,
          timestamp: error.timestamp,
        },
      });

      // Log to critical errors channel
      await this.redis.lpush(
        'errors:critical',
        JSON.stringify({
          traceId: error.traceId,
          message: error.message,
          category: error.context.category,
          operationName,
          userId: context.user?.id,
          organizationId: context.organizationId,
          timestamp: error.timestamp,
          metadata: error.context.metadata,
        })
      );

    } catch (notificationError) {
      this.logger.error({
        originalError: error.message,
        notificationError: notificationError.message,
      }, 'Failed to handle critical error');
    }
  }

  private async auditSecurityViolation(
    error: SecurityDashboardError,
    context: SecurityDashboardContext,
    operationName?: string
  ): Promise<void> {
    try {
      await this.auditService.logSecurityViolation(
        context.user?.id,
        error.context.category.toUpperCase(),
        {
          traceId: error.traceId,
          message: error.message,
          operationName,
          clientIp: context.clientIp,
          userAgent: context.userAgent,
          timestamp: error.timestamp,
          metadata: error.context.metadata,
        }
      );
    } catch (auditError) {
      this.logger.error({
        originalError: error.message,
        auditError: auditError.message,
      }, 'Failed to audit security violation');
    }
  }

  private formatErrorForResponse(
    error: SecurityDashboardError,
    isProduction: boolean
  ): GraphQLFormattedError {
    const formattedError: GraphQLFormattedError = {
      message: isProduction ? error.context.userMessage : error.message,
      extensions: {
        code: error.name.replace('Error', '').toUpperCase(),
        category: error.context.category,
        severity: error.context.severity,
        retryable: error.context.retryable,
        traceId: error.traceId,
        timestamp: error.timestamp,
      },
    };

    // Include internal details only in development
    if (!isProduction) {
      formattedError.extensions.internalMessage = error.context.internalMessage;
      formattedError.extensions.metadata = error.context.metadata;
    }

    return formattedError;
  }

  private getLogLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
    switch (severity) {
      case ErrorSeverity.LOW: return 'info';
      case ErrorSeverity.MEDIUM: return 'warn';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.CRITICAL: return 'fatal';
      default: return 'error';
    }
  }

  private getSentryLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warning' | 'error' | 'fatal' {
    switch (severity) {
      case ErrorSeverity.LOW: return 'info';
      case ErrorSeverity.MEDIUM: return 'warning';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.CRITICAL: return 'fatal';
      default: return 'error';
    }
  }
}

// Performance monitoring plugin
export function createMonitoringPlugin(
  redis: Redis,
  errorHandler: ErrorHandler
): ApolloServerPlugin<SecurityDashboardContext> {
  return {
    requestDidStart(): GraphQLRequestListener<SecurityDashboardContext> {
      const startTime = performance.now();
      let requestTraceId: string;

      return {
        didResolveSource: async (requestContext) => {
          requestTraceId = requestContext.context.traceId || uuidv4();
          requestContext.context.traceId = requestTraceId;
        },

        didResolveOperation: async (requestContext) => {
          const { operationName, operation } = requestContext;
          const operationType = operation?.operation || 'unknown';

          // Record request start
          logger.info({
            traceId: requestTraceId,
            operationName,
            operationType,
            userId: requestContext.context.user?.id,
            organizationId: requestContext.context.organizationId,
            clientIp: requestContext.context.clientIp,
          }, 'GraphQL request started');
        },

        willSendResponse: async (requestContext) => {
          const endTime = performance.now();
          const duration = (endTime - startTime) / 1000; // Convert to seconds
          const { operationName, operation, errors } = requestContext;
          const operationType = operation?.operation || 'unknown';
          const hasErrors = errors && errors.length > 0;

          // Record metrics
          const labels = {
            operation_name: operationName || 'anonymous',
            operation_type: operationType,
            status: hasErrors ? 'error' : 'success',
          };

          metrics.requestsTotal.inc(labels);
          metrics.requestDuration.observe(labels, duration);

          // Log request completion
          logger.info({
            traceId: requestTraceId,
            operationName,
            operationType,
            duration: `${duration.toFixed(3)}s`,
            status: hasErrors ? 'error' : 'success',
            errorCount: errors?.length || 0,
            userId: requestContext.context.user?.id,
            organizationId: requestContext.context.organizationId,
          }, 'GraphQL request completed');

          // Store performance data
          try {
            await redis.lpush(
              'performance:requests',
              JSON.stringify({
                traceId: requestTraceId,
                operationName,
                operationType,
                duration,
                status: hasErrors ? 'error' : 'success',
                errorCount: errors?.length || 0,
                timestamp: new Date().toISOString(),
                userId: requestContext.context.user?.id,
                organizationId: requestContext.context.organizationId,
              })
            );
            await redis.expire('performance:requests', 86400); // Keep for 24 hours
          } catch (redisError) {
            logger.warn({ error: redisError.message }, 'Failed to store performance data');
          }
        },

        didEncounterErrors: async (requestContext) => {
          const { errors, operationName } = requestContext;

          if (errors && errors.length > 0) {
            // Process each error through our error handler
            const formattedErrors = await Promise.all(
              errors.map(error =>
                errorHandler.handleError(error, requestContext.context, operationName || undefined)
              )
            );

            // Replace errors with formatted versions
            requestContext.errors = formattedErrors.map(formatted =>
              new GraphQLError(
                formatted.message,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                formatted.extensions
              )
            );
          }
        },
      };
    },
  };
}

// Health check endpoint data
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    auth: 'healthy' | 'unhealthy';
  };
  metrics: {
    requestsPerMinute: number;
    errorRate: number;
    avgResponseTime: number;
    activeConnections: number;
  };
}

// Health check implementation
export async function getHealthCheck(redis: Redis): Promise<HealthCheckResult> {
  const startTime = Date.now();

  // Check service health
  const serviceChecks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkRedisHealth(redis),
    checkAuthServiceHealth(),
  ]);

  const services = {
    database: serviceChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
    redis: serviceChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
    auth: serviceChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
  } as const;

  // Calculate overall status
  const healthyServices = Object.values(services).filter(status => status === 'healthy').length;
  const totalServices = Object.keys(services).length;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (healthyServices === totalServices) {
    status = 'healthy';
  } else if (healthyServices >= totalServices / 2) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  // Get metrics from Redis
  const metrics = await getHealthMetrics(redis);

  return {
    status,
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services,
    metrics,
  };
}

async function checkDatabaseHealth(): Promise<void> {
  // Implement database health check
  // This would typically run a simple query
  return Promise.resolve();
}

async function checkRedisHealth(redis: Redis): Promise<void> {
  await redis.ping();
}

async function checkAuthServiceHealth(): Promise<void> {
  // Implement auth service health check
  // This would typically make an HTTP request to the auth service
  return Promise.resolve();
}

async function getHealthMetrics(redis: Redis): Promise<HealthCheckResult['metrics']> {
  try {
    // Get recent performance data
    const recentRequests = await redis.lrange('performance:requests', 0, 59); // Last 60 requests

    if (recentRequests.length === 0) {
      return {
        requestsPerMinute: 0,
        errorRate: 0,
        avgResponseTime: 0,
        activeConnections: 0,
      };
    }

    const requests = recentRequests.map(r => JSON.parse(r));
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Filter requests from last minute
    const recentRequestsInMinute = requests.filter(r =>
      new Date(r.timestamp).getTime() > oneMinuteAgo
    );

    const errorCount = recentRequestsInMinute.filter(r => r.status === 'error').length;
    const totalRequests = recentRequestsInMinute.length;
    const avgResponseTime = totalRequests > 0
      ? recentRequestsInMinute.reduce((sum, r) => sum + r.duration, 0) / totalRequests
      : 0;

    // Get active connections from subscription metrics
    const subscriptionMetrics = await redis.hmget('security_subscriptions:metrics', 'totalConnections');
    const activeConnections = parseInt(subscriptionMetrics[0] || '0');

    return {
      requestsPerMinute: totalRequests,
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
      avgResponseTime,
      activeConnections,
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get health metrics');
    return {
      requestsPerMinute: 0,
      errorRate: 0,
      avgResponseTime: 0,
      activeConnections: 0,
    };
  }
}

// Export all error classes and utilities
export {
  ErrorHandler,
  metrics,
  logger,
  SecurityDashboardError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ExternalServiceError,
  DatabaseError,
  SecurityViolationError,
};
