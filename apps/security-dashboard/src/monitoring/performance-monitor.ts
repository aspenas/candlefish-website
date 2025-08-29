// Frontend Performance Monitoring for Security Dashboard

interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay  
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  
  // Custom metrics
  pageLoadTime?: number;
  domLoadTime?: number;
  resourceLoadTime?: number;
  memoryUsage?: number;
  
  // User context
  userAgent?: string;
  connectionType?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  timestamp?: string;
  sessionId?: string;
  userId?: string;
}

interface ErrorReport {
  type: 'javascript' | 'network' | 'csp' | 'unhandled';
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: string;
  url: string;
  userAgent: string;
  sessionId: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private sessionId: string;
  private reportingEndpoint: string;
  private isEnabled: boolean;
  private observer?: PerformanceObserver;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.reportingEndpoint = import.meta.env.VITE_PERFORMANCE_ENDPOINT || '/api/v1/performance';
    this.isEnabled = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';
    
    if (this.isEnabled) {
      this.initializeMonitoring();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring() {
    // Initialize Web Vitals monitoring
    this.initWebVitals();
    
    // Initialize error tracking
    this.initErrorTracking();
    
    // Initialize resource monitoring
    this.initResourceMonitoring();
    
    // Initialize user interaction tracking
    this.initUserInteractionTracking();
    
    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics(true);
    });
  }

  private initWebVitals() {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              this.metrics.LCP = entry.startTime;
              break;
            case 'first-input':
              this.metrics.FID = entry.processingStart - entry.startTime;
              break;
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                this.metrics.CLS = (this.metrics.CLS || 0) + (entry as any).value;
              }
              break;
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              this.metrics.TTFB = navEntry.responseStart - navEntry.fetchStart;
              this.metrics.domLoadTime = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
              this.metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
              break;
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.metrics.FCP = entry.startTime;
              }
              break;
          }
        });
      });

      try {
        this.observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation', 'paint'] });
      } catch (e) {
        console.warn('Some performance metrics not supported:', e);
      }
    }
  }

  private initErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId
      });
    });

    // Promise rejection errors
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'unhandled',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId
      });
    });

    // Network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.reportError({
            type: 'network',
            message: `Network error: ${response.status} ${response.statusText}`,
            timestamp: new Date().toISOString(),
            url: args[0]?.toString() || 'unknown',
            userAgent: navigator.userAgent,
            sessionId: this.sessionId
          });
        }
        return response;
      } catch (error) {
        this.reportError({
          type: 'network',
          message: `Network error: ${error}`,
          timestamp: new Date().toISOString(),
          url: args[0]?.toString() || 'unknown',
          userAgent: navigator.userAgent,
          sessionId: this.sessionId
        });
        throw error;
      }
    };
  }

  private initResourceMonitoring() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        const resources = list.getEntries() as PerformanceResourceTiming[];
        let totalResourceTime = 0;
        
        resources.forEach((resource) => {
          totalResourceTime += resource.duration;
          
          // Track slow resources
          if (resource.duration > 1000) {
            console.warn(`Slow resource detected: ${resource.name} took ${resource.duration}ms`);
          }
        });
        
        this.metrics.resourceLoadTime = totalResourceTime;
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource monitoring not supported:', e);
      }
    }
  }

  private initUserInteractionTracking() {
    // Track key user interactions
    const interactionEvents = ['click', 'keydown', 'scroll'];
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, this.throttle(() => {
        // Record user activity timestamp
        this.metrics.timestamp = new Date().toISOString();
      }, 1000));
    });
  }

  private throttle(func: Function, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout>;
    let lastExecTime = 0;
    return function (this: any, ...args: any[]) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    } : null;
  }

  public reportMetrics(isPageUnload = false) {
    if (!this.isEnabled) return;

    // Get memory usage if available
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    const finalMetrics: PerformanceMetrics = {
      ...this.metrics,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionInfo()?.effectiveType || 'unknown',
      deviceType: this.getDeviceType(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    // Use sendBeacon for page unload, fetch otherwise
    if (isPageUnload && navigator.sendBeacon) {
      navigator.sendBeacon(this.reportingEndpoint, JSON.stringify(finalMetrics));
    } else {
      this.sendMetrics(finalMetrics);
    }
  }

  private async sendMetrics(metrics: PerformanceMetrics) {
    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
        keepalive: true
      });
    } catch (error) {
      console.warn('Failed to report performance metrics:', error);
    }
  }

  private async reportError(error: ErrorReport) {
    if (!this.isEnabled) return;

    const errorEndpoint = import.meta.env.VITE_ERROR_ENDPOINT || '/api/v1/errors';
    
    try {
      await fetch(errorEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
        keepalive: true
      });
    } catch (e) {
      console.warn('Failed to report error:', e);
    }
  }

  // Public API methods
  public markInteraction(name: string) {
    if (!this.isEnabled) return;
    performance.mark(`interaction-${name}-start`);
  }

  public measureInteraction(name: string) {
    if (!this.isEnabled) return;
    try {
      performance.mark(`interaction-${name}-end`);
      performance.measure(`interaction-${name}`, `interaction-${name}-start`, `interaction-${name}-end`);
    } catch (e) {
      console.warn(`Failed to measure interaction ${name}:`, e);
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types for use in components
export type { PerformanceMetrics, ErrorReport };