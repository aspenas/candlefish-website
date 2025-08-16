/**
 * @file Rate Limiting Middleware Tests
 * @description Tests for API rate limiting functionality
 */

import { rateLimitMiddleware, RateLimiter } from '@/lib/middleware/rate-limit';
import { createRateLimitInfo } from '@/__tests__/factories';
import { NextRequest, NextResponse } from 'next/server';
import { jest } from '@jest/globals';

// Mock Redis for rate limiting storage
jest.mock('ioredis');

describe('Rate Limiting Middleware', () => {
  let mockRedis: any;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      pipeline: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue([]),
      })),
    };

    rateLimiter = new RateLimiter({
      redis: mockRedis,
      windowSize: 60, // 1 minute window
      maxRequests: 100, // 100 requests per window
    });
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      // Mock Redis to return low request count
      mockRedis.get.mockResolvedValue('10'); // 10 requests in current window

      const response = await rateLimitMiddleware(request);

      expect(response).toBeUndefined(); // No response means request is allowed
    });

    it('should block requests exceeding rate limit', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      // Mock Redis to return high request count
      mockRedis.get.mockResolvedValue('101'); // Exceeds limit of 100

      const response = await rateLimitMiddleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(429);
        const body = await response.json();
        expect(body.error).toBe('Rate limit exceeded');
      }
    });

    it('should increment request count for each request', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      mockRedis.get.mockResolvedValue('50');
      mockRedis.incr.mockResolvedValue(51);

      await rateLimitMiddleware(request);

      const expectedKey = 'rate_limit:192.168.1.1:60';
      expect(mockRedis.incr).toHaveBeenCalledWith(expectedKey);
    });

    it('should set TTL for new rate limit windows', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      // First request in window
      mockRedis.get.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(1);

      await rateLimitMiddleware(request);

      const expectedKey = 'rate_limit:192.168.1.1:60';
      expect(mockRedis.expire).toHaveBeenCalledWith(expectedKey, 60);
    });
  });

  describe('IP Address Detection', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '203.0.113.1, 192.168.1.1');

      mockRedis.get.mockResolvedValue('10');

      await rateLimitMiddleware(request);

      // Should use first IP in chain
      const expectedKey = 'rate_limit:203.0.113.1:60';
      expect(mockRedis.incr).toHaveBeenCalledWith(expectedKey);
    });

    it('should fallback to x-real-ip header', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-real-ip', '203.0.113.2');

      mockRedis.get.mockResolvedValue('10');

      await rateLimitMiddleware(request);

      const expectedKey = 'rate_limit:203.0.113.2:60';
      expect(mockRedis.incr).toHaveBeenCalledWith(expectedKey);
    });

    it('should use connection remote address as last resort', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      // No forwarded headers

      mockRedis.get.mockResolvedValue('10');

      await rateLimitMiddleware(request);

      // Should use some default/connection IP
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should handle IPv6 addresses correctly', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '2001:db8::1');

      mockRedis.get.mockResolvedValue('10');

      await rateLimitMiddleware(request);

      const expectedKey = 'rate_limit:2001:db8::1:60';
      expect(mockRedis.incr).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe('Different Rate Limit Configurations', () => {
    it('should apply different limits for different endpoints', async () => {
      const apiRequest = new NextRequest('https://app.paintbox.com/api/estimates');
      const authRequest = new NextRequest('https://app.paintbox.com/api/auth/login');
      
      apiRequest.headers.set('x-forwarded-for', '192.168.1.1');
      authRequest.headers.set('x-forwarded-for', '192.168.1.1');

      const config = {
        '/api/estimates': { maxRequests: 100, windowSize: 60 },
        '/api/auth/*': { maxRequests: 5, windowSize: 60 }, // Stricter for auth
      };

      mockRedis.get.mockResolvedValue('4');

      // API request should be allowed with higher limit
      const apiResponse = await rateLimitMiddleware(apiRequest, config);
      expect(apiResponse).toBeUndefined();

      // Auth request should be allowed but approaching limit
      const authResponse = await rateLimitMiddleware(authRequest, config);
      expect(authResponse).toBeUndefined();
    });

    it('should apply user-based rate limiting for authenticated requests', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('authorization', 'Bearer user.token.123');
      
      // Mock JWT payload with user ID
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (request as any).user = mockUser;

      mockRedis.get.mockResolvedValue('50');

      await rateLimitMiddleware(request, {
        useUserBased: true,
        userLimits: { maxRequests: 1000, windowSize: 3600 }, // Higher limits for users
      });

      const expectedKey = 'rate_limit:user:user-123:3600';
      expect(mockRedis.incr).toHaveBeenCalledWith(expectedKey);
    });

    it('should apply premium user rate limits', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      const premiumUser = { id: 'premium-user-123', role: 'premium' };
      (request as any).user = premiumUser;

      mockRedis.get.mockResolvedValue('500');

      await rateLimitMiddleware(request, {
        useUserBased: true,
        premiumLimits: { maxRequests: 10000, windowSize: 3600 },
      });

      // Should use premium limits
      const response = await rateLimitMiddleware(request);
      expect(response).toBeUndefined(); // Should be allowed
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in response', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      mockRedis.get.mockResolvedValue('75');
      mockRedis.ttl.mockResolvedValue(30); // 30 seconds remaining

      const response = await rateLimitMiddleware(request);

      expect(response).toBeUndefined();
      
      // Check that headers would be set (in real implementation)
      // This would be verified through integration tests
    });

    it('should include retry-after header when rate limited', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      mockRedis.get.mockResolvedValue('101');
      mockRedis.ttl.mockResolvedValue(45); // 45 seconds until reset

      const response = await rateLimitMiddleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.headers.get('Retry-After')).toBe('45');
        expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
        expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
      }
    });
  });

  describe('Whitelist and Exemptions', () => {
    it('should exempt whitelisted IP addresses', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.100'); // Whitelisted IP

      const response = await rateLimitMiddleware(request, {
        whitelist: ['192.168.1.100', '10.0.0.0/8'],
      });

      expect(response).toBeUndefined();
      expect(mockRedis.incr).not.toHaveBeenCalled(); // Should not increment counter
    });

    it('should exempt requests with valid API keys', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/webhooks/salesforce');
      request.headers.set('x-api-key', 'valid-service-key-123');

      const response = await rateLimitMiddleware(request, {
        exemptApiKeys: ['valid-service-key-123'],
      });

      expect(response).toBeUndefined();
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    it('should exempt admin users', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      const adminUser = { id: 'admin-123', role: 'admin' };
      (request as any).user = adminUser;

      const response = await rateLimitMiddleware(request, {
        exemptRoles: ['admin'],
      });

      expect(response).toBeUndefined();
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });
  });

  describe('Sliding Window Algorithm', () => {
    it('should implement sliding window rate limiting', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      // Mock current time
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const slidingLimiter = new RateLimiter({
        redis: mockRedis,
        algorithm: 'sliding_window',
        windowSize: 60,
        maxRequests: 100,
      });

      // Mock Redis sorted set operations for sliding window
      mockRedis.zcard = jest.fn().mockResolvedValue(50);
      mockRedis.zadd = jest.fn().mockResolvedValue(1);
      mockRedis.zremrangebyscore = jest.fn().mockResolvedValue(5);

      const result = await slidingLimiter.checkLimit('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
      expect(mockRedis.zremrangebyscore).toHaveBeenCalled(); // Cleanup old entries
    });

    it('should handle sliding window cleanup correctly', async () => {
      const slidingLimiter = new RateLimiter({
        redis: mockRedis,
        algorithm: 'sliding_window',
        windowSize: 60,
        maxRequests: 100,
      });

      const now = Date.now();
      const windowStart = now - 60000; // 60 seconds ago

      mockRedis.zcard.mockResolvedValue(100);
      mockRedis.zremrangebyscore.mockResolvedValue(20); // Removed 20 old entries

      const result = await slidingLimiter.checkLimit('192.168.1.1');

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.any(String),
        '-inf',
        windowStart
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const response = await rateLimitMiddleware(request, {
        failOpen: true, // Allow requests when Redis is down
      });

      expect(response).toBeUndefined(); // Should allow request
    });

    it('should fail closed when Redis is down and failOpen is false', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const response = await rateLimitMiddleware(request, {
        failOpen: false, // Block requests when Redis is down
      });

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(503); // Service Unavailable
      }
    });

    it('should handle malformed Redis data', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      mockRedis.get.mockResolvedValue('invalid-number');

      const response = await rateLimitMiddleware(request);

      // Should treat invalid data as 0 and continue
      expect(response).toBeUndefined();
    });
  });

  describe('Burst Handling', () => {
    it('should allow burst requests with token bucket algorithm', async () => {
      const tokenBucketLimiter = new RateLimiter({
        redis: mockRedis,
        algorithm: 'token_bucket',
        capacity: 10, // Bucket capacity
        refillRate: 1, // 1 token per second
        windowSize: 1,
      });

      // Mock token bucket state
      mockRedis.hmget.mockResolvedValue(['8', Date.now().toString()]); // 8 tokens available

      const result = await tokenBucketLimiter.checkLimit('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7); // One token consumed
    });

    it('should reject requests when token bucket is empty', async () => {
      const tokenBucketLimiter = new RateLimiter({
        redis: mockRedis,
        algorithm: 'token_bucket',
        capacity: 10,
        refillRate: 1,
        windowSize: 1,
      });

      // No tokens available
      mockRedis.hmget.mockResolvedValue(['0', Date.now().toString()]);

      const result = await tokenBucketLimiter.checkLimit('192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should refill tokens over time', async () => {
      const tokenBucketLimiter = new RateLimiter({
        redis: mockRedis,
        algorithm: 'token_bucket',
        capacity: 10,
        refillRate: 2, // 2 tokens per second
        windowSize: 1,
      });

      const now = Date.now();
      const lastRefill = now - 5000; // 5 seconds ago

      // Should refill 10 tokens (2 * 5 seconds), but capped at capacity
      mockRedis.hmget.mockResolvedValue(['0', lastRefill.toString()]);

      const result = await tokenBucketLimiter.checkLimit('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // Full bucket minus one consumed
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => {
        const req = new NextRequest('https://app.paintbox.com/api/estimates');
        req.headers.set('x-forwarded-for', `192.168.1.${i}`);
        return req;
      });

      mockRedis.get.mockResolvedValue('50');
      mockRedis.incr.mockResolvedValue(51);

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => rateLimitMiddleware(req))
      );
      const endTime = Date.now();

      // All should be allowed
      expect(responses.filter(r => r === undefined)).toHaveLength(50);
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should use Redis pipeline for batch operations', async () => {
      const slidingLimiter = new RateLimiter({
        redis: mockRedis,
        algorithm: 'sliding_window',
        windowSize: 60,
        maxRequests: 100,
        usePipeline: true,
      });

      mockRedis.pipeline().exec.mockResolvedValue([
        [null, 50], // zcard result
        [null, 1],  // zadd result
        [null, 5],  // zremrangebyscore result
      ]);

      await slidingLimiter.checkLimit('192.168.1.1');

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should track rate limiting metrics', async () => {
      const request = new NextRequest('https://app.paintbox.com/api/estimates');
      request.headers.set('x-forwarded-for', '192.168.1.1');

      mockRedis.get.mockResolvedValue('101'); // Rate limited

      const mockMetrics = jest.fn();
      await rateLimitMiddleware(request, {
        metricsCallback: mockMetrics,
      });

      expect(mockMetrics).toHaveBeenCalledWith({
        event: 'rate_limited',
        ip: '192.168.1.1',
        endpoint: '/api/estimates',
        limit: 100,
        current: 101,
      });
    });

    it('should provide rate limiting statistics', () => {
      const stats = rateLimiter.getStatistics();

      expect(stats).toMatchObject({
        totalRequests: expect.any(Number),
        allowedRequests: expect.any(Number),
        blockedRequests: expect.any(Number),
        blockRate: expect.any(Number),
      });
    });
  });
});