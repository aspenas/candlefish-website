/**
 * Authentication Middleware
 * Protects routes and enforces role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        role: 'admin' | 'user' | 'viewer';
      };
      apiKey?: string;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor(db: Pool, redis: Redis) {
    this.authService = new AuthService(db, redis);
  }

  /**
   * Authenticate request (JWT or API key)
   */
  authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for API key first
      const apiKey = this.extractApiKey(req);
      if (apiKey) {
        const user = await this.authService.authenticateApiKey(apiKey);
        req.user = {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        };
        req.apiKey = apiKey;
        return next();
      }

      // Check for JWT token
      const token = this.extractToken(req);
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No authentication provided'
        });
      }

      const decoded = await this.authService.verifyToken(token);
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  };

  /**
   * Require specific role
   */
  requireRole = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  };

  /**
   * Require admin role
   */
  requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  };

  /**
   * Require specific permission
   */
  requirePermission = (permission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = await this.authService.checkPermission(req.user.userId, permission);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`
        });
      }

      next();
    };
  };

  /**
   * Optional authentication (doesn't fail if no auth provided)
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to authenticate but don't fail if no auth provided
      const apiKey = this.extractApiKey(req);
      if (apiKey) {
        const user = await this.authService.authenticateApiKey(apiKey);
        req.user = {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        };
        req.apiKey = apiKey;
      } else {
        const token = this.extractToken(req);
        if (token) {
          const decoded = await this.authService.verifyToken(token);
          req.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
          };
        }
      }
    } catch (error) {
      // Ignore authentication errors for optional auth
    }
    
    next();
  };

  /**
   * Rate limiting middleware
   */
  rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
    const requests = new Map<string, number[]>();

    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.user?.userId || req.ip || 'anonymous';
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get requests for this key
      const userRequests = requests.get(key) || [];
      
      // Filter out old requests
      const recentRequests = userRequests.filter(time => time > windowStart);
      
      if (recentRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
        });
      }

      // Add current request
      recentRequests.push(now);
      requests.set(key, recentRequests);

      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance
        for (const [k, v] of requests.entries()) {
          const recent = v.filter(time => time > windowStart);
          if (recent.length === 0) {
            requests.delete(k);
          } else {
            requests.set(k, recent);
          }
        }
      }

      next();
    };
  };

  /**
   * Audit logging middleware
   */
  auditLog = (db: Pool) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Log the request
      const startTime = Date.now();
      
      // Store original send function
      const originalSend = res.send;
      
      // Override send to log response
      res.send = function(data: any) {
        res.locals.responseBody = data;
        return originalSend.call(this, data);
      };

      // Continue with request
      next();

      // Log after response
      res.on('finish', async () => {
        if (req.user && req.method !== 'GET') {
          try {
            await db.query(
              `INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                req.user.userId,
                `${req.method} ${req.path}`,
                req.path.split('/')[2], // Extract resource type from path
                req.params.id || null,
                req.ip,
                req.get('user-agent')
              ]
            );
          } catch (error) {
            console.error('Audit log error:', error);
          }
        }
      });
    };
  };

  /**
   * Extract token from request
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies for accessToken
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    // Check cookies for token (backward compatibility)
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    // Check query parameter (for WebSocket connections)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }

    return null;
  }

  /**
   * Extract API key from request
   */
  private extractApiKey(req: Request): string | null {
    // Check X-API-Key header
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      return apiKeyHeader;
    }

    // Check Authorization header for API key
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    // Check query parameter
    if (req.query.api_key && typeof req.query.api_key === 'string') {
      return req.query.api_key;
    }

    return null;
  }
}