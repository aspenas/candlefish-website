/**
 * Production Error Handler Middleware
 * Comprehensive error handling for production environment
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/simple-logger';

export interface ErrorDetails {
  message: string;
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  stack?: string;
  timestamp: string;
  requestId: string;
}

export interface ProductionErrorResponse {
  error: {
    message: string;
    code?: string;
    requestId: string;
    timestamp: string;
  };
  status: number;
}

export class ProductionError extends Error {
  public statusCode: number;
  public code: string;
  public context: Record<string, any>;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    context?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ProductionError';
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.context = context || {};
    this.isOperational = isOperational;

    // Maintain proper stack trace
    Error.captureStackTrace(this, ProductionError);
  }
}

// Pre-defined production error types
export class ValidationError extends ProductionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', context);
  }
}

export class AuthenticationError extends ProductionError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', context);
  }
}

export class AuthorizationError extends ProductionError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', context);
  }
}

export class NotFoundError extends ProductionError {
  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND', context);
  }
}

export class ConflictError extends ProductionError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, 'CONFLICT_ERROR', context);
  }
}

export class RateLimitError extends ProductionError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_ERROR', context);
  }
}

export class ServiceUnavailableError extends ProductionError {
  constructor(message: string = 'Service temporarily unavailable', context?: Record<string, any>) {
    super(message, 503, 'SERVICE_UNAVAILABLE', context);
  }
}

export class ExternalServiceError extends ProductionError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...context });
  }
}

// Error classification utility
export function classifyError(error: any): {
  isOperational: boolean;
  statusCode: number;
  code: string;
  shouldRetry: boolean;
} {
  // Production errors
  if (error instanceof ProductionError) {
    return {
      isOperational: error.isOperational,
      statusCode: error.statusCode,
      code: error.code,
      shouldRetry: error.statusCode >= 500 && error.statusCode < 600,
    };
  }

  // Salesforce errors
  if (error.name === 'INVALID_SESSION_ID' || error.errorCode === 'INVALID_SESSION_ID') {
    return {
      isOperational: true,
      statusCode: 401,
      code: 'SALESFORCE_SESSION_EXPIRED',
      shouldRetry: true,
    };
  }

  // CompanyCam errors
  if (error.response?.status === 401 && error.config?.url?.includes('companycam')) {
    return {
      isOperational: true,
      statusCode: 401,
      code: 'COMPANYCAM_AUTHENTICATION_ERROR',
      shouldRetry: true,
    };
  }

  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return {
      isOperational: true,
      statusCode: 503,
      code: 'DATABASE_CONNECTION_ERROR',
      shouldRetry: true,
    };
  }

  // Redis connection errors
  if (error.code === 'ENOTFOUND' && error.message?.includes('redis')) {
    return {
      isOperational: true,
      statusCode: 503,
      code: 'REDIS_CONNECTION_ERROR',
      shouldRetry: true,
    };
  }

  // Network timeouts
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return {
      isOperational: true,
      statusCode: 504,
      code: 'REQUEST_TIMEOUT',
      shouldRetry: true,
    };
  }

  // Validation errors (Zod, etc.)
  if (error.name === 'ZodError') {
    return {
      isOperational: true,
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      shouldRetry: false,
    };
  }

  // Default for unknown errors
  return {
    isOperational: false,
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    shouldRetry: false,
  };
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Sanitize error for production response
function sanitizeErrorForProduction(
  error: any,
  requestId: string,
  includeStack: boolean = false
): ProductionErrorResponse {
  const classification = classifyError(error);

  // Build safe error response
  const response: ProductionErrorResponse = {
    error: {
      message: classification.isOperational
        ? error.message
        : 'An internal server error occurred',
      code: classification.code,
      requestId,
      timestamp: new Date().toISOString(),
    },
    status: classification.statusCode,
  };

  return response;
}

// Log error with appropriate level and context
function logError(error: any, requestId: string, request?: NextRequest): void {
  const classification = classifyError(error);

  const logContext = {
    requestId,
    error: {
      name: error.name || 'Unknown',
      message: error.message,
      code: classification.code,
      statusCode: classification.statusCode,
      isOperational: classification.isOperational,
      stack: error.stack,
    },
    request: request ? {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown',
    } : undefined,
  };

  // Log with appropriate level
  if (classification.isOperational && classification.statusCode < 500) {
    logger.warn('Operational error occurred', logContext);
  } else if (classification.isOperational && classification.statusCode >= 500) {
    logger.error('Operational service error', logContext);
  } else {
    logger.error('Unexpected error occurred', logContext);
  }
}

// Main error handler function
export function handleError(
  error: any,
  request?: NextRequest,
  options: {
    includeStack?: boolean;
    customRequestId?: string;
  } = {}
): NextResponse {
  const requestId = options.customRequestId || generateRequestId();

  // Log the error
  logError(error, requestId, request);

  // Generate safe response
  const response = sanitizeErrorForProduction(error, requestId, options.includeStack);

  // Set security headers
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  });

  return NextResponse.json(response.error, {
    status: response.status,
    headers,
  });
}

// Async error handler wrapper for API routes
export function withErrorHandler<T = any>(
  handler: (request: NextRequest, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

// Error boundary for middleware chains
export function errorBoundary(
  middleware: (request: NextRequest) => Promise<NextResponse | any>
) {
  return async (request: NextRequest): Promise<NextResponse | any> => {
    try {
      return await middleware(request);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

// Circuit breaker for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private retryTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    serviceName: string
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.retryTimeout) {
        throw new ServiceUnavailableError(`Circuit breaker open for ${serviceName}`);
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        ),
      ]);

      // Success - reset circuit breaker
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Global circuit breakers for external services
export const salesforceCircuitBreaker = new CircuitBreaker(3, 30000, 60000);
export const companyCamCircuitBreaker = new CircuitBreaker(3, 30000, 60000);
export const redisCircuitBreaker = new CircuitBreaker(5, 10000, 30000);

// Export everything for production use - classifyError already exported above
export {
  generateRequestId,
  sanitizeErrorForProduction,
  logError,
};
