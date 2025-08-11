import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthenticatedUser, ApiResponse } from '../types';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { UserRole } from '@prisma/client';

const authService = new AuthService();
const moduleLogger = logger.child({ module: 'AuthMiddleware' });

/**
 * Extract token from Authorization header
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Send unauthorized response
 */
const sendUnauthorized = (res: Response, message: string = 'Authentication required'): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  res.status(401).json(response);
};

/**
 * Send forbidden response
 */
const sendForbidden = (res: Response, message: string = 'Insufficient permissions'): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'FORBIDDEN',
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  res.status(403).json(response);
};

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      sendUnauthorized(res, 'Missing authentication token');
      return;
    }

    // Verify token and get user
    const user = await authService.verifyAccessToken(token);

    if (!user) {
      sendUnauthorized(res, 'Invalid or expired token');
      return;
    }

    // Attach user to request
    req.user = user;

    // Log successful authentication for audit
    moduleLogger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
    });

    next();
  } catch (error) {
    moduleLogger.error('Authentication failed:', error);

    if (error instanceof Error) {
      if (error.message === 'TOKEN_EXPIRED') {
        sendUnauthorized(res, 'Token has expired');
        return;
      } else if (error.message === 'INVALID_TOKEN') {
        sendUnauthorized(res, 'Invalid token');
        return;
      }
    }

    sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware - does not require token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        const user = await authService.verifyAccessToken(token);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Ignore authentication errors for optional auth
        moduleLogger.debug('Optional authentication failed:', error);
      }
    }

    next();
  } catch (error) {
    moduleLogger.error('Optional authentication error:', error);
    next(); // Continue anyway for optional auth
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendForbidden(res, `Required role: ${allowedRoles.join(' or ')}`);
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      sendForbidden(res, `Required permission: ${requiredPermissions.join(' or ')}`);
      return;
    }

    next();
  };
};

/**
 * Organization-based authorization middleware
 */
export const requireSameOrganization = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required');
    return;
  }

  // Extract organization ID from request params, body, or query
  const targetOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;

  if (targetOrgId && req.user.organizationId !== targetOrgId) {
    sendForbidden(res, 'Access denied to organization resource');
    return;
  }

  next();
};

/**
 * Admin or owner authorization middleware
 */
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.OWNER);

/**
 * Owner-only authorization middleware
 */
export const requireOwner = requireRole(UserRole.OWNER);

/**
 * Active user check middleware
 */
export const requireActiveUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required');
    return;
  }

  if (!req.user.isActive) {
    sendForbidden(res, 'Account is deactivated');
    return;
  }

  next();
};

/**
 * Rate limiting check middleware (works with Redis)
 */
export const rateLimitCheck = (keyGenerator: (req: AuthenticatedRequest) => string, limit: number, windowMs: number) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { redisService } = await import('../config/redis');

      const key = keyGenerator(req);
      const current = await redisService.incrementRateLimit(key, Math.floor(windowMs / 1000));

      if (current > limit) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: 'v1',
          },
        };

        res.status(429).json(response);
        return;
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': Math.max(0, limit - current).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
      });

      next();
    } catch (error) {
      moduleLogger.error('Rate limit check failed:', error);
      next(); // Continue on Redis error
    }
  };
};
