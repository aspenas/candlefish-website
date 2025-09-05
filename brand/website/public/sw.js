// Service Worker for Candlefish.ai - Offline Support & Performance
const CACHE_NAME = 'candlefish-v1.0.0';
const RUNTIME_CACHE = 'runtime-cache';

// Core assets to cache for offline access
const STATIC_ASSETS = [
  '/',
  '/atelier/',
  '/monitoring/',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle API requests differently (network first)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const responseToCache = response.clone();
          
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets (cache first)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          event.waitUntil(
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  return caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, response.clone());
                    return response;
                  });
                }
              })
              .catch(() => {})
          );
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response before caching
            const responseToCache = response.clone();
            
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
            
            return response;
          })
          .catch(() => {
            // Network failed, try to return offline page
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-metrics') {
    event.waitUntil(syncMetrics());
  }
});

// Periodic background sync for metrics
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-metrics') {
    event.waitUntil(updateMetrics());
  }
});

// Push notifications for operational alerts
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New operational update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Candlefish Operations', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/monitoring/')
    );
  }
});

// Helper functions
async function syncMetrics() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    
    const metricsRequests = requests.filter(req => 
      req.url.includes('/api/metrics')
    );
    
    for (const request of metricsRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Sync failed for:', request.url);
      }
    }
  } catch (error) {
    console.error('Sync metrics error:', error);
  }
}

async function updateMetrics() {
  try {
    const response = await fetch('/api/metrics/latest');
    if (response.ok) {
      const data = await response.json();
      
      // Send update to all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'METRICS_UPDATE',
          data
        });
      });
    }
  } catch (error) {
    console.error('Update metrics error:', error);
  }
}

// Cache versioning and update notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});