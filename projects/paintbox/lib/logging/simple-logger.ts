/**
 * Simple Logger for Paintbox Application
 * Provides structured logging with different levels and consistent formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: unknown;
  timestamp?: string;
  level?: string;
  component?: string;
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

class SimpleLogger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLog(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      // Pretty print for development
      return JSON.stringify(logEntry, null, 2);
    }

    // Single line JSON for production
    return JSON.stringify(logEntry);
  }

  private writeLog(level: string, message: string, context?: LogContext): void {
    const formattedLog = this.formatLog(level, message, context);

    if (level === 'ERROR') {
      console.error(formattedLog);
    } else if (level === 'WARN') {
      console.warn(formattedLog);
    } else {
      console.log(formattedLog);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog('DEBUG', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog('INFO', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog('WARN', message, context);
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog('ERROR', message, context);
    }
  }

  // Security-specific logging methods
  security(message: string, context?: LogContext): void {
    this.warn(`[SECURITY] ${message}`, {
      ...context,
      security: true,
    });
  }

  audit(action: string, context?: LogContext): void {
    this.info(`[AUDIT] ${action}`, {
      ...context,
      audit: true,
    });
  }

  // Middleware-specific logging
  middleware(middlewareName: string, message: string, context?: LogContext): void {
    this.info(`[MIDDLEWARE:${middlewareName}] ${message}`, context);
  }

  // Authentication logging
  auth(message: string, context?: LogContext): void {
    this.info(`[AUTH] ${message}`, {
      ...context,
      component: 'auth',
    });
  }

  // Rate limiting logging
  rateLimit(message: string, context?: LogContext): void {
    this.warn(`[RATE_LIMIT] ${message}`, {
      ...context,
      component: 'rate-limit',
    });
  }

  // Request logging
  request(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, {
      ...context,
      component: 'request',
      method,
      path,
    });
  }
}

// Singleton instance
export const logger = new SimpleLogger();

// Helper function to create contextual loggers
export function createContextLogger(defaultContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...defaultContext, ...context }),
    error: (message: string, context?: LogContext) =>
      logger.error(message, { ...defaultContext, ...context }),
    security: (message: string, context?: LogContext) =>
      logger.security(message, { ...defaultContext, ...context }),
    audit: (action: string, context?: LogContext) =>
      logger.audit(action, { ...defaultContext, ...context }),
    middleware: (middlewareName: string, message: string, context?: LogContext) =>
      logger.middleware(middlewareName, message, { ...defaultContext, ...context }),
    auth: (message: string, context?: LogContext) =>
      logger.auth(message, { ...defaultContext, ...context }),
    rateLimit: (message: string, context?: LogContext) =>
      logger.rateLimit(message, { ...defaultContext, ...context }),
    request: (method: string, path: string, context?: LogContext) =>
      logger.request(method, path, { ...defaultContext, ...context }),
  };
}

// Helper function to extract request context from Next.js request
export function getRequestContext(req: any): LogContext {
  const context: LogContext = {};

  if (req.headers) {
    context.ip = req.headers['x-forwarded-for'] ||
                 req.headers['x-real-ip'] ||
                 req.connection?.remoteAddress ||
                 req.socket?.remoteAddress;
    context.userAgent = req.headers['user-agent'];
  }

  if (req.url) {
    context.path = req.url;
  }

  if (req.method) {
    context.method = req.method;
  }

  // Extract request ID if available (from correlation ID middleware)
  if (req.headers?.['x-request-id']) {
    context.requestId = req.headers['x-request-id'];
  }

  return context;
}
