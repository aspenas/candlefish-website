import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { redisService } from '../config/redis';
import { config } from '../config';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'RateLimitMiddleware' });

/**
 * Create Redis store for express-rate-limit
 */
const createRedisStore = () => {
  return {
    async incr(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
      try {
        const windowMs = config.rateLimit.windowMs;
        const current = await redisService.incrementRateLimit(key, Math.floor(windowMs / 1000));

        return {
          totalHits: current,
          resetTime: new Date(Date.now() + windowMs),
        };
      } catch (error) {
        moduleLogger.error('Redis rate limit incr failed:', error);
        throw error;
      }
    },

    async decrement(key: string): Promise<void> {
      // Implementation for decrement if needed
      try {
        await redisService.incr(`ratelimit:${key}`);
      } catch (error) {
        moduleLogger.error('Redis rate limit decr failed:', error);
      }
    },

    async resetKey(key: string): Promise<void> {
      try {
        await redisService.del(`ratelimit:${key}`);
      } catch (error) {
        moduleLogger.error('Redis rate limit reset failed:', error);
      }
    },
  };
};

/**
 * Standard rate limiter configuration
 */
const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests, please try again later',
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    } as ApiResponse,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      return req.ip || 'anonymous';
    }),
    skip: options.skip,
    store: createRedisStore(),
  });
};

/**
 * Global rate limiter - applies to all requests
 */
export const globalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Generous limit for all endpoints
  message: 'Too many requests from this IP, please try again later',
});

/**
 * Authentication rate limiter - for login/register endpoints
 */
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by IP and email if provided
    const email = req.body?.email || '';
    return `auth:${req.ip}:${email}`;
  },
});

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later',
  keyGenerator: (req: Request) => {
    const email = req.body?.email || '';
    return `password-reset:${req.ip}:${email}`;
  },
});

/**
 * API rate limiter for authenticated users
 */
export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes for authenticated users
  message: 'API rate limit exceeded, please try again later',
  keyGenerator: (req: AuthenticatedRequest) => {
    const userId = req.user?.id || req.ip;
    return `api:${userId}`;
  },
  skip: (req: AuthenticatedRequest) => {
    // Skip rate limiting for owners and admins
    return req.user?.role === 'OWNER' || req.user?.role === 'ADMIN';
  },
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many sensitive operation attempts, please try again later',
  keyGenerator: (req: AuthenticatedRequest) => {
    const userId = req.user?.id || req.ip;
    return `strict:${userId}`;
  },
});

/**
 * Registration rate limiter
 */
export const registrationRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: 'Too many registration attempts from this IP, please try again later',
  keyGenerator: (req: Request) => {
    return `registration:${req.ip}`;
  },
});

/**
 * Per-user rate limiter factory
 */
export const createUserRateLimit = (options: {
  windowMs: number;
  max: number;
  message: string;
}) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req: AuthenticatedRequest) => {
      return `user:${req.user?.id || req.ip}`;
    },
  });
};

/**
 * Per-organization rate limiter factory
 */
export const createOrgRateLimit = (options: {
  windowMs: number;
  max: number;
  message: string;
}) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req: AuthenticatedRequest) => {
      return `org:${req.user?.organizationId || req.ip}`;
    },
  });
};

/**
 * Custom rate limit handler for manual implementation
 */
export const customRateLimit = (
  keyGenerator: (req: Request) => string,
  max: number,
  windowMs: number,
  message: string = 'Rate limit exceeded'
) => {
  return async (req: Request, res: Response, next: Function): Promise<void> => {
    try {
      const key = keyGenerator(req);
      const windowSeconds = Math.floor(windowMs / 1000);
      const current = await redisService.incrementRateLimit(key, windowSeconds);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': Math.max(0, max - current).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
      });

      if (current > max) {
        moduleLogger.warn('Custom rate limit exceeded', {
          key,
          current,
          max,
          ip: req.ip,
          url: req.url,
        });

        const response: ApiResponse = {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: 'v1',
          },
        };

        res.status(429).json(response);
        return;
      }

      next();
    } catch (error) {
      moduleLogger.error('Custom rate limit error:', error);
      next(); // Continue on error to not break the flow
    }
  };
};
