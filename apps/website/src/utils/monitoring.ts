// Monitoring and error tracking utilities for Candlefish AI website

import { ErrorInfo } from 'react';

// Environment configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Sentry configuration
export const initSentry = () => {
  if (isProduction && window.Sentry) {
    window.Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT || 'production',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        new window.Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', /^https:\/\/candlefish\.ai/],
        }),
        new window.Sentry.Replay(),
      ],
      beforeSend(event) {
        // Filter out development errors
        if (isDevelopment) return null;

        // Filter out known non-critical errors
        if (event.exception?.values?.[0]?.value?.includes('Non-Error promise rejection')) {
          return null;
        }

        return event;
      },
    });
  }
};

// Google Analytics 4 configuration
export const initGoogleAnalytics = () => {
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (isProduction && GA_MEASUREMENT_ID) {
    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: 'Candlefish AI',
      page_location: window.location.href,
      send_page_view: true,
    });
  }
};

// Performance monitoring
export const initPerformanceMonitoring = () => {
  if (!isProduction) return;

  // Core Web Vitals
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          trackMetric('LCP', entry.startTime);
        }

        if (entry.entryType === 'first-input') {
          trackMetric('FID', entry.processingStart - entry.startTime);
        }

        if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
          trackMetric('CLS', entry.value);
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  }

  // Time to Interactive (TTI)
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        trackMetric('TTI', navigation.loadEventEnd - navigation.fetchStart);
        trackMetric('TTFB', navigation.responseStart - navigation.fetchStart);
      }
    }, 0);
  });
};

// Metric tracking
export const trackMetric = (name: string, value: number, unit = 'ms') => {
  if (isProduction) {
    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'web_vitals', {
        custom_parameter_1: name,
        custom_parameter_2: value,
        custom_parameter_3: unit,
      });
    }

    // Send to Sentry as performance data
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'performance',
        message: `${name}: ${value}${unit}`,
        level: 'info',
        data: { metric: name, value, unit },
      });
    }
  }

  if (isDevelopment) {
    console.log(`Performance Metric - ${name}: ${value}${unit}`);
  }
};

// Error tracking
export const trackError = (error: Error, errorInfo?: ErrorInfo, context?: Record<string, any>) => {
  if (isProduction) {
    if (window.Sentry) {
      window.Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setTag(key, context[key]);
          });
        }

        if (errorInfo) {
          scope.setContext('errorInfo', errorInfo);
        }

        window.Sentry.captureException(error);
      });
    }

    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  if (isDevelopment) {
    console.error('Error tracked:', error, errorInfo, context);
  }
};

// User interaction tracking
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (isProduction && window.gtag) {
    window.gtag('event', eventName, parameters);
  }

  if (isDevelopment) {
    console.log(`Event tracked: ${eventName}`, parameters);
  }
};

// Page view tracking
export const trackPageView = (path: string, title?: string) => {
  if (isProduction && window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title || document.title,
    });
  }

  if (isDevelopment) {
    console.log(`Page view tracked: ${path}`, title);
  }
};

// Uptime monitoring (for health checks)
export const reportHealthStatus = () => {
  const healthData = {
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    performance: {
      memory: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit,
      } : null,
      navigation: performance.getEntriesByType('navigation')[0],
    },
  };

  if (isProduction) {
    // Send health data to monitoring endpoint
    fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(healthData),
    }).catch(() => {
      // Silently handle failures
    });
  }

  return healthData;
};

// Initialize all monitoring
export const initMonitoring = () => {
  initSentry();
  initGoogleAnalytics();
  initPerformanceMonitoring();

  // Report health status every 5 minutes
  if (isProduction) {
    setInterval(reportHealthStatus, 5 * 60 * 1000);
  }
};

// Type declarations for global objects
declare global {
  interface Window {
    Sentry: any;
    gtag: any;
    dataLayer: any[];
  }
}
