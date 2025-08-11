import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';

const moduleLogger = logger.child({ module: 'SecurityMiddleware' });

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable COEP for API
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Allow specific origins in production
    const allowedOrigins = [
      'https://candlefish.ai',
      'https://www.candlefish.ai',
      'https://app.candlefish.ai',
      'https://api.candlefish.ai',
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    moduleLogger.warn('CORS blocked request from origin:', { origin });
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
  ],
};

/**
 * Request ID middleware
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId;
  res.set('X-Request-ID', requestId);

  next();
};

/**
 * IP validation middleware
 */
export const validateIP = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = req.ip;

  if (!clientIP) {
    moduleLogger.warn('Request without IP address');
  }

  // Block known bad IPs in production
  if (process.env.NODE_ENV === 'production') {
    const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];

    if (blockedIPs.includes(clientIP)) {
      moduleLogger.warn('Blocked IP attempted request:', { ip: clientIP });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(403).json(response);
      return;
    }
  }

  next();
};

/**
 * User agent validation
 */
export const validateUserAgent = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent');

  if (!userAgent) {
    moduleLogger.warn('Request without User-Agent header');
    // Don't block, just log
  }

  // Block obviously malicious user agents
  const blockedPatterns = [
    /sqlmap/i,
    /nikto/i,
    /w3af/i,
    /dirbuster/i,
    /nessus/i,
    /openvas/i,
  ];

  if (userAgent && blockedPatterns.some(pattern => pattern.test(userAgent))) {
    moduleLogger.warn('Blocked malicious User-Agent:', { userAgent });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    res.status(403).json(response);
    return;
  }

  next();
};

/**
 * Request size limit middleware
 */
export const requestSizeLimit = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      moduleLogger.warn('Request size too large:', {
        size: contentLength,
        maxSize,
        ip: req.ip,
        url: req.url,
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds ${maxSize} bytes`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(413).json(response);
      return;
    }

    next();
  };
};

/**
 * Slow loris attack protection
 */
export const slowLorisProtection = (req: Request, res: Response, next: NextFunction): void => {
  const timeout = 30000; // 30 seconds

  const timer = setTimeout(() => {
    moduleLogger.warn('Request timeout - possible slow loris attack:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });

    if (!res.headersSent) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout',
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(408).json(response);
    }
  }, timeout);

  res.on('finish', () => {
    clearTimeout(timer);
  });

  res.on('close', () => {
    clearTimeout(timer);
  });

  next();
};

/**
 * API key validation middleware
 */
export const validateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    next(); // API key is optional, let other auth handle it
    return;
  }

  try {
    // Extract key prefix and validate format
    if (!apiKey.startsWith('cf_')) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(401).json(response);
      return;
    }

    // TODO: Implement API key validation with database
    // For now, just continue
    next();
  } catch (error) {
    moduleLogger.error('API key validation failed:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'API key validation failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    res.status(401).json(response);
  }
};

/**
 * Security event logging
 */
export const logSecurityEvent = (eventType: string, details?: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    moduleLogger.warn('Security event:', {
      event: eventType,
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      details,
    });

    next();
  };
};

/**
 * Honeypot middleware - catches automated attacks
 */
export const honeypot = (req: Request, res: Response, next: NextFunction): void => {
  // Check for common attack patterns in URL
  const suspiciousPatterns = [
    /\.env/,
    /wp-admin/,
    /wp-login/,
    /admin/,
    /phpmyadmin/,
    /\.git/,
    /\.svn/,
    /backup/,
    /config/,
  ];

  const url = req.url.toLowerCase();

  if (suspiciousPatterns.some(pattern => pattern.test(url))) {
    moduleLogger.warn('Honeypot triggered - suspicious URL:', {
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Return fake response to waste attacker's time
    res.status(200).send('OK');
    return;
  }

  next();
};
