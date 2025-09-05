// Candlefish Fish Animation Service Worker
// Generated from PWAManager.generateServiceWorkerCode()

const CACHE_NAME = 'candlefish-fish-v1.2.0';
const OFFLINE_URL = '/offline-fish.html';

// Files to cache for offline use
const STATIC_CACHE_URLS = [
  '/',
  '/offline-fish.html',
  '/hero-fish.css',
  '/img/cf-fish-fallback.svg',
  '/img/candlefish-static.svg',
  '/favicon.ico',
  // Add essential JS/CSS files
  '/_next/static/css/',
  '/_next/static/js/',
  // Fonts and other assets
  '/fonts/',
];

// Dynamic cache patterns
const CACHE_PATTERNS = {
  images: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
  scripts: /\.(js|jsx|ts|tsx)$/i,
  styles: /\.(css|scss|sass)$/i,
  fonts: /\.(woff|woff2|eot|ttf|otf)$/i
};

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources...');
        return cache.addAll(STATIC_CACHE_URLS.filter(url => !url.endsWith('/')));
      })
      .then(() => {
        console.log('[SW] Static resources cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('candlefish-fish-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Claim all clients immediately
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Service worker activated successfully');
    })
    .catch((error) => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip cross-origin requests unless they're for assets
  if (url.origin !== self.location.origin && !isAssetRequest(request)) {
    return;
  }

  event.respondWith(handleFetchRequest(request));
});

/**
 * Handle fetch requests with caching strategy
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(request)) {
      return await cacheFirstStrategy(request);
    }
    
    // Strategy 2: Network First for HTML pages
    if (isNavigationRequest(request)) {
      return await networkFirstStrategy(request);
    }
    
    // Strategy 3: Stale While Revalidate for API calls
    if (isAPIRequest(request)) {
      return await staleWhileRevalidateStrategy(request);
    }
    
    // Default: Network First
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    return await handleFetchError(request, error);
  }
}

/**
 * Cache First strategy - check cache, then network
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    throw error;
  }
}

/**
 * Network First strategy - try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Update cache with fresh content
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, checking cache:', error.message);
    
    // Network failed, try cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate - return cache immediately, update in background
 */
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Start network request (don't await)
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.warn('[SW] Background update failed:', error);
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // No cached version, wait for network
  return await networkPromise;
}

/**
 * Handle fetch errors with appropriate fallbacks
 */
async function handleFetchError(request, error) {
  const url = new URL(request.url);
  
  // For navigation requests, serve offline page
  if (isNavigationRequest(request)) {
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match(OFFLINE_URL);
    
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback offline HTML
    return new Response(
      createOfflineHTML(),
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
  
  // For image requests, return fallback image
  if (CACHE_PATTERNS.images.test(url.pathname)) {
    const cache = await caches.open(CACHE_NAME);
    const fallbackImage = await cache.match('/img/cf-fish-fallback.svg');
    
    if (fallbackImage) {
      return fallbackImage;
    }
  }
  
  // For all other requests, return error
  throw error;
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    CACHE_PATTERNS.images.test(url.pathname) ||
    CACHE_PATTERNS.fonts.test(url.pathname) ||
    CACHE_PATTERNS.styles.test(url.pathname) ||
    url.pathname.includes('/_next/static/') ||
    url.pathname.includes('/static/')
  );
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

/**
 * Check if request is an API call
 */
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || url.pathname.includes('/api/');
}

/**
 * Check if request is for an asset (cross-origin)
 */
function isAssetRequest(request) {
  const url = new URL(request.url);
  return (
    CACHE_PATTERNS.images.test(url.pathname) ||
    CACHE_PATTERNS.fonts.test(url.pathname) ||
    CACHE_PATTERNS.styles.test(url.pathname) ||
    CACHE_PATTERNS.scripts.test(url.pathname)
  );
}

/**
 * Create offline HTML page
 */
function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline - Candlefish Animation</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #3A3A60 0%, #2A2A50 100%);
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          text-align: center;
        }
        
        .offline-container {
          max-width: 400px;
          padding: 2rem;
        }
        
        .fish-icon {
          width: 120px;
          height: 80px;
          margin: 0 auto 2rem;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yMCA0MEMyMCA0MCA0MCAyMCA4MCAyMEM5MCAyMCAxMDAgMzAgMTAwIDQwQzEwMCA1MCA5MCA2MCA4MCA2MEM0MCA2MCAyMCA0MCAyMCA0MFoiIGZpbGw9IiNGRkIzNDciLz48Y2lyY2xlIGN4PSI3MCIgY3k9IjM1IiByPSIzIiBmaWxsPSIjMzMzIi8+PC9zdmc+') no-repeat center;
          background-size: contain;
          opacity: 0.8;
        }
        
        h1 {
          font-size: 2rem;
          margin: 0 0 1rem;
          font-weight: 300;
        }
        
        p {
          font-size: 1.1rem;
          margin: 0 0 2rem;
          opacity: 0.8;
          line-height: 1.5;
        }
        
        .retry-button {
          background: #FFB347;
          color: #3A3A60;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .retry-button:hover {
          background: #FFA500;
        }
        
        .offline-fish {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 40px;
          opacity: 0.3;
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @media (max-width: 480px) {
          .offline-container {
            padding: 1rem;
          }
          
          h1 {
            font-size: 1.5rem;
          }
          
          p {
            font-size: 1rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="fish-icon"></div>
        <h1>You're Offline</h1>
        <p>The fish animation is swimming in cached waters. Check your connection and try again.</p>
        <button class="retry-button" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
      
      <div class="offline-fish">
        <div class="fish-icon" style="width: 100%; height: 100%;"></div>
      </div>
      
      <script>
        // Auto-retry when online
        window.addEventListener('online', () => {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        });
        
        // Show connection status
        if (navigator.onLine) {
          document.querySelector('p').textContent = 'Connection restored! The page will reload automatically.';
          setTimeout(() => window.location.reload(), 2000);
        }
      </script>
    </body>
    </html>
  `;
}

// Background sync for analytics
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'fish-analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

/**
 * Sync pending analytics data
 */
async function syncAnalytics() {
  try {
    console.log('[SW] Syncing analytics data...');
    
    // Open IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    
    // Get unsynced data
    const unsyncedData = await getAllUnsynced(store);
    console.log(`[SW] Found ${unsyncedData.length} unsynced analytics items`);
    
    let syncedCount = 0;
    
    for (const item of unsyncedData) {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Sync-Source': 'service-worker'
          },
          body: JSON.stringify({
            event: item.event,
            data: item.data,
            timestamp: item.timestamp,
            offline: true
          })
        });
        
        if (response.ok) {
          // Mark as synced
          await store.put({ ...item, synced: true });
          syncedCount++;
        } else {
          console.warn('[SW] Analytics sync failed for item:', item.id, response.status);
        }
      } catch (error) {
        console.warn('[SW] Failed to sync analytics item:', item.id, error);
      }
    }
    
    console.log(`[SW] Successfully synced ${syncedCount}/${unsyncedData.length} analytics items`);
    
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

/**
 * Open IndexedDB connection
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CandlefishAnimationDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('analytics')) {
        const store = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

/**
 * Get all unsynced analytics items
 */
function getAllUnsynced(store) {
  return new Promise((resolve, reject) => {
    const index = store.index('synced');
    const request = index.getAll(false); // Get items where synced = false
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Your fish are swimming!',
      icon: '/icon-192.png',
      badge: '/icon-badge.png',
      tag: 'fish-notification',
      renotify: false,
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View Animation',
          icon: '/icon-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icon-dismiss.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Candlefish Animation', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CACHE_ANALYTICS':
        // Cache analytics data for later sync
        cacheAnalyticsData(event.data.data);
        break;
        
      case 'GET_CACHE_SIZE':
        getCacheSize().then(size => {
          event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
        });
        break;
        
      default:
        console.warn('[SW] Unknown message type:', event.data.type);
    }
  }
});

/**
 * Cache analytics data for background sync
 */
async function cacheAnalyticsData(data) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    
    await store.add({
      event: data.event,
      data: data.data,
      timestamp: Date.now(),
      synced: false
    });
    
    console.log('[SW] Analytics data cached for sync');
  } catch (error) {
    console.error('[SW] Failed to cache analytics data:', error);
  }
}

/**
 * Get total cache size
 */
async function getCacheSize() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    let totalSize = 0;
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('[SW] Failed to calculate cache size:', error);
    return 0;
  }
}

console.log('[SW] Service worker loaded and ready');