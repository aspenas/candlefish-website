/**
 * Performance monitoring utility for tracking Core Web Vitals and custom metrics
 */

interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint

  // Custom metrics
  TTI?: number; // Time to Interactive
  TBT?: number; // Total Blocking Time
  memoryUsage?: number;
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;

  // Resource metrics
  jsHeapSize?: number;
  domNodes?: number;
  resourceCount?: number;
  transferSize?: number;
}

interface PerformanceConfig {
  enableLogging?: boolean;
  enableAnalytics?: boolean;
  analyticsEndpoint?: string;
  sampleRate?: number;
  debug?: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private config: PerformanceConfig;
  private observers: Map<string, PerformanceObserver> = new Map();
  private analyticsQueue: PerformanceMetrics[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableLogging: true,
      enableAnalytics: false,
      sampleRate: 1,
      debug: false,
      ...config
    };

    if (this.shouldTrack()) {
      this.init();
    }
  }

  private shouldTrack(): boolean {
    // Sample rate check
    if (Math.random() > this.config.sampleRate!) {
      return false;
    }

    // Check for Performance API support
    if (typeof window === 'undefined' || !window.performance) {
      console.warn('Performance API not supported');
      return false;
    }

    return true;
  }

  private init(): void {
    // Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
    this.observeINP();

    // Custom metrics
    this.observeTTI();
    this.observeMemory();
    this.observeResources();
    this.observeConnection();

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportMetrics();
      }
    });

    // Report metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });

    // Schedule periodic reporting
    this.scheduleFlush();
  }

  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
        this.log('LCP', this.metrics.LCP);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    } catch (e) {
      this.debug('LCP observer failed:', e);
    }
  }

  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstEntry = entries[0] as any;
        this.metrics.FID = firstEntry.processingStart - firstEntry.startTime;
        this.log('FID', this.metrics.FID);
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    } catch (e) {
      this.debug('FID observer failed:', e);
    }
  }

  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: any[] = [];

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();

        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        });

        this.metrics.CLS = clsValue;
        this.log('CLS', this.metrics.CLS);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    } catch (e) {
      this.debug('CLS observer failed:', e);
    }
  }

  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');

        if (fcpEntry) {
          this.metrics.FCP = fcpEntry.startTime;
          this.log('FCP', this.metrics.FCP);
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', observer);
    } catch (e) {
      this.debug('FCP observer failed:', e);
    }
  }

  private observeTTFB(): void {
    if (!window.performance || !window.performance.timing) return;

    const timing = window.performance.timing;
    const ttfb = timing.responseStart - timing.navigationStart;

    if (ttfb > 0) {
      this.metrics.TTFB = ttfb;
      this.log('TTFB', ttfb);
    }
  }

  private observeINP(): void {
    if (!('PerformanceObserver' in window)) return;

    let worstINP = 0;

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();

        entries.forEach((entry: any) => {
          if (entry.duration > worstINP) {
            worstINP = entry.duration;
            this.metrics.INP = worstINP;
            this.log('INP', worstINP);
          }
        });
      });

      observer.observe({ entryTypes: ['event'] });
      this.observers.set('inp', observer);
    } catch (e) {
      this.debug('INP observer failed:', e);
    }
  }

  private observeTTI(): void {
    if (!window.performance || !window.performance.timing) return;

    // Simplified TTI calculation
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const tti = Date.now() - timing.navigationStart;
        this.metrics.TTI = tti;
        this.log('TTI', tti);
      }, 0);
    });
  }

  private observeMemory(): void {
    if (!('memory' in performance)) return;

    const memory = (performance as any).memory;

    if (memory) {
      this.metrics.jsHeapSize = memory.usedJSHeapSize;
      this.metrics.memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
      this.log('Memory Usage', `${this.metrics.memoryUsage}%`);
    }
  }

  private observeResources(): void {
    if (!window.performance || !window.performance.getEntriesByType) return;

    const resources = window.performance.getEntriesByType('resource');
    this.metrics.resourceCount = resources.length;

    const transferSize = resources.reduce((total, resource: any) => {
      return total + (resource.transferSize || 0);
    }, 0);

    this.metrics.transferSize = transferSize;
    this.metrics.domNodes = document.querySelectorAll('*').length;

    this.log('Resources', {
      count: this.metrics.resourceCount,
      size: `${Math.round(transferSize / 1024)}KB`,
      domNodes: this.metrics.domNodes
    });
  }

  private observeConnection(): void {
    const connection = (navigator as any).connection;

    if (connection) {
      this.metrics.connectionType = connection.effectiveType;
      this.log('Connection', connection.effectiveType);
    }

    if ('deviceMemory' in navigator) {
      this.metrics.deviceMemory = (navigator as any).deviceMemory;
    }

    if ('hardwareConcurrency' in navigator) {
      this.metrics.hardwareConcurrency = navigator.hardwareConcurrency;
    }
  }

  private log(metric: string, value: any): void {
    if (!this.config.enableLogging) return;

    const formattedValue = typeof value === 'number' ?
      `${Math.round(value)}ms` :
      JSON.stringify(value);

    console.log(`[Performance] ${metric}:`, formattedValue);
  }

  private debug(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.debug(`[Performance Debug] ${message}`, ...args);
    }
  }

  private scheduleFlush(): void {
    // Flush analytics every 10 seconds
    this.flushTimer = setInterval(() => {
      if (this.analyticsQueue.length > 0) {
        this.flushAnalytics();
      }
    }, 10000);
  }

  private flushAnalytics(): void {
    if (!this.config.enableAnalytics || !this.config.analyticsEndpoint) return;

    const batch = [...this.analyticsQueue];
    this.analyticsQueue = [];

    fetch(this.config.analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: batch,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }),
      keepalive: true
    }).catch(err => {
      this.debug('Analytics flush failed:', err);
      // Re-add to queue on failure
      this.analyticsQueue.unshift(...batch);
    });
  }

  public reportMetrics(): void {
    if (Object.keys(this.metrics).length === 0) return;

    // Log final metrics
    if (this.config.enableLogging) {
      console.table(this.metrics);
    }

    // Queue for analytics
    if (this.config.enableAnalytics) {
      this.analyticsQueue.push({ ...this.metrics });
      this.flushAnalytics();
    }

    // Emit custom event
    window.dispatchEvent(new CustomEvent('performance-metrics', {
      detail: this.metrics
    }));
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public markCustomMetric(name: string, value: number): void {
    (this.metrics as any)[name] = value;
    this.log(name, value);
  }

  public destroy(): void {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Final report
    this.reportMetrics();
  }
}

// Export singleton instance
let instance: PerformanceMonitor | null = null;

export const initPerformanceMonitoring = (config?: PerformanceConfig): PerformanceMonitor => {
  if (!instance) {
    instance = new PerformanceMonitor(config);
  }
  return instance;
};

export const getPerformanceMonitor = (): PerformanceMonitor | null => {
  return instance;
};

export default PerformanceMonitor;
