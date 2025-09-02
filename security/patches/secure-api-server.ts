/**
 * Secure API Server Implementation
 * Implements comprehensive security controls for the CLOS API
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { body, param, query, validationResult } from 'express-validator';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import csrf from 'csurf';
import winston from 'winston';
import { spawn } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Security configuration
const SECURITY_CONFIG = {
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'RS256' as const,
  },
  rateLimit: {
    login: { points: 5, duration: 900 }, // 5 attempts per 15 minutes
    api: { points: 100, duration: 60 }, // 100 requests per minute
    websocket: { points: 50, duration: 60 }, // 50 messages per minute
  },
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    saltRounds: 12,
  },
  session: {
    maxAge: 15 * 60 * 1000, // 15 minutes
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    httpOnly: true,
  },
};

// Initialize Express app with security
const app = express();
const server = createServer(app);

// Database and Redis initialization with connection validation
const db = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  enableOfflineQueue: false,
});

// Initialize secure WebSocket server
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize logger with security event tracking
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'clos-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Rate limiters
const loginLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'login_limit',
  ...SECURITY_CONFIG.rateLimit.login,
  blockDuration: 900, // Block for 15 minutes
});

const apiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'api_limit',
  ...SECURITY_CONFIG.rateLimit.api,
});

const wsLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ws_limit',
  ...SECURITY_CONFIG.rateLimit.websocket,
});

// CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
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
    preload: true,
  },
}));

// CORS configuration with origin validation
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Request ID for tracing
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Security event logging
const logSecurityEvent = async (event: {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ip: string;
  userAgent?: string;
  details: any;
}) => {
  logger.warn('Security Event', {
    ...event,
    timestamp: new Date().toISOString(),
    requestId: event.details.requestId,
  });

  // Store in database for audit trail
  try {
    await db.query(
      `INSERT INTO security_events 
       (type, severity, user_id, ip_address, user_agent, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [event.type, event.severity, event.userId, event.ip, event.userAgent, JSON.stringify(event.details)]
    );
  } catch (error) {
    logger.error('Failed to log security event to database', error);
  }
};

// Authentication middleware
const authenticate = async (req: any, res: any, next: any) => {
  try {
    const token = req.cookies.accessToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token with public key
    const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    if (!publicKey) {
      throw new Error('JWT public key not configured');
    }

    const decoded = jwt.verify(token, publicKey, {
      algorithms: [SECURITY_CONFIG.jwt.algorithm],
    }) as any;

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Check user status
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found or inactive');
    }

    // Attach user to request
    req.user = userResult.rows[0];
    req.tokenId = decoded.tokenId;
    
    next();
  } catch (error: any) {
    logSecurityEvent({
      type: 'AUTH_FAILED',
      severity: 'MEDIUM',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        error: error.message,
        requestId: req.id,
        path: req.path,
      },
    });

    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware
const authorize = (requiredRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!requiredRoles.includes(req.user.role)) {
      logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        userId: req.user.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        details: {
          requiredRoles,
          userRole: req.user.role,
          path: req.path,
          requestId: req.id,
        },
      });

      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Input validation helpers
const validateInput = {
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid username format'),
  
  email: body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  
  password: body('password')
    .isLength({ min: SECURITY_CONFIG.password.minLength })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password does not meet security requirements'),
  
  serviceId: param('id')
    .isUUID()
    .withMessage('Invalid service ID'),
};

// Secure command execution
const executeCommand = async (command: string, args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate command against whitelist
    const allowedCommands = ['docker', 'systemctl'];
    if (!allowedCommands.includes(command)) {
      reject(new Error('Command not allowed'));
      return;
    }

    // Validate arguments
    const sanitizedArgs = args.map(arg => {
      // Remove any shell metacharacters
      return arg.replace(/[;&|`$()<>\\]/g, '');
    });

    const child = spawn(command, sanitizedArgs, {
      timeout: 30000, // 30 second timeout
      uid: process.env.RUN_AS_UID ? parseInt(process.env.RUN_AS_UID) : undefined,
      gid: process.env.RUN_AS_GID ? parseInt(process.env.RUN_AS_GID) : undefined,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
};

// API Routes with security

// CSRF token endpoint
app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Login endpoint with rate limiting
app.post('/api/auth/login',
  csrfProtection,
  validateInput.username,
  validateInput.password,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, fingerprint } = req.body;
    const ip = req.ip;

    try {
      // Rate limiting
      await loginLimiter.consume(ip + ':' + username);

      // Get user
      const userResult = await db.query(
        'SELECT * FROM users WHERE username = $1 AND status = $2',
        [username.toLowerCase(), 'active']
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const tokenId = uuidv4();
      const privateKey = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!privateKey) {
        throw new Error('JWT private key not configured');
      }

      const accessToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
          tokenId,
        },
        privateKey,
        {
          algorithm: SECURITY_CONFIG.jwt.algorithm,
          expiresIn: SECURITY_CONFIG.jwt.accessTokenExpiry,
        }
      );

      const refreshToken = jwt.sign(
        {
          userId: user.id,
          tokenId,
          type: 'refresh',
        },
        privateKey,
        {
          algorithm: SECURITY_CONFIG.jwt.algorithm,
          expiresIn: SECURITY_CONFIG.jwt.refreshTokenExpiry,
        }
      );

      // Store refresh token
      await redis.setex(
        `refresh:${tokenId}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify({
          userId: user.id,
          fingerprint,
          createdAt: Date.now(),
        })
      );

      // Set secure cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh', // Restrict to refresh endpoint
      });

      // Log successful login
      await logSecurityEvent({
        type: 'LOGIN_SUCCESS',
        severity: 'LOW',
        userId: user.id,
        ip,
        userAgent: req.get('user-agent'),
        details: {
          requestId: req.id,
        },
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
        },
        csrfToken: req.csrfToken(),
      });
    } catch (error: any) {
      // Log failed login
      await logSecurityEvent({
        type: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        ip,
        userAgent: req.get('user-agent'),
        details: {
          username,
          error: error.message,
          requestId: req.id,
        },
      });

      res.status(401).json({ error: 'Invalid credentials' });
    }
  }
);

// Secure WebSocket implementation
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      throw new Error('No token provided');
    }

    // Rate limiting for WebSocket connections
    await wsLimiter.consume(socket.handshake.address);

    // Verify token
    const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    if (!publicKey) {
      throw new Error('JWT public key not configured');
    }

    const decoded = jwt.verify(token, publicKey, {
      algorithms: [SECURITY_CONFIG.jwt.algorithm],
    }) as any;

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Get user
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found or inactive');
    }

    // Attach user to socket
    socket.data.user = userResult.rows[0];
    socket.data.tokenId = decoded.tokenId;

    next();
  } catch (error: any) {
    logSecurityEvent({
      type: 'WS_AUTH_FAILED',
      severity: 'MEDIUM',
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      details: {
        error: error.message,
      },
    });

    next(new Error('Authentication failed'));
  }
});

// WebSocket event handlers with authorization
io.on('connection', (socket) => {
  const user = socket.data.user;
  
  logger.info('WebSocket connection established', {
    userId: user.id,
    username: user.username,
    ip: socket.handshake.address,
  });

  // Join user-specific room
  socket.join(`user:${user.id}`);
  
  // Join role-based room
  socket.join(`role:${user.role}`);

  // Handle subscription with authorization
  socket.on('subscribe', async (channel: string) => {
    try {
      // Validate channel access
      if (!canAccessChannel(user, channel)) {
        socket.emit('error', { message: 'Unauthorized channel access' });
        
        await logSecurityEvent({
          type: 'WS_UNAUTHORIZED_CHANNEL',
          severity: 'HIGH',
          userId: user.id,
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
          details: {
            channel,
          },
        });
        
        return;
      }

      socket.join(channel);
      socket.emit('subscribed', { channel });
    } catch (error) {
      socket.emit('error', { message: 'Subscription failed' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info('WebSocket disconnected', {
      userId: user.id,
      username: user.username,
    });
  });
});

// Channel access control
function canAccessChannel(user: any, channel: string): boolean {
  // Admin can access all channels
  if (user.role === 'admin') return true;
  
  // User can access their own channel
  if (channel === `user:${user.id}`) return true;
  
  // Role-based channels
  if (channel === `role:${user.role}`) return true;
  
  // Public channels for authenticated users
  if (channel === 'public' && user.id) return true;
  
  return false;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT 1');
    logger.info('Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected');

    const PORT = process.env.PORT || 3501;
    server.listen(PORT, () => {
      logger.info(`Secure API server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  io.close();
  server.close();
  await db.end();
  redis.disconnect();
  
  process.exit(0);
});

startServer();

export { app, io, db, redis };