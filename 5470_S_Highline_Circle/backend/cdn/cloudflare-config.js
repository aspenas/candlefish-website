/**
 * Cloudflare CDN Configuration with Performance Optimizations
 * Implements caching strategies, image optimization, and edge computing
 */

// Cloudflare Worker for edge optimization
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  // Static assets
  static: {
    cacheTTL: 31536000, // 1 year
    browserTTL: 31536000,
    cacheKey: 'static',
    patterns: [/\.(js|css|woff|woff2|ttf|eot|svg)$/],
  },
  
  // Images
  images: {
    cacheTTL: 2592000, // 30 days
    browserTTL: 86400, // 1 day
    cacheKey: 'images',
    patterns: [/\.(jpg|jpeg|png|gif|webp|avif|ico)$/],
  },
  
  // API responses
  api: {
    cacheTTL: 300, // 5 minutes
    browserTTL: 0, // No browser cache
    cacheKey: 'api',
    patterns: [/^\/api\//],
  },
  
  // GraphQL
  graphql: {
    cacheTTL: 60, // 1 minute for queries
    browserTTL: 0,
    cacheKey: 'graphql',
    patterns: [/^\/graphql$/],
  },
  
  // HTML pages
  html: {
    cacheTTL: 3600, // 1 hour
    browserTTL: 0,
    cacheKey: 'html',
    patterns: [/\.html$/, /^\/$/],
  },
};

/**
 * Image optimization settings
 */
const IMAGE_CONFIG = {
  format: 'auto', // Auto-detect best format (WebP/AVIF)
  quality: 85,
  fit: 'scale-down',
  metadata: 'none',
  sharpen: 1,
  
  // Responsive image sizes
  sizes: {
    thumbnail: { width: 150, height: 150, quality: 80 },
    mobile: { width: 375, quality: 75 },
    tablet: { width: 768, quality: 80 },
    desktop: { width: 1920, quality: 85 },
  },
};

/**
 * Security headers
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
};

/**
 * Performance headers
 */
const PERFORMANCE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'max-age=3600',
  'Vary': 'Accept-Encoding, Accept',
  'Accept-CH': 'DPR, Viewport-Width, Width',
  'Accept-CH-Lifetime': '86400',
};

/**
 * Main request handler
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle different request types
  if (isImageRequest(url)) {
    return handleImageRequest(request, url);
  }
  
  if (isAPIRequest(url)) {
    return handleAPIRequest(request, url);
  }
  
  if (isStaticAsset(url)) {
    return handleStaticRequest(request, url);
  }
  
  if (isGraphQLRequest(url)) {
    return handleGraphQLRequest(request, url);
  }
  
  // Default handling with caching
  return handleDefaultRequest(request, url);
}

/**
 * Handle image requests with optimization
 */
async function handleImageRequest(request, url) {
  const cache = caches.default;
  
  // Parse image transformation parameters
  const params = parseImageParams(url);
  
  // Generate cache key
  const cacheKey = generateImageCacheKey(url, params);
  
  // Check cache
  let response = await cache.match(cacheKey);
  if (response) {
    return addHeaders(response, { 'X-Cache': 'HIT' });
  }
  
  // Build Cloudflare Image Resizing URL
  const imageURL = buildImageURL(url, params);
  
  // Fetch optimized image
  const imageRequest = new Request(imageURL, {
    cf: {
      image: {
        format: params.format || IMAGE_CONFIG.format,
        quality: params.quality || IMAGE_CONFIG.quality,
        width: params.width,
        height: params.height,
        fit: params.fit || IMAGE_CONFIG.fit,
        metadata: IMAGE_CONFIG.metadata,
        sharpen: IMAGE_CONFIG.sharpen,
      },
      cacheEverything: true,
      cacheTtl: CACHE_CONFIG.images.cacheTTL,
    },
  });
  
  response = await fetch(imageRequest);
  
  // Cache the response
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${CACHE_CONFIG.images.browserTTL}`);
    headers.set('X-Cache', 'MISS');
    
    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    
    // Store in cache
    await cache.put(cacheKey, response.clone());
  }
  
  return response;
}

/**
 * Handle API requests with caching
 */
async function handleAPIRequest(request, url) {
  const cache = caches.default;
  
  // Only cache GET requests
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  // Generate cache key
  const cacheKey = new Request(url.toString(), {
    method: 'GET',
    headers: { 'Cache-Key': 'api' },
  });
  
  // Check cache
  let response = await cache.match(cacheKey);
  if (response) {
    return addHeaders(response, { 
      'X-Cache': 'HIT',
      'Cache-Control': 'no-cache',
    });
  }
  
  // Fetch from origin
  response = await fetch(request, {
    cf: {
      cacheTtl: CACHE_CONFIG.api.cacheTTL,
      cacheKey: CACHE_CONFIG.api.cacheKey,
    },
  });
  
  // Cache successful responses
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-cache');
    headers.set('X-Cache', 'MISS');
    
    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    
    await cache.put(cacheKey, cachedResponse.clone());
    return cachedResponse;
  }
  
  return response;
}

/**
 * Handle GraphQL requests with smart caching
 */
async function handleGraphQLRequest(request, url) {
  // Only cache queries, not mutations
  if (request.method !== 'POST') {
    return fetch(request);
  }
  
  const body = await request.json();
  
  // Check if it's a query (not mutation or subscription)
  if (!body.query || body.query.trim().startsWith('mutation') || body.query.trim().startsWith('subscription')) {
    return fetch(request);
  }
  
  const cache = caches.default;
  
  // Generate cache key from query
  const cacheKey = generateGraphQLCacheKey(body);
  
  // Check cache
  let response = await cache.match(cacheKey);
  if (response) {
    return addHeaders(response, {
      'X-Cache': 'HIT',
      'Cache-Control': 'no-cache',
    });
  }
  
  // Fetch from origin
  response = await fetch(request);
  
  // Cache successful responses
  if (response.ok) {
    const clonedResponse = response.clone();
    const responseData = await clonedResponse.json();
    
    // Only cache if no errors
    if (!responseData.errors) {
      const cachedResponse = new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Cache': 'MISS',
        },
      });
      
      // Store with short TTL
      await cache.put(cacheKey, cachedResponse.clone());
    }
    
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: response.headers,
    });
  }
  
  return response;
}

/**
 * Handle static assets with long-term caching
 */
async function handleStaticRequest(request, url) {
  const cache = caches.default;
  
  // Check cache
  let response = await cache.match(request);
  if (response) {
    return addHeaders(response, { 'X-Cache': 'HIT' });
  }
  
  // Fetch from origin
  response = await fetch(request, {
    cf: {
      cacheEverything: true,
      cacheTtl: CACHE_CONFIG.static.cacheTTL,
    },
  });
  
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${CACHE_CONFIG.static.browserTTL}, immutable`);
    headers.set('X-Cache', 'MISS');
    
    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    
    await cache.put(request, cachedResponse.clone());
    return cachedResponse;
  }
  
  return response;
}

/**
 * Handle default requests
 */
async function handleDefaultRequest(request, url) {
  const response = await fetch(request);
  
  // Add security and performance headers
  const headers = new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  // Add performance hints
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    headers.set('Link', [
      '</css/app.css>; rel=preload; as=style',
      '</js/app.js>; rel=preload; as=script',
      '</fonts/main.woff2>; rel=preload; as=font; crossorigin',
      '</api/initial-data>; rel=prefetch',
    ].join(', '));
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Utility functions
 */
function isImageRequest(url) {
  return CACHE_CONFIG.images.patterns.some(pattern => pattern.test(url.pathname));
}

function isAPIRequest(url) {
  return CACHE_CONFIG.api.patterns.some(pattern => pattern.test(url.pathname));
}

function isStaticAsset(url) {
  return CACHE_CONFIG.static.patterns.some(pattern => pattern.test(url.pathname));
}

function isGraphQLRequest(url) {
  return CACHE_CONFIG.graphql.patterns.some(pattern => pattern.test(url.pathname));
}

function parseImageParams(url) {
  const params = {};
  
  // Parse query parameters
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  // Parse size from path (e.g., /images/thumbnail/image.jpg)
  const pathParts = url.pathname.split('/');
  if (pathParts.length > 2) {
    const size = pathParts[pathParts.length - 2];
    if (IMAGE_CONFIG.sizes[size]) {
      Object.assign(params, IMAGE_CONFIG.sizes[size]);
    }
  }
  
  return params;
}

function buildImageURL(url, params) {
  const imageURL = new URL(url);
  
  // Remove transformation params from URL
  ['width', 'height', 'quality', 'format', 'fit'].forEach(param => {
    imageURL.searchParams.delete(param);
  });
  
  return imageURL.toString();
}

function generateImageCacheKey(url, params) {
  const key = new URL(url);
  
  // Add params to cache key
  Object.entries(params).sort().forEach(([k, v]) => {
    key.searchParams.set(k, v);
  });
  
  return new Request(key.toString(), {
    method: 'GET',
    headers: { 'Cache-Key': 'image' },
  });
}

function generateGraphQLCacheKey(body) {
  const hash = btoa(JSON.stringify({
    query: body.query,
    variables: body.variables,
  }));
  
  return new Request(`https://cache.local/graphql/${hash}`, {
    method: 'GET',
    headers: { 'Cache-Key': 'graphql' },
  });
}

function addHeaders(response, headers) {
  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}