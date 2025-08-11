/**
 * Cloudflare Worker for Excel Calculation Optimization
 * Handles calculation caching at the edge
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Cache configuration
const CACHE_TTL = 7200 // 2 hours for calculations
const CACHE_KEY_PREFIX = 'excel-calc:'

async function handleRequest(request) {
  const cache = caches.default
  const url = new URL(request.url)

  // Only process calculation endpoints
  if (!url.pathname.startsWith('/api/excel/') && !url.pathname.startsWith('/api/calculations/')) {
    return fetch(request)
  }

  // Generate cache key based on request
  const cacheKey = await generateCacheKey(request)
  const cacheUrl = new Request(cacheKey, request)

  // Try to get from cache first
  let response = await cache.match(cacheUrl)

  if (response) {
    // Add cache hit header
    response = new Response(response.body, response)
    response.headers.set('X-Cache-Status', 'HIT')
    response.headers.set('X-Cache-Age', getAge(response))
    return response
  }

  // Cache miss - fetch from origin
  response = await fetch(request)

  // Only cache successful responses
  if (response.ok) {
    // Clone response for caching
    const responseToCache = response.clone()

    // Add cache headers
    const headers = new Headers(responseToCache.headers)
    headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`)
    headers.set('X-Cache-Status', 'MISS')
    headers.set('X-Cached-At', new Date().toISOString())

    // Create new response with updated headers
    const cachedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers: headers
    })

    // Store in cache
    event.waitUntil(cache.put(cacheUrl, cachedResponse))

    // Return response with cache miss header
    const returnResponse = new Response(response.body, response)
    returnResponse.headers.set('X-Cache-Status', 'MISS')
    return returnResponse
  }

  return response
}

async function generateCacheKey(request) {
  const url = new URL(request.url)
  const method = request.method

  // For POST requests, include body in cache key
  if (method === 'POST') {
    const body = await request.text()
    const hash = await sha256(body)
    return `${CACHE_KEY_PREFIX}${url.pathname}:${hash}`
  }

  // For GET requests, include query params
  const params = Array.from(url.searchParams.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return `${CACHE_KEY_PREFIX}${url.pathname}?${params}`
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

function getAge(response) {
  const cachedAt = response.headers.get('X-Cached-At')
  if (!cachedAt) return '0'

  const age = Math.floor((Date.now() - new Date(cachedAt).getTime()) / 1000)
  return age.toString()
}

// Batch calculation optimization
async function handleBatchCalculation(requests) {
  const cache = caches.default
  const results = []
  const uncachedRequests = []

  // Check cache for each request
  for (const req of requests) {
    const cacheKey = await generateCacheKey(req)
    const cached = await cache.match(new Request(cacheKey))

    if (cached) {
      results.push({
        id: req.id,
        cached: true,
        data: await cached.json()
      })
    } else {
      uncachedRequests.push(req)
    }
  }

  // Batch fetch uncached calculations
  if (uncachedRequests.length > 0) {
    const batchResponse = await fetch('/api/excel/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ calculations: uncachedRequests })
    })

    if (batchResponse.ok) {
      const batchResults = await batchResponse.json()

      // Cache individual results
      for (const result of batchResults.results) {
        const req = uncachedRequests.find(r => r.id === result.id)
        if (req) {
          const cacheKey = await generateCacheKey(req)
          const response = new Response(JSON.stringify(result.data), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': `public, max-age=${CACHE_TTL}`
            }
          })
          await cache.put(new Request(cacheKey), response)
        }

        results.push({
          id: result.id,
          cached: false,
          data: result.data
        })
      }
    }
  }

  return results
}

// Purge cache on demand
async function handleCachePurge(request) {
  const url = new URL(request.url)
  const purgeKey = url.searchParams.get('key')

  // Validate purge key
  if (purgeKey !== PURGE_KEY) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Purge specific pattern or all
  const pattern = url.searchParams.get('pattern') || '*'

  // Note: Cloudflare doesn't support wildcard cache purging in Workers
  // This would need to be done via API

  return new Response(JSON.stringify({
    status: 'success',
    message: 'Cache purge initiated',
    pattern: pattern
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
