// Candlefish AI Service Worker
// Provides offline support and intelligent caching

const CACHE_NAME = 'candlefish-ai-v2.0.0'
const STATIC_CACHE = 'candlefish-static-v2.0.0'
const DYNAMIC_CACHE = 'candlefish-dynamic-v2.0.0'
const API_CACHE = 'candlefish-api-v2.0.0'

// Core assets to cache immediately
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/favicon.ico'
]

// Assets to cache on demand
const CACHE_STRATEGIES = {
  // Static assets: Cache first with long TTL
  static: /\.(js|css|woff2?|ttf|png|jpg|jpeg|webp|svg|ico)$/,
  // API calls: Network first with fallback
  api: /\/api\//,
  // HTML pages: Network first with cache fallback
  pages: /\.html$|\/$/
}

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching core assets')
        return cache.addAll(CORE_ASSETS)
      })
      .then(() => {
        console.log('Core assets cached successfully')
        // Force the waiting service worker to become active
        return self.skipWaiting()
      })
      .catch(err => {
        console.error('Cache install error:', err)
        throw err
      })
  )
})

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        const validCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE]
        
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!validCaches.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all pages
      self.clients.claim()
    ])
      .then(() => {
        console.log('Service Worker activated and ready')
        return self.registration.update()
      })
  )
})

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip cross-origin requests and non-GET requests
  if (url.origin !== self.location.origin || request.method !== 'GET') {
    return
  }

  // Determine caching strategy based on request type
  if (CACHE_STRATEGIES.api.test(url.pathname)) {
    event.respondWith(handleApiRequest(request))
  } else if (CACHE_STRATEGIES.static.test(url.pathname)) {
    event.respondWith(handleStaticAsset(request))
  } else if (CACHE_STRATEGIES.pages.test(url.pathname)) {
    event.respondWith(handlePageRequest(request))
  } else {
    event.respondWith(handleDynamicRequest(request))
  }
})

// API requests: Network first with cache fallback
async function handleApiRequest(request) {
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('API request failed, checking cache:', error)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Request failed and no cached version available' }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Static assets: Cache first with network fallback
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('Static asset request failed:', error)
    throw error
  }
}

// Page requests: Network first with cache fallback
async function handlePageRequest(request) {
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('Page request failed, checking cache:', error)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fallback to main page for navigation
    const mainPage = await caches.match('/index.html')
    if (mainPage) {
      return mainPage
    }
    
    throw error
  }
}

// Dynamic requests: Network first with limited caching
async function handleDynamicRequest(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful responses with short TTL
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      // Add timestamp for TTL management
      const responseWithTimestamp = response.clone()
      responseWithTimestamp.headers.set('sw-cache-timestamp', Date.now().toString())
      cache.put(request, responseWithTimestamp)
    }
    
    return response
  } catch (error) {
    console.log('Dynamic request failed, checking cache:', error)
    return caches.match(request) || Promise.reject(error)
  }
}

// Background sync for offline operations
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag)
  
  switch (event.tag) {
    case 'sync-forms':
      event.waitUntil(syncForms())
      break
    case 'sync-analytics':
      event.waitUntil(syncAnalytics())
      break
    case 'cleanup-cache':
      event.waitUntil(cleanupExpiredCache())
      break
    default:
      console.log('Unknown sync tag:', event.tag)
  }
})

// Sync offline form submissions
async function syncForms() {
  try {
    console.log('Syncing offline forms...')
    // Implementation for syncing offline form data
    // This would typically involve sending queued form data to the server
    return Promise.resolve()
  } catch (error) {
    console.error('Form sync failed:', error)
    throw error
  }
}

// Sync offline analytics events
async function syncAnalytics() {
  try {
    console.log('Syncing offline analytics...')
    // Implementation for syncing offline analytics events
    return Promise.resolve()
  } catch (error) {
    console.error('Analytics sync failed:', error)
    throw error
  }
}

// Clean up expired cache entries
async function cleanupExpiredCache() {
  try {
    console.log('Cleaning up expired cache entries...')
    const cacheNames = await caches.keys()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()
      
      for (const request of requests) {
        const response = await cache.match(request)
        const timestamp = response?.headers.get('sw-cache-timestamp')
        
        if (timestamp && (Date.now() - parseInt(timestamp)) > maxAge) {
          await cache.delete(request)
          console.log('Deleted expired cache entry:', request.url)
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error)
    throw error
  }
}

// Handle push notifications (future enhancement)
self.addEventListener('push', event => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/xmark.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Message handling for communication with main thread
self.addEventListener('message', event => {
  const { type, payload } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls))
      break
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName))
      break
    default:
      console.log('Unknown message type:', type)
  }
})

// Cache specific URLs on demand
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE)
  return Promise.all(
    urls.map(url => 
      fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response)
        }
      }).catch(err => console.log('Failed to cache:', url, err))
    )
  )
}

// Clear specific cache
async function clearCache(cacheName) {
  if (cacheName) {
    return caches.delete(cacheName)
  } else {
    const cacheNames = await caches.keys()
    return Promise.all(cacheNames.map(name => caches.delete(name)))
  }
}
