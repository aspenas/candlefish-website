/**
 * Rate Limiting Middleware for Paintbox Application
 * Implements Redis-backed rate limiting with sliding window and token bucket algorithms
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger, getRequestContext } from '@/lib/logging/simple-logger';
import getCacheInstance from '@/lib/cache/cache-service';

// Rate limit configuration schema
const RateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000).default(60000), // 1 minute default
  maxRequests: z.number().min(1).default(100),
  keyGenerator: z.function().optional(),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
  message: z.string().default('Too many requests'),
  statusCode: z.number().min(400).max(599).default(429),
  headers: z.boolean().default(true),
  standardHeaders: z.boolean().default(true),
  legacyHeaders: z.boolean().default(false),
  algorithm: z.enum(['sliding-window', 'token-bucket', 'fixed-window']).default('sliding-window'),
  store: z.enum(['redis', 'memory']).default('redis'),
});

type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

interface RateLimitInfo {
  totalHits: number;
  totalWindow: number;
  remainingPoints: number;
  msBeforeNext: number;
  isBlocked: boolean;
}

interface RateLimitResult {
  success: boolean;
  info: RateLimitInfo;
  headers: Record<string, string>;
}

/**
 * Rate limiting algorithms
 */
class RateLimiter {
  private cache = getCacheInstance();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = RateLimitConfigSchema.parse(config);
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(key: string): Promise<RateLimitResult> {
    try {
      switch (this.config.algorithm) {
        case 'sliding-window':
          return await this.slidingWindowCheck(key);
        case 'token-bucket':
          return await this.tokenBucketCheck(key);
        case 'fixed-window':
          return await this.fixedWindowCheck(key);
        default:
          return await this.slidingWindowCheck(key);
      }
    } catch (error) {
      logger.error('Rate limit check failed', {
        key,
        algorithm: this.config.algorithm,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail open - allow request if rate limiting fails
      return this.createSuccessResult();
    }
  }

  /**
   * Sliding window rate limiting (most accurate)
   */
  private async slidingWindowCheck(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const window = this.config.windowMs;
    const limit = this.config.maxRequests;

    const windowKey = `sliding:${key}`;
    const requestKey = `${windowKey}:${now}`;

    // Remove old entries (outside the window)
    const cutoff = now - window;

    // Get current count in window
    const currentData = await this.cache.get(windowKey);
    const requests: number[] = currentData ? JSON.parse(currentData) : [];

    // Filter out old requests
    const validRequests = requests.filter(timestamp => timestamp > cutoff);

    const currentCount = validRequests.length;
    const remainingPoints = Math.max(0, limit - currentCount - 1);
    const isBlocked = currentCount >= limit;

    if (!isBlocked) {
      // Add current request
      validRequests.push(now);
      await this.cache.set(windowKey, JSON.stringify(validRequests), Math.ceil(window / 1000));
    }

    const oldestRequest = validRequests[0] || now;
    const msBeforeNext = isBlocked ? Math.max(0, (oldestRequest + window) - now) : 0;

    return {
      success: !isBlocked,
      info: {
        totalHits: currentCount + (isBlocked ? 0 : 1),
        totalWindow: window,
        remainingPoints,
        msBeforeNext,
        isBlocked,
      },
      headers: this.generateHeaders({
        totalHits: currentCount + (isBlocked ? 0 : 1),
        totalWindow: window,
        remainingPoints,
        msBeforeNext,
        isBlocked,
      }),
    };
  }

  /**
   * Token bucket rate limiting (good for burst allowance)
   */
  private async tokenBucketCheck(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const bucketKey = `bucket:${key}`;

    // Get current bucket state
    const bucketData = await this.cache.get(bucketKey);
    let bucket = bucketData ? JSON.parse(bucketData) : {
      tokens: this.config.maxRequests,
      lastRefill: now,
    };

    // Calculate tokens to add based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.config.windowMs * this.config.maxRequests);

    bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const hasTokens = bucket.tokens > 0;

    if (hasTokens) {
      bucket.tokens -= 1;
    }

    // Store updated bucket
    await this.cache.set(bucketKey, JSON.stringify(bucket), Math.ceil(this.config.windowMs / 1000 * 2));

    const msBeforeNext = hasTokens ? 0 : this.config.windowMs;

    return {
      success: hasTokens,
      info: {
        totalHits: this.config.maxRequests - bucket.tokens,
        totalWindow: this.config.windowMs,
        remainingPoints: bucket.tokens,
        msBeforeNext,
        isBlocked: !hasTokens,
      },
      headers: this.generateHeaders({
        totalHits: this.config.maxRequests - bucket.tokens,
        totalWindow: this.config.windowMs,
        remainingPoints: bucket.tokens,
        msBeforeNext,
        isBlocked: !hasTokens,
      }),
    };
  }

  /**
   * Fixed window rate limiting (simple and efficient)
   */
  private async fixedWindowCheck(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const window = this.config.windowMs;
    const windowStart = Math.floor(now / window) * window;

    const windowKey = `fixed:${key}:${windowStart}`;

    const currentCount = await this.cache.incr(windowKey, Math.ceil(window / 1000));
    const isBlocked = currentCount > this.config.maxRequests;

    const remainingPoints = Math.max(0, this.config.maxRequests - currentCount);
    const msBeforeNext = isBlocked ? (windowStart + window) - now : 0;

    return {
      success: !isBlocked,
      info: {
        totalHits: currentCount,
        totalWindow: window,
        remainingPoints,
        msBeforeNext,
        isBlocked,
      },
      headers: this.generateHeaders({
        totalHits: currentCount,
        totalWindow: window,
        remainingPoints,
        msBeforeNext,
        isBlocked,
      }),
    };
  }

  private createSuccessResult(): RateLimitResult {
    return {
      success: true,
      info: {
        totalHits: 1,
        totalWindow: this.config.windowMs,
        remainingPoints: this.config.maxRequests - 1,
        msBeforeNext: 0,
        isBlocked: false,
      },
      headers: {},
    };
  }

  private generateHeaders(info: RateLimitInfo): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.headers) {
      if (this.config.standardHeaders) {
        // Standard rate limit headers (draft RFC)
        headers['RateLimit-Limit'] = this.config.maxRequests.toString();
        headers['RateLimit-Remaining'] = info.remainingPoints.toString();
        headers['RateLimit-Reset'] = Math.ceil((Date.now() + info.msBeforeNext) / 1000).toString();
        headers['RateLimit-Policy'] = `${this.config.maxRequests};w=${Math.ceil(this.config.windowMs / 1000)}`;
      }

      if (this.config.legacyHeaders) {
        // Legacy X-RateLimit headers
        headers['X-RateLimit-Limit'] = this.config.maxRequests.toString();
        headers['X-RateLimit-Remaining'] = info.remainingPoints.toString();
        headers['X-RateLimit-Reset'] = Math.ceil((Date.now() + info.msBeforeNext) / 1000).toString();
      }

      if (info.isBlocked) {
        headers['Retry-After'] = Math.ceil(info.msBeforeNext / 1000).toString();
      }
    }

    return headers;
  }
}

/**
 * Default key generators
 */
const keyGenerators = {
  ip: (request: NextRequest): string => {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    return `ip:${ip}`;
  },

  user: (request: NextRequest): string => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        // Simple JWT payload extraction (not verification)
        const token = authHeader.substring(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return `user:${payload.sub || 'anonymous'}`;
      } catch {
        return 'user:anonymous';
      }
    }
    return 'user:anonymous';
  },

  userAndEndpoint: (request: NextRequest): string => {
    const userKey = keyGenerators.user(request);
    const path = new URL(request.url).pathname;
    return `${userKey}:${path}`;
  },

  endpoint: (request: NextRequest): string => {
    const path = new URL(request.url).pathname;
    return `endpoint:${path}`;
  },
};

/**
 * Rate limiting middleware function
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {}
): Promise<NextResponse | null> {
  const requestContext = getRequestContext(request);

  try {
    logger.middleware('rate-limit', 'Processing rate limit check', requestContext);

    const rateLimiter = new RateLimiter(config);

    // Generate rate limit key
    const keyGenerator = config.keyGenerator || keyGenerators.ip;
    const key = keyGenerator(request);

    // Check rate limit
    const result = await rateLimiter.checkLimit(key);

    // Log rate limit info
    logger.rateLimit('Rate limit check completed', {
      ...requestContext,
      key,
      algorithm: rateLimiter['config'].algorithm,
      totalHits: result.info.totalHits,
      remainingPoints: result.info.remainingPoints,
      isBlocked: result.info.isBlocked,
    });

    if (!result.success) {
      // Rate limit exceeded
      logger.security('Rate limit exceeded', {
        ...requestContext,
        key,
        totalHits: result.info.totalHits,
        limit: rateLimiter['config'].maxRequests,
      });

      const response = NextResponse.json(
        {
          error: rateLimiter['config'].message,
          retryAfter: Math.ceil(result.info.msBeforeNext / 1000),
        },
        { status: rateLimiter['config'].statusCode }
      );

      // Add rate limit headers
      Object.entries(result.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    // Rate limit passed - add headers to the request for downstream middleware
    const response = NextResponse.next();
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return null; // Continue to next middleware
  } catch (error) {
    logger.error('Rate limit middleware error', {
      ...requestContext,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fail open - allow request if rate limiting fails
    return null;
  }
}

/**
 * Higher-order function to create rate limit middleware with specific config
 */
export function createRateLimitMiddleware(config: Partial<RateLimitConfig>) {
  return (request: NextRequest) => rateLimitMiddleware(request, config);
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const apiRateLimiter = createRateLimitMiddleware({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  keyGenerator: keyGenerators.userAndEndpoint,
  algorithm: 'sliding-window',
});

export const authRateLimiter = createRateLimitMiddleware({
  windowMs: 300000, // 5 minutes
  maxRequests: 5,
  keyGenerator: keyGenerators.ip,
  algorithm: 'fixed-window',
  message: 'Too many authentication attempts, please try again later',
});

export const sensitiveActionRateLimiter = createRateLimitMiddleware({
  windowMs: 300000, // 5 minutes
  maxRequests: 3,
  keyGenerator: keyGenerators.user,
  algorithm: 'token-bucket',
  message: 'Too many sensitive actions, please wait before trying again',
});

export const publicApiRateLimiter = createRateLimitMiddleware({
  windowMs: 60000, // 1 minute
  maxRequests: 20,
  keyGenerator: keyGenerators.ip,
  algorithm: 'sliding-window',
  message: 'Rate limit exceeded for public API',
});

export const adminActionRateLimiter = createRateLimitMiddleware({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
  keyGenerator: keyGenerators.user,
  algorithm: 'sliding-window',
  message: 'Admin action rate limit exceeded',
});

// Export types and utilities
export type { RateLimitConfig, RateLimitInfo, RateLimitResult };
export { RateLimiter, keyGenerators };
