// Comprehensive security middleware for Tyler Setup Platform
// Implements OWASP security headers and protections

const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const crypto = require('crypto');

const authService = require('../security/auth');

/**
 * Generate Content Security Policy nonce
 */
const generateNonce = () => {
  return crypto.randomBytes(16).toString('base64');
};

/**
 * CORS configuration with security best practices
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from approved origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://setup.candlefish.ai',
      process.env.ADMIN_URL || 'https://admin.setup.candlefish.ai',
      'https://setup.candlefish.ai',
      'https://www.setup.candlefish.ai'
    ];

    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

/**
 * Content Security Policy configuration
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-eval'", // Required for GraphQL introspection in dev
      (req, res) => `'nonce-${res.locals.nonce}'`,
      'https://api.setup.candlefish.ai',
      'https://cdn.jsdelivr.net' // For any CDN dependencies
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Allow inline styles for React
      'https://fonts.googleapis.com'
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com',
      'data:'
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    connectSrc: [
      "'self'",
      'https://api.setup.candlefish.ai',
      'wss://api.setup.candlefish.ai',
      'https://*.amazonaws.com' // For AWS services
    ],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    childSrc: ["'none'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    blockAllMixedContent: process.env.NODE_ENV === 'production' ? [] : null
  },
  reportOnly: process.env.NODE_ENV === 'development'
};

/**
 * Helmet configuration with comprehensive security headers
 */
const helmetConfig = {
  contentSecurityPolicy: cspConfig,
  crossOriginEmbedderPolicy: { policy: 'credentialless' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
};

/**
 * Custom security headers middleware
 */
const customSecurityHeaders = (req, res, next) => {
  // Generate nonce for CSP
  res.locals.nonce = generateNonce();

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

  // Feature Policy / Permissions Policy
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', '));

  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log security-relevant information
  const logData = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    xForwardedFor: req.get('X-Forwarded-For'),
    xRealIp: req.get('X-Real-IP')
  };

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.(php|asp|jsp|cgi)/i,
    /\.\./,
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(req.url) ||
    (req.body && typeof req.body === 'string' && pattern.test(req.body))
  );

  if (isSuspicious) {
    console.warn('SECURITY: Suspicious request detected:', JSON.stringify(logData));
  }

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseData = {
      ...logData,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    };

    // Log errors and suspicious responses
    if (res.statusCode >= 400 || isSuspicious) {
      console.warn('SECURITY: Request completed:', JSON.stringify(responseData));
    }
  });

  next();
};

/**
 * Input validation and sanitization middleware
 */
const inputSanitization = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        // Remove null bytes and control characters
        req.query[key] = req.query[key].replace(/\0|\x08|\x09|\x1a|\x0D|\x0A/g, '');

        // Limit query parameter length
        if (req.query[key].length > 1000) {
          return res.status(400).json({ error: 'Query parameter too long' });
        }
      }
    }
  }

  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ];

    if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(400).json({ error: 'Unsupported Content-Type' });
    }

    // Limit request body size (handled by express.json limit, but double-check)
    const contentLength = parseInt(req.get('Content-Length')) || 0;
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      return res.status(413).json({ error: 'Request entity too large' });
    }
  }

  next();
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API routes with valid JWT (API-to-API communication)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  // Check CSRF token
  const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
  const sessionToken = req.session && req.session.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    console.warn('CSRF: Invalid or missing CSRF token', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

/**
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = await authService.verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    console.warn('AUTH: Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authorization middleware factory
 */
const authorize = (requiredRoles = [], requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check roles
    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
      console.warn('AUTHZ: Role check failed', {
        userId: req.user.sub,
        userRole: req.user.role,
        requiredRoles,
        path: req.path
      });
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const userPermissions = req.user.permissions || [];
      const hasPermission = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        console.warn('AUTHZ: Permission check failed', {
          userId: req.user.sub,
          userPermissions,
          requiredPermissions,
          path: req.path
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    next();
  };
};

/**
 * Rate limiting configuration
 */
const rateLimiters = {
  // General API rate limiting
  general: authService.createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: 'Too many requests, please try again later'
  }),

  // Strict rate limiting for authentication endpoints
  auth: authService.createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // requests per window
    message: 'Too many authentication attempts, please try again later'
  }),

  // API endpoints rate limiting
  api: authService.createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // requests per minute
    message: 'API rate limit exceeded'
  }),

  // GraphQL specific rate limiting
  graphql: authService.createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // queries per minute
    message: 'GraphQL rate limit exceeded'
  })
};

/**
 * Slow down middleware for progressive delays
 */
const slowDown = {
  auth: authService.createSlowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 5,
    delayMs: 1000,
    maxDelayMs: 10000
  })
};

/**
 * Error handling middleware with security considerations
 */
const securityErrorHandler = (err, req, res, next) => {
  // Log security-related errors
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    console.warn('SECURITY: Unauthorized access attempt', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      error: err.message
    });
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    if (err.status >= 500) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.details });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

/**
 * Compression middleware with security considerations
 */
const secureCompression = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    // Don't compress responses for suspicious requests
    const suspiciousUA = /bot|crawler|spider/i.test(req.get('User-Agent'));
    if (suspiciousUA) return false;

    return compression.filter(req, res);
  }
});

/**
 * Export all security middleware
 */
module.exports = {
  // Core security middleware
  helmet: helmet(helmetConfig),
  cors: cors(corsOptions),
  customSecurityHeaders,
  securityLogger,
  inputSanitization,
  csrfProtection,

  // Data sanitization
  xssClean: xss(),
  mongoSanitize: mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Data sanitization: ${key} in ${req.url}`);
    }
  }),
  hpp: hpp({
    whitelist: ['sort', 'filter', 'page', 'limit']
  }),

  // Compression
  compression: secureCompression,

  // Authentication & Authorization
  authenticate,
  authorize,

  // Rate limiting
  rateLimiters,
  slowDown,

  // Error handling
  securityErrorHandler,

  // Utility functions
  generateNonce,

  // Complete security middleware stack
  securityStack: [
    securityLogger,
    helmet(helmetConfig),
    customSecurityHeaders,
    cors(corsOptions),
    secureCompression,
    inputSanitization,
    xss(),
    mongoSanitize({
      replaceWith: '_'
    }),
    hpp({
      whitelist: ['sort', 'filter', 'page', 'limit']
    })
  ]
};
