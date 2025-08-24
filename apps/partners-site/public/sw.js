// Candlefish Partners Portal Service Worker
// Optimized for field operators with offline-first architecture

const CACHE_NAME = 'candlefish-partners-v1.0.0';
const CACHE_VERSION = '1.0.0';
const OFFLINE_URL = '/offline';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/network',
  '/guides',
  '/stories',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main-app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// GraphQL queries to cache for offline use
const CRITICAL_GRAPHQL_QUERIES = [
  'GetOperatorNetwork',
  'GetImplementationGuides', 
  'GetPartnerDirectory',
  'GetSuccessStories'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Candlefish Partners Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // Cache static resources
        await cache.addAll(STATIC_CACHE_URLS);
        console.log('[SW] Static resources cached successfully');
      } catch (error) {
        console.error('[SW] Failed to cache static resources:', error);
        // Cache resources individually to avoid failing entire install
        for (const url of STATIC_CACHE_URLS) {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn('[SW] Failed to cache:', url, e);
          }
        }
      }
      
      // Skip waiting to activate immediately
      await self.skipWaiting();
    })()
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Candlefish Partners Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith('candlefish-partners-') && cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
      
      // Claim all clients immediately
      await self.clients.claim();
      console.log('[SW] Service worker activated and claimed all clients');
    })()
  );
});

// Fetch event - implement offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method !== 'GET') {
    return; // Don't cache non-GET requests
  }
  
  // Handle GraphQL API requests
  if (url.pathname.includes('/api/graphql')) {
    event.respondWith(handleGraphQLRequest(request));
    return;
  }
  
  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// Handle GraphQL requests with cache-first strategy for critical queries
async function handleGraphQLRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request.clone(), {
      headers: {
        ...request.headers,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (networkResponse.ok) {
      // Cache successful GraphQL responses for offline use
      const responseClone = networkResponse.clone();
      const responseBody = await responseClone.text();
      
      // Only cache critical queries to avoid storage bloat
      if (isCriticalQuery(responseBody)) {
        await cache.put(request, networkResponse.clone());
        console.log('[SW] Cached GraphQL response for offline use');
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('[SW] Network failed for GraphQL, trying cache');
    
    // Try cache if network fails
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving GraphQL from cache');
      return cachedResponse;
    }
    
    // Return offline fallback for GraphQL
    return new Response(
      JSON.stringify({
        data: null,
        errors: [{ message: 'Offline - cached data not available' }]
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first for faster loading
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    // Try network if not in cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      await cache.put(request, networkResponse.clone());
      console.log('[SW] Cached network response:', request.url);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network and cache failed for:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await cache.match(OFFLINE_URL);
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    // Return 503 for other requests
    return new Response('Offline', { status: 503 });
  }
}

// Check if GraphQL query is critical for offline functionality
function isCriticalQuery(responseBody) {
  return CRITICAL_GRAPHQL_QUERIES.some(query => 
    responseBody.includes(query) || responseBody.includes(query.toLowerCase())
  );
}

// Background sync for failed requests when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'partner-data-sync') {
    event.waitUntil(syncPartnerData());
  }
});

// Sync partner data when connection is restored
async function syncPartnerData() {
  try {
    console.log('[SW] Syncing partner data...');
    
    // Get all failed requests from IndexedDB (implementation depends on your offline queue)
    // This is a placeholder - implement based on your offline queue strategy
    
    console.log('[SW] Partner data sync completed');
  } catch (error) {
    console.error('[SW] Partner data sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New partner update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Update',
        icon: '/icons/action-view.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icons/action-close.png'
      }
    ],
    requireInteraction: true,
    tag: 'partner-update'
  };
  
  event.waitUntil(
    self.registration.showNotification('Candlefish Partners', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const notification = event.notification;
  
  if (action === 'explore') {
    // Open the app to relevant section
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.payload);
      })
    );
  }
});

console.log('[SW] Candlefish Partners Service Worker loaded successfully');