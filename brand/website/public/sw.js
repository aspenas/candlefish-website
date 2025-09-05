// Candlefish AI Service Worker
// Version 1.0 - Performance optimized caching strategy

const CACHE_NAME = 'candlefish-v1';
const STATIC_CACHE_NAME = 'candlefish-static-v1';
const DYNAMIC_CACHE_NAME = 'candlefish-dynamic-v1';
const THREE_CACHE_NAME = 'candlefish-threejs-v1';

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000,    // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,       // 1 day
  THREE: 30 * 24 * 60 * 60 * 1000,    // 30 days (Three.js assets are stable)
  API: 15 * 60 * 1000,                // 15 minutes
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/hero-fish.css',
  '/favicon.ico',
  '/offline.html',
];

// Three.js and WebGL related assets
const THREE_JS_PATTERNS = [
  /\/three\//,
  /\.glsl$/,
  /\.vert$/,
  /\.frag$/,
  /\/shaders\//,
  /@react-three/,
];

// Critical resource patterns for immediate caching
const CRITICAL_PATTERNS = [
  /\/_next\/static\//,
  /\/fonts\//,
  /\.woff2?$/,
  /\.css$/,
  /\.js$/,
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME)
        .then(cache => cache.addAll(STATIC_ASSETS))
        .catch(err => console.warn('[SW] Failed to cache static assets:', err)),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes('candlefish-v1')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim clients
      self.clients.claim()
    ])
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different resource types
  if (isThreeJSAsset(request)) {
    event.respondWith(handleThreeJSAsset(request));
  } else if (isCriticalResource(request)) {
    event.respondWith(handleCriticalResource(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Three.js asset handler - long-term caching with performance focus
async function handleThreeJSAsset(request) {
  try {
    const cache = await caches.open(THREE_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached && !isExpired(cached, CACHE_EXPIRATION.THREE)) {
      return cached;
    }
    
    const response = await fetch(request, {
      cache: 'force-cache' // Aggressive caching for Three.js
    });
    
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.warn('[SW] Three.js asset failed:', error);
    return caches.match(request) || fetch(request);
  }
}

// Critical resource handler - network first with fast fallback
async function handleCriticalResource(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    
    // Race network vs cache for performance
    const networkPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });
    
    const cachePromise = cache.match(request);
    
    // Return whichever resolves first
    return await Promise.race([
      networkPromise,
      cachePromise.then(cached => cached || networkPromise)
    ]);
  } catch (error) {
    console.warn('[SW] Critical resource failed:', error);
    return caches.match(request);
  }
}

// API request handler - network first with short cache
async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    
    // Always try network first for API requests
    const response = await fetch(request);
    
    if (response.ok && response.status < 400) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.warn('[SW] API request failed, serving from cache:', error);
    const cached = await caches.match(request);
    
    if (cached && !isExpired(cached, CACHE_EXPIRATION.API)) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Static asset handler - cache first
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached && !isExpired(cached, CACHE_EXPIRATION.STATIC)) {
      return cached;
    }
    
    const response = await fetch(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

// Dynamic request handler - network first with cache fallback
async function handleDynamicRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = await fetch(request);
    
    if (response.ok && response.status < 400) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    
    if (cached && !isExpired(cached, CACHE_EXPIRATION.DYNAMIC)) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Utility functions
function isThreeJSAsset(request) {
  return THREE_JS_PATTERNS.some(pattern => pattern.test(request.url));
}

function isCriticalResource(request) {
  return CRITICAL_PATTERNS.some(pattern => pattern.test(request.url));
}

function isAPIRequest(request) {
  return request.url.includes('/api/') || 
         request.headers.get('content-type')?.includes('application/json');
}

function isStaticAsset(request) {
  return request.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ico|webp|avif)$/);
}

function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const responseTime = new Date(dateHeader).getTime();
  const now = Date.now();
  
  return (now - responseTime) > maxAge;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-cleanup') {
    event.waitUntil(cleanupExpiredCaches());
  }
});

// Cleanup expired caches
async function cleanupExpiredCaches() {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      if (cacheName.includes('candlefish')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          
          let maxAge = CACHE_EXPIRATION.DYNAMIC;
          if (cacheName.includes('static')) maxAge = CACHE_EXPIRATION.STATIC;
          if (cacheName.includes('threejs')) maxAge = CACHE_EXPIRATION.THREE;
          
          if (response && isExpired(response, maxAge)) {
            console.log('[SW] Removing expired cache entry:', request.url);
            await cache.delete(request);
          }
        }
      }
    }
  } catch (error) {
    console.warn('[SW] Cache cleanup failed:', error);
  }
}

// Message handling for manual cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CACHE_UPDATE':
        event.waitUntil(cleanupExpiredCaches());
        break;
        
      case 'CACHE_CLEAR':
        event.waitUntil(
          caches.keys().then(cacheNames => 
            Promise.all(
              cacheNames.filter(name => name.includes('candlefish'))
                       .map(name => caches.delete(name))
            )
          )
        );
        break;
    }
  }
});

console.log('[SW] Service Worker loaded - Candlefish AI v1.0');