/**
 * CloudFlare CDN Configuration and Workers
 * Optimizes static asset delivery and implements edge caching
 * Handles 10M+ requests per day with global distribution
 */

// ====================
// CloudFlare Worker for Edge Optimization
// ====================

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Cache configuration
const CACHE_CONTROL = {
  // Static assets - long cache
  'js': 'public, max-age=31536000, immutable',
  'css': 'public, max-age=31536000, immutable',
  'woff2': 'public, max-age=31536000, immutable',
  'woff': 'public, max-age=31536000, immutable',
  'ttf': 'public, max-age=31536000, immutable',
  'png': 'public, max-age=604800, stale-while-revalidate=86400',
  'jpg': 'public, max-age=604800, stale-while-revalidate=86400',
  'jpeg': 'public, max-age=604800, stale-while-revalidate=86400',
  'svg': 'public, max-age=604800, stale-while-revalidate=86400',
  'webp': 'public, max-age=604800, stale-while-revalidate=86400',
  
  // Dynamic content - short cache
  'json': 'public, max-age=60, stale-while-revalidate=300',
  'html': 'public, max-age=300, stale-while-revalidate=600',
  
  // API responses - no cache by default
  'api': 'no-cache, no-store, must-revalidate',
  'graphql': 'private, max-age=0',
}

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }
  
  // Route to appropriate handler
  if (url.pathname.startsWith('/api/')) {
    return handleAPI(request, url)
  } else if (url.pathname.startsWith('/graphql')) {
    return handleGraphQL(request, url)
  } else if (url.pathname.startsWith('/ws')) {
    return handleWebSocket(request, url)
  } else {
    return handleStatic(request, url)
  }
}

// Handle static assets with edge caching
async function handleStatic(request, url) {
  const cache = caches.default
  const cacheKey = new Request(url.toString(), request)
  
  // Check cache first
  let response = await cache.match(cacheKey)
  
  if (!response) {
    // Cache miss - fetch from origin
    response = await fetch(request)
    
    if (response.status === 200) {
      // Get file extension for cache control
      const ext = url.pathname.split('.').pop().toLowerCase()
      const cacheControl = CACHE_CONTROL[ext] || CACHE_CONTROL['html']
      
      // Clone response to modify headers
      response = new Response(response.body, response)
      response.headers.set('Cache-Control', cacheControl)
      
      // Add security headers
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      // Add performance headers
      response.headers.set('X-Cache', 'MISS')
      response.headers.set('X-Cache-Time', new Date().toISOString())
      
      // Store in cache
      await cache.put(cacheKey, response.clone())
    }
  } else {
    // Cache hit
    response = new Response(response.body, response)
    response.headers.set('X-Cache', 'HIT')
  }
  
  // Add CORS headers if needed
  if (request.headers.get('Origin')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  }
  
  return response
}

// Handle API requests with smart caching
async function handleAPI(request, url) {
  const cache = caches.default
  const cacheKey = new Request(url.toString(), request)
  
  // Determine if request is cacheable
  const isCacheable = request.method === 'GET' && 
                     !url.searchParams.has('nocache') &&
                     !request.headers.get('Authorization')
  
  if (isCacheable) {
    // Check cache for GET requests
    const cached = await cache.match(cacheKey)
    if (cached) {
      const age = Date.now() - new Date(cached.headers.get('X-Cache-Time')).getTime()
      
      // Return cached response if fresh (< 60 seconds)
      if (age < 60000) {
        const response = new Response(cached.body, cached)
        response.headers.set('X-Cache', 'HIT')
        response.headers.set('X-Cache-Age', Math.floor(age / 1000))
        return response
      }
    }
  }
  
  // Fetch from origin
  let response = await fetch(request, {
    cf: {
      // CloudFlare specific optimizations
      cacheTtl: 60,
      cacheEverything: isCacheable,
      minify: {
        javascript: false,
        css: false,
        html: false,
      },
    },
  })
  
  // Clone and modify response
  response = new Response(response.body, response)
  
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Add cache headers
  if (isCacheable && response.status === 200) {
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('X-Cache-Time', new Date().toISOString())
    
    // Store in cache
    await cache.put(cacheKey, response.clone())
  } else {
    response.headers.set('Cache-Control', CACHE_CONTROL['api'])
  }
  
  return response
}

// Handle GraphQL requests with query-specific caching
async function handleGraphQL(request, url) {
  // GraphQL requests are typically POST
  if (request.method !== 'POST') {
    return fetch(request)
  }
  
  // Parse request body
  const body = await request.json()
  const { query, variables, operationName } = body
  
  // Determine if query is cacheable
  const isQuery = query.trim().startsWith('query')
  const isCacheable = isQuery && !query.includes('mutation') && !query.includes('subscription')
  
  if (isCacheable) {
    // Generate cache key based on query and variables
    const cacheKey = await generateGraphQLCacheKey(query, variables, operationName)
    const cache = caches.default
    
    // Check cache
    const cached = await cache.match(cacheKey)
    if (cached) {
      const response = new Response(cached.body, cached)
      response.headers.set('X-Cache', 'HIT')
      response.headers.set('Content-Type', 'application/json')
      return response
    }
  }
  
  // Fetch from origin
  const response = await fetch(request)
  
  if (isCacheable && response.status === 200) {
    // Cache successful query responses
    const responseClone = response.clone()
    const responseBody = await responseClone.json()
    
    // Only cache if no errors
    if (!responseBody.errors) {
      const cacheKey = await generateGraphQLCacheKey(query, variables, operationName)
      const cache = caches.default
      
      const cachedResponse = new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'MISS',
          'X-Cache-Time': new Date().toISOString(),
        },
      })
      
      await cache.put(cacheKey, cachedResponse)
    }
  }
  
  return response
}

// Handle WebSocket upgrade requests
async function handleWebSocket(request, url) {
  // WebSocket connections cannot be cached
  // Add authentication and rate limiting here if needed
  return fetch(request, {
    headers: {
      'Upgrade': 'websocket',
    },
  })
}

// Handle OPTIONS requests for CORS
function handleOptions(request) {
  const headers = request.headers
  
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': headers.get('Access-Control-Request-Headers'),
        'Access-Control-Max-Age': '86400',
      },
    })
  } else {
    return new Response(null, {
      headers: {
        'Allow': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
      },
    })
  }
}

// Generate cache key for GraphQL queries
async function generateGraphQLCacheKey(query, variables, operationName) {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify({ query, variables, operationName }))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return new Request(`https://cache.local/graphql/${hashHex}`)
}

// ====================
// CloudFlare Page Rules Configuration
// ====================

const PAGE_RULES = {
  // API endpoints - no edge caching
  '/api/*': {
    cache_level: 'bypass',
    security_level: 'high',
    ssl: 'full',
    always_use_https: true,
    automatic_https_rewrites: true,
  },
  
  // GraphQL endpoint - selective caching
  '/graphql': {
    cache_level: 'bypass',
    security_level: 'high',
    ssl: 'full',
    always_use_https: true,
  },
  
  // Static assets - aggressive caching
  '/assets/*': {
    cache_level: 'cache_everything',
    edge_cache_ttl: 2678400, // 31 days
    browser_cache_ttl: 31536000, // 1 year
    origin_cache_control: false,
    sort_query_string_for_cache: true,
    minify: {
      js: true,
      css: true,
      html: false,
    },
  },
  
  // Images - moderate caching with Polish
  '/images/*': {
    cache_level: 'cache_everything',
    edge_cache_ttl: 604800, // 7 days
    browser_cache_ttl: 604800,
    polish: 'lossless',
    webp: true,
    origin_cache_control: false,
  },
  
  // Main app - short cache
  '/*': {
    cache_level: 'standard',
    edge_cache_ttl: 300, // 5 minutes
    browser_cache_ttl: 300,
    always_use_https: true,
    automatic_https_rewrites: true,
    minify: {
      js: true,
      css: true,
      html: true,
    },
  },
}

// ====================
// CloudFlare Transform Rules
// ====================

const TRANSFORM_RULES = {
  // URL normalization
  normalize_urls: {
    incoming: true,
    normalize_incoming_urls: {
      scope: 'both',
      normalize: {
        query_string_sort: true,
        remove_empty_query_strings: true,
      },
    },
  },
  
  // Request header modification
  request_headers: [
    {
      action: 'set',
      header: 'X-Forwarded-Proto',
      value: 'https',
    },
    {
      action: 'set',
      header: 'X-Real-IP',
      expression: 'http.request.headers["cf-connecting-ip"][0]',
    },
    {
      action: 'remove',
      header: 'CF-Connecting-IP',
    },
  ],
  
  // Response header modification
  response_headers: [
    {
      action: 'set',
      header: 'X-Powered-By',
      value: 'Security Platform',
    },
    {
      action: 'set',
      header: 'X-Cache-Status',
      expression: 'cf.cache_status',
    },
  ],
}

// ====================
// CloudFlare Firewall Rules
// ====================

const FIREWALL_RULES = {
  // Rate limiting
  rate_limiting: [
    {
      name: 'API Rate Limit',
      expression: '(http.request.uri.path contains "/api/")',
      action: 'challenge',
      ratelimit: {
        threshold: 100,
        period: 60,
        mitigation_timeout: 600,
      },
    },
    {
      name: 'GraphQL Rate Limit',
      expression: '(http.request.uri.path eq "/graphql")',
      action: 'challenge',
      ratelimit: {
        threshold: 50,
        period: 60,
        mitigation_timeout: 600,
      },
    },
  ],
  
  // Security rules
  security: [
    {
      name: 'Block Known Bots',
      expression: '(cf.client.bot)',
      action: 'block',
    },
    {
      name: 'Challenge Suspicious Requests',
      expression: '(cf.threat_score > 20)',
      action: 'challenge',
    },
    {
      name: 'Block SQL Injection',
      expression: '(http.request.uri.query contains "union" and http.request.uri.query contains "select")',
      action: 'block',
    },
  ],
  
  // Geographic restrictions
  geo_blocking: [
    {
      name: 'Block High Risk Countries',
      expression: '(ip.geoip.country in {"XX" "YY"})',
      action: 'block',
    },
  ],
}

// Export configuration
module.exports = {
  PAGE_RULES,
  TRANSFORM_RULES,
  FIREWALL_RULES,
  CACHE_CONTROL,
  SECURITY_HEADERS,
}