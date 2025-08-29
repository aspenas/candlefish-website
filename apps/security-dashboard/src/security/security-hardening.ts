/**
 * Security Hardening Implementation
 * Implements TLS, OAuth, rate limiting, and other security measures
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { Request, Response, NextFunction, Express } from 'express';
import crypto from 'crypto';
import winston from 'winston';

// Security configuration
export const securityConfig = {
  // TLS Configuration
  tls: {
    minVersion: 'TLSv1.2',
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ].join(':'),
    honorCipherOrder: true,
    secureOptions: crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1
  },

  // OAuth2/OIDC Configuration
  oauth: {
    issuer: process.env.OAUTH_ISSUER || 'https://auth.security-dashboard.io/',
    audience: process.env.OAUTH_AUDIENCE || 'security-dashboard-api',
    algorithms: ['RS256'],
    jwksUri: process.env.JWKS_URI || 'https://auth.security-dashboard.io/.well-known/jwks.json'
  },

  // Rate Limiting Configuration
  rateLimit: {
    // Global rate limit
    global: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    },
    
    // API-specific rate limits
    api: {
      windowMs: 1 * 60 * 1000,
      max: 60,
      skipSuccessfulRequests: false,
    },
    
    // Authentication rate limit
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per 15 minutes
      skipSuccessfulRequests: true,
    },
    
    // GraphQL rate limit
    graphql: {
      windowMs: 1 * 60 * 1000,
      max: 30,
      keyGenerator: (req: Request) => {
        // Rate limit by user ID if authenticated, otherwise by IP
        return req.user?.sub || req.ip;
      }
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://staging.security-dashboard.io',
      'https://security-dashboard.io',
      'http://localhost:3000',
      'http://localhost:3004',
      'http://localhost:3005'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
    maxAge: 86400 // 24 hours
  },

  // Security Headers
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};

// Security logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security-dashboard' },
  transports: [
    new winston.transports.File({ filename: 'security-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'security-audit.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * JWT Authentication Middleware
 */
export const authMiddleware = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: securityConfig.oauth.jwksUri
  }),
  audience: securityConfig.oauth.audience,
  issuer: securityConfig.oauth.issuer,
  algorithms: securityConfig.oauth.algorithms,
  credentialsRequired: false
});

/**
 * Role-based access control middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      securityLogger.warn('Access denied', {
        userId: req.user.sub,
        requiredRoles: roles,
        userRoles,
        path: req.path
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * API Key Authentication Middleware
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return next(); // Pass through to JWT auth
  }

  // Verify API key against database or cache
  validateApiKey(apiKey as string)
    .then(valid => {
      if (valid) {
        req.user = { sub: `api-key:${apiKey}`, type: 'api-key' };
        next();
      } else {
        res.status(401).json({ error: 'Invalid API key' });
      }
    })
    .catch(err => {
      securityLogger.error('API key validation error', err);
      res.status(500).json({ error: 'Authentication error' });
    });
};

/**
 * Validate API key against database
 */
async function validateApiKey(apiKey: string): Promise<boolean> {
  // TODO: Implement actual API key validation against database
  // For now, check against environment variable
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}

/**
 * Security audit logging middleware
 */
export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log request
  securityLogger.info('Request received', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.sub,
    userAgent: req.headers['user-agent']
  });

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    securityLogger.info('Request completed', {
      requestId,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.sub
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Input validation and sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove potential XSS vectors
        req.query[key] = (req.query[key] as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }

  // Sanitize body if JSON
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  });
}

/**
 * Create rate limiter instances
 */
export const rateLimiters = {
  global: rateLimit(securityConfig.rateLimit.global),
  api: rateLimit(securityConfig.rateLimit.api),
  auth: rateLimit(securityConfig.rateLimit.auth),
  graphql: rateLimit(securityConfig.rateLimit.graphql)
};

/**
 * Apply security hardening to Express app
 */
export function applySecurityHardening(app: Express): void {
  // Basic security headers
  app.use(helmet(securityConfig.headers));
  
  // CORS
  app.use(cors(securityConfig.cors));
  
  // Global rate limiting
  app.use(rateLimiters.global);
  
  // Audit logging
  app.use(auditLog);
  
  // Input sanitization
  app.use(sanitizeInput);
  
  // API key authentication (optional)
  app.use(apiKeyAuth);
  
  // JWT authentication (optional - becomes required for protected routes)
  app.use(authMiddleware);
  
  // Apply specific rate limits to routes
  app.use('/api/', rateLimiters.api);
  app.use('/auth/', rateLimiters.auth);
  app.use('/graphql', rateLimiters.graphql);
  
  // Health check endpoint (no auth required)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  // Protected endpoint example
  app.get('/api/admin/*', requireRole(['admin']), (req, res, next) => {
    next();
  });

  securityLogger.info('Security hardening applied successfully');
}

/**
 * TLS configuration for HTTPS server
 */
export function getTLSConfig() {
  return {
    key: process.env.TLS_KEY || '', // Load from secure storage
    cert: process.env.TLS_CERT || '', // Load from secure storage
    ca: process.env.TLS_CA || '', // Load from secure storage
    ...securityConfig.tls
  };
}

/**
 * Session configuration for Express
 */
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const
  },
  name: 'security-dashboard-session'
};

/**
 * Content Security Policy violation report handler
 */
export const cspReportHandler = (req: Request, res: Response) => {
  if (req.body) {
    securityLogger.warn('CSP Violation', {
      report: req.body,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  }
  res.status(204).end();
};

/**
 * Security monitoring metrics
 */
export class SecurityMetrics {
  private static instance: SecurityMetrics;
  private metrics: Map<string, number> = new Map();

  static getInstance(): SecurityMetrics {
    if (!SecurityMetrics.instance) {
      SecurityMetrics.instance = new SecurityMetrics();
    }
    return SecurityMetrics.instance;
  }

  increment(metric: string): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + 1);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Export security middleware collection
export const securityMiddleware = {
  auth: authMiddleware,
  requireRole,
  apiKeyAuth,
  auditLog,
  sanitizeInput,
  rateLimiters,
  cspReportHandler
};

export default {
  applySecurityHardening,
  securityConfig,
  securityMiddleware,
  SecurityMetrics,
  getTLSConfig,
  sessionConfig
};