const CACHE_NAME = 'inventory-photos-v1';
const STATIC_CACHE = 'inventory-static-v1';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== STATIC_CACHE && cache !== CACHE_NAME) {
              console.log('Service Worker: Clearing old cache', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static files
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// Handle API requests with offline fallback
async function handleAPIRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for', url.pathname);

    // For GET requests, try to serve from cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // For photo uploads, store in IndexedDB for later sync
    if (request.method === 'POST' && url.pathname.includes('/photos')) {
      return handleOfflinePhotoUpload(request);
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No network connection available'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  try {
    // Try cache first for static files
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fall back to network
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch', request.url);

    // For navigation requests, return cached index.html
    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('/index.html');
      if (cachedIndex) {
        return cachedIndex;
      }
    }

    return new Response('Offline', { status: 503 });
  }
}

// Handle offline photo uploads
async function handleOfflinePhotoUpload(request) {
  try {
    // Clone the request to read the body
    const requestClone = request.clone();
    const formData = await requestClone.formData();

    // Extract photo data
    const photoFile = formData.get('photo');
    const itemId = formData.get('itemId');
    const angle = formData.get('angle');
    const metadata = formData.get('metadata');

    if (!photoFile || !itemId) {
      throw new Error('Missing required photo data');
    }

    // Store in IndexedDB for later sync
    const photoData = {
      id: generateId(),
      itemId,
      angle,
      metadata: metadata ? JSON.parse(metadata) : {},
      file: photoFile,
      timestamp: new Date().toISOString(),
      synced: false
    };

    await storeOfflinePhoto(photoData);

    // Schedule background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register('photo-upload-sync');
    }

    // Return success response
    return new Response(
      JSON.stringify({
        id: photoData.id,
        message: 'Photo queued for upload when online',
        offline: true
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Service Worker: Failed to handle offline photo upload:', error);
    return new Response(
      JSON.stringify({
        error: 'Upload Failed',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync for photo uploads
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'photo-upload-sync') {
    event.waitUntil(syncPhotos());
  }
});

// Sync queued photos when online
async function syncPhotos() {
  try {
    console.log('Service Worker: Starting photo sync');
    const offlinePhotos = await getOfflinePhotos();

    for (const photo of offlinePhotos) {
      try {
        // Create FormData for upload
        const formData = new FormData();
        formData.append('photo', photo.file);
        formData.append('itemId', photo.itemId);
        formData.append('angle', photo.angle);
        formData.append('metadata', JSON.stringify(photo.metadata));

        // Attempt upload
        const response = await fetch('/api/items/photos', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          console.log('Service Worker: Successfully synced photo', photo.id);
          await markPhotoAsSynced(photo.id);
        } else {
          console.error('Service Worker: Failed to sync photo', photo.id, response.status);
        }
      } catch (error) {
        console.error('Service Worker: Error syncing photo', photo.id, error);
      }
    }

    console.log('Service Worker: Photo sync completed');
  } catch (error) {
    console.error('Service Worker: Photo sync failed:', error);
  }
}

// IndexedDB operations for offline photos
async function storeOfflinePhoto(photoData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('InventoryPhotos', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlinePhotos'], 'readwrite');
      const store = transaction.objectStore('offlinePhotos');

      const addRequest = store.add(photoData);
      addRequest.onerror = () => reject(addRequest.error);
      addRequest.onsuccess = () => resolve(addRequest.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlinePhotos')) {
        const store = db.createObjectStore('offlinePhotos', { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function getOfflinePhotos() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('InventoryPhotos', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlinePhotos'], 'readonly');
      const store = transaction.objectStore('offlinePhotos');
      const index = store.index('synced');

      const getRequest = index.getAll(false);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result);
    };
  });
}

async function markPhotoAsSynced(photoId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('InventoryPhotos', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlinePhotos'], 'readwrite');
      const store = transaction.objectStore('offlinePhotos');

      const getRequest = store.get(photoId);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const photo = getRequest.result;
        if (photo) {
          photo.synced = true;
          const putRequest = store.put(photo);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve(putRequest.result);
        } else {
          resolve(); // Photo not found, already synced or removed
        }
      };
    };
  });
}

// Utility function to generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Handle push notifications for sync status
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Service Worker: Failed to parse push data:', error);
  }

  const options = {
    title: data.title || 'Photo Sync Update',
    body: data.body || 'Photos have been synced successfully',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'photo-sync',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

console.log('Service Worker: Script loaded');
