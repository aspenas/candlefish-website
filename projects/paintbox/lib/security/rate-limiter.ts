/**
 * Rate Limiter for API Endpoints
 * Implements token bucket algorithm for rate limiting
 * Compatible with Edge Runtime and Fly.io deployment
 */

import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  standardHeaders?: boolean; // Return standard rate limit headers
  legacyHeaders?: boolean; // Return legacy X-RateLimit headers
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  handler?: (req: NextRequest) => Response; // Custom response handler
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
}

// In-memory store for rate limiting (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    standardHeaders = true,
    legacyHeaders = false,
    keyGenerator = defaultKeyGenerator,
  } = config;

  return {
    async check(request: NextRequest): Promise<RateLimitResult> {
      const key = keyGenerator(request);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);

      if (!entry || entry.resetTime < now) {
        // Create new window
        entry = {
          count: 1,
          resetTime: now + windowMs,
        };
        rateLimitStore.set(key, entry);

        return {
          success: true,
          limit: max,
          remaining: max - 1,
        };
      }

      // Check if limit exceeded
      if (entry.count >= max) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return {
          success: false,
          limit: max,
          remaining: 0,
          retryAfter,
        };
      }

      // Increment counter
      entry.count++;
      rateLimitStore.set(key, entry);

      return {
        success: true,
        limit: max,
        remaining: max - entry.count,
      };
    },

    // Helper to create headers
    getHeaders(result: RateLimitResult): HeadersInit {
      const headers: HeadersInit = {};

      if (standardHeaders) {
        headers['RateLimit-Limit'] = result.limit.toString();
        headers['RateLimit-Remaining'] = result.remaining.toString();
        headers['RateLimit-Reset'] = new Date(Date.now() + windowMs).toISOString();

        if (result.retryAfter) {
          headers['RateLimit-RetryAfter'] = result.retryAfter.toString();
        }
      }

      if (legacyHeaders) {
        headers['X-RateLimit-Limit'] = result.limit.toString();
        headers['X-RateLimit-Remaining'] = result.remaining.toString();
        headers['X-RateLimit-Reset'] = Math.floor((Date.now() + windowMs) / 1000).toString();

        if (result.retryAfter) {
          headers['Retry-After'] = result.retryAfter.toString();
        }
      }

      return headers;
    },
  };
}

// Default key generator using IP address
function defaultKeyGenerator(request: NextRequest): string {
  // Try to get real IP from various headers
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    request.headers.get('x-client-ip') ||
    request.ip ||
    'unknown';

  return `rate-limit:${ip}`;
}

// Specialized rate limiters for different endpoints
export const jwksRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  standardHeaders: true,
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: true,
});

// Strict rate limiter for sensitive operations
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  standardHeaders: true,
});

// Helper function to apply rate limiting to API routes
export async function withRateLimit(
  request: NextRequest,
  limiter: ReturnType<typeof rateLimit>,
  handler: () => Promise<Response>
): Promise<Response> {
  const result = await limiter.check(request);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...limiter.getHeaders(result),
        },
      }
    );
  }

  // Add rate limit headers to successful response
  const response = await handler();
  const headers = new Headers(response.headers);
  Object.entries(limiter.getHeaders(result)).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
