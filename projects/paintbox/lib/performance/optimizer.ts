/**
 * Performance Optimizer for System Analyzer
 * Comprehensive performance optimization utilities and monitoring
 */

import { IncomingMessage, ServerResponse } from 'http';
import { performance } from 'perf_hooks';

// Performance metrics store
interface PerformanceMetrics {
  apiResponseTimes: Map<string, number[]>;
  cacheHitRate: { hits: number; misses: number };
  dbQueryTimes: Map<string, number[]>;
  bundleLoadTimes: Map<string, number>;
  memoryUsage: number[];
  gcEvents: number;
}

class PerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    apiResponseTimes: new Map(),
    cacheHitRate: { hits: 0, misses: 0 },
    dbQueryTimes: new Map(),
    bundleLoadTimes: new Map(),
    memoryUsage: [],
    gcEvents: 0,
  };

  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers() {
    // API Response Time Observer
    const apiObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.name.startsWith('api-')) {
          const endpoint = entry.name.replace('api-', '');
          if (!this.metrics.apiResponseTimes.has(endpoint)) {
            this.metrics.apiResponseTimes.set(endpoint, []);
          }
          this.metrics.apiResponseTimes.get(endpoint)?.push(entry.duration);
        }
      }
    });
    apiObserver.observe({ entryTypes: ['measure'] });
    this.observers.set('api', apiObserver);

    // Memory Usage Monitor
    if (typeof process !== 'undefined') {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage.push(memUsage.heapUsed);
        // Keep only last 100 readings
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage.shift();
        }
      }, 5000);
    }
  }

  /**
   * Track API request performance
   */
  trackApiRequest(endpoint: string, startTime: number) {
    const duration = performance.now() - startTime;
    performance.measure(`api-${endpoint}`, {
      start: startTime,
      duration,
    });
  }

  /**
   * Track cache performance
   */
  trackCacheAccess(hit: boolean) {
    if (hit) {
      this.metrics.cacheHitRate.hits++;
    } else {
      this.metrics.cacheHitRate.misses++;
    }
  }

  /**
   * Track database query performance
   */
  trackDbQuery(queryName: string, duration: number) {
    if (!this.metrics.dbQueryTimes.has(queryName)) {
      this.metrics.dbQueryTimes.set(queryName, []);
    }
    this.metrics.dbQueryTimes.get(queryName)?.push(duration);
  }

  /**
   * Get performance report
   */
  getReport() {
    const cacheTotal = this.metrics.cacheHitRate.hits + this.metrics.cacheHitRate.misses;
    const cacheHitRate = cacheTotal > 0 
      ? (this.metrics.cacheHitRate.hits / cacheTotal) * 100 
      : 0;

    const apiMetrics = Array.from(this.metrics.apiResponseTimes.entries()).map(([endpoint, times]) => ({
      endpoint,
      avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      p95: this.calculatePercentile(times, 95),
      p99: this.calculatePercentile(times, 99),
      count: times.length,
    }));

    const dbMetrics = Array.from(this.metrics.dbQueryTimes.entries()).map(([query, times]) => ({
      query,
      avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      p95: this.calculatePercentile(times, 95),
      p99: this.calculatePercentile(times, 99),
      count: times.length,
    }));

    const avgMemory = this.metrics.memoryUsage.length > 0
      ? this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      cache: {
        hitRate: `${cacheHitRate.toFixed(2)}%`,
        hits: this.metrics.cacheHitRate.hits,
        misses: this.metrics.cacheHitRate.misses,
      },
      api: {
        endpoints: apiMetrics,
        totalRequests: apiMetrics.reduce((sum, m) => sum + m.count, 0),
      },
      database: {
        queries: dbMetrics,
        totalQueries: dbMetrics.reduce((sum, m) => sum + m.count, 0),
      },
      memory: {
        current: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || 0,
        average: avgMemory,
        peak: Math.max(...this.metrics.memoryUsage, 0),
      },
    };
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      apiResponseTimes: new Map(),
      cacheHitRate: { hits: 0, misses: 0 },
      dbQueryTimes: new Map(),
      bundleLoadTimes: new Map(),
      memoryUsage: [],
      gcEvents: 0,
    };
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * Express middleware for automatic performance tracking
 */
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const endpoint = `${req.method}-${req.path}`;

    // Override res.end to track response time
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      performanceOptimizer.trackApiRequest(endpoint, startTime);
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * GraphQL plugin for query complexity and performance tracking
 */
export const graphQLPerformancePlugin = {
  requestDidStart() {
    return {
      willSendResponse(requestContext: any) {
        const { response, request } = requestContext;
        
        if (response.http) {
          // Add performance headers
          response.http.headers.set('X-Response-Time', `${Date.now() - request.startTime}ms`);
          response.http.headers.set('X-Cache-Status', request.cacheHit ? 'HIT' : 'MISS');
        }

        // Track cache performance
        if (request.cacheHit !== undefined) {
          performanceOptimizer.trackCacheAccess(request.cacheHit);
        }
      },
      
      didResolveOperation(requestContext: any) {
        const { request, document } = requestContext;
        
        // Calculate query complexity
        const complexity = calculateQueryComplexity(document);
        
        if (complexity > 1000) {
          throw new Error(`Query complexity ${complexity} exceeds maximum allowed complexity 1000`);
        }
        
        request.complexity = complexity;
      },
    };
  },
};

/**
 * Calculate GraphQL query complexity
 */
function calculateQueryComplexity(document: any): number {
  // Simplified complexity calculation
  let complexity = 0;
  
  const visit = (node: any, depth = 0) => {
    if (node.kind === 'Field') {
      // Base complexity for field
      complexity += 1;
      
      // Add depth multiplier
      complexity += depth * 0.5;
      
      // Check for arguments (filters, pagination)
      if (node.arguments && node.arguments.length > 0) {
        complexity += node.arguments.length * 2;
      }
    }
    
    if (node.selectionSet) {
      node.selectionSet.selections.forEach((selection: any) => {
        visit(selection, depth + 1);
      });
    }
  };
  
  if (document.definitions) {
    document.definitions.forEach((def: any) => {
      if (def.selectionSet) {
        def.selectionSet.selections.forEach((selection: any) => {
          visit(selection);
        });
      }
    });
  }
  
  return complexity;
}

/**
 * Database query optimizer
 */
export class DatabaseOptimizer {
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute default

  /**
   * Execute query with caching
   */
  async executeQuery(queryKey: string, queryFn: () => Promise<any>, options?: { 
    cache?: boolean; 
    timeout?: number 
  }): Promise<any> {
    const startTime = performance.now();
    const shouldCache = options?.cache !== false;
    const timeout = options?.timeout || this.cacheTimeout;

    // Check cache
    if (shouldCache) {
      const cached = this.queryCache.get(queryKey);
      if (cached && Date.now() - cached.timestamp < timeout) {
        performanceOptimizer.trackCacheAccess(true);
        performanceOptimizer.trackDbQuery(queryKey, 0);
        return cached.result;
      }
    }

    // Execute query
    performanceOptimizer.trackCacheAccess(false);
    const result = await queryFn();
    const duration = performance.now() - startTime;
    performanceOptimizer.trackDbQuery(queryKey, duration);

    // Cache result
    if (shouldCache) {
      this.queryCache.set(queryKey, {
        result,
        timestamp: Date.now(),
      });

      // Clean old cache entries
      this.cleanCache();
    }

    return result;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout * 2) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.queryCache.clear();
  }
}

/**
 * React component performance tracker
 */
export function usePerformanceTracking(componentName: string) {
  if (typeof window === 'undefined') return;

  const startTime = performance.now();
  
  // Track mount time
  setTimeout(() => {
    const mountTime = performance.now() - startTime;
    performance.measure(`component-mount-${componentName}`, {
      start: startTime,
      duration: mountTime,
    });
  }, 0);

  // Return cleanup function
  return () => {
    const totalTime = performance.now() - startTime;
    performance.measure(`component-lifecycle-${componentName}`, {
      start: startTime,
      duration: totalTime,
    });
  };
}

/**
 * Bundle size analyzer
 */
export class BundleAnalyzer {
  static analyze() {
    if (typeof window === 'undefined') return null;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const jsFiles = resources.filter(r => r.name.endsWith('.js'));
    const cssFiles = resources.filter(r => r.name.endsWith('.css'));
    const imageFiles = resources.filter(r => 
      r.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)
    );

    return {
      javascript: {
        count: jsFiles.length,
        totalSize: jsFiles.reduce((sum, f) => sum + (f.transferSize || 0), 0),
        avgLoadTime: jsFiles.reduce((sum, f) => sum + f.duration, 0) / jsFiles.length || 0,
      },
      css: {
        count: cssFiles.length,
        totalSize: cssFiles.reduce((sum, f) => sum + (f.transferSize || 0), 0),
        avgLoadTime: cssFiles.reduce((sum, f) => sum + f.duration, 0) / cssFiles.length || 0,
      },
      images: {
        count: imageFiles.length,
        totalSize: imageFiles.reduce((sum, f) => sum + (f.transferSize || 0), 0),
        avgLoadTime: imageFiles.reduce((sum, f) => sum + f.duration, 0) / imageFiles.length || 0,
      },
      total: {
        resources: resources.length,
        size: resources.reduce((sum, f) => sum + (f.transferSize || 0), 0),
        loadTime: Math.max(...resources.map(r => r.responseEnd || 0)),
      },
    };
  }
}

export default performanceOptimizer;