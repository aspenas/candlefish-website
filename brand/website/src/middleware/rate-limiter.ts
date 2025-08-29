/**
 * Rate Limiting Middleware
 * DDoS protection and API rate limiting implementation
 * SECURITY LEVEL: HIGH
 */

import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

// Rate limit configurations for different endpoints
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  blockDuration: number; // Block duration in ms after limit exceeded
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  handler?: (req: NextRequest) => NextResponse;
}

// Endpoint-specific rate limits
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict limits
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 attempts per 15 minutes
    blockDuration: 30 * 60 * 1000, // 30 minute block
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,           // 3 registrations per hour
    blockDuration: 60 * 60 * 1000, // 1 hour block
  },
  '/api/auth/password-reset': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,           // 3 reset attempts per hour
    blockDuration: 60 * 60 * 1000, // 1 hour block
  },
  
  // API endpoints - moderate limits
  '/api/': {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 100,         // 100 requests per minute
    blockDuration: 5 * 60 * 1000, // 5 minute block
  },
  
  // Public endpoints - lenient limits
  '/': {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 300,        // 300 requests per minute
    blockDuration: 60 * 1000, // 1 minute block
  },
};

// Global rate limit as fallback
const GLOBAL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,       // 1 minute
  maxRequests: 1000,         // 1000 requests per minute globally
  blockDuration: 5 * 60 * 1000, // 5 minute block
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
  violations: number;
}

class RateLimiter {
  private cache: LRUCache<string, RateLimitEntry>;
  private blacklist: Set<string>;
  private whitelist: Set<string>;

  constructor() {
    // Initialize LRU cache for rate limit tracking
    this.cache = new LRUCache<string, RateLimitEntry>({
      max: 10000, // Maximum 10,000 entries
      ttl: 60 * 60 * 1000, // 1 hour TTL
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });

    // Initialize IP lists
    this.blacklist = new Set();
    this.whitelist = new Set(this.getWhitelistedIPs());

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
    const clientId = this.getClientIdentifier(req);
    const endpoint = this.getEndpointKey(req);

    // Skip rate limiting for whitelisted IPs
    if (this.whitelist.has(clientId)) {
      return null;
    }

    // Immediately block blacklisted IPs
    if (this.blacklist.has(clientId)) {
      return this.createBlockedResponse('IP address is blacklisted');
    }

    // Get rate limit config for endpoint
    const config = this.getRateLimitConfig(endpoint);
    
    // Check global rate limit
    const globalCheck = this.checkLimit(clientId, GLOBAL_RATE_LIMIT);
    if (globalCheck.blocked) {
      this.handleViolation(clientId, 'global');
      return this.createRateLimitResponse(globalCheck, 'global');
    }

    // Check endpoint-specific rate limit
    const endpointKey = `${clientId}:${endpoint}`;
    const endpointCheck = this.checkLimit(endpointKey, config);
    if (endpointCheck.blocked) {
      this.handleViolation(clientId, endpoint);
      return this.createRateLimitResponse(endpointCheck, endpoint);
    }

    // Request is allowed
    return null;
  }

  /**
   * Check if limit is exceeded
   */
  private checkLimit(key: string, config: RateLimitConfig): RateLimitEntry {
    const now = Date.now();
    let entry = this.cache.get(key);

    if (!entry) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
        violations: 0,
      };
      this.cache.set(key, entry);
      return entry;
    }

    // Check if blocked
    if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
      return entry;
    }

    // Check if window has expired
    if (entry.resetTime <= now) {
      // Reset counter
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
      entry.blocked = false;
      delete entry.blockUntil;
    } else {
      // Increment counter
      entry.count++;
      
      // Check if limit exceeded
      if (entry.count > config.maxRequests) {
        entry.blocked = true;
        entry.blockUntil = now + config.blockDuration;
        entry.violations++;
      }
    }

    this.cache.set(key, entry);
    return entry;
  }

  /**
   * Get client identifier (IP + fingerprint)
   */
  private getClientIdentifier(req: NextRequest): string {
    // Get IP address
    const ip = this.getClientIP(req);
    
    // Get additional fingerprinting data
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    
    // Create fingerprint hash
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .digest('hex')
      .substring(0, 16);
    
    return `${ip}:${fingerprint}`;
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(req: NextRequest): string {
    // Check various headers for IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = req.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to request IP
    return req.ip || '127.0.0.1';
  }

  /**
   * Get endpoint key for rate limiting
   */
  private getEndpointKey(req: NextRequest): string {
    const path = req.nextUrl.pathname;

    // Find matching rate limit config
    for (const key of Object.keys(RATE_LIMITS)) {
      if (path.startsWith(key)) {
        return key;
      }
    }

    // Default to root
    return '/';
  }

  /**
   * Get rate limit config for endpoint
   */
  private getRateLimitConfig(endpoint: string): RateLimitConfig {
    return RATE_LIMITS[endpoint] || RATE_LIMITS['/'];
  }

  /**
   * Handle rate limit violation
   */
  private handleViolation(clientId: string, endpoint: string): void {
    console.warn(`[RateLimiter] Rate limit violation: ${clientId} on ${endpoint}`);
    
    // Get violation count
    const violationKey = `violations:${clientId}`;
    let violations = this.cache.get(violationKey);
    
    if (!violations) {
      violations = {
        count: 1,
        resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        blocked: false,
        violations: 1,
      };
    } else {
      violations.violations++;
      
      // Auto-blacklist after 10 violations in 24 hours
      if (violations.violations >= 10) {
        this.blacklist.add(clientId);
        console.error(`[RateLimiter] IP blacklisted due to repeated violations: ${clientId}`);
      }
    }
    
    this.cache.set(violationKey, violations);
  }

  /**
   * Create rate limit response
   */
  private createRateLimitResponse(entry: RateLimitEntry, endpoint: string): NextResponse {
    const retryAfter = entry.blockUntil ? Math.ceil((entry.blockUntil - Date.now()) / 1000) : 60;
    
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${endpoint}`,
        retryAfter: retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': RATE_LIMITS[endpoint]?.maxRequests.toString() || '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        },
      }
    );
  }

  /**
   * Create blocked response
   */
  private createBlockedResponse(reason: string): NextResponse {
    return new NextResponse(
      JSON.stringify({
        error: 'Forbidden',
        message: reason,
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Get whitelisted IPs from environment
   */
  private getWhitelistedIPs(): string[] {
    const whitelistEnv = process.env.RATE_LIMIT_WHITELIST || '';
    return whitelistEnv.split(',').map(ip => ip.trim()).filter(Boolean);
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    setInterval(() => {
      // Cache cleanup is handled by LRU-cache TTL
      // Clear old blacklist entries (optional)
      if (this.blacklist.size > 1000) {
        // Keep only recent entries
        const newBlacklist = new Set<string>();
        let count = 0;
        for (const ip of Array.from(this.blacklist).reverse()) {
          if (count++ < 500) {
            newBlacklist.add(ip);
          }
        }
        this.blacklist = newBlacklist;
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Reset rate limit for a specific key
   */
  resetLimit(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Add IP to blacklist
   */
  blacklistIP(ip: string): void {
    this.blacklist.add(ip);
  }

  /**
   * Remove IP from blacklist
   */
  unblacklistIP(ip: string): void {
    this.blacklist.delete(ip);
  }

  /**
   * Add IP to whitelist
   */
  whitelistIP(ip: string): void {
    this.whitelist.add(ip);
  }

  /**
   * Get current stats
   */
  getStats(): {
    cacheSize: number;
    blacklistSize: number;
    whitelistSize: number;
  } {
    return {
      cacheSize: this.cache.size,
      blacklistSize: this.blacklist.size,
      whitelistSize: this.whitelist.size,
    };
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Export middleware function
export async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
  return rateLimiter.checkRateLimit(req);
}

// Export utility functions
export function resetRateLimit(key: string): void {
  rateLimiter.resetLimit(key);
}

export function blacklistIP(ip: string): void {
  rateLimiter.blacklistIP(ip);
}

export function whitelistIP(ip: string): void {
  rateLimiter.whitelistIP(ip);
}

export function getRateLimiterStats() {
  return rateLimiter.getStats();
}