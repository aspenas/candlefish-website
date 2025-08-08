import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter for development
// In production, use Vercel's Edge Config or KV storage
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 4000, // 4000 requests per minute as specified
  maxRequestsPerIP: 100, // Per IP limit
};

export function middleware(request: NextRequest) {
  // Only apply rate limiting to v2 API routes
  if (request.nextUrl.pathname.startsWith('/app/v2/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.windowMs;

    // Clean up old entries
    rateLimit.forEach((value, key) => {
      if (value.resetTime < windowStart) {
        rateLimit.delete(key);
      }
    });

    // Check rate limit
    const limitKey = `${ip}:${request.nextUrl.pathname}`;
    const current = rateLimit.get(limitKey);

    if (current) {
      if (current.count >= RATE_LIMIT.maxRequestsPerIP) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((current.resetTime - now) / 1000)
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((current.resetTime - now) / 1000)),
              'X-RateLimit-Limit': String(RATE_LIMIT.maxRequestsPerIP),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(current.resetTime),
            }
          }
        );
      }
      current.count++;
    } else {
      rateLimit.set(limitKey, {
        count: 1,
        resetTime: now + RATE_LIMIT.windowMs,
      });
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    const limitInfo = rateLimit.get(limitKey)!;
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequestsPerIP));
    response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT.maxRequestsPerIP - limitInfo.count));
    response.headers.set('X-RateLimit-Reset', String(limitInfo.resetTime));

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/v2/:path*', '/app/v3/:path*', '/app/v4/:path*'],
};
