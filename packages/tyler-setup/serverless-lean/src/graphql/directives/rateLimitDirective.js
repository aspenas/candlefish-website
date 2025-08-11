/**
 * Rate Limiting Directive for GraphQL
 * Implements per-field and per-user rate limiting
 */

import { defaultFieldResolver } from 'graphql';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';

/**
 * In-memory rate limit store (use Redis in production)
 */
class RateLimitStore {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Get current count for a key
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return 0;

    // Clean up expired entries
    const now = Date.now();
    entry.requests = entry.requests.filter(timestamp => now - timestamp < entry.windowMs);

    return entry.requests.length;
  }

  /**
   * Increment count for a key
   */
  increment(key, windowMs) {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry) {
      entry = { requests: [], windowMs };
      this.store.set(key, entry);
    }

    // Clean up expired requests
    entry.requests = entry.requests.filter(timestamp => now - timestamp < windowMs);

    // Add new request
    entry.requests.push(now);

    return entry.requests.length;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key, max, windowMs) {
    const current = this.get(key);
    return Math.max(0, max - current);
  }

  /**
   * Get reset time for a key
   */
  getResetTime(key, windowMs) {
    const entry = this.store.get(key);
    if (!entry || entry.requests.length === 0) {
      return new Date(Date.now() + windowMs);
    }

    const oldestRequest = Math.min(...entry.requests);
    return new Date(oldestRequest + windowMs);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      entry.requests = entry.requests.filter(timestamp => now - timestamp < entry.windowMs);

      if (entry.requests.length === 0) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      totalRequests: Array.from(this.store.values())
        .reduce((total, entry) => total + entry.requests.length, 0),
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Rate limit directive implementation
 * Usage: @rateLimit(max: 100, window: 60000)
 */
export class RateLimitDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { max = 60, window = 60000 } = this.args; // Default: 60 requests per minute
    const { resolve = defaultFieldResolver } = field;

    field.resolve = async function(parent, args, context, info) {
      const fieldName = info.fieldName;
      const userId = context.user?.id || 'anonymous';
      const clientIP = context.event?.requestContext?.http?.sourceIp || 'unknown';

      // Create rate limit key
      const rateLimitKey = `${fieldName}:${userId}:${clientIP}`;

      // Check current rate limit
      const currentCount = rateLimitStore.increment(rateLimitKey, window);

      // Check if limit exceeded
      if (currentCount > max) {
        const resetTime = rateLimitStore.getResetTime(rateLimitKey, window);

        // Log rate limit exceeded
        console.warn('Rate limit exceeded:', {
          field: fieldName,
          userId,
          clientIP,
          currentCount,
          max,
          resetTime: resetTime.toISOString(),
        });

        // Log audit event
        if (context.logAudit) {
          await context.logAudit({
            action: 'RATE_LIMIT_EXCEEDED',
            resource: fieldName,
            details: {
              currentCount,
              max,
              window,
            },
          });
        }

        throw new Error(
          `Rate limit exceeded for ${fieldName}. Maximum ${max} requests per ${window}ms. Try again at ${resetTime.toISOString()}`
        );
      }

      // Add rate limit headers to response
      if (context.response?.http) {
        const remaining = rateLimitStore.getRemaining(rateLimitKey, max, window);
        const resetTime = rateLimitStore.getResetTime(rateLimitKey, window);

        context.response.http.headers.set('x-ratelimit-limit', max.toString());
        context.response.http.headers.set('x-ratelimit-remaining', remaining.toString());
        context.response.http.headers.set('x-ratelimit-reset', Math.ceil(resetTime.getTime() / 1000).toString());
      }

      // Execute original resolver
      return resolve.call(this, parent, args, context, info);
    };
  }
}

/**
 * Advanced rate limiting with different strategies
 */
export class AdvancedRateLimiter {
  constructor(options = {}) {
    this.store = options.store || rateLimitStore;
    this.defaultLimits = {
      queries: { max: 1000, window: 60000 }, // 1000 queries per minute
      mutations: { max: 100, window: 60000 }, // 100 mutations per minute
      subscriptions: { max: 10, window: 60000 }, // 10 subscriptions per minute
      auth: { max: 5, window: 300000 }, // 5 auth attempts per 5 minutes
      admin: { max: 2000, window: 60000 }, // Higher limits for admins
      contractor: { max: 100, window: 60000 }, // Lower limits for contractors
    };
  }

  /**
   * Get rate limit configuration for a user and operation
   */
  getRateLimitConfig(operationType, user) {
    if (user?.role === 'admin') {
      return this.defaultLimits.admin;
    }

    if (user?.type === 'contractor') {
      return this.defaultLimits.contractor;
    }

    return this.defaultLimits[operationType] || this.defaultLimits.queries;
  }

  /**
   * Check and enforce rate limit
   */
  async checkRateLimit(operationType, context) {
    const user = context.user;
    const clientIP = context.event?.requestContext?.http?.sourceIp || 'unknown';
    const userAgent = context.event?.headers?.['user-agent'] || 'unknown';

    const config = this.getRateLimitConfig(operationType, user);
    const rateLimitKey = `${operationType}:${user?.id || clientIP}:${Date.now().toString().slice(0, -4)}0000`;

    const currentCount = this.store.increment(rateLimitKey, config.window);

    if (currentCount > config.max) {
      // Log security event
      console.error('Rate limit exceeded:', {
        operationType,
        userId: user?.id,
        userAgent,
        clientIP,
        currentCount,
        max: config.max,
        window: config.window,
      });

      // Log audit event
      if (context.logAudit) {
        await context.logAudit({
          action: 'RATE_LIMIT_EXCEEDED',
          resource: operationType,
          details: {
            currentCount,
            max: config.max,
            window: config.window,
            clientIP,
            userAgent,
          },
        });
      }

      throw new Error(
        `Rate limit exceeded for ${operationType}. Maximum ${config.max} requests per ${Math.floor(config.window / 1000)} seconds.`
      );
    }

    return {
      currentCount,
      remaining: Math.max(0, config.max - currentCount),
      resetTime: new Date(Date.now() + config.window),
      limit: config.max,
    };
  }

  /**
   * Create rate limiting plugin for Apollo Server
   */
  createPlugin() {
    return {
      requestDidStart: () => ({
        didResolveOperation: async (requestContext) => {
          const operationType = requestContext.request.operationName?.toLowerCase() ||
                               requestContext.document.definitions[0]?.operation || 'query';

          // Apply rate limiting
          const rateLimitInfo = await this.checkRateLimit(operationType, requestContext.context);

          // Store rate limit info in context
          requestContext.context.rateLimitInfo = rateLimitInfo;
        },

        willSendResponse: (requestContext) => {
          // Add rate limit headers
          const rateLimitInfo = requestContext.context.rateLimitInfo;
          if (rateLimitInfo && requestContext.response.http) {
            requestContext.response.http.headers.set('x-ratelimit-limit', rateLimitInfo.limit.toString());
            requestContext.response.http.headers.set('x-ratelimit-remaining', rateLimitInfo.remaining.toString());
            requestContext.response.http.headers.set('x-ratelimit-reset', Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString());
          }
        },
      }),
    };
  }
}

/**
 * IP-based rate limiting for additional security
 */
export class IPRateLimiter {
  constructor() {
    this.ipStore = new Map();
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
  }

  /**
   * Check if IP should be blocked
   */
  isBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Check if IP is suspicious
   */
  isSuspicious(ip) {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Track request from IP
   */
  trackRequest(ip, context) {
    if (this.isBlocked(ip)) {
      throw new Error('IP address is blocked due to suspicious activity');
    }

    const now = Date.now();
    const window = 60000; // 1 minute window
    const maxRequests = 500; // Max requests per window

    if (!this.ipStore.has(ip)) {
      this.ipStore.set(ip, []);
    }

    const requests = this.ipStore.get(ip);

    // Clean old requests
    while (requests.length > 0 && now - requests[0] > window) {
      requests.shift();
    }

    requests.push(now);

    // Check for suspicious activity
    if (requests.length > maxRequests) {
      this.suspiciousIPs.add(ip);

      // Block after multiple violations
      if (requests.length > maxRequests * 2) {
        this.blockedIPs.add(ip);

        console.error('IP blocked due to excessive requests:', {
          ip,
          requestCount: requests.length,
          window,
        });
      }

      throw new Error('Rate limit exceeded for IP address');
    }

    return requests.length;
  }

  /**
   * Unblock an IP (admin function)
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    this.ipStore.delete(ip);
  }

  /**
   * Get blocked IPs list
   */
  getBlockedIPs() {
    return Array.from(this.blockedIPs);
  }

  /**
   * Get suspicious IPs list
   */
  getSuspiciousIPs() {
    return Array.from(this.suspiciousIPs);
  }
}

// Export instances
export const advancedRateLimiter = new AdvancedRateLimiter();
export const ipRateLimiter = new IPRateLimiter();
export { RateLimitDirective as rateLimitDirective, rateLimitStore };
