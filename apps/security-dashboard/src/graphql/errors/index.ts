import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { AuthenticationError, ForbiddenError, UserInputError, ApolloError } from 'apollo-server-errors';

// Custom error types for security domain
export class ValidationError extends ApolloError {
  constructor(message: string, field?: string, rejectedValue?: any) {
    super(message, 'VALIDATION_ERROR', {
      field,
      rejectedValue,
    });
    Object.defineProperty(this, 'name', { value: 'ValidationError' });
  }
}

export class NotFoundError extends ApolloError {
  constructor(entityType: string, entityId: string) {
    super(`${entityType} with ID ${entityId} not found`, 'NOT_FOUND', {
      entityType,
      entityId,
    });
    Object.defineProperty(this, 'name', { value: 'NotFoundError' });
  }
}

export class ConflictError extends ApolloError {
  constructor(message: string, conflictingFields?: string[]) {
    super(message, 'CONFLICT', {
      conflictingFields,
    });
    Object.defineProperty(this, 'name', { value: 'ConflictError' });
  }
}

export class RateLimitError extends ApolloError {
  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`, 'RATE_LIMITED', {
      retryAfter,
    });
    Object.defineProperty(this, 'name', { value: 'RateLimitError' });
  }
}

export class InsufficientPermissionsError extends ApolloError {
  constructor(requiredRole?: string, requiredPermissions?: string[]) {
    super('Insufficient permissions to perform this action', 'INSUFFICIENT_PERMISSIONS', {
      requiredRole,
      requiredPermissions,
    });
    Object.defineProperty(this, 'name', { value: 'InsufficientPermissionsError' });
  }
}

export class ExternalServiceError extends ApolloError {
  constructor(service: string, originalError?: Error) {
    super(`External service ${service} is unavailable`, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message,
    });
    Object.defineProperty(this, 'name', { value: 'ExternalServiceError' });
  }
}

export class DataIntegrityError extends ApolloError {
  constructor(message: string, constraints?: string[]) {
    super(message, 'DATA_INTEGRITY_ERROR', {
      constraints,
    });
    Object.defineProperty(this, 'name', { value: 'DataIntegrityError' });
  }
}

export class TimeoutError extends ApolloError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation ${operation} timed out after ${timeoutMs}ms`, 'TIMEOUT', {
      operation,
      timeoutMs,
    });
    Object.defineProperty(this, 'name', { value: 'TimeoutError' });
  }
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Error categories for monitoring and alerting
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  TIMEOUT = 'TIMEOUT',
  INTERNAL = 'INTERNAL',
  NETWORK = 'NETWORK',
  SECURITY = 'SECURITY',
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  operationName?: string;
  variables?: Record<string, any>;
  path?: string[];
  timestamp: Date;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Enhanced error class with security context
export class SecurityError extends ApolloError {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context: ErrorContext;
  public readonly shouldAlert: boolean;
  public readonly shouldLog: boolean;

  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.INTERNAL,
    context: Partial<ErrorContext> = {},
    shouldAlert: boolean = false,
    shouldLog: boolean = true,
    extensions?: Record<string, any>
  ) {
    super(message, code, extensions);
    
    this.severity = severity;
    this.category = category;
    this.context = {
      timestamp: new Date(),
      ...context,
    };
    this.shouldAlert = shouldAlert;
    this.shouldLog = shouldLog;
    
    Object.defineProperty(this, 'name', { value: 'SecurityError' });
  }
}

// Error mapping from common database/service errors
export const mapExternalError = (error: Error, context: Partial<ErrorContext> = {}): GraphQLError => {
  const errorMessage = error.message.toLowerCase();
  
  // Database constraint violations
  if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
    return new ConflictError('Resource already exists', ['unique_constraint']);
  }
  
  // Foreign key violations
  if (errorMessage.includes('foreign key constraint')) {
    return new DataIntegrityError('Referenced resource does not exist', ['foreign_key']);
  }
  
  // Network timeouts
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return new TimeoutError(context.operationName || 'unknown', 30000);
  }
  
  // Connection errors
  if (errorMessage.includes('connection refused') || errorMessage.includes('network error')) {
    return new ExternalServiceError('database', error);
  }
  
  // Permission denied at database level
  if (errorMessage.includes('permission denied') || errorMessage.includes('access denied')) {
    return new InsufficientPermissionsError();
  }
  
  // Default to generic error
  return new SecurityError(
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    ErrorSeverity.HIGH,
    ErrorCategory.INTERNAL,
    context,
    true, // Alert on internal errors
    true
  );
};

// Error formatter for GraphQL responses
export const formatError = (error: GraphQLFormattedError, context?: any): GraphQLFormattedError => {
  // Extract error details
  const originalError = error.extensions?.exception;
  const errorCode = error.extensions?.code || 'INTERNAL_ERROR';
  const errorPath = error.path?.join('.') || 'unknown';
  
  // Create error context
  const errorContext: ErrorContext = {
    userId: context?.user?.id,
    organizationId: context?.user?.organizationId,
    operationName: context?.operationName,
    variables: context?.variables,
    path: error.path,
    timestamp: new Date(),
    requestId: context?.requestId,
    userAgent: context?.userAgent,
    ipAddress: context?.ipAddress,
  };

  // Determine if error should be logged/monitored
  const shouldLog = shouldLogError(error, errorContext);
  const shouldAlert = shouldAlertError(error, errorContext);
  
  // Log error details
  if (shouldLog) {
    logError(error, errorContext, shouldAlert);
  }
  
  // Send alerts for critical errors
  if (shouldAlert) {
    sendErrorAlert(error, errorContext);
  }
  
  // Format error for client response
  const formattedError: GraphQLFormattedError = {
    message: sanitizeErrorMessage(error.message, context),
    extensions: {
      code: errorCode,
      timestamp: errorContext.timestamp.toISOString(),
      path: errorPath,
      requestId: errorContext.requestId,
    },
    locations: error.locations,
    path: error.path,
  };
  
  // Add additional context in development
  if (process.env.NODE_ENV === 'development') {
    formattedError.extensions!.originalError = originalError;
    formattedError.extensions!.stack = error.extensions?.exception?.stacktrace;
  }
  
  // Add user-specific context for authorized users
  if (context?.user) {
    formattedError.extensions!.userId = context.user.id;
    formattedError.extensions!.organizationId = context.user.organizationId;
  }
  
  return formattedError;
};

// Determine if error should be logged
const shouldLogError = (error: GraphQLFormattedError, context: ErrorContext): boolean => {
  const errorCode = error.extensions?.code;
  
  // Always log internal errors
  if (errorCode === 'INTERNAL_ERROR' || errorCode === 'EXTERNAL_SERVICE_ERROR') {
    return true;
  }
  
  // Log security-related errors
  if (['UNAUTHENTICATED', 'FORBIDDEN', 'INSUFFICIENT_PERMISSIONS'].includes(errorCode)) {
    return true;
  }
  
  // Log rate limiting and abuse
  if (errorCode === 'RATE_LIMITED' || errorCode === 'QUERY_COMPLEXITY_EXCEEDED') {
    return true;
  }
  
  // Skip logging for common client errors
  if (['VALIDATION_ERROR', 'NOT_FOUND', 'USER_INPUT_ERROR'].includes(errorCode)) {
    return false;
  }
  
  return true;
};

// Determine if error should trigger alerts
const shouldAlertError = (error: GraphQLFormattedError, context: ErrorContext): boolean => {
  const errorCode = error.extensions?.code;
  
  // Alert on internal server errors
  if (errorCode === 'INTERNAL_ERROR') {
    return true;
  }
  
  // Alert on external service failures
  if (errorCode === 'EXTERNAL_SERVICE_ERROR') {
    return true;
  }
  
  // Alert on security breaches
  if (errorCode === 'INSUFFICIENT_PERMISSIONS' && context.userId) {
    return true; // Someone with valid auth tried to access forbidden resource
  }
  
  // Alert on high rate of authentication failures (potential attack)
  if (errorCode === 'UNAUTHENTICATED') {
    return checkForSuspiciousActivity(context);
  }
  
  return false;
};

// Check for suspicious activity patterns
const checkForSuspiciousActivity = (context: ErrorContext): boolean => {
  // In production, implement rate tracking and pattern detection
  // For now, return false to avoid false alarms
  return false;
};

// Sanitize error messages for client responses
const sanitizeErrorMessage = (message: string, context: any): string => {
  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    // Map specific error patterns to generic messages
    const sensitivePatterns = [
      /database/i,
      /sql/i,
      /connection/i,
      /internal/i,
      /server/i,
      /stack/i,
      /trace/i,
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return 'An unexpected error occurred. Please try again later.';
      }
    }
  }
  
  return message;
};

// Log error with structured logging
const logError = (error: GraphQLFormattedError, context: ErrorContext, shouldAlert: boolean): void => {
  const logEntry = {
    level: shouldAlert ? 'error' : 'warn',
    message: error.message,
    error: {
      code: error.extensions?.code,
      path: error.path?.join('.'),
      locations: error.locations,
    },
    context: {
      userId: context.userId,
      organizationId: context.organizationId,
      operationName: context.operationName,
      requestId: context.requestId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    },
    timestamp: context.timestamp.toISOString(),
    shouldAlert,
  };
  
  if (shouldAlert) {
    console.error('🚨 GraphQL Error Alert:', JSON.stringify(logEntry, null, 2));
  } else {
    console.warn('⚠️  GraphQL Error:', JSON.stringify(logEntry, null, 2));
  }
  
  // In production, send to your logging service (e.g., Winston, Bunyan, etc.)
  // logger.log(logEntry.level, logEntry);
};

// Send error alerts (integrate with your alerting system)
const sendErrorAlert = async (error: GraphQLFormattedError, context: ErrorContext): Promise<void> => {
  const alert = {
    title: 'GraphQL Error Alert',
    message: error.message,
    severity: 'high',
    context,
    timestamp: new Date().toISOString(),
    error: {
      code: error.extensions?.code,
      path: error.path?.join('.'),
    },
  };
  
  // In production, integrate with your alerting system
  // await alertingService.send(alert);
  console.log('🚨 Alert would be sent:', alert);
};

// Partial response helper for handling multiple errors
export class PartialResponseBuilder {
  private data: any = {};
  private errors: GraphQLError[] = [];
  
  setField(path: string, value: any): this {
    const pathParts = path.split('.');
    let current = this.data;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[pathParts[pathParts.length - 1]] = value;
    return this;
  }
  
  addError(error: GraphQLError): this {
    this.errors.push(error);
    return this;
  }
  
  build(): { data: any; errors: GraphQLError[] } {
    return {
      data: this.data,
      errors: this.errors,
    };
  }
}

// Resilient field resolver wrapper
export const resilientResolver = <T>(
  resolver: (...args: any[]) => Promise<T>,
  fallbackValue: T | null = null,
  errorMessage: string = 'Field temporarily unavailable'
) => {
  return async (...args: any[]): Promise<T | null> => {
    try {
      return await resolver(...args);
    } catch (error) {
      const context = args[2]; // GraphQL context is the third argument
      
      // Log the error
      console.warn(`🔧 Resilient resolver caught error:`, {
        error: error instanceof Error ? error.message : error,
        field: context?.info?.fieldName,
        path: context?.info?.path,
        userId: context?.user?.id,
      });
      
      // Return fallback value instead of throwing
      return fallbackValue;
    }
  };
};

// Error boundary for resolver execution
export const withErrorBoundary = <T>(
  resolver: (...args: any[]) => Promise<T>,
  options: {
    fallback?: T | null;
    logError?: boolean;
    alertOnError?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
  } = {}
) => {
  const {
    fallback = null,
    logError = true,
    alertOnError = false,
    retryAttempts = 0,
    retryDelay = 1000,
  } = options;
  
  return async (...args: any[]): Promise<T | null> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        return await resolver(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retryAttempts) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
        
        // Final attempt failed
        const context = args[2];
        
        if (logError) {
          console.error(`🚫 Resolver error after ${retryAttempts + 1} attempts:`, {
            error: lastError.message,
            field: context?.info?.fieldName,
            path: context?.info?.path,
            userId: context?.user?.id,
            attempts: retryAttempts + 1,
          });
        }
        
        if (alertOnError) {
          sendErrorAlert({
            message: lastError.message,
            extensions: { code: 'RESOLVER_ERROR' },
            path: context?.info?.path,
            locations: undefined,
          }, {
            userId: context?.user?.id,
            organizationId: context?.user?.organizationId,
            operationName: context?.info?.operation?.name?.value,
            path: context?.info?.path,
            timestamp: new Date(),
          });
        }
        
        // Return fallback instead of throwing
        return fallback as T | null;
      }
    }
    
    return fallback as T | null;
  };
};

// Circuit breaker for external service calls
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private maxFailures: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ExternalServiceError('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.maxFailures) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Error metrics collector
export class ErrorMetrics {
  private errorCounts: Map<string, number> = new Map();
  private errorRates: Map<string, { count: number; window: number }> = new Map();
  
  recordError(errorCode: string, context?: ErrorContext): void {
    // Count total errors by code
    const currentCount = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, currentCount + 1);
    
    // Track error rates in time windows
    const windowKey = `${errorCode}_${Math.floor(Date.now() / 60000)}`; // 1-minute windows
    const currentRate = this.errorRates.get(windowKey) || { count: 0, window: Math.floor(Date.now() / 60000) };
    this.errorRates.set(windowKey, { ...currentRate, count: currentRate.count + 1 });
    
    // Log metrics
    console.log(`📊 Error recorded: ${errorCode}`, {
      totalCount: this.errorCounts.get(errorCode),
      windowCount: this.errorRates.get(windowKey)?.count,
      context: context ? {
        userId: context.userId,
        organizationId: context.organizationId,
        operationName: context.operationName,
      } : undefined,
    });
  }
  
  getErrorCounts(): Map<string, number> {
    return new Map(this.errorCounts);
  }
  
  getErrorRate(errorCode: string, windowMinutes: number = 5): number {
    const now = Math.floor(Date.now() / 60000);
    let totalErrors = 0;
    
    for (let i = 0; i < windowMinutes; i++) {
      const windowKey = `${errorCode}_${now - i}`;
      const windowData = this.errorRates.get(windowKey);
      if (windowData) {
        totalErrors += windowData.count;
      }
    }
    
    return totalErrors / windowMinutes; // Errors per minute
  }
  
  // Clean up old metrics
  cleanup(): void {
    const cutoff = Math.floor(Date.now() / 60000) - 60; // Keep last 60 minutes
    
    for (const [key, data] of this.errorRates.entries()) {
      if (data.window < cutoff) {
        this.errorRates.delete(key);
      }
    }
  }
}

// Create global error metrics instance
export const errorMetrics = new ErrorMetrics();

// Cleanup interval for error metrics
setInterval(() => {
  errorMetrics.cleanup();
}, 300000); // Clean up every 5 minutes

// Export all error handling utilities
export {
  formatError,
  mapExternalError,
  resilientResolver,
  withErrorBoundary,
  ErrorSeverity,
  ErrorCategory,
  SecurityError,
};