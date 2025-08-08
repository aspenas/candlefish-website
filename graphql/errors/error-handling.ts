import {
  GraphQLError,
  GraphQLErrorExtensions
} from 'graphql';
import {
  ApolloServerErrorCode,
  AuthenticationError,
  ForbiddenError,
  UserInputError,
  SyntaxError
} from '@apollo/server/errors';

// Custom error codes for business logic
export enum ErrorCode {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // User & Organization
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  ORGANIZATION_LIMIT_REACHED = 'ORGANIZATION_LIMIT_REACHED',
  INVALID_ORGANIZATION_MEMBER = 'INVALID_ORGANIZATION_MEMBER',

  // Dashboard & Widgets
  DASHBOARD_NOT_FOUND = 'DASHBOARD_NOT_FOUND',
  DASHBOARD_LIMIT_REACHED = 'DASHBOARD_LIMIT_REACHED',
  WIDGET_NOT_FOUND = 'WIDGET_NOT_FOUND',
  WIDGET_CONFIGURATION_INVALID = 'WIDGET_CONFIGURATION_INVALID',
  INVALID_WIDGET_TYPE = 'INVALID_WIDGET_TYPE',

  // Data Sources & Metrics
  DATA_SOURCE_NOT_FOUND = 'DATA_SOURCE_NOT_FOUND',
  DATA_SOURCE_CONNECTION_FAILED = 'DATA_SOURCE_CONNECTION_FAILED',
  DATA_SOURCE_TIMEOUT = 'DATA_SOURCE_TIMEOUT',
  DATA_SOURCE_LIMIT_REACHED = 'DATA_SOURCE_LIMIT_REACHED',
  METRIC_NOT_FOUND = 'METRIC_NOT_FOUND',
  METRIC_CALCULATION_FAILED = 'METRIC_CALCULATION_FAILED',
  INVALID_METRIC_QUERY = 'INVALID_METRIC_QUERY',

  // Alerts & Notifications
  ALERT_NOT_FOUND = 'ALERT_NOT_FOUND',
  ALERT_CONFIGURATION_INVALID = 'ALERT_CONFIGURATION_INVALID',
  NOTIFICATION_DELIVERY_FAILED = 'NOTIFICATION_DELIVERY_FAILED',

  // Export & File Operations
  EXPORT_NOT_FOUND = 'EXPORT_NOT_FOUND',
  EXPORT_GENERATION_FAILED = 'EXPORT_GENERATION_FAILED',
  EXPORT_LIMIT_REACHED = 'EXPORT_LIMIT_REACHED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_FORMAT = 'UNSUPPORTED_FILE_FORMAT',

  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  USAGE_LIMIT_REACHED = 'USAGE_LIMIT_REACHED',

  // Validation
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  FIELD_VALIDATION_FAILED = 'FIELD_VALIDATION_FAILED',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // System & Infrastructure
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',

  // Query & Performance
  QUERY_COMPLEXITY_TOO_HIGH = 'QUERY_COMPLEXITY_TOO_HIGH',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  QUERY_DEPTH_TOO_HIGH = 'QUERY_DEPTH_TOO_HIGH',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
}

// Error severity levels for monitoring and alerting
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Error categories for metrics and reporting
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  DATA_ACCESS = 'DATA_ACCESS',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
}

// Enhanced error extensions
interface ErrorExtensions extends GraphQLErrorExtensions {
  code: ErrorCode | ApolloServerErrorCode;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: string;
  requestId: string;
  userId?: string;
  organizationId?: string;
  retryable: boolean;
  details?: Record<string, any>;
  suggestion?: string;
}

// Custom error classes
export class BusinessLogicError extends GraphQLError {
  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.BUSINESS_LOGIC,
    extensions: Partial<ErrorExtensions> = {}
  ) {
    super(message, {
      extensions: {
        code,
        severity,
        category,
        timestamp: new Date().toISOString(),
        retryable: false,
        ...extensions,
      },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(
    message: string,
    field?: string,
    value?: any,
    extensions: Partial<ErrorExtensions> = {}
  ) {
    super(message, {
      extensions: {
        code: ErrorCode.FIELD_VALIDATION_FAILED,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        timestamp: new Date().toISOString(),
        retryable: false,
        details: {
          field,
          value,
        },
        ...extensions,
      },
    });
  }
}

export class ResourceNotFoundError extends GraphQLError {
  constructor(
    resource: string,
    id: string,
    extensions: Partial<ErrorExtensions> = {}
  ) {
    super(`${resource} with ID ${id} not found`, {
      extensions: {
        code: ErrorCode[`${resource.toUpperCase()}_NOT_FOUND` as keyof typeof ErrorCode] || ErrorCode.INTERNAL_ERROR,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.BUSINESS_LOGIC,
        timestamp: new Date().toISOString(),
        retryable: false,
        details: {
          resource,
          id,
        },
        ...extensions,
      },
    });
  }
}

export class ExternalServiceError extends GraphQLError {
  constructor(
    service: string,
    message: string,
    extensions: Partial<ErrorExtensions> = {}
  ) {
    super(`External service error from ${service}: ${message}`, {
      extensions: {
        code: ErrorCode.EXTERNAL_SERVICE_ERROR,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.EXTERNAL_SERVICE,
        timestamp: new Date().toISOString(),
        retryable: true,
        details: {
          service,
          originalMessage: message,
        },
        ...extensions,
      },
    });
  }
}

export class DatabaseError extends GraphQLError {
  constructor(
    message: string,
    query?: string,
    extensions: Partial<ErrorExtensions> = {}
  ) {
    super(`Database error: ${message}`, {
      extensions: {
        code: ErrorCode.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.DATA_ACCESS,
        timestamp: new Date().toISOString(),
        retryable: false,
        details: {
          query: query?.substring(0, 200), // Truncate for security
        },
        ...extensions,
      },
    });
  }
}

export class RateLimitError extends GraphQLError {
  constructor(
    limit: number,
    window: string,
    retryAfter?: number,
    extensions: Partial<ErrorExtensions> = {}
  ) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, {
      extensions: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        timestamp: new Date().toISOString(),
        retryable: true,
        details: {
          limit,
          window,
          retryAfter,
        },
        suggestion: retryAfter ? `Please retry after ${retryAfter} seconds` : 'Please retry later',
        ...extensions,
      },
    });
  }
}

export class UsageLimitError extends GraphQLError {
  constructor(
    resource: string,
    current: number,
    limit: number,
    extensions: Partial<ErrorExtensions> = {}
  ) {
    super(`Usage limit reached for ${resource}: ${current}/${limit}`, {
      extensions: {
        code: ErrorCode.USAGE_LIMIT_REACHED,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.BUSINESS_LOGIC,
        timestamp: new Date().toISOString(),
        retryable: false,
        details: {
          resource,
          current,
          limit,
        },
        suggestion: 'Please upgrade your plan or remove unused resources',
        ...extensions,
      },
    });
  }
}

// Error mapping utilities
export class ErrorMapper {
  private static errorMappings: Map<string, ErrorCode> = new Map([
    // Database errors
    ['23505', ErrorCode.DUPLICATE_ENTRY], // PostgreSQL unique violation
    ['23503', ErrorCode.INVALID_INPUT], // PostgreSQL foreign key violation
    ['23502', ErrorCode.REQUIRED_FIELD_MISSING], // PostgreSQL not null violation
    ['23514', ErrorCode.FIELD_VALIDATION_FAILED], // PostgreSQL check violation
    ['42P01', ErrorCode.INVALID_INPUT], // PostgreSQL undefined table
    ['42703', ErrorCode.INVALID_INPUT], // PostgreSQL undefined column

    // Network/timeout errors
    ['ENOTFOUND', ErrorCode.NETWORK_ERROR],
    ['ECONNREFUSED', ErrorCode.EXTERNAL_SERVICE_ERROR],
    ['ETIMEDOUT', ErrorCode.TIMEOUT_ERROR],
    ['ECONNRESET', ErrorCode.NETWORK_ERROR],
  ]);

  static mapError(error: Error, context?: any): GraphQLError {
    const timestamp = new Date().toISOString();
    const requestId = context?.requestId || 'unknown';
    const userId = context?.user?.id;
    const organizationId = context?.user?.organizationId;

    // Handle known error types
    if (error instanceof GraphQLError) {
      return error;
    }

    // Map database errors
    if ('code' in error && error.code && typeof error.code === 'string') {
      const mappedCode = this.errorMappings.get(error.code);
      if (mappedCode) {
        return new BusinessLogicError(
          error.message,
          mappedCode,
          ErrorSeverity.MEDIUM,
          ErrorCategory.DATA_ACCESS,
          {
            timestamp,
            requestId,
            userId,
            organizationId,
            details: { originalCode: error.code },
          }
        );
      }
    }

    // Handle specific error patterns
    if (error.message.includes('connection')) {
      return new ExternalServiceError(
        'Database',
        error.message,
        {
          timestamp,
          requestId,
          userId,
          organizationId,
        }
      );
    }

    if (error.message.includes('timeout')) {
      return new GraphQLError('Request timeout', {
        extensions: {
          code: ErrorCode.TIMEOUT_ERROR,
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.PERFORMANCE,
          timestamp,
          requestId,
          userId,
          organizationId,
          retryable: true,
          suggestion: 'Please try again or simplify your request',
        },
      });
    }

    // Default internal error
    return new GraphQLError('An unexpected error occurred', {
      extensions: {
        code: ErrorCode.INTERNAL_ERROR,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        timestamp,
        requestId,
        userId,
        organizationId,
        retryable: false,
        details: {
          originalMessage: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        suggestion: 'Please contact support if this issue persists',
      },
    });
  }
}

// Error aggregation for monitoring
export class ErrorAggregator {
  private static errors: Array<{
    error: GraphQLError;
    timestamp: string;
    context: any;
  }> = [];

  static track(error: GraphQLError, context?: any) {
    this.errors.push({
      error,
      timestamp: new Date().toISOString(),
      context,
    });

    // Keep only recent errors (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    this.errors = this.errors.filter(e => e.timestamp > oneHourAgo);

    // Alert on critical errors
    if (error.extensions?.severity === ErrorSeverity.CRITICAL) {
      this.alertCriticalError(error, context);
    }

    // Alert on high error rate
    const recentErrors = this.errors.filter(
      e => e.timestamp > new Date(Date.now() - 5 * 60 * 1000).toISOString()
    );
    if (recentErrors.length > 50) { // More than 50 errors in 5 minutes
      this.alertHighErrorRate(recentErrors.length);
    }
  }

  static getMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentErrors = this.errors.filter(
      e => new Date(e.timestamp) > oneHourAgo
    );

    const errorsBySeverity = recentErrors.reduce((acc, { error }) => {
      const severity = error.extensions?.severity as ErrorSeverity || ErrorSeverity.LOW;
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const errorsByCategory = recentErrors.reduce((acc, { error }) => {
      const category = error.extensions?.category as ErrorCategory || ErrorCategory.SYSTEM;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsByCode = recentErrors.reduce((acc, { error }) => {
      const code = error.extensions?.code as string || 'UNKNOWN';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: recentErrors.length,
      errorsBySeverity,
      errorsByCategory,
      errorsByCode,
      timestamp: now.toISOString(),
    };
  }

  private static alertCriticalError(error: GraphQLError, context?: any) {
    // In a real implementation, this would send to monitoring service
    console.error('CRITICAL ERROR ALERT:', {
      message: error.message,
      code: error.extensions?.code,
      requestId: error.extensions?.requestId,
      userId: error.extensions?.userId,
      organizationId: error.extensions?.organizationId,
      timestamp: error.extensions?.timestamp,
      context,
    });
  }

  private static alertHighErrorRate(errorCount: number) {
    console.warn('HIGH ERROR RATE ALERT:', {
      errorCount,
      timeWindow: '5 minutes',
      timestamp: new Date().toISOString(),
    });
  }
}

// Format error for client response
export const formatError = (error: GraphQLError, context?: any): GraphQLError => {
  // Track error for monitoring
  ErrorAggregator.track(error, context);

  // Map unknown errors
  const mappedError = error instanceof GraphQLError ?
    error :
    ErrorMapper.mapError(error as Error, context);

  // Sanitize error for production
  if (process.env.NODE_ENV === 'production') {
    // Remove sensitive information
    const sanitizedExtensions = { ...mappedError.extensions };
    delete sanitizedExtensions.details?.stack;
    delete sanitizedExtensions.details?.query;

    return new GraphQLError(
      mappedError.message,
      {
        nodes: mappedError.nodes,
        source: mappedError.source,
        positions: mappedError.positions,
        path: mappedError.path,
        originalError: undefined, // Never expose original error in production
        extensions: sanitizedExtensions,
      }
    );
  }

  return mappedError;
};

// Validation helpers
export const validateRequired = (value: any, fieldName: string) => {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
};

export const validateEmail = (email: string, fieldName: string = 'email') => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format`, fieldName, email);
  }
};

export const validateUUID = (id: string, fieldName: string = 'id') => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError(`Invalid UUID format`, fieldName, id);
  }
};

export const validateStringLength = (
  value: string,
  min: number,
  max: number,
  fieldName: string
) => {
  if (value.length < min || value.length > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max} characters`,
      fieldName,
      value
    );
  }
};

export const validatePositiveNumber = (value: number, fieldName: string) => {
  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be positive`, fieldName, value);
  }
};

// Export all error types and utilities
export {
  ErrorMapper,
  ErrorAggregator,
  formatError,
};
