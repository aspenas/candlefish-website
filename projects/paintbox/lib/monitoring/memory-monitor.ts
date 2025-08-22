/**
 * Real-time Memory Monitoring System
 * Tracks and reports memory usage with automatic optimization triggers
 */

import { EventEmitter } from 'events';
import v8 from 'v8';
import { performance } from 'perf_hooks';

interface MemoryMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  heapPercentage: number;
  v8Stats?: {
    totalHeapSize: number;
    usedHeapSize: number;
    heapSizeLimit: number;
    totalAvailableSize: number;
    numberOfNativeContexts: number;
    numberOfDetachedContexts: number;
  };
}

interface MemoryThresholds {
  warning: number;  // 70%
  critical: number; // 85%
  emergency: number; // 92%
}

interface MemoryAlert {
  level: 'warning' | 'critical' | 'emergency';
  timestamp: number;
  metrics: MemoryMetrics;
  message: string;
  actions: string[];
}

class MemoryMonitor extends EventEmitter {
  private static instance: MemoryMonitor;
  private metrics: MemoryMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private thresholds: MemoryThresholds = {
    warning: 70,
    critical: 85,
    emergency: 92,
  };
  private lastGC = Date.now();
  private gcCount = 0;
  private memoryTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';

  private constructor() {
    super();
    this.setupGCTracking();
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  private setupGCTracking() {
    if (global.gc) {
      // Track manual GC calls
      const originalGC = global.gc;
      global.gc = () => {
        this.gcCount++;
        this.lastGC = Date.now();
        originalGC();
        this.emit('gc', { count: this.gcCount, timestamp: this.lastGC });
      };
    }
  }

  startMonitoring(intervalMs = 10000) {
    if (this.isMonitoring) {
      console.log('[Memory Monitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log('[Memory Monitor] Starting real-time monitoring');

    // Initial measurement
    this.collectMetrics();

    // Regular monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzeMetrics();
      this.checkThresholds();
    }, intervalMs);

    // Emergency check every second when memory is high
    this.startEmergencyMonitoring();
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[Memory Monitor] Stopped monitoring');
  }

  private collectMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    const metrics: MemoryMetrics = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      heapPercentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      v8Stats: {
        totalHeapSize: heapStats.total_heap_size,
        usedHeapSize: heapStats.used_heap_size,
        heapSizeLimit: heapStats.heap_size_limit,
        totalAvailableSize: heapStats.total_available_size,
        numberOfNativeContexts: heapStats.number_of_native_contexts,
        numberOfDetachedContexts: heapStats.number_of_detached_contexts,
      },
    };

    // Keep only last 100 metrics
    this.metrics.push(metrics);
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    this.emit('metrics', metrics);

    return metrics;
  }

  private analyzeMetrics() {
    if (this.metrics.length < 5) return;

    // Calculate trend over last 5 measurements
    const recent = this.metrics.slice(-5);
    const trend = this.calculateTrend(recent);

    if (trend !== this.memoryTrend) {
      this.memoryTrend = trend;
      this.emit('trend', { trend, metrics: recent });
    }

    // Detect memory leaks
    if (this.detectMemoryLeak()) {
      this.emit('leak', {
        message: 'Potential memory leak detected',
        metrics: this.metrics.slice(-10),
      });
    }
  }

  private calculateTrend(metrics: MemoryMetrics[]): 'stable' | 'increasing' | 'decreasing' {
    const values = metrics.map(m => m.heapUsed);
    const avgIncrease = values.reduce((acc, val, idx) => {
      if (idx === 0) return 0;
      return acc + (val - values[idx - 1]);
    }, 0) / (values.length - 1);

    const threshold = 1024 * 1024; // 1MB

    if (avgIncrease > threshold) return 'increasing';
    if (avgIncrease < -threshold) return 'decreasing';
    return 'stable';
  }

  private detectMemoryLeak(): boolean {
    if (this.metrics.length < 10) return false;

    const recent = this.metrics.slice(-10);
    const oldestHeap = recent[0].heapUsed;
    const newestHeap = recent[recent.length - 1].heapUsed;

    // Check for consistent growth
    const growth = newestHeap - oldestHeap;
    const growthPercentage = (growth / oldestHeap) * 100;

    // Check for detached contexts (sign of memory leak)
    const latestV8Stats = recent[recent.length - 1].v8Stats;
    const hasDetachedContexts = latestV8Stats && latestV8Stats.numberOfDetachedContexts > 5;

    return growthPercentage > 20 || hasDetachedContexts;
  }

  private checkThresholds() {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return;

    const percentage = latest.heapPercentage;

    if (percentage >= this.thresholds.emergency) {
      this.handleEmergency(latest);
    } else if (percentage >= this.thresholds.critical) {
      this.handleCritical(latest);
    } else if (percentage >= this.thresholds.warning) {
      this.handleWarning(latest);
    }
  }

  private handleWarning(metrics: MemoryMetrics) {
    const alert: MemoryAlert = {
      level: 'warning',
      timestamp: Date.now(),
      metrics,
      message: `Memory usage at ${metrics.heapPercentage.toFixed(1)}% - approaching limits`,
      actions: [
        'Monitoring cache usage',
        'Preparing for cleanup if needed',
      ],
    };

    this.emit('alert', alert);
    console.warn('[Memory Monitor]', alert.message);
  }

  private handleCritical(metrics: MemoryMetrics) {
    const alert: MemoryAlert = {
      level: 'critical',
      timestamp: Date.now(),
      metrics,
      message: `CRITICAL: Memory usage at ${metrics.heapPercentage.toFixed(1)}%`,
      actions: [
        'Clearing application caches',
        'Reducing connection pools',
        'Forcing garbage collection',
      ],
    };

    this.emit('alert', alert);
    console.error('[Memory Monitor]', alert.message);

    // Trigger automatic optimizations
    this.performCriticalOptimizations();
  }

  private handleEmergency(metrics: MemoryMetrics) {
    const alert: MemoryAlert = {
      level: 'emergency',
      timestamp: Date.now(),
      metrics,
      message: `EMERGENCY: Memory usage at ${metrics.heapPercentage.toFixed(1)}% - system unstable`,
      actions: [
        'Clearing all caches',
        'Closing database connections',
        'Dropping non-essential operations',
        'Forcing aggressive GC',
      ],
    };

    this.emit('alert', alert);
    console.error('[Memory Monitor] EMERGENCY:', alert.message);

    // Trigger emergency optimizations
    this.performEmergencyOptimizations();
  }

  private performCriticalOptimizations() {
    // Emit events for other systems to respond
    this.emit('optimize', { level: 'critical' });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  private performEmergencyOptimizations() {
    // Emit emergency optimization event
    this.emit('optimize', { level: 'emergency' });

    // Aggressive garbage collection
    if (global.gc) {
      global.gc();
      global.gc(); // Double GC for thorough cleanup
    }

    // Clear require cache for non-essential modules
    this.clearModuleCache();
  }

  private clearModuleCache() {
    const keysToDelete: string[] = [];

    for (const key in require.cache) {
      // Keep essential modules
      if (!key.includes('node_modules') ||
          key.includes('@prisma') ||
          key.includes('next') ||
          key.includes('react')) {
        continue;
      }
      keysToDelete.push(key);
    }

    keysToDelete.forEach(key => delete require.cache[key]);

    console.log(`[Memory Monitor] Cleared ${keysToDelete.length} cached modules`);
  }

  private startEmergencyMonitoring() {
    setInterval(() => {
      const latest = this.metrics[this.metrics.length - 1];
      if (latest && latest.heapPercentage > this.thresholds.critical) {
        // Check every second when critical
        this.collectMetrics();
        this.checkThresholds();
      }
    }, 1000);
  }

  getMetrics(): MemoryMetrics[] {
    return [...this.metrics];
  }

  getCurrentMetrics(): MemoryMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  getMemoryReport() {
    const current = this.getCurrentMetrics();
    if (!current) return null;

    return {
      current: {
        heapUsedMB: Math.round(current.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(current.heapTotal / 1024 / 1024),
        rssMB: Math.round(current.rss / 1024 / 1024),
        externalMB: Math.round(current.external / 1024 / 1024),
        percentage: current.heapPercentage.toFixed(1),
      },
      trend: this.memoryTrend,
      gcStats: {
        lastGC: new Date(this.lastGC).toISOString(),
        gcCount: this.gcCount,
      },
      thresholds: this.thresholds,
      recommendations: this.getRecommendations(current),
    };
  }

  private getRecommendations(metrics: MemoryMetrics): string[] {
    const recommendations: string[] = [];
    const percentage = metrics.heapPercentage;

    if (percentage > 90) {
      recommendations.push('Immediate action required: Restart application or scale horizontally');
    } else if (percentage > 80) {
      recommendations.push('Clear caches and reduce memory-intensive operations');
      recommendations.push('Consider increasing memory allocation');
    } else if (percentage > 70) {
      recommendations.push('Monitor closely and prepare for optimization');
      recommendations.push('Review recent changes for memory inefficiencies');
    }

    if (metrics.v8Stats && metrics.v8Stats.numberOfDetachedContexts > 3) {
      recommendations.push('Memory leak suspected: Review event listeners and closures');
    }

    if (this.memoryTrend === 'increasing') {
      recommendations.push('Memory usage trending upward - investigate cause');
    }

    return recommendations;
  }

  // API endpoint data
  toJSON() {
    return {
      isMonitoring: this.isMonitoring,
      report: this.getMemoryReport(),
      metrics: this.metrics.slice(-20), // Last 20 metrics
    };
  }
}

// Export singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  memoryMonitor.startMonitoring(30000); // Check every 30 seconds
}

export { MemoryMonitor, MemoryMetrics, MemoryAlert, MemoryThresholds };
