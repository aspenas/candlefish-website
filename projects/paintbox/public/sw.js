const CACHE_NAME = 'paintbox-v1.0.0';
const OFFLINE_URL = '/offline';

// Critical resources to cache immediately
const PRECACHE_RESOURCES = [
  '/',
  '/estimate/new',
  '/estimate/new/details',
  '/estimate/new/exterior',
  '/estimate/new/interior',
  '/estimate/new/review',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Runtime cache configurations
const CACHE_STRATEGIES = {
  // Static assets - cache first with long TTL
  STATIC_ASSETS: {
    cacheName: `${CACHE_NAME}-static`,
    maxEntries: 100,
    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
  },
  // API calls - network first with fallback
  API_CALLS: {
    cacheName: `${CACHE_NAME}-api`,
    maxEntries: 50,
    maxAgeSeconds: 5 * 60, // 5 minutes
  },
  // Images and media - cache first
  MEDIA: {
    cacheName: `${CACHE_NAME}-media`,
    maxEntries: 200,
    maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
  },
  // HTML pages - network first with cache fallback
  PAGES: {
    cacheName: `${CACHE_NAME}-pages`,
    maxEntries: 30,
    maxAgeSeconds: 24 * 60 * 60, // 24 hours
  }
};

// Background sync tags
const SYNC_TAGS = {
  ESTIMATE_SYNC: 'estimate-sync',
  SALESFORCE_SYNC: 'salesforce-sync',
  COMPANYCAM_SYNC: 'companycam-sync'
};

// Install event - precache critical resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('Service Worker: Precaching critical resources...');

      try {
        await cache.addAll(PRECACHE_RESOURCES);
        console.log('Service Worker: Precaching completed');
      } catch (error) {
        console.error('Service Worker: Precaching failed:', error);
        // Cache resources individually if batch fails
        for (const resource of PRECACHE_RESOURCES) {
          try {
            await cache.add(resource);
          } catch (err) {
            console.warn(`Service Worker: Failed to cache ${resource}:`, err);
          }
        }
      }

      // Force activation of new service worker
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name =>
        name.startsWith('paintbox-') && name !== CACHE_NAME
      );

      await Promise.all(
        oldCaches.map(cacheName => {
          console.log(`Service Worker: Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );

      // Claim all clients immediately
      await self.clients.claim();
      console.log('Service Worker: Activated successfully');
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

// Cache strategy implementations
async function handleAPIRequest(request) {
  const cache = await caches.open(CACHE_STRATEGIES.API_CALLS.cacheName);

  try {
    // Network first strategy
    const networkResponse = await fetch(request.clone());

    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request.clone(), networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API request, checking cache...');

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('Service Worker: Serving API request from cache');
      return cachedResponse;
    }

    // Return offline response for critical API endpoints
    if (request.url.includes('/api/calculations')) {
      return new Response(
        JSON.stringify({
          error: 'offline',
          message: 'Calculations available offline',
          offline: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_STRATEGIES.STATIC_ASSETS.cacheName);

  // Cache first strategy for static assets
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request.clone(), networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset:', request.url);
    throw error;
  }
}

async function handleMediaFile(request) {
  const cache = await caches.open(CACHE_STRATEGIES.MEDIA.cacheName);

  // Cache first strategy for media
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request.clone(), networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch media file:', request.url);
    // Return placeholder image for failed media requests
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#6b7280">Image unavailable offline</text></svg>',
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

// Placeholder functions for IndexedDB operations (will be implemented in separate module)
async function getStoredEstimates() {
  // This will be implemented with the IndexedDB service
  return [];
}

async function markEstimateSynced(id) {
  // This will be implemented with the IndexedDB service
  console.log(`Marking estimate ${id} as synced`);
}

async function getStoredSalesforceUpdates() {
  // This will be implemented with the IndexedDB service
  return [];
}

async function markSalesforceUpdateSynced(id) {
  // This will be implemented with the IndexedDB service
  console.log(`Marking Salesforce update ${id} as synced`);
}

async function getStoredPhotos() {
  // This will be implemented with the IndexedDB service
  return [];
}

async function markPhotoSynced(id) {
  // This will be implemented with the IndexedDB service
  console.log(`Marking photo ${id} as synced`);
}
