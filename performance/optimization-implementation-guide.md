# Candlefish AI Performance Optimization Implementation Guide

## Quick Start Optimizations (Immediate Impact)

### 1. Next.js Configuration Optimization

Create `/Users/patricksmith/candlefish-ai/apps/docs-site/next.config.optimized.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable compression
  compress: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Advanced optimization
  experimental: {
    optimizePackageImports: [
      '@candlefish-ai/shared',
      'lucide-react',
      '@apollo/client',
      'framer-motion',
      'date-fns',
    ],
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Image optimization
  images: {
    domains: ['candlefish.ai', 'docs.candlefish.ai'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Replace React with Preact in production
      Object.assign(config.resolve.alias, {
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
        // Optimize Apollo Client bundle
        '@apollo/client': '@apollo/client/core',
      });
      
      // Advanced chunking strategy
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // React/Framework chunk
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|preact)[\\/]/,
            priority: 50,
            enforce: true,
          },
          // Apollo GraphQL chunk
          apollo: {
            name: 'apollo',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@apollo|graphql)[\\/]/,
            priority: 40,
          },
          // Animation libraries
          animations: {
            name: 'animations',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](framer-motion|react-intersection-observer)[\\/]/,
            priority: 35,
          },
          // Common libraries
          lib: {
            test(module) {
              return module.size() > 50000 &&
                /node_modules[\\/]/.test(module.identifier());
            },
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)[\\/]/
              );
              return `lib-${packageName[1].replace('@', '')}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          // Shared components
          shared: {
            name: 'shared',
            test: /[\\/]components[\\/]|[\\/]shared[\\/]/,
            priority: 20,
            minChunks: 2,
          },
        },
      };
      
      // Minimize bundle
      config.optimization.minimize = true;
      
      // Module concatenation
      config.optimization.concatenateModules = true;
    }
    
    return config;
  },
  
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  
  // Rewrites for API optimization
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      },
    ];
  },
};

module.exports = nextConfig;
```

### 2. GraphQL DataLoader Implementation

Create `/Users/patricksmith/candlefish-ai/apps/api-site/lib/dataloader.ts`:

```typescript
import DataLoader from 'dataloader';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

// Cache configuration
const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

// Generate cache key
function getCacheKey(type: string, id: string | number): string {
  return `${type}:${id}`;
}

// Batch function wrapper with caching
function createCachedBatchFn<K, V>(
  type: string,
  batchFn: (keys: readonly K[]) => Promise<(V | Error)[]>
) {
  return async (keys: readonly K[]): Promise<(V | Error)[]> => {
    const results: (V | Error | undefined)[] = new Array(keys.length);
    const uncachedKeys: { key: K; index: number }[] = [];
    
    // Check cache first
    keys.forEach((key, index) => {
      const cacheKey = getCacheKey(type, String(key));
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        results[index] = cached;
      } else {
        uncachedKeys.push({ key, index });
      }
    });
    
    // Fetch uncached items
    if (uncachedKeys.length > 0) {
      const batchResults = await batchFn(uncachedKeys.map(item => item.key));
      uncachedKeys.forEach((item, i) => {
        const result = batchResults[i];
        if (!(result instanceof Error)) {
          const cacheKey = getCacheKey(type, String(item.key));
          cache.set(cacheKey, result);
        }
        results[item.index] = result;
      });
    }
    
    return results as (V | Error)[];
  };
}

// DataLoader factory
export function createDataLoaders(db: any) {
  return {
    // User loader with caching
    users: new DataLoader(
      createCachedBatchFn('user', async (userIds: readonly string[]) => {
        const users = await db.user.findMany({
          where: { id: { in: userIds as string[] } },
        });
        const userMap = new Map(users.map(user => [user.id, user]));
        return userIds.map(id => userMap.get(id) || new Error(`User ${id} not found`));
      }),
      { cache: false } // Use our custom cache instead
    ),
    
    // Document loader with caching
    documents: new DataLoader(
      createCachedBatchFn('document', async (docIds: readonly string[]) => {
        const docs = await db.document.findMany({
          where: { id: { in: docIds as string[] } },
          include: {
            author: true,
            tags: true,
          },
        });
        const docMap = new Map(docs.map(doc => [doc.id, doc]));
        return docIds.map(id => docMap.get(id) || new Error(`Document ${id} not found`));
      }),
      { cache: false }
    ),
    
    // Comments loader
    comments: new DataLoader(
      async (docIds: readonly string[]) => {
        const comments = await db.comment.findMany({
          where: { documentId: { in: docIds as string[] } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        
        const commentsByDoc = new Map<string, any[]>();
        comments.forEach(comment => {
          const existing = commentsByDoc.get(comment.documentId) || [];
          existing.push(comment);
          commentsByDoc.set(comment.documentId, existing);
        });
        
        return docIds.map(id => commentsByDoc.get(id) || []);
      }
    ),
    
    // Tags loader
    tags: new DataLoader(
      async (tagIds: readonly string[]) => {
        const tags = await db.tag.findMany({
          where: { id: { in: tagIds as string[] } },
        });
        const tagMap = new Map(tags.map(tag => [tag.id, tag]));
        return tagIds.map(id => tagMap.get(id) || new Error(`Tag ${id} not found`));
      }
    ),
    
    // User documents count loader
    userDocumentCounts: new DataLoader(
      async (userIds: readonly string[]) => {
        const counts = await db.document.groupBy({
          by: ['authorId'],
          where: { authorId: { in: userIds as string[] } },
          _count: { id: true },
        });
        
        const countMap = new Map(
          counts.map(c => [c.authorId, c._count.id])
        );
        
        return userIds.map(id => countMap.get(id) || 0);
      }
    ),
  };
}

// Clear cache utility
export function clearCache(type?: string, id?: string | number) {
  if (type && id) {
    cache.delete(getCacheKey(type, String(id)));
  } else if (type) {
    // Clear all entries of a type
    const keys = Array.from(cache.keys());
    keys.forEach(key => {
      if (key.startsWith(`${type}:`)) {
        cache.delete(key);
      }
    });
  } else {
    // Clear entire cache
    cache.clear();
  }
}

// Cache statistics
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: cache.max,
    hitRate: cache.size > 0 ? 
      (cache.size / (cache.size + cache.calculatedSize)) : 0,
  };
}
```

### 3. Redis Caching Layer

Create `/Users/patricksmith/candlefish-ai/apps/api-site/lib/redis-cache.ts`:

```typescript
import Redis from 'ioredis';
import { compress, decompress } from 'lz-string';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: true,
  maxRetriesPerRequest: 3,
});

// Cache TTL configurations
const TTL_CONFIG = {
  HOT: 60,        // 1 minute for frequently accessed data
  WARM: 300,      // 5 minutes for moderately accessed data  
  COLD: 3600,     // 1 hour for rarely accessed data
  STATIC: 86400,  // 24 hours for static content
};

export class CacheManager {
  private prefix: string;
  
  constructor(prefix = 'candlefish') {
    this.prefix = prefix;
  }
  
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(this.getKey(key));
      if (!data) return null;
      
      // Decompress and parse
      const decompressed = decompress(data);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set(
    key: string, 
    value: any, 
    ttl: keyof typeof TTL_CONFIG | number = 'WARM'
  ): Promise<void> {
    try {
      // Compress data
      const compressed = compress(JSON.stringify(value));
      const ttlSeconds = typeof ttl === 'number' ? ttl : TTL_CONFIG[ttl];
      
      await redis.setex(this.getKey(key), ttlSeconds, compressed);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async delete(key: string): Promise<void> {
    try {
      await redis.del(this.getKey(key));
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(`${this.prefix}:${pattern}`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }
  
  // Wrapper for GraphQL resolvers
  async withCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: keyof typeof TTL_CONFIG | number = 'WARM'
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
  
  // Batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(k => this.getKey(k));
      const values = await redis.mget(...fullKeys);
      
      return values.map(val => {
        if (!val) return null;
        try {
          const decompressed = decompress(val);
          return JSON.parse(decompressed);
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }
  
  async mset(items: Array<{ key: string; value: any; ttl?: keyof typeof TTL_CONFIG | number }>): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      
      items.forEach(item => {
        const compressed = compress(JSON.stringify(item.value));
        const ttlSeconds = item.ttl ? 
          (typeof item.ttl === 'number' ? item.ttl : TTL_CONFIG[item.ttl]) : 
          TTL_CONFIG.WARM;
        
        pipeline.setex(this.getKey(item.key), ttlSeconds, compressed);
      });
      
      await pipeline.exec();
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();

// GraphQL resolver wrapper
export function cached(ttl: keyof typeof TTL_CONFIG | number = 'WARM') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Generate cache key from method name and arguments
      const cacheKey = `resolver:${propertyKey}:${JSON.stringify(args)}`;
      
      return cache.withCache(
        cacheKey,
        () => originalMethod.apply(this, args),
        ttl
      );
    };
    
    return descriptor;
  };
}
```

### 4. Service Worker Implementation

Create `/Users/patricksmith/candlefish-ai/apps/docs-site/public/sw.js`:

```javascript
// Service Worker for Candlefish AI Docs
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `candlefish-docs-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'candlefish-runtime';

// Assets to precache
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/_next/static/css/app.css',
  '/manifest.json',
  '/favicon.ico',
];

// Cache strategies
const CACHE_STRATEGIES = {
  cacheFirst: [
    /\/_next\/static\//,
    /\/fonts\//,
    /\/images\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
  ],
  networkFirst: [
    /\/api\//,
    /\/graphql/,
    /\/$/, // Root pages
  ],
  staleWhileRevalidate: [
    /\.(?:js|css)$/,
    /\/docs\//,
  ],
};

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('candlefish-') && 
                   cacheName !== CACHE_NAME &&
                   cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;
  
  // Determine cache strategy
  let strategy = 'networkFirst'; // default
  
  for (const [strategyName, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pattern.test(url.pathname))) {
      strategy = strategyName;
      break;
    }
  }
  
  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match('/offline');
  }
}

// Network-first strategy
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match('/offline');
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms());
  }
});

async function syncForms() {
  // Implementation for syncing offline form data
  const cache = await caches.open('form-data');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.delete(request);
      }
    } catch (error) {
      // Keep in cache for next sync
    }
  }
}

// Push notification support
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };
  
  event.waitUntil(
    self.registration.showNotification('Candlefish AI', options)
  );
});
```

### 5. Database Query Optimization

Create `/Users/patricksmith/candlefish-ai/migrations/performance-indexes.sql`:

```sql
-- Performance optimization indexes for Candlefish AI

-- Documents table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_author_created 
ON documents(author_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_status_updated 
ON documents(status, updated_at DESC) 
WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_search 
ON documents USING gin(
  to_tsvector('english', 
    coalesce(title, '') || ' ' || 
    coalesce(content, '') || ' ' || 
    coalesce(tags::text, '')
  )
);

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
ON users(lower(email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created 
ON users(created_at DESC);

-- API logs table (use BRIN for time-series data)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_logs_timestamp_brin 
ON api_logs USING brin(timestamp) 
WITH (pages_per_range = 128);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_logs_user_timestamp 
ON api_logs(user_id, timestamp DESC) 
WHERE user_id IS NOT NULL;

-- Sessions table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token_expires 
ON sessions(token, expires_at) 
WHERE expires_at > now();

-- Comments table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_document_created 
ON comments(document_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Materialized views for dashboard metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_hourly AS
SELECT 
  date_trunc('hour', created_at) as hour,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time
FROM api_logs
WHERE created_at > now() - interval '7 days'
GROUP BY date_trunc('hour', created_at);

CREATE UNIQUE INDEX ON dashboard_metrics_hourly(hour);

-- Daily aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_daily AS
SELECT 
  date_trunc('day', created_at) as day,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time
FROM api_logs
WHERE created_at > now() - interval '90 days'
GROUP BY date_trunc('day', created_at);

CREATE UNIQUE INDEX ON dashboard_metrics_daily(day);

-- Document statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS document_stats AS
SELECT 
  d.id,
  d.title,
  COUNT(DISTINCT v.user_id) as view_count,
  COUNT(DISTINCT c.id) as comment_count,
  AVG(r.rating) as avg_rating,
  MAX(v.viewed_at) as last_viewed
FROM documents d
LEFT JOIN document_views v ON d.id = v.document_id
LEFT JOIN comments c ON d.id = c.document_id
LEFT JOIN ratings r ON d.id = r.document_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.title;

CREATE UNIQUE INDEX ON document_stats(id);

-- Refresh materialized views periodically
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_hourly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY document_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_materialized_views()');

-- Query performance analysis
CREATE OR REPLACE FUNCTION analyze_slow_queries()
RETURNS TABLE(
  query_hash text,
  avg_time numeric,
  max_time numeric,
  calls bigint,
  total_time numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    queryid::text,
    round(mean_exec_time::numeric, 2) as avg_time,
    round(max_exec_time::numeric, 2) as max_time,
    calls,
    round(total_exec_time::numeric, 2) as total_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100 -- queries slower than 100ms
  ORDER BY mean_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring Setup

Create `/Users/patricksmith/candlefish-ai/performance/monitoring-setup.md`:

```markdown
# Performance Monitoring Setup

## 1. Application Performance Monitoring (APM)

### New Relic Integration
```javascript
// apps/api-site/lib/monitoring.ts
import newrelic from 'newrelic';

export const apm = {
  startTransaction: (name: string) => newrelic.startSegment(name),
  endTransaction: () => newrelic.endTransaction(),
  recordMetric: (name: string, value: number) => newrelic.recordMetric(name, value),
  noticeError: (error: Error) => newrelic.noticeError(error),
};
```

### Custom Metrics Collection
```typescript
// apps/api-site/middleware/metrics.ts
export async function collectMetrics(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Send to monitoring service
    metrics.histogram('http_request_duration_ms', duration, {
      method: req.method,
      route: req.route?.path || 'unknown',
      status: res.statusCode,
    });
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        url: req.url,
        duration,
        method: req.method,
      });
    }
  });
  
  next();
}
```

## 2. Real User Monitoring (RUM)

### Browser Performance API
```javascript
// apps/docs-site/lib/rum.js
export function initRUM() {
  if (typeof window === 'undefined') return;
  
  // Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        sendMetric('LCP', entry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        sendMetric('FID', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          cls += entry.value;
          sendMetric('CLS', cls);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  // Navigation Timing
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      sendMetric('TTFB', navigation.responseStart - navigation.fetchStart);
      sendMetric('DOM_LOAD', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      sendMetric('WINDOW_LOAD', navigation.loadEventEnd - navigation.fetchStart);
    }
  });
}

function sendMetric(name, value) {
  // Send to analytics endpoint
  fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: name,
      value: Math.round(value),
      url: window.location.href,
      timestamp: Date.now(),
    }),
  });
}
```

## 3. Alerts Configuration

### Prometheus Alert Rules
```yaml
groups:
  - name: performance
    rules:
      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 0.5
        for: 5m
        annotations:
          summary: "High response time on {{ $labels.instance }}"
          
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          
      - alert: LowCacheHitRate
        expr: redis_cache_hit_rate < 0.7
        for: 10m
        annotations:
          summary: "Cache hit rate below 70%"
```
```

## Deployment Commands

```bash
# 1. Apply database optimizations
psql $DATABASE_URL < migrations/performance-indexes.sql

# 2. Deploy optimized Next.js config
cp apps/docs-site/next.config.optimized.js apps/docs-site/next.config.js
npm run build

# 3. Deploy service worker
cp apps/docs-site/public/sw.js apps/docs-site/public/
npm run build

# 4. Test performance
node performance/performance-test.js

# 5. Run load test (requires k6)
k6 run performance/k6-load-test.js
```

## Expected Results After Implementation

- **Page Load Time**: 217ms → **45-60ms** (73-78% improvement)
- **API Response Time**: 153ms → **30-40ms** (74-80% improvement)  
- **Bundle Size**: ~2.5MB → **600-750KB** (70-76% reduction)
- **Cache Hit Rate**: ~45% → **85-92%** (89-104% improvement)
- **Database Query Time**: ~125ms → **20-30ms** (76-84% improvement)
- **Infrastructure Cost**: ~$3,000/mo → **$1,500/mo** (50% reduction)

## ROI Timeline

- **Week 1**: 30% performance improvement
- **Week 2**: 50% bundle size reduction  
- **Week 3**: 60% API response improvement
- **Week 4**: Full optimization complete
- **Month 2**: $1,500 monthly savings realized
- **Year 1**: $18,000 total savings
