import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'ErrorMiddleware' });

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create standardized error response
 */
const createErrorResponse = (
  error: any,
  requestId?: string
): ApiResponse => {
  return {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error.details || undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: 'v1',
    },
  };
};

/**
 * Handle different types of errors
 */
const handleError = (error: any): { statusCode: number; response: ApiResponse } => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  // Handle custom application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
  }
  // Handle Prisma errors
  else if (error.code?.startsWith('P')) {
    statusCode = 400;
    errorCode = 'DATABASE_ERROR';

    switch (error.code) {
      case 'P2002':
        message = 'A record with this information already exists';
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        message = 'The requested record was not found';
        errorCode = 'NOT_FOUND';
        statusCode = 404;
        break;
      case 'P2003':
        message = 'Invalid reference to related record';
        errorCode = 'FOREIGN_KEY_ERROR';
        break;
      default:
        message = 'Database operation failed';
    }
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  // Handle validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid input data';
  }
  // Handle Redis errors
  else if (error.code === 'ECONNREFUSED' && error.port === 6379) {
    statusCode = 503;
    errorCode = 'REDIS_CONNECTION_ERROR';
    message = 'Session service temporarily unavailable';
  }
  // Handle database connection errors
  else if (error.code === 'ECONNREFUSED' && error.port === 5432) {
    statusCode = 503;
    errorCode = 'DATABASE_CONNECTION_ERROR';
    message = 'Database temporarily unavailable';
  }
  // Handle known application errors
  else if (typeof error.message === 'string') {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes('user already exists')) {
      statusCode = 409;
      errorCode = 'USER_EXISTS';
      message = 'A user with this email already exists';
    }
    else if (lowerMessage.includes('invalid email or password')) {
      statusCode = 401;
      errorCode = 'INVALID_CREDENTIALS';
      message = 'Invalid email or password';
    }
    else if (lowerMessage.includes('account is locked')) {
      statusCode = 423;
      errorCode = 'ACCOUNT_LOCKED';
      message = error.message;
    }
    else if (lowerMessage.includes('account is deactivated')) {
      statusCode = 403;
      errorCode = 'ACCOUNT_DEACTIVATED';
      message = 'Account is deactivated';
    }
    else if (lowerMessage.includes('organization slug is already taken')) {
      statusCode = 409;
      errorCode = 'ORGANIZATION_EXISTS';
      message = 'Organization slug is already taken';
    }
    else if (lowerMessage.includes('password validation failed')) {
      statusCode = 400;
      errorCode = 'WEAK_PASSWORD';
      message = error.message;
    }
    else {
      message = error.message;
    }
  }

  const response = createErrorResponse(
    { code: errorCode, message },
    undefined
  );

  return { statusCode, response };
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;

  // Log the error
  const logData = {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    requestId,
  };

  if (error instanceof AppError && error.isOperational) {
    moduleLogger.warn('Operational error:', logData);
  } else {
    moduleLogger.error('Unexpected error:', logData);
  }

  // Handle the error and send response
  const { statusCode, response } = handleError(error);
  response.meta!.requestId = requestId;

  if (!res.headersSent) {
    res.status(statusCode).json(response);
  }
};

/**
 * Handle 404 errors (route not found)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string,
      version: 'v1',
    },
  };

  moduleLogger.warn('Route not found:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  res.status(404).json(response);
};

/**
 * Async wrapper for route handlers to catch promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  moduleLogger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });

  // Don't crash the process in production, log and continue
  if (process.env.NODE_ENV !== 'production') {
    throw reason;
  }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  moduleLogger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });

  // Gracefully shutdown
  process.exit(1);
});
