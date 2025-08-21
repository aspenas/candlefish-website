/**
 * Performance Profiler for Paintbox Application
 * Real-time monitoring and profiling of application performance
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import v8 from 'v8';
import os from 'os';
import { logger } from '@/lib/logging/simple-logger';
import getCacheInstance from '@/lib/cache/cache-service';

interface PerformanceMetrics {
  timestamp: number;
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  api: APIMetrics;
  cache: CacheMetrics;
  database: DatabaseMetrics;
  event_loop: EventLoopMetrics;
  garbage_collection: GCMetrics;
}

interface MemoryMetrics {
  heap_used: number;
  heap_total: number;
  external: number;
  rss: number;
  heap_percent: number;
  array_buffers: number;
  heap_code_statistics?: any;
  heap_spaces?: any[];
}

interface CPUMetrics {
  user: number;
  system: number;
  percent: number;
  load_average: number[];
}

interface APIMetrics {
  total_requests: number;
  active_requests: number;
  response_times: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  error_rate: number;
  slow_endpoints: SlowEndpoint[];
}

interface SlowEndpoint {
  path: string;
  method: string;
  avg_duration: number;
  count: number;
  errors: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hit_rate: number;
  evictions: number;
  memory_used: number;
  keys_count: number;
}

interface DatabaseMetrics {
  active_connections: number;
  pool_size: number;
  query_count: number;
  slow_queries: SlowQuery[];
  connection_errors: number;
}

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: number;
}

interface EventLoopMetrics {
  delay: number;
  utilization: number;
  active_handles: number;
  active_requests: number;
}

interface GCMetrics {
  collections: number;
  pause_time: number;
  heap_before: number;
  heap_after: number;
  type: string;
}

class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private metrics: Map<string, any> = new Map();
  private apiCalls: Map<string, any[]> = new Map();
  private gcStats: GCMetrics[] = [];
  private startTime: number = Date.now();
  private cache = getCacheInstance();
  private metricsInterval: NodeJS.Timeout | null = null;
  private eventLoopMonitor: NodeJS.Timeout | null = null;
  private lastCpuUsage = process.cpuUsage();
  private lastSampleTime = Date.now();

  private constructor() {
    this.setupPerformanceObserver();
    this.startMetricsCollection();
  }

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  private setupPerformanceObserver(): void {
    // Monitor garbage collection
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'gc') {
          this.gcStats.push({
            collections: this.gcStats.length + 1,
            pause_time: entry.duration,
            heap_before: 0, // Would need additional tracking
            heap_after: process.memoryUsage().heapUsed,
            type: (entry as any).kind ? this.getGCType((entry as any).kind) : 'unknown'
          });

          // Keep only last 100 GC events
          if (this.gcStats.length > 100) {
            this.gcStats.shift();
          }
        }
      });
    });

    try {
      obs.observe({ entryTypes: ['gc'] });
    } catch (error) {
      logger.warn('GC monitoring not available', { error });
    }
  }

  private getGCType(kind: number): string {
    const gcTypes: { [key: number]: string } = {
      1: 'Scavenge',
      2: 'MarkSweepCompact',
      4: 'IncrementalMarking',
      8: 'ProcessWeakCallbacks',
      15: 'All'
    };
    return gcTypes[kind] || 'Unknown';
  }

  private startMetricsCollection(): void {
    // Collect metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // Monitor event loop delay
    this.monitorEventLoop();
  }

  private monitorEventLoop(): void {
    let lastCheck = Date.now();

    this.eventLoopMonitor = setInterval(() => {
      const now = Date.now();
      const delay = now - lastCheck - 100; // Expected 100ms interval

      this.metrics.set('eventLoopDelay', Math.max(0, delay));
      lastCheck = now;
    }, 100);
  }

  private async collectMetrics(): Promise<void> {
    const metrics = await this.getCurrentMetrics();

    // Store metrics in cache for historical analysis
    const key = `metrics:${Date.now()}`;
    await this.cache.set(key, JSON.stringify(metrics), 3600); // Keep for 1 hour

    // Also store latest metrics
    await this.cache.set('metrics:latest', JSON.stringify(metrics), 60);

    // Log critical issues
    this.detectAndLogIssues(metrics);
  }

  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastSampleTime;

    // Calculate CPU percentage
    const userDiff = cpuUsage.user - this.lastCpuUsage.user;
    const systemDiff = cpuUsage.system - this.lastCpuUsage.system;
    const cpuPercent = ((userDiff + systemDiff) / (timeDiff * 1000)) * 100;

    this.lastCpuUsage = cpuUsage;
    this.lastSampleTime = currentTime;

    // Get heap statistics
    const heapStats = v8.getHeapStatistics();
    const heapSpaces = v8.getHeapSpaceStatistics();

    // Calculate API metrics
    const apiMetrics = this.calculateAPIMetrics();

    // Get cache metrics
    const cacheMetrics = await this.getCacheMetrics();

    // Get database metrics
    const dbMetrics = await this.getDatabaseMetrics();

    return {
      timestamp: Date.now(),
      memory: {
        heap_used: memUsage.heapUsed,
        heap_total: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        heap_percent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        array_buffers: memUsage.arrayBuffers || 0,
        heap_code_statistics: heapStats,
        heap_spaces: heapSpaces
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percent: cpuPercent,
        load_average: os.loadavg()
      },
      api: apiMetrics,
      cache: cacheMetrics,
      database: dbMetrics,
      event_loop: {
        delay: this.metrics.get('eventLoopDelay') || 0,
        utilization: 0, // Would need additional tracking
        active_handles: (process as any)._getActiveHandles?.()?.length || 0,
        active_requests: (process as any)._getActiveRequests?.()?.length || 0
      },
      garbage_collection: {
        collections: this.gcStats.length,
        pause_time: this.gcStats.reduce((sum, gc) => sum + gc.pause_time, 0) / Math.max(this.gcStats.length, 1),
        heap_before: 0,
        heap_after: memUsage.heapUsed,
        type: this.gcStats[this.gcStats.length - 1]?.type || 'none'
      }
    };
  }

  private calculateAPIMetrics(): APIMetrics {
    const endpoints = Array.from(this.apiCalls.entries());
    const allCalls = endpoints.flatMap(([_, calls]) => calls);

    // Calculate response time percentiles
    const responseTimes = allCalls.map(call => call.duration).sort((a, b) => a - b);
    const p50Index = Math.floor(responseTimes.length * 0.5);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    // Find slow endpoints
    const slowEndpoints: SlowEndpoint[] = endpoints
      .map(([path, calls]) => {
        const avgDuration = calls.reduce((sum, call) => sum + call.duration, 0) / calls.length;
        const errors = calls.filter(call => call.error).length;
        return {
          path,
          method: calls[0]?.method || 'GET',
          avg_duration: avgDuration,
          count: calls.length,
          errors
        };
      })
      .filter(endpoint => endpoint.avg_duration > 1000) // Slower than 1 second
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .slice(0, 10);

    const totalErrors = allCalls.filter(call => call.error).length;

    return {
      total_requests: allCalls.length,
      active_requests: allCalls.filter(call => !call.completed).length,
      response_times: {
        p50: responseTimes[p50Index] || 0,
        p95: responseTimes[p95Index] || 0,
        p99: responseTimes[p99Index] || 0,
        max: Math.max(...responseTimes, 0)
      },
      error_rate: allCalls.length > 0 ? (totalErrors / allCalls.length) * 100 : 0,
      slow_endpoints
    };
  }

  private async getCacheMetrics(): Promise<CacheMetrics> {
    // These would come from Redis INFO command or cache service stats
    const hits = this.metrics.get('cache:hits') || 0;
    const misses = this.metrics.get('cache:misses') || 0;
    const total = hits + misses;

    return {
      hits,
      misses,
      hit_rate: total > 0 ? (hits / total) * 100 : 0,
      evictions: this.metrics.get('cache:evictions') || 0,
      memory_used: this.metrics.get('cache:memory') || 0,
      keys_count: this.metrics.get('cache:keys') || 0
    };
  }

  private async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    // These would come from database connection pool stats
    return {
      active_connections: this.metrics.get('db:active_connections') || 0,
      pool_size: this.metrics.get('db:pool_size') || 10,
      query_count: this.metrics.get('db:query_count') || 0,
      slow_queries: this.metrics.get('db:slow_queries') || [],
      connection_errors: this.metrics.get('db:connection_errors') || 0
    };
  }

  private detectAndLogIssues(metrics: PerformanceMetrics): void {
    const issues: string[] = [];

    // Memory issues
    if (metrics.memory.heap_percent > 90) {
      issues.push(`CRITICAL: Heap memory usage at ${metrics.memory.heap_percent.toFixed(2)}%`);
    } else if (metrics.memory.heap_percent > 75) {
      issues.push(`WARNING: Heap memory usage at ${metrics.memory.heap_percent.toFixed(2)}%`);
    }

    // CPU issues
    if (metrics.cpu.percent > 80) {
      issues.push(`HIGH CPU: ${metrics.cpu.percent.toFixed(2)}%`);
    }

    // Event loop delay
    if (metrics.event_loop.delay > 100) {
      issues.push(`Event loop delay: ${metrics.event_loop.delay}ms`);
    }

    // API issues
    if (metrics.api.error_rate > 5) {
      issues.push(`High API error rate: ${metrics.api.error_rate.toFixed(2)}%`);
    }

    if (metrics.api.response_times.p95 > 5000) {
      issues.push(`Slow API responses: p95 = ${metrics.api.response_times.p95}ms`);
    }

    // Cache issues
    if (metrics.cache.hit_rate < 50 && metrics.cache.hits + metrics.cache.misses > 100) {
      issues.push(`Low cache hit rate: ${metrics.cache.hit_rate.toFixed(2)}%`);
    }

    // Log issues
    if (issues.length > 0) {
      logger.warn('Performance issues detected', { issues, metrics });
    }
  }

  // Public API for tracking
  trackAPICall(endpoint: string, method: string = 'GET'): { end: (error?: boolean) => void } {
    const startTime = Date.now();
    const callData = {
      endpoint,
      method,
      startTime,
      duration: 0,
      completed: false,
      error: false
    };

    if (!this.apiCalls.has(endpoint)) {
      this.apiCalls.set(endpoint, []);
    }
    this.apiCalls.get(endpoint)!.push(callData);

    // Keep only last 1000 calls per endpoint
    const calls = this.apiCalls.get(endpoint)!;
    if (calls.length > 1000) {
      calls.shift();
    }

    return {
      end: (error = false) => {
        callData.duration = Date.now() - startTime;
        callData.completed = true;
        callData.error = error;
      }
    };
  }

  updateCacheMetrics(type: 'hit' | 'miss' | 'eviction', count: number = 1): void {
    const key = `cache:${type}s`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + count);
  }

  updateDatabaseMetrics(type: string, value: any): void {
    this.metrics.set(`db:${type}`, value);
  }

  trackSlowQuery(query: string, duration: number): void {
    const slowQueries = this.metrics.get('db:slow_queries') || [];
    slowQueries.push({
      query: query.substring(0, 100), // Truncate long queries
      duration,
      timestamp: Date.now()
    });

    // Keep only last 50 slow queries
    if (slowQueries.length > 50) {
      slowQueries.shift();
    }

    this.metrics.set('db:slow_queries', slowQueries);
  }

  async getPerformanceReport(): Promise<any> {
    const metrics = await this.getCurrentMetrics();
    const uptime = Date.now() - this.startTime;

    return {
      uptime_seconds: Math.floor(uptime / 1000),
      current_metrics: metrics,
      recommendations: this.generateRecommendations(metrics),
      gc_stats: this.gcStats.slice(-10), // Last 10 GC events
      summary: {
        memory_pressure: metrics.memory.heap_percent > 75 ? 'HIGH' : metrics.memory.heap_percent > 50 ? 'MEDIUM' : 'LOW',
        api_health: metrics.api.error_rate < 1 ? 'HEALTHY' : metrics.api.error_rate < 5 ? 'DEGRADED' : 'UNHEALTHY',
        cache_efficiency: metrics.cache.hit_rate > 80 ? 'EXCELLENT' : metrics.cache.hit_rate > 60 ? 'GOOD' : 'POOR'
      }
    };
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (metrics.memory.heap_percent > 75) {
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
      recommendations.push('Review for memory leaks in long-lived objects');
      recommendations.push('Implement more aggressive caching strategies');
    }

    // API recommendations
    if (metrics.api.response_times.p95 > 3000) {
      recommendations.push('Optimize slow API endpoints');
      recommendations.push('Consider implementing request caching');
      recommendations.push('Review database query performance');
    }

    if (metrics.api.slow_endpoints.length > 0) {
      const slowest = metrics.api.slow_endpoints[0];
      recommendations.push(`Optimize ${slowest.path} - avg response time: ${slowest.avg_duration}ms`);
    }

    // Cache recommendations
    if (metrics.cache.hit_rate < 60) {
      recommendations.push('Increase cache TTL for frequently accessed data');
      recommendations.push('Review cache key strategies');
      recommendations.push('Consider pre-warming cache for common queries');
    }

    // Database recommendations
    if (metrics.database.slow_queries.length > 0) {
      recommendations.push('Add indexes for slow queries');
      recommendations.push('Consider query optimization or denormalization');
    }

    // Event loop recommendations
    if (metrics.event_loop.delay > 50) {
      recommendations.push('Offload CPU-intensive tasks to worker threads');
      recommendations.push('Review synchronous operations in request handlers');
    }

    return recommendations;
  }

  cleanup(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.eventLoopMonitor) {
      clearInterval(this.eventLoopMonitor);
    }
  }
}

export const performanceProfiler = PerformanceProfiler.getInstance();

// Export for use in API routes
export function trackAPIPerformance(req: any, res: any, next: any) {
  const tracker = performanceProfiler.trackAPICall(req.path, req.method);

  // Track response
  const originalSend = res.send;
  res.send = function(data: any) {
    tracker.end(res.statusCode >= 400);
    return originalSend.call(this, data);
  };

  next();
}
