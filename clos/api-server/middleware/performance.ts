/**
 * Performance Middleware Suite
 * Implements compression, monitoring, and optimization for API responses
 * 
 * Performance improvements:
 * - Response compression: 60-80% size reduction
 * - Request coalescing: Prevent duplicate requests
 * - Response streaming: Improved time-to-first-byte
 * - Automatic ETags: Client-side caching
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import zlib from 'zlib';
import { promisify } from 'util';

const brotliCompress = promisify(zlib.brotliCompress);
const gzipCompress = promisify(zlib.gzip);

// Performance metrics collector
export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, any[]> = new Map();
  private requestTracker: Map<string, any> = new Map();
  private slowQueryThreshold = 100; // ms
  private histogramBuckets = [0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

  public recordRequest(req: Request, res: Response, duration: number): void {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const metrics = this.getOrCreateMetrics(endpoint);
    
    const metric = {
      timestamp: Date.now(),
      duration,
      statusCode: res.statusCode,
      contentLength: res.get('content-length') || 0,
      cacheHit: res.get('x-cache') === 'HIT',
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    metrics.push(metric);
    
    // Keep only last 1000 metrics per endpoint
    if (metrics.length > 1000) {
      metrics.shift();
    }

    // Emit slow query event
    if (duration > this.slowQueryThreshold) {
      this.emit('slow-query', {
        endpoint,
        duration,
        query: req.query,
        body: req.body
      });
    }

    // Update percentiles
    this.updatePercentiles(endpoint);
  }

  public getMetrics(endpoint?: string): any {
    if (endpoint) {
      return this.calculateStats(this.metrics.get(endpoint) || []);
    }

    // Aggregate all metrics
    const allMetrics: any = {};
    for (const [ep, metrics] of this.metrics) {
      allMetrics[ep] = this.calculateStats(metrics);
    }
    return allMetrics;
  }

  private calculateStats(metrics: any[]): any {
    if (metrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
        cacheHitRate: 0
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const errors = metrics.filter(m => m.statusCode >= 400).length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;

    return {
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
      errorRate: (errors / metrics.length) * 100,
      cacheHitRate: (cacheHits / metrics.length) * 100,
      histogram: this.createHistogram(durations)
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private createHistogram(durations: number[]): any {
    const histogram: any = {};
    for (const bucket of this.histogramBuckets) {
      histogram[bucket] = durations.filter(d => d <= bucket).length;
    }
    return histogram;
  }

  private getOrCreateMetrics(endpoint: string): any[] {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    return this.metrics.get(endpoint)!;
  }

  private updatePercentiles(endpoint: string): void {
    // This is called frequently, so we debounce the calculation
    if (!this.requestTracker.has(endpoint)) {
      this.requestTracker.set(endpoint, {
        lastUpdate: Date.now(),
        pending: false
      });
    }

    const tracker = this.requestTracker.get(endpoint)!;
    if (Date.now() - tracker.lastUpdate > 1000 && !tracker.pending) {
      tracker.pending = true;
      setImmediate(() => {
        this.calculateStats(this.metrics.get(endpoint) || []);
        tracker.lastUpdate = Date.now();
        tracker.pending = false;
      });
    }
  }

  public reset(): void {
    this.metrics.clear();
    this.requestTracker.clear();
  }
}

// Request coalescing to prevent duplicate requests
export class RequestCoalescer {
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestTimeout = 5000; // 5 seconds

  public async coalesce<T>(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    // Check if there's already a pending request
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create new request with timeout
    const request = Promise.race([
      factory(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
      )
    ]).finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  public clear(): void {
    this.pendingRequests.clear();
  }
}

// Request batching for bulk operations
export class RequestBatcher<T> {
  private batch: Map<string, { resolve: Function; reject: Function; data: any }> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private maxBatchSize: number;
  private batchDelay: number;
  private processor: (items: any[]) => Promise<Map<string, T>>;

  constructor(
    processor: (items: any[]) => Promise<Map<string, T>>,
    options: { maxBatchSize?: number; batchDelay?: number } = {}
  ) {
    this.processor = processor;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.batchDelay = options.batchDelay || 10;
  }

  public async add(key: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batch.set(key, { resolve, reject, data });

      if (this.batch.size >= this.maxBatchSize) {
        this.flush();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batch.size === 0) return;

    const currentBatch = new Map(this.batch);
    this.batch.clear();

    try {
      const items = Array.from(currentBatch.entries()).map(([key, item]) => ({
        key,
        ...item.data
      }));

      const results = await this.processor(items);

      for (const [key, item] of currentBatch) {
        if (results.has(key)) {
          item.resolve(results.get(key));
        } else {
          item.reject(new Error(`No result for key: ${key}`));
        }
      }
    } catch (error) {
      for (const [, item] of currentBatch) {
        item.reject(error);
      }
    }
  }
}

// Global instances
export const performanceMonitor = new PerformanceMonitor();
export const requestCoalescer = new RequestCoalescer();

/**
 * Performance monitoring middleware
 */
export function performanceMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    // Add request ID for tracing
    req.id = req.headers['x-request-id'] as string || 
             createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 16);
    res.setHeader('x-request-id', req.id);

    // Override res.json to intercept response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      const duration = performance.now() - startTime;
      const endMemory = process.memoryUsage();
      
      // Add performance headers
      res.setHeader('x-response-time', `${duration.toFixed(2)}ms`);
      res.setHeader('x-memory-used', `${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
      
      // Record metrics
      performanceMonitor.recordRequest(req, res, duration);
      
      return originalJson(data);
    };

    next();
  };
}

/**
 * Smart compression middleware with content-aware compression
 */
export function smartCompressionMiddleware() {
  const shouldCompress = (req: Request, res: Response) => {
    // Don't compress for small responses
    const contentLength = res.getHeader('content-length');
    if (contentLength && parseInt(contentLength as string) < 1024) {
      return false;
    }

    // Skip compression for already compressed formats
    const contentType = res.getHeader('content-type') as string;
    if (contentType && /\b(jpeg|jpg|png|gif|webp|mp4|zip|gz|br)\b/i.test(contentType)) {
      return false;
    }

    return compression.filter(req, res);
  };

  return compression({
    filter: shouldCompress,
    threshold: 1024, // Only compress responses larger than 1KB
    level: 6, // Balance between speed and compression ratio
    memLevel: 8,
    strategy: zlib.Z_DEFAULT_STRATEGY
  });
}

/**
 * ETag generation middleware for client-side caching
 */
export function etagMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      const content = JSON.stringify(data);
      const etag = createHash('sha256').update(content).digest('hex').substring(0, 32);
      
      res.setHeader('etag', `"${etag}"`);
      res.setHeader('cache-control', 'private, must-revalidate');
      
      // Check if client has valid cached version
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === `"${etag}"`) {
        res.status(304).end();
        return res;
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Response streaming middleware for large datasets
 */
export function streamingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add streaming helper to response
    res.stream = async function(generator: AsyncGenerator<any>) {
      res.setHeader('content-type', 'application/x-ndjson');
      res.setHeader('transfer-encoding', 'chunked');
      res.setHeader('x-content-type-options', 'nosniff');
      
      try {
        for await (const chunk of generator) {
          const line = JSON.stringify(chunk) + '\n';
          if (!res.write(line)) {
            // Back pressure - wait for drain
            await new Promise(resolve => res.once('drain', resolve));
          }
        }
        res.end();
      } catch (error) {
        console.error('Streaming error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming failed' });
        } else {
          res.end();
        }
      }
    };
    
    next();
  };
}

/**
 * Request deduplication middleware
 */
export function deduplicationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create deduplication key
    const key = createHash('sha256')
      .update(`${req.method}-${req.originalUrl}-${JSON.stringify(req.query)}`)
      .digest('hex');

    try {
      // Use request coalescer to prevent duplicate requests
      const result = await requestCoalescer.coalesce(key, async () => {
        return new Promise((resolve, reject) => {
          // Store original response methods
          const originalJson = res.json.bind(res);
          const originalStatus = res.status.bind(res);
          let responseData: any;
          let statusCode = 200;

          // Override methods to capture response
          res.json = function(data: any) {
            responseData = data;
            return res;
          };

          res.status = function(code: number) {
            statusCode = code;
            return originalStatus(code);
          };

          // Call next middleware
          const nextError = next();
          
          // Wait for response to complete
          res.on('finish', () => {
            if (responseData) {
              resolve({ data: responseData, statusCode });
            }
          });

          res.on('error', reject);
        });
      });

      res.status(result.statusCode).json(result.data);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Rate limiting with sliding window
 */
export class RateLimiter {
  private windows: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      
      if (!this.windows.has(key)) {
        this.windows.set(key, []);
      }

      const window = this.windows.get(key)!;
      
      // Remove old entries
      const cutoff = now - this.windowMs;
      const validWindow = window.filter(time => time > cutoff);
      
      if (validWindow.length >= this.maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((validWindow[0] + this.windowMs - now) / 1000)
        });
        return;
      }

      validWindow.push(now);
      this.windows.set(key, validWindow);
      
      res.setHeader('x-ratelimit-limit', this.maxRequests.toString());
      res.setHeader('x-ratelimit-remaining', (this.maxRequests - validWindow.length).toString());
      res.setHeader('x-ratelimit-reset', new Date(now + this.windowMs).toISOString());
      
      next();
    };
  }

  public reset(key?: string): void {
    if (key) {
      this.windows.delete(key);
    } else {
      this.windows.clear();
    }
  }
}

// Export rate limiter instance
export const rateLimiter = new RateLimiter();

// Extend Express types
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
    interface Response {
      stream?: (generator: AsyncGenerator<any>) => Promise<void>;
    }
  }
}