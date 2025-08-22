import { useEffect } from 'react';
// Temporarily disabled - web-vitals package needs to be installed
// import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
type Metric = any;

export interface WebVitalsData {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay (deprecated, use INP)
  inp?: number; // Interaction to Next Paint (replaces FID)
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  tti?: number; // Time to Interactive (calculated)
}

interface UseWebVitalsOptions {
  onReport?: (metrics: WebVitalsData) => void;
  reportToAnalytics?: boolean;
  debug?: boolean;
}

/**
 * Hook to measure and report Web Vitals
 * Automatically tracks Core Web Vitals and reports them
 */
export function useWebVitals(options: UseWebVitalsOptions = {}) {
  const { onReport, reportToAnalytics = true, debug = false } = options;

  useEffect(() => {
    const vitals: WebVitalsData = {};

    // Log to console in debug mode
    const logMetric = (metric: Metric) => {
      if (debug) {
        console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
      }
    };

    // Send to analytics endpoint
    const sendToAnalytics = (metric: Metric) => {
      if (reportToAnalytics) {
        // Send to telemetry endpoint
        fetch('/api/telemetry/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric: metric.name,
            value: metric.value,
            delta: metric.delta,
            id: metric.id,
            rating: metric.rating,
            navigationType: metric.navigationType,
            timestamp: new Date().toISOString(),
          }),
        }).catch((error) => {
          console.error('Failed to report web vital:', error);
        });
      }
    };

    // Unified handler for all metrics
    const handleMetric = (metric: Metric) => {
      logMetric(metric);
      sendToAnalytics(metric);

      // Update vitals object
      switch (metric.name) {
        case 'FCP':
          vitals.fcp = Math.round(metric.value);
          break;
        case 'LCP':
          vitals.lcp = Math.round(metric.value);
          break;
        case 'FID':
          vitals.fid = Math.round(metric.value);
          break;
        case 'INP':
          vitals.inp = Math.round(metric.value);
          break;
        case 'CLS':
          vitals.cls = parseFloat(metric.value.toFixed(3));
          break;
        case 'TTFB':
          vitals.ttfb = Math.round(metric.value);
          break;
      }

      // Report to callback if provided
      if (onReport) {
        onReport(vitals);
      }
    };

    // Register Web Vitals observers
    // Temporarily disabled - web-vitals package needs to be installed
    // onFCP(handleMetric);
    // onLCP(handleMetric);
    // onFID(handleMetric); // Deprecated but still tracked
    // onINP(handleMetric); // New metric replacing FID
    // onCLS(handleMetric);
    // onTTFB(handleMetric);

    // Calculate Time to Interactive (TTI)
    // This is a simplified calculation based on when the page becomes interactive
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Use Long Tasks API to estimate TTI
        const observer = new PerformanceObserver((list) => {
          const perfEntries = list.getEntries();
          if (perfEntries.length > 0) {
            const lastLongTask = perfEntries[perfEntries.length - 1];
            const tti = lastLongTask.startTime + lastLongTask.duration;
            vitals.tti = Math.round(tti);

            if (debug) {
              console.log('[Web Vitals] TTI:', tti);
            }

            if (onReport) {
              onReport(vitals);
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });

        // Cleanup observer on unmount
        return () => {
          observer.disconnect();
        };
      } catch (error) {
        console.error('Failed to setup TTI observer:', error);
      }
    }

    // Also measure navigation timing for additional metrics
    if (typeof window !== 'undefined' && window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;

      // Calculate Time to Interactive as a fallback
      if (!vitals.tti && timing.loadEventEnd > 0) {
        vitals.tti = timing.loadEventEnd - navigationStart;

        if (debug) {
          console.log('[Web Vitals] TTI (fallback):', vitals.tti);
        }

        if (onReport) {
          onReport(vitals);
        }
      }
    }
  }, [onReport, reportToAnalytics, debug]);

  return null;
}

/**
 * Get Web Vitals thresholds for scoring
 */
export function getWebVitalsThresholds() {
  return {
    fcp: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
    lcp: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
    fid: { good: 100, needsImprovement: 300 },    // First Input Delay
    inp: { good: 200, needsImprovement: 500 },    // Interaction to Next Paint
    cls: { good: 0.1, needsImprovement: 0.25 },   // Cumulative Layout Shift
    ttfb: { good: 800, needsImprovement: 1800 },  // Time to First Byte
    tti: { good: 2500, needsImprovement: 4000 },  // Time to Interactive (custom)
  };
}

/**
 * Score a Web Vital metric
 */
export function scoreWebVital(
  metric: keyof WebVitalsData,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = getWebVitalsThresholds();
  const threshold = thresholds[metric];

  if (!threshold) return 'needs-improvement';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}
