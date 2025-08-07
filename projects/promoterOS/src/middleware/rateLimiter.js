/**
 * Rate Limiting Middleware for PromoterOS
 * Prevents abuse and DoS attacks
 */

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredEntries, 60000);

/**
 * Get client identifier from request
 * @param {Object} event - Netlify function event
 * @returns {string} Client identifier
 */
function getClientIdentifier(event) {
  // Try to get IP from various headers
  const ip = event.headers['x-forwarded-for'] || 
             event.headers['x-real-ip'] || 
             event.headers['client-ip'] ||
             'unknown';
  
  // If authenticated, use user ID for more accurate limiting
  if (event.user && event.user.id) {
    return `user:${event.user.id}`;
  }
  
  // Use IP address for anonymous users
  return `ip:${ip}`;
}

/**
 * Rate limiter configuration
 */
const rateLimitConfigs = {
  // Default limits for anonymous users
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many requests, please try again later'
  },
  
  // Stricter limits for sensitive endpoints
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Rate limit exceeded for this endpoint'
  },
  
  // Relaxed limits for authenticated users
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Rate limit exceeded, please slow down'
  },
  
  // Very strict limits for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later'
  }
};

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @returns {Function} Middleware function
 */
function rateLimiter(options = {}) {
  const config = options.config || 'default';
  const limits = rateLimitConfigs[config] || rateLimitConfigs.default;
  
  return async function(event, context, handler) {
    const clientId = getClientIdentifier(event);
    const now = Date.now();
    const windowStart = now - limits.windowMs;
    
    // Get or create client data
    let clientData = rateLimitStore.get(clientId);
    
    if (!clientData) {
      clientData = {
        requests: [],
        resetTime: now + limits.windowMs
      };
      rateLimitStore.set(clientId, clientData);
    }
    
    // Clean up old requests outside the window
    clientData.requests = clientData.requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (clientData.requests.length >= limits.maxRequests) {
      const resetTime = new Date(clientData.resetTime).toISOString();
      
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limits.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime,
          'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString()
        },
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: limits.message,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        })
      };
    }
    
    // Add current request
    clientData.requests.push(now);
    
    // Update reset time
    if (clientData.requests.length === 1) {
      clientData.resetTime = now + limits.windowMs;
    }
    
    // Add rate limit headers to response
    const remaining = limits.maxRequests - clientData.requests.length;
    
    // Call handler and add rate limit headers to response
    const response = await handler(event, context);
    
    // Ensure response has headers object
    if (!response.headers) {
      response.headers = {};
    }
    
    // Add rate limit headers
    response.headers['X-RateLimit-Limit'] = limits.maxRequests.toString();
    response.headers['X-RateLimit-Remaining'] = remaining.toString();
    response.headers['X-RateLimit-Reset'] = new Date(clientData.resetTime).toISOString();
    
    return response;
  };
}

/**
 * Distributed rate limiter using Redis (for production)
 * This is a placeholder for when Redis is implemented
 */
class RedisRateLimiter {
  constructor(redisClient, options = {}) {
    this.redis = redisClient;
    this.keyPrefix = options.keyPrefix || 'rate_limit:';
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
  }

  async isAllowed(identifier) {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Use Redis sorted sets for sliding window
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry
    pipeline.expire(key, Math.ceil(this.windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results[1][1];
    
    return {
      allowed: count < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - count - 1),
      resetTime: now + this.windowMs
    };
  }
}

/**
 * Throttling middleware for expensive operations
 * Ensures certain operations can only be performed once per time period
 */
function throttle(operationKey, cooldownMs = 60000) {
  const throttleStore = new Map();
  
  return async function(event, context, handler) {
    const clientId = getClientIdentifier(event);
    const throttleKey = `${clientId}:${operationKey}`;
    const now = Date.now();
    
    const lastOperation = throttleStore.get(throttleKey);
    
    if (lastOperation && lastOperation + cooldownMs > now) {
      const retryAfter = Math.ceil((lastOperation + cooldownMs - now) / 1000);
      
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString()
        },
        body: JSON.stringify({
          error: 'Operation throttled',
          message: `This operation can only be performed once every ${Math.ceil(cooldownMs / 1000)} seconds`,
          retryAfter
        })
      };
    }
    
    // Record operation time
    throttleStore.set(throttleKey, now);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [key, timestamp] of throttleStore.entries()) {
        if (timestamp + cooldownMs * 2 < now) {
          throttleStore.delete(key);
        }
      }
    }
    
    return handler(event, context);
  };
}

/**
 * IP-based blocking for security
 */
class IPBlocker {
  constructor() {
    this.blockedIPs = new Set();
    this.tempBlocked = new Map(); // IP -> unblock time
  }

  block(ip, duration = null) {
    if (duration) {
      this.tempBlocked.set(ip, Date.now() + duration);
    } else {
      this.blockedIPs.add(ip);
    }
  }

  unblock(ip) {
    this.blockedIPs.delete(ip);
    this.tempBlocked.delete(ip);
  }

  isBlocked(ip) {
    // Check permanent blocks
    if (this.blockedIPs.has(ip)) {
      return true;
    }

    // Check temporary blocks
    const unblockTime = this.tempBlocked.get(ip);
    if (unblockTime) {
      if (Date.now() < unblockTime) {
        return true;
      } else {
        this.tempBlocked.delete(ip);
      }
    }

    return false;
  }

  middleware() {
    return async (event, context, handler) => {
      const ip = event.headers['x-forwarded-for'] || 
                 event.headers['x-real-ip'] || 
                 'unknown';

      if (this.isBlocked(ip)) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Forbidden',
            message: 'Your IP has been blocked due to suspicious activity'
          })
        };
      }

      return handler(event, context);
    };
  }
}

// Create global IP blocker instance
const ipBlocker = new IPBlocker();

// Export rate limiting functions and middleware
module.exports = {
  rateLimiter,
  throttle,
  RedisRateLimiter,
  IPBlocker,
  ipBlocker,
  rateLimitConfigs,
  getClientIdentifier
};