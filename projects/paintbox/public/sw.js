const CACHE_NAME = 'paintbox-v1.0.0';
const OFFLINE_URL = '/offline';

// Memory-aware cache limits
const MAX_CACHE_SIZE = 25 * 1024 * 1024; // 25MB total cache limit
const CACHE_CHECK_INTERVAL = 60000; // Check cache size every minute

// Critical resources to cache immediately (minimal set)
const PRECACHE_RESOURCES = [
  '/',
  '/offline',
  '/manifest.json'
];

// Runtime cache configurations with strict limits
const CACHE_STRATEGIES = {
  // Static assets - cache first with memory limits
  STATIC_ASSETS: {
    cacheName: `${CACHE_NAME}-static`,
    maxEntries: 50, // Reduced from 100
    maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (reduced from 30)
    maxSize: 5 * 1024 * 1024, // 5MB max per cache
  },
  // API calls - network first with minimal caching
  API_CALLS: {
    cacheName: `${CACHE_NAME}-api`,
    maxEntries: 20, // Reduced from 50
    maxAgeSeconds: 2 * 60, // 2 minutes (reduced from 5)
    maxSize: 2 * 1024 * 1024, // 2MB max
  },
  // Images and media - cache with compression
  MEDIA: {
    cacheName: `${CACHE_NAME}-media`,
    maxEntries: 50, // Reduced from 200
    maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days (reduced from 7)
    maxSize: 10 * 1024 * 1024, // 10MB max
  },
  // HTML pages - network first with minimal cache
  PAGES: {
    cacheName: `${CACHE_NAME}-pages`,
    maxEntries: 10, // Reduced from 30
    maxAgeSeconds: 6 * 60 * 60, // 6 hours (reduced from 24)
    maxSize: 1 * 1024 * 1024, // 1MB max
  }
};

// Track cache sizes
let cacheStats = {
  totalSize: 0,
  lastCheck: Date.now(),
  caches: {}
};

// Background sync tags
const SYNC_TAGS = {
  ESTIMATE_SYNC: 'estimate-sync',
  SALESFORCE_SYNC: 'salesforce-sync',
  COMPANYCAM_SYNC: 'companycam-sync'
};

// Install event - minimal precaching for memory efficiency
self.addEventListener('install', (event) => {
  console.log('[SW] Installing with memory optimization...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Precaching minimal critical resources...');

      // Only cache absolutely essential resources
      for (const resource of PRECACHE_RESOURCES) {
        try {
          const response = await fetch(resource);
          if (response.ok) {
            // Check size before caching
            const size = parseInt(response.headers.get('content-length') || '0');
            if (size < 1024 * 1024) { // Only cache if < 1MB
              await cache.put(resource, response);
            }
          }
        } catch (err) {
          console.warn(`[SW] Skipped caching ${resource}:`, err);
        }
      }

      // Start cache monitoring
      startCacheMonitoring();

      // Force activation
      self.skipWaiting();
    })()
  );
});

// Activate event - aggressive cache cleanup
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating with memory optimization...');

  event.waitUntil(
    (async () => {
      // Delete ALL old caches
      const cacheNames = await caches.keys();
      const cachesToDelete = cacheNames.filter(name => {
        // Keep only current cache versions
        return !Object.values(CACHE_STRATEGIES).some(strategy =>
          strategy.cacheName === name
        ) && name !== CACHE_NAME;
      });

      await Promise.all(
        cachesToDelete.map(cacheName => {
          console.log(`[SW] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );

      // Calculate initial cache size
      await calculateCacheSize();

      // Claim all clients
      await self.clients.claim();
      console.log('[SW] Activated with optimized memory usage');
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isMediaFile(url)) {
    event.respondWith(handleMediaFile(request));
  } else if (isHTMLPage(request)) {
    event.respondWith(handleHTMLPage(request));
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);

  switch (event.tag) {
    case SYNC_TAGS.ESTIMATE_SYNC:
      event.waitUntil(syncEstimates());
      break;
    case SYNC_TAGS.SALESFORCE_SYNC:
      event.waitUntil(syncSalesforceData());
      break;
    case SYNC_TAGS.COMPANYCAM_SYNC:
      event.waitUntil(syncCompanyCamPhotos());
      break;
  }
});

// Message handling for cache management and sync requests
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CACHE_ESTIMATE':
      event.waitUntil(cacheEstimate(payload));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
    case 'FORCE_SYNC':
      event.waitUntil(forceSyncAll());
      break;
  }
});

// Helper functions for request classification
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname !== self.location.hostname;
}

function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname.startsWith('/_next/');
}

function isMediaFile(url) {
  const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  return mediaExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

function isHTMLPage(request) {
  return request.headers.get('accept')?.includes('text/html');
}

// Memory-optimized cache strategy implementations
async function handleAPIRequest(request) {
  const strategy = CACHE_STRATEGIES.API_CALLS;
  const cache = await caches.open(strategy.cacheName);

  try {
    // Network first with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const networkResponse = await fetch(request.clone(), {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (networkResponse.ok) {
      // Check size before caching
      const contentLength = networkResponse.headers.get('content-length');
      const size = parseInt(contentLength || '0');

      if (size < 100 * 1024) { // Only cache API responses < 100KB
        await cacheWithSizeCheck(cache, request, networkResponse.clone(), strategy);
      }
    }

    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Check if cache is stale
      const cacheAge = getCacheAge(cachedResponse);
      if (cacheAge < strategy.maxAgeSeconds * 1000) {
        return cachedResponse;
      }
      // Delete stale cache
      await cache.delete(request);
    }

    // Return minimal offline response
    if (request.url.includes('/api/calculations')) {
      return new Response(
        JSON.stringify({ offline: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw error;
  }
}

async function handleStaticAsset(request) {
  const strategy = CACHE_STRATEGIES.STATIC_ASSETS;
  const cache = await caches.open(strategy.cacheName);

  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    const age = getCacheAge(cachedResponse);
    if (age < strategy.maxAgeSeconds * 1000) {
      return cachedResponse;
    }
    // Remove stale cache
    await cache.delete(request);
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Only cache small static assets
      const size = parseInt(networkResponse.headers.get('content-length') || '0');
      if (size < 500 * 1024) { // < 500KB
        await cacheWithSizeCheck(cache, request, networkResponse.clone(), strategy);
      }
    }
    return networkResponse;
  } catch (error) {
    // Return stale cache if available
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function handleMediaFile(request) {
  const strategy = CACHE_STRATEGIES.MEDIA;
  const cache = await caches.open(strategy.cacheName);
  const url = new URL(request.url);

  // Skip caching large images
  if (url.pathname.includes('original') || url.pathname.includes('full')) {
    return fetch(request);
  }

  // Check cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    const age = getCacheAge(cachedResponse);
    if (age < strategy.maxAgeSeconds * 1000) {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const size = parseInt(networkResponse.headers.get('content-length') || '0');
      // Only cache images < 200KB
      if (size < 200 * 1024) {
        await cacheWithSizeCheck(cache, request, networkResponse.clone(), strategy);
      }
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse; // Return stale cache
    }
    // Return tiny placeholder
    return new Response(
      '<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e5e7eb"/></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

async function handleHTMLPage(request) {
  const cache = await caches.open(CACHE_STRATEGIES.PAGES.cacheName);

  try {
    // Network first for HTML pages
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request.clone(), networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for HTML page, checking cache...');

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for uncached HTML requests
    const offlineResponse = await cache.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }

    // Fallback offline HTML
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Paintbox - Offline</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
            .offline { color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Paintbox</h1>
          <div class="offline">
            <h2>You're offline</h2>
            <p>This page isn't available offline yet.</p>
            <button onclick="location.reload()">Try again</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background sync functions
async function syncEstimates() {
  try {
    console.log('Service Worker: Syncing estimates...');

    // Get pending estimates from IndexedDB
    const estimates = await getStoredEstimates();
    const pendingSync = estimates.filter(e => e.syncStatus === 'pending');

    for (const estimate of pendingSync) {
      try {
        const response = await fetch('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estimate.data)
        });

        if (response.ok) {
          await markEstimateSynced(estimate.id);
          console.log(`Service Worker: Synced estimate ${estimate.id}`);
        }
      } catch (error) {
        console.error(`Service Worker: Failed to sync estimate ${estimate.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Estimate sync failed:', error);
  }
}

async function syncSalesforceData() {
  try {
    console.log('Service Worker: Syncing Salesforce data...');

    const pendingUpdates = await getStoredSalesforceUpdates();

    for (const update of pendingUpdates) {
      try {
        const response = await fetch('/api/salesforce/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update.data)
        });

        if (response.ok) {
          await markSalesforceUpdateSynced(update.id);
          console.log(`Service Worker: Synced Salesforce update ${update.id}`);
        }
      } catch (error) {
        console.error(`Service Worker: Failed to sync Salesforce update ${update.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Salesforce sync failed:', error);
  }
}

async function syncCompanyCamPhotos() {
  try {
    console.log('Service Worker: Syncing Company Cam photos...');

    const pendingPhotos = await getStoredPhotos();

    for (const photo of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('photo', photo.blob);
        formData.append('metadata', JSON.stringify(photo.metadata));

        const response = await fetch('/api/companycam/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          await markPhotoSynced(photo.id);
          console.log(`Service Worker: Synced photo ${photo.id}`);
        }
      } catch (error) {
        console.error(`Service Worker: Failed to sync photo ${photo.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Photo sync failed:', error);
  }
}

// Cache management functions
async function cacheEstimate(estimate) {
  const cache = await caches.open(CACHE_STRATEGIES.API_CALLS.cacheName);
  const url = `/api/estimates/${estimate.id}`;
  const response = new Response(JSON.stringify(estimate), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(url, response);
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const paintboxCaches = cacheNames.filter(name => name.startsWith('paintbox-'));

  await Promise.all(
    paintboxCaches.map(cacheName => caches.delete(cacheName))
  );

  console.log('Service Worker: All caches cleared');
}

async function forceSyncAll() {
  await syncEstimates();
  await syncSalesforceData();
  await syncCompanyCamPhotos();
}

// Memory management helper functions
async function cacheWithSizeCheck(cache, request, response, strategy) {
  try {
    // Check current cache size
    const cacheSize = await estimateCacheSize(strategy.cacheName);

    if (cacheSize > strategy.maxSize) {
      // Clean up old entries
      await cleanupCache(cache, strategy.maxEntries / 2);
    }

    // Add timestamp header
    const headers = new Headers(response.headers);
    headers.set('sw-cached-at', new Date().toISOString());

    const responseWithHeaders = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });

    await cache.put(request, responseWithHeaders);
  } catch (error) {
    console.error('[SW] Cache storage failed:', error);
  }
}

async function estimateCacheSize(cacheName) {
  if (!cacheName) {
    // Estimate total cache size
    if ('estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  // Estimate specific cache size
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  let totalSize = 0;

  for (const request of keys.slice(0, 10)) { // Sample first 10
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }

  // Extrapolate
  return keys.length > 10 ? (totalSize / 10) * keys.length : totalSize;
}

async function cleanupCache(cache, keepCount = 10) {
  const keys = await cache.keys();
  const entries = [];

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const age = getCacheAge(response);
      entries.push({ request, age });
    }
  }

  // Sort by age and delete oldest
  entries.sort((a, b) => b.age - a.age);
  const toDelete = entries.slice(keepCount);

  for (const entry of toDelete) {
    await cache.delete(entry.request);
  }
}

function getCacheAge(response) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (cachedAt) {
    return Date.now() - new Date(cachedAt).getTime();
  }
  return 0;
}

async function calculateCacheSize() {
  let totalSize = 0;

  for (const strategy of Object.values(CACHE_STRATEGIES)) {
    const size = await estimateCacheSize(strategy.cacheName);
    cacheStats.caches[strategy.cacheName] = size;
    totalSize += size;
  }

  cacheStats.totalSize = totalSize;
  cacheStats.lastCheck = Date.now();

  // Emergency cleanup if too large
  if (totalSize > MAX_CACHE_SIZE) {
    console.warn('[SW] Cache size exceeded limit, performing cleanup');
    await emergencyCacheCleanup();
  }

  return totalSize;
}

async function emergencyCacheCleanup() {
  for (const strategy of Object.values(CACHE_STRATEGIES)) {
    const cache = await caches.open(strategy.cacheName);
    await cleanupCache(cache, Math.floor(strategy.maxEntries / 3));
  }
}

function startCacheMonitoring() {
  // Periodic cache size check
  setInterval(async () => {
    await calculateCacheSize();
  }, CACHE_CHECK_INTERVAL);
}

// Placeholder IndexedDB functions (minimal implementation)
async function getStoredEstimates() {
  return [];
}

async function markEstimateSynced(id) {
  console.log(`[SW] Marked estimate ${id} as synced`);
}

async function getStoredSalesforceUpdates() {
  return [];
}

async function markSalesforceUpdateSynced(id) {
  console.log(`[SW] Marked Salesforce update ${id} as synced`);
}

async function getStoredPhotos() {
  return [];
}

async function markPhotoSynced(id) {
  console.log(`[SW] Marked photo ${id} as synced`);
}
