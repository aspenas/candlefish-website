/**
 * Cloudflare Worker for Security Dashboard API
 * Provides edge caching, rate limiting, and performance optimization
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Performance metrics
    const startTime = Date.now();
    let cacheStatus = 'MISS';
    
    try {
      // Rate limiting using Durable Objects
      const rateLimitResult = await checkRateLimit(request, env);
      if (!rateLimitResult.allowed) {
        return new Response('Rate limit exceeded', { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit,
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.reset,
            'Retry-After': rateLimitResult.retryAfter,
          }
        });
      }
      
      // Cache key generation
      const cacheKey = await generateCacheKey(request, env);
      
      // Check cache for GET requests
      if (request.method === 'GET') {
        const cachedResponse = await env.SECURITY_CACHE.get(cacheKey, 'json');
        if (cachedResponse) {
          cacheStatus = 'HIT';
          return createResponse(cachedResponse, {
            'X-Cache-Status': 'HIT',
            'X-Edge-Location': env.CF_LOCATION || 'unknown',
            'X-Response-Time': Date.now() - startTime,
          });
        }
      }
      
      // Forward request to origin
      const originResponse = await forwardToOrigin(request, env);
      
      // Cache successful GET responses
      if (request.method === 'GET' && originResponse.status === 200) {
        const responseData = await originResponse.json();
        const ttl = determineCacheTTL(url.pathname);
        
        // Store in KV with metadata
        ctx.waitUntil(
          env.SECURITY_CACHE.put(cacheKey, JSON.stringify({
            data: responseData,
            timestamp: Date.now(),
            headers: Object.fromEntries(originResponse.headers.entries()),
          }), { 
            expirationTtl: ttl,
            metadata: {
              path: url.pathname,
              method: request.method,
            }
          })
        );
        
        return createResponse({ data: responseData }, {
          'X-Cache-Status': 'MISS',
          'X-Edge-Location': env.CF_LOCATION || 'unknown',
          'X-Response-Time': Date.now() - startTime,
          'Cache-Control': `public, max-age=${ttl}`,
        });
      }
      
      return originResponse;
      
    } catch (error) {
      // Error handling with fallback
      console.error('Worker error:', error);
      
      // Try to serve from stale cache if available
      if (request.method === 'GET') {
        const staleResponse = await env.SECURITY_CACHE.get(cacheKey, 'json');
        if (staleResponse) {
          return createResponse(staleResponse, {
            'X-Cache-Status': 'STALE',
            'X-Error': 'origin-error',
            'X-Response-Time': Date.now() - startTime,
          });
        }
      }
      
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

// Rate limiting implementation
async function checkRateLimit(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const id = env.RateLimiter.idFromName(ip);
  const limiter = env.RateLimiter.get(id);
  
  const response = await limiter.fetch(request);
  const result = await response.json();
  
  return {
    allowed: result.allowed,
    limit: result.limit || 100,
    reset: result.reset || Date.now() + 60000,
    retryAfter: result.retryAfter || 60,
  };
}

// Cache key generation with normalization
async function generateCacheKey(request, env) {
  const url = new URL(request.url);
  
  // Normalize query parameters
  const params = new URLSearchParams(url.search);
  const sortedParams = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Include user context for personalized responses
  const authHeader = request.headers.get('Authorization');
  let userContext = 'anonymous';
  if (authHeader) {
    // Hash the auth token for privacy
    const encoder = new TextEncoder();
    const data = encoder.encode(authHeader);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    userContext = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }
  
  return `${request.method}:${url.pathname}:${sortedParams}:${userContext}`;
}

// Determine cache TTL based on endpoint
function determineCacheTTL(pathname) {
  const ttlMap = {
    '/api/security/overview': 60,        // 1 minute
    '/api/assets': 300,                  // 5 minutes
    '/api/vulnerabilities': 120,         // 2 minutes
    '/api/alerts': 30,                   // 30 seconds
    '/api/compliance': 600,              // 10 minutes
    '/api/kong/status': 10,              // 10 seconds - critical monitoring
  };
  
  // Check for pattern matches
  for (const [pattern, ttl] of Object.entries(ttlMap)) {
    if (pathname.startsWith(pattern)) {
      return ttl;
    }
  }
  
  // Default TTL
  return 60;
}

// Forward request to origin with optimizations
async function forwardToOrigin(request, env) {
  const url = new URL(request.url);
  
  // Select origin based on geo-location
  const origin = selectOrigin(env.CF_LOCATION);
  url.host = origin;
  
  // Clone request with modifications
  const modifiedRequest = new Request(url, {
    method: request.method,
    headers: new Headers(request.headers),
    body: request.body,
    redirect: 'follow',
  });
  
  // Add tracing headers
  modifiedRequest.headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || 'unknown');
  modifiedRequest.headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || 'unknown');
  modifiedRequest.headers.set('X-Request-ID', crypto.randomUUID());
  modifiedRequest.headers.set('X-Edge-Location', env.CF_LOCATION || 'unknown');
  
  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(modifiedRequest, { 
      signal: controller.signal,
      cf: {
        cacheTtl: 0, // Bypass Cloudflare cache for origin requests
        cacheEverything: false,
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Select optimal origin based on location
function selectOrigin(location) {
  const originMap = {
    'US': 'security-use1.candlefish.ai',
    'EU': 'security-euw1.candlefish.ai',
    'AS': 'security-apse1.candlefish.ai',
  };
  
  // Determine region from location
  const region = location ? location.substring(0, 2) : 'US';
  return originMap[region] || originMap['US'];
}

// Create response with standard headers
function createResponse(data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Powered-By': 'Cloudflare Workers',
      ...headers,
    },
  });
}

// Durable Object for rate limiting
export class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.requests = new Map();
  }
  
  async fetch(request) {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const limit = 100; // 100 requests per minute
    
    // Clean old entries
    for (const [timestamp] of this.requests) {
      if (now - timestamp > windowMs) {
        this.requests.delete(timestamp);
      }
    }
    
    // Check rate limit
    const requestCount = this.requests.size;
    
    if (requestCount >= limit) {
      return new Response(JSON.stringify({
        allowed: false,
        limit,
        reset: now + windowMs,
        retryAfter: Math.ceil(windowMs / 1000),
      }));
    }
    
    // Add new request
    this.requests.set(now, true);
    
    return new Response(JSON.stringify({
      allowed: true,
      limit,
      remaining: limit - requestCount - 1,
      reset: now + windowMs,
    }));
  }
}