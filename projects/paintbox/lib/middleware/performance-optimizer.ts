/**
 * Performance Optimization Middleware
 * Provides response caching, connection pooling, and memory optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import LRU from 'lru-cache';
import { logger } from '@/lib/logging/simple-logger';
import { performanceProfiler } from '@/lib/monitoring/performance-profiler';

// Response cache configuration
const responseCache = new LRU<string, CachedResponse>({
  max: 100, // Maximum number of items
  maxSize: 50 * 1024 * 1024, // 50MB max size
  sizeCalculation: (value) => value.size,
  ttl: 1000 * 60 * 5, // 5 minutes default TTL
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

interface CachedResponse {
  data: any;
  headers: Record<string, string>;
  status: number;
  timestamp: number;
  size: number;
}

// Connection pool for external services
class ConnectionPool {
  private pools: Map<string, any[]> = new Map();
  private maxConnections = 10;
  private connectionTimeout = 30000; // 30 seconds

  async getConnection(service: string): Promise<any> {
    if (!this.pools.has(service)) {
      this.pools.set(service, []);
    }

    const pool = this.pools.get(service)!;

    // Reuse existing connection if available
    const availableConnection = pool.find(conn => !conn.inUse);
    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = Date.now();
      return availableConnection;
    }

    // Create new connection if under limit
    if (pool.length < this.maxConnections) {
      const newConnection = {
        id: `${service}-${Date.now()}`,
        inUse: true,
        lastUsed: Date.now(),
        created: Date.now(),
      };
      pool.push(newConnection);
      return newConnection;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const conn = pool.find(c => !c.inUse);
        if (conn) {
          clearInterval(checkInterval);
          conn.inUse = true;
          conn.lastUsed = Date.now();
          resolve(conn);
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, this.connectionTimeout);
    });
  }

  releaseConnection(service: string, connection: any): void {
    if (!connection) return;

    const pool = this.pools.get(service);
    if (pool) {
      const conn = pool.find(c => c.id === connection.id);
      if (conn) {
        conn.inUse = false;
        conn.lastUsed = Date.now();
      }
    }
  }

  // Clean up idle connections
  cleanupIdleConnections(): void {
    const idleTimeout = 60000; // 1 minute
    const now = Date.now();

    this.pools.forEach((pool, service) => {
      const activeConnections = pool.filter(conn => {
        const isIdle = !conn.inUse && (now - conn.lastUsed > idleTimeout);
        if (isIdle) {
          logger.debug(`Removing idle connection: ${conn.id}`);
        }
        return !isIdle;
      });
      this.pools.set(service, activeConnections);
    });
  }
}

const connectionPool = new ConnectionPool();

// Cleanup idle connections every minute
setInterval(() => {
  connectionPool.cleanupIdleConnections();
}, 60000);

// Memory optimization utilities
class MemoryOptimizer {
  private lastGC: number = Date.now();
  private gcInterval = 30000; // 30 seconds
  private memoryThreshold = 0.85; // 85% memory usage

  checkMemoryPressure(): boolean {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;

    if (heapUsedPercent > this.memoryThreshold) {
      logger.warn('High memory pressure detected', {
        heapUsedPercent: (heapUsedPercent * 100).toFixed(2),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      });
      return true;
    }

    return false;
  }

  async optimizeMemory(): Promise<void> {
    const now = Date.now();

    // Check if enough time has passed since last GC
    if (now - this.lastGC < this.gcInterval) {
      return;
    }

    if (this.checkMemoryPressure()) {
      // Clear caches
      responseCache.clear();
      logger.info('Cleared response cache due to memory pressure');

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        this.lastGC = now;
        logger.info('Forced garbage collection');
      }

      // Clear module cache for non-critical modules
      this.clearModuleCache();
    }
  }

  private clearModuleCache(): void {
    // Clear require cache for non-essential modules
    const criticalModules = ['next', 'react', 'express', 'http', 'https', 'fs', 'path'];

    Object.keys(require.cache).forEach(key => {
      const isCritical = criticalModules.some(mod => key.includes(mod));
      if (!isCritical && key.includes('node_modules')) {
        delete require.cache[key];
      }
    });
  }
}

const memoryOptimizer = new MemoryOptimizer();

// Request deduplication to prevent duplicate processing
const pendingRequests = new Map<string, Promise<any>>();

export async function withRequestDeduplication<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    logger.debug(`Request deduplication hit: ${key}`);
    return pendingRequests.get(key)!;
  }

  // Create new promise and store it
  const promise = fn().finally(() => {
    // Remove from pending after completion
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Performance optimization middleware
export async function performanceMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const path = request.nextUrl.pathname;
  const method = request.method;
  const cacheKey = `${method}:${path}:${request.nextUrl.search}`;

  // Start performance tracking
  const tracker = performanceProfiler.trackAPICall(path, method);

  try {
    // Check memory pressure and optimize if needed
    await memoryOptimizer.optimizeMemory();

    // Skip caching for non-GET requests
    if (method !== 'GET') {
      const response = await handler();
      tracker.end(response.status >= 400);
      return response;
    }

    // Check cache
    const cached = responseCache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit: ${cacheKey}`);
      performanceProfiler.updateCacheMetrics('hit');

      tracker.end(false);

      return new NextResponse(
        JSON.stringify(cached.data),
        {
          status: cached.status,
          headers: {
            ...cached.headers,
            'X-Cache': 'HIT',
            'X-Cache-Age': String(Date.now() - cached.timestamp),
          },
        }
      );
    }

    performanceProfiler.updateCacheMetrics('miss');

    // Use request deduplication
    const response = await withRequestDeduplication(cacheKey, handler);

    // Cache successful responses
    if (response.status === 200) {
      const data = await response.json();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const cachedResponse: CachedResponse = {
        data,
        headers,
        status: response.status,
        timestamp: Date.now(),
        size: JSON.stringify(data).length,
      };

      responseCache.set(cacheKey, cachedResponse);
      logger.debug(`Cached response: ${cacheKey}`);

      // Return new response with cache headers
      tracker.end(false);

      return new NextResponse(
        JSON.stringify(data),
        {
          status: response.status,
          headers: {
            ...headers,
            'X-Cache': 'MISS',
            'X-Response-Time': String(Date.now() - startTime),
          },
        }
      );
    }

    tracker.end(response.status >= 400);
    return response;

  } catch (error) {
    tracker.end(true);
    logger.error('Performance middleware error', {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Optimized fetch with connection pooling
export async function optimizedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const urlObj = new URL(url);
  const service = urlObj.hostname;

  // Get connection from pool
  const connection = await connectionPool.getConnection(service);

  try {
    // Add connection reuse headers
    const headers = {
      ...options.headers,
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100',
    };

    const response = await fetch(url, {
      ...options,
      headers,
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    return response;

  } finally {
    // Release connection back to pool
    connectionPool.releaseConnection(service, connection);
  }
}

// Export cache stats for monitoring
export function getCacheStats() {
  const stats = {
    size: responseCache.size,
    maxSize: responseCache.maxSize,
    itemCount: responseCache.itemCount,
    cacheHitRate: 0,
  };

  // Calculate hit rate from profiler metrics
  const hits = performanceProfiler['metrics'].get('cache:hits') || 0;
  const misses = performanceProfiler['metrics'].get('cache:misses') || 0;
  const total = hits + misses;

  if (total > 0) {
    stats.cacheHitRate = (hits / total) * 100;
  }

  return stats;
}

// Clear cache endpoint (for admin use)
export function clearCache(): void {
  responseCache.clear();
  logger.info('Response cache cleared');
}
