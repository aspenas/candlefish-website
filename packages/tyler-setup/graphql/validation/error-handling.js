// Error Handling Schema for Tyler Setup Platform
// Comprehensive error management with proper logging and user feedback

import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

/**
 * Custom error classes for different error types
 */
export class TylerSetupError extends GraphQLError {
  constructor(message, code, statusCode = 500, extensions = {}) {
    super(message);

    this.extensions = {
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      ...extensions,
    };
  }
}

export class AuthenticationError extends TylerSetupError {
  constructor(message = 'Authentication required', extensions = {}) {
    super(message, 'UNAUTHENTICATED', 401, {
      ...extensions,
      category: 'AUTHENTICATION',
    });
  }
}

export class AuthorizationError extends TylerSetupError {
  constructor(message = 'Insufficient permissions', extensions = {}) {
    super(message, 'FORBIDDEN', 403, {
      ...extensions,
      category: 'AUTHORIZATION',
    });
  }
}

export class ValidationError extends TylerSetupError {
  constructor(message = 'Input validation failed', validationErrors = [], extensions = {}) {
    super(message, 'BAD_USER_INPUT', 400, {
      ...extensions,
      category: 'VALIDATION',
      validationErrors,
    });
  }
}

export class NotFoundError extends TylerSetupError {
  constructor(resource = 'Resource', extensions = {}) {
    super(`${resource} not found`, 'NOT_FOUND', 404, {
      ...extensions,
      category: 'NOT_FOUND',
      resource,
    });
  }
}

export class ConflictError extends TylerSetupError {
  constructor(message = 'Resource conflict', extensions = {}) {
    super(message, 'CONFLICT', 409, {
      ...extensions,
      category: 'CONFLICT',
    });
  }
}

export class RateLimitError extends TylerSetupError {
  constructor(message = 'Rate limit exceeded', limit = null, windowMs = null, extensions = {}) {
    super(message, 'RATE_LIMITED', 429, {
      ...extensions,
      category: 'RATE_LIMIT',
      limit,
      windowMs,
      retryAfter: windowMs ? Math.ceil(windowMs / 1000) : null,
    });
  }
}

export class ExternalServiceError extends TylerSetupError {
  constructor(service, message = 'External service error', extensions = {}) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, {
      ...extensions,
      category: 'EXTERNAL_SERVICE',
      service,
    });
  }
}

export class DatabaseError extends TylerSetupError {
  constructor(operation, message = 'Database operation failed', extensions = {}) {
    super(`Database ${operation}: ${message}`, 'DATABASE_ERROR', 500, {
      ...extensions,
      category: 'DATABASE',
      operation,
    });
  }
}

export class BusinessLogicError extends TylerSetupError {
  constructor(message, extensions = {}) {
    super(message, 'BUSINESS_LOGIC_ERROR', 422, {
      ...extensions,
      category: 'BUSINESS_LOGIC',
    });
  }
}

export class SecurityError extends TylerSetupError {
  constructor(message = 'Security policy violation', extensions = {}) {
    super(message, 'SECURITY_ERROR', 403, {
      ...extensions,
      category: 'SECURITY',
      severity: 'HIGH',
    });
  }
}

/**
 * Error handling configuration
 */
export const errorConfig = {
  // Enable detailed error reporting in development
  enableDetailedErrors: process.env.NODE_ENV === 'development',

  // Enable error tracking in production
  enableErrorTracking: process.env.NODE_ENV === 'production',

  // Maximum error message length for security
  maxErrorMessageLength: 500,

  // Errors that should be logged as security incidents
  securityErrorCodes: [
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'SECURITY_ERROR',
    'RATE_LIMITED',
  ],

  // Errors that should trigger alerts
  criticalErrorCodes: [
    'DATABASE_ERROR',
    'EXTERNAL_SERVICE_ERROR',
    'SECURITY_ERROR',
  ],

  // Error categories for metrics
  errorCategories: {
    AUTHENTICATION: 'auth',
    AUTHORIZATION: 'auth',
    VALIDATION: 'input',
    NOT_FOUND: 'client',
    CONFLICT: 'client',
    RATE_LIMIT: 'security',
    EXTERNAL_SERVICE: 'infrastructure',
    DATABASE: 'infrastructure',
    BUSINESS_LOGIC: 'application',
    SECURITY: 'security',
  },
};

/**
 * Format GraphQL errors for client response
 */
export function formatError(formattedError, originalError) {
  const { enableDetailedErrors } = errorConfig;

  // Extract error details
  const code = formattedError.extensions?.code || 'INTERNAL_ERROR';
  const category = formattedError.extensions?.category || 'UNKNOWN';
  const statusCode = formattedError.extensions?.statusCode || 500;

  // Create formatted error response
  const errorResponse = {
    message: truncateMessage(formattedError.message),
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: {
      code,
      category,
      statusCode,
      timestamp: formattedError.extensions?.timestamp || new Date().toISOString(),
      traceId: formattedError.extensions?.traceId,
    },
  };

  // Add detailed information in development
  if (enableDetailedErrors) {
    errorResponse.extensions.originalError = {
      name: originalError?.constructor.name,
      stack: originalError?.stack,
    };

    // Include validation errors if present
    if (formattedError.extensions?.validationErrors) {
      errorResponse.extensions.validationErrors = formattedError.extensions.validationErrors;
    }

    // Include additional context
    if (formattedError.extensions?.context) {
      errorResponse.extensions.context = formattedError.extensions.context;
    }
  }

  // Log the error
  logError(errorResponse, originalError);

  // Track error metrics
  trackErrorMetrics(errorResponse);

  // Send security alerts if needed
  if (errorConfig.criticalErrorCodes.includes(code)) {
    sendSecurityAlert(errorResponse, originalError);
  }

  return errorResponse;
}

/**
 * Log errors with appropriate level and context
 */
function logError(formattedError, originalError) {
  const { code, category, statusCode } = formattedError.extensions;

  const logData = {
    code,
    category,
    statusCode,
    message: formattedError.message,
    path: formattedError.path,
    locations: formattedError.locations,
    timestamp: formattedError.extensions.timestamp,
    traceId: formattedError.extensions.traceId,
  };

  // Add original error details for server logs
  if (originalError) {
    logData.originalError = {
      name: originalError.constructor.name,
      message: originalError.message,
      stack: originalError.stack,
    };
  }

  // Determine log level based on error type
  if (statusCode >= 500) {
    console.error('GraphQL Server Error:', logData);
  } else if (statusCode >= 400) {
    console.warn('GraphQL Client Error:', logData);
  } else {
    console.info('GraphQL Info:', logData);
  }

  // Log security incidents
  if (errorConfig.securityErrorCodes.includes(code)) {
    console.error('SECURITY INCIDENT:', {
      severity: 'HIGH',
      type: 'GraphQL Security Error',
      ...logData,
    });
  }
}

/**
 * Track error metrics for monitoring
 */
function trackErrorMetrics(formattedError) {
  const { code, category } = formattedError.extensions;

  // In production, send to monitoring service (DataDog, New Relic, etc.)
  if (errorConfig.enableErrorTracking) {
    const metricTags = {
      error_code: code,
      error_category: errorConfig.errorCategories[category] || 'unknown',
      path: formattedError.path?.join('.') || 'unknown',
    };

    console.log('ERROR_METRIC:', {
      metric: 'graphql.error',
      value: 1,
      tags: metricTags,
      timestamp: Date.now(),
    });
  }
}

/**
 * Send security alerts for critical errors
 */
function sendSecurityAlert(formattedError, originalError) {
  const alertData = {
    type: 'GraphQL Security Alert',
    severity: 'HIGH',
    code: formattedError.extensions.code,
    message: formattedError.message,
    path: formattedError.path,
    timestamp: formattedError.extensions.timestamp,
    traceId: formattedError.extensions.traceId,
  };

  // In production, send to security monitoring system
  console.error('SECURITY_ALERT:', alertData);

  // Could integrate with services like:
  // - PagerDuty for incident management
  // - Slack for team notifications
  // - AWS SNS for alert distribution
  // - Custom security dashboard
}

/**
 * Truncate error messages for security
 */
function truncateMessage(message) {
  if (!message) return 'An error occurred';

  if (message.length > errorConfig.maxErrorMessageLength) {
    return message.substring(0, errorConfig.maxErrorMessageLength) + '...';
  }

  return message;
}

/**
 * Error context builder for enhanced error reporting
 */
export class ErrorContext {
  constructor() {
    this.data = {};
  }

  setUser(user) {
    this.data.userId = user?.id;
    this.data.userRole = user?.role;
    return this;
  }

  setRequest(req) {
    this.data.ip = req?.ip;
    this.data.userAgent = req?.headers?.['user-agent'];
    this.data.endpoint = req?.url;
    this.data.method = req?.method;
    return this;
  }

  setOperation(operationName, variables) {
    this.data.operationName = operationName;
    this.data.hasVariables = !!variables && Object.keys(variables).length > 0;
    return this;
  }

  setResolver(resolverName, parentType) {
    this.data.resolver = resolverName;
    this.data.parentType = parentType;
    return this;
  }

  setTrace(traceId) {
    this.data.traceId = traceId;
    return this;
  }

  addCustomData(key, value) {
    this.data[key] = value;
    return this;
  }

  build() {
    return { ...this.data };
  }
}

/**
 * Error handling middleware for resolvers
 */
export function withErrorHandling(resolver, options = {}) {
  return async (parent, args, context, info) => {
    const startTime = Date.now();
    const errorContext = new ErrorContext()
      .setUser(context.user)
      .setRequest(context.req)
      .setOperation(info.operation.name?.value, info.variableValues)
      .setResolver(info.fieldName, info.parentType.name)
      .setTrace(context.traceId);

    try {
      const result = await resolver(parent, args, context, info);

      // Track successful resolution
      const duration = Date.now() - startTime;
      if (context.metrics) {
        context.metrics.timing('resolver.success', duration, {
          resolver: info.fieldName,
          parentType: info.parentType.name,
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Add error context
      const contextData = errorContext
        .addCustomData('duration', duration)
        .addCustomData('args', sanitizeArgs(args))
        .build();

      // Handle different error types
      if (error instanceof TylerSetupError) {
        // Already a properly formatted error
        error.extensions.context = contextData;
        throw error;
      }

      if (error.code === 'ValidationError') {
        throw new ValidationError(error.message, error.details, { context: contextData });
      }

      if (error.code === 'NotFoundError') {
        throw new NotFoundError(error.resource, { context: contextData });
      }

      // Database errors
      if (error.name?.includes('Dynamo') || error.name?.includes('Database')) {
        throw new DatabaseError(
          info.fieldName,
          'Database operation failed',
          { context: contextData, originalError: error.message }
        );
      }

      // AWS Service errors
      if (error.name?.includes('AWS') || error.$metadata) {
        throw new ExternalServiceError(
          'AWS',
          error.message || 'AWS service error',
          { context: contextData, service: error.name }
        );
      }

      // Generic internal error
      throw new TylerSetupError(
        options.genericMessage || 'Internal server error',
        'INTERNAL_ERROR',
        500,
        {
          context: contextData,
          originalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
        }
      );
    }
  };
}

/**
 * Sanitize arguments for logging (remove sensitive data)
 */
function sanitizeArgs(args) {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'refreshToken',
  ];

  const sanitized = { ...args };

  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const result = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return sanitizeObject(sanitized);
}

/**
 * Global error handler plugin for Apollo Server
 */
export function createErrorHandlerPlugin() {
  return {
    requestDidStart() {
      return {
        didEncounterErrors(requestContext) {
          const { errors, request, context } = requestContext;

          // Process each error
          errors.forEach(error => {
            // Add request context to error
            if (error.extensions) {
              error.extensions.traceId = context.traceId || generateTraceId();
              error.extensions.operationName = request.operationName;
            }
          });
        },

        willSendResponse(requestContext) {
          const { response, errors } = requestContext;

          // Add error summary to response headers in development
          if (errors?.length && process.env.NODE_ENV === 'development') {
            response.http.headers.set('X-GraphQL-Error-Count', errors.length.toString());
            response.http.headers.set('X-GraphQL-Error-Types',
              [...new Set(errors.map(e => e.extensions?.code || 'UNKNOWN'))].join(',')
            );
          }
        },
      };
    },
  };
}

/**
 * Generate trace ID for error tracking
 */
function generateTraceId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Error boundary for critical operations
 */
export function withErrorBoundary(operation, fallbackValue = null) {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      console.error('Error boundary caught error:', error);

      // Log critical error
      if (error instanceof TylerSetupError && error.extensions?.category === 'SECURITY') {
        console.error('CRITICAL SECURITY ERROR:', error);
      }

      return fallbackValue;
    }
  };
}

/**
 * Validation error aggregator
 */
export function aggregateValidationErrors(errors) {
  const fieldErrors = {};
  const generalErrors = [];

  errors.forEach(error => {
    if (error.field) {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = [];
      }
      fieldErrors[error.field].push(error.message);
    } else {
      generalErrors.push(error.message);
    }
  });

  return {
    fieldErrors,
    generalErrors,
    totalCount: errors.length,
  };
}
