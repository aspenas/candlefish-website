/**
 * Security Logger Module
 * Provides structured logging for security events without exposing sensitive data
 * Compatible with Fly.io and cloud logging services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security' | 'audit';

interface LogContext {
  event: string;
  [key: string]: any;
}

interface SecurityEvent extends LogContext {
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'threat';
}

class SecurityLogger {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly sensitivePatterns: RegExp[];

  constructor() {
    this.serviceName = 'paintbox';
    this.environment = process.env.NODE_ENV || 'development';
    
    // Patterns to redact from logs
    this.sensitivePatterns = [
      /AWS_SECRET_ACCESS_KEY=[\w+/]+/gi,
      /AWS_ACCESS_KEY_ID=[\w]+/gi,
      /Bearer\s+[\w\-._~+/]+=*/gi,
      /password["\s:=]+["']?[\w\-._~+/]+["']?/gi,
      /secret["\s:=]+["']?[\w\-._~+/]+["']?/gi,
      /private["\s:=]+["']?[\w\-._~+/]+["']?/gi,
      /token["\s:=]+["']?[\w\-._~+/]+["']?/gi,
      /api[_-]?key["\s:=]+["']?[\w\-._~+/]+["']?/gi,
      /client[_-]?secret["\s:=]+["']?[\w\-._~+/]+["']?/gi,
    ];
  }

  /**
   * Sanitize log data to remove sensitive information
   */
  private sanitize(data: any): any {
    if (typeof data === 'string') {
      let sanitized = data;
      for (const pattern of this.sensitivePatterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
      return sanitized;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Redact entire value for sensitive keys
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('key') ||
          lowerKey.includes('authorization')
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Format log entry with metadata
   */
  private formatLogEntry(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitize(context) : {};
    
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      environment: this.environment,
      message: this.sanitize(message),
      ...sanitizedContext,
      // Add request ID if available (for tracing)
      requestId: (global as any).requestId || undefined,
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Log to appropriate output based on environment
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const formattedEntry = this.formatLogEntry(level, message, context);
    
    // In production, use structured logging
    if (this.environment === 'production') {
      switch (level) {
        case 'error':
        case 'security':
          console.error(formattedEntry);
          break;
        case 'warn':
          console.warn(formattedEntry);
          break;
        case 'debug':
          // Only log debug in development
          if (process.env.DEBUG === 'true') {
            console.log(formattedEntry);
          }
          break;
        default:
          console.log(formattedEntry);
      }
    } else {
      // In development, use readable format
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        security: '🔐',
        audit: '📋',
      }[level];
      
      console.log(`${emoji} [${level.toUpperCase()}] ${message}`);
      if (context) {
        console.log('  Context:', this.sanitize(context));
      }
    }
  }

  // Public logging methods
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
    
    // In production, also send to error tracking service
    if (this.environment === 'production' && context?.error) {
      this.sendToErrorTracking(message, context);
    }
  }

  /**
   * Log security-specific events
   */
  security(message: string, event: SecurityEvent): void {
    const enhancedContext = {
      ...event,
      category: event.category || 'general',
      severity: event.severity || 'MEDIUM',
    };
    
    this.log('security', message, enhancedContext);
    
    // Send critical security events to alerting system
    if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
      this.sendSecurityAlert(message, enhancedContext);
    }
  }

  /**
   * Log audit trail events
   */
  audit(message: string, context: LogContext): void {
    this.log('audit', message, {
      ...context,
      auditTimestamp: Date.now(),
      auditId: this.generateAuditId(),
    });
  }

  /**
   * Send error to external tracking service (e.g., Sentry)
   */
  private sendToErrorTracking(message: string, context: LogContext): void {
    // Implementation would integrate with error tracking service
    // For now, just log that we would send it
    if (process.env.SENTRY_DSN) {
      // Sentry.captureException(context.error, { extra: context });
    }
  }

  /**
   * Send security alert to notification system
   */
  private sendSecurityAlert(message: string, context: SecurityEvent): void {
    // Implementation would integrate with alerting system (SNS, PagerDuty, etc.)
    // For now, just log that we would send an alert
    if (process.env.SECURITY_ALERT_WEBHOOK) {
      // Send webhook notification
      fetch(process.env.SECURITY_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Security Alert: ${message}`,
          severity: context.severity,
          context: this.sanitize(context),
        }),
      }).catch(err => {
        console.error('Failed to send security alert:', err);
      });
    }
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): SecurityLogger {
    const childLogger = Object.create(this);
    childLogger.defaultContext = context;
    return childLogger;
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

// Export types for use in other modules
export type { LogLevel, LogContext, SecurityEvent };