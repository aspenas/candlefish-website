'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB, type Metric } from 'web-vitals';

interface WebVitalsData {
  cls: number | null;
  fid: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
}

interface WebVitalsState extends WebVitalsData {
  isLoading: boolean;
  lastUpdated: Date | null;
}

// Thresholds for Core Web Vitals (good, needs improvement, poor)
const VITALS_THRESHOLDS = {
  lcp: { good: 2500, needsImprovement: 4000 },
  fid: { good: 100, needsImprovement: 300 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 1800, needsImprovement: 3000 },
  ttfb: { good: 600, needsImprovement: 1500 }
};

function getVitalStatus(metric: keyof WebVitalsData, value: number | null): 'good' | 'needs-improvement' | 'poor' | 'loading' {
  if (value === null) return 'loading';
  
  const threshold = VITALS_THRESHOLDS[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function formatVitalValue(metric: keyof WebVitalsData, value: number | null): string {
  if (value === null) return 'Loading...';
  
  switch (metric) {
    case 'cls':
      return value.toFixed(3);
    case 'fcp':
    case 'lcp':
    case 'fid':
    case 'ttfb':
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
}

// Custom hook for Web Vitals monitoring
export function useWebVitals() {
  const [vitals, setVitals] = useState<WebVitalsState>({
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    isLoading: true,
    lastUpdated: null,
  });

  const updateVital = useCallback((metric: Metric) => {
    setVitals(prev => ({
      ...prev,
      [metric.name.toLowerCase()]: metric.value,
      lastUpdated: new Date(),
      isLoading: false,
    }));

    // Send to analytics if in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Google Analytics 4
      if ('gtag' in window) {
        (window as any).gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true,
        });
      }

      // Send to custom analytics endpoint
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
          delta: metric.delta,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(err => console.warn('Failed to send vitals to analytics:', err));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Web Vitals collection
    getCLS(updateVital);
    getFID(updateVital);
    getFCP(updateVital);
    getLCP(updateVital);
    getTTFB(updateVital);

    // Set loading to false after a delay if no metrics received
    const timeout = setTimeout(() => {
      setVitals(prev => ({ ...prev, isLoading: false }));
    }, 5000);

    return () => clearTimeout(timeout);
  }, [updateVital]);

  return vitals;
}

// Web Vitals display component for development
export function WebVitalsMonitor({ showInProduction = false }: { showInProduction?: boolean }) {
  const vitals = useWebVitals();

  // Only show in development unless explicitly requested
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/90 text-white text-xs font-mono p-4 rounded border border-[#3FD3C6]/30 max-w-sm">
      <div className="text-[#3FD3C6] font-bold mb-3 flex items-center gap-2">
        <span>CORE WEB VITALS</span>
        {vitals.isLoading && (
          <div className="w-2 h-2 bg-[#3FD3C6] rounded-full animate-pulse" />
        )}
      </div>
      
      <div className="space-y-2">
        {/* Largest Contentful Paint */}
        <div className="flex justify-between items-center">
          <span>LCP:</span>
          <span className={`${
            getVitalStatus('lcp', vitals.lcp) === 'good' ? 'text-green-400' :
            getVitalStatus('lcp', vitals.lcp) === 'needs-improvement' ? 'text-yellow-400' :
            getVitalStatus('lcp', vitals.lcp) === 'poor' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {formatVitalValue('lcp', vitals.lcp)}
          </span>
        </div>

        {/* First Input Delay */}
        <div className="flex justify-between items-center">
          <span>FID:</span>
          <span className={`${
            getVitalStatus('fid', vitals.fid) === 'good' ? 'text-green-400' :
            getVitalStatus('fid', vitals.fid) === 'needs-improvement' ? 'text-yellow-400' :
            getVitalStatus('fid', vitals.fid) === 'poor' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {formatVitalValue('fid', vitals.fid)}
          </span>
        </div>

        {/* Cumulative Layout Shift */}
        <div className="flex justify-between items-center">
          <span>CLS:</span>
          <span className={`${
            getVitalStatus('cls', vitals.cls) === 'good' ? 'text-green-400' :
            getVitalStatus('cls', vitals.cls) === 'needs-improvement' ? 'text-yellow-400' :
            getVitalStatus('cls', vitals.cls) === 'poor' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {formatVitalValue('cls', vitals.cls)}
          </span>
        </div>

        {/* First Contentful Paint */}
        <div className="flex justify-between items-center">
          <span>FCP:</span>
          <span className={`${
            getVitalStatus('fcp', vitals.fcp) === 'good' ? 'text-green-400' :
            getVitalStatus('fcp', vitals.fcp) === 'needs-improvement' ? 'text-yellow-400' :
            getVitalStatus('fcp', vitals.fcp) === 'poor' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {formatVitalValue('fcp', vitals.fcp)}
          </span>
        </div>

        {/* Time to First Byte */}
        <div className="flex justify-between items-center">
          <span>TTFB:</span>
          <span className={`${
            getVitalStatus('ttfb', vitals.ttfb) === 'good' ? 'text-green-400' :
            getVitalStatus('ttfb', vitals.ttfb) === 'needs-improvement' ? 'text-yellow-400' :
            getVitalStatus('ttfb', vitals.ttfb) === 'poor' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {formatVitalValue('ttfb', vitals.ttfb)}
          </span>
        </div>
      </div>

      {vitals.lastUpdated && (
        <div className="mt-3 pt-2 border-t border-[#3FD3C6]/20 text-[#415A77]">
          Last updated: {vitals.lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// Performance observer for additional metrics
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<{
    navigation?: PerformanceNavigationTiming;
    resources: PerformanceResourceTiming[];
    marks: PerformanceMark[];
    measures: PerformanceMeasure[];
  }>({
    resources: [],
    marks: [],
    measures: [],
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    // Get navigation timing
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      setMetrics(prev => ({ ...prev, navigation: navEntries[0] }));
    }

    // Performance observer for resources
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        switch (entry.entryType) {
          case 'resource':
            setMetrics(prev => ({
              ...prev,
              resources: [...prev.resources, entry as PerformanceResourceTiming].slice(-50)
            }));
            break;
          case 'mark':
            setMetrics(prev => ({
              ...prev,
              marks: [...prev.marks, entry as PerformanceMark].slice(-20)
            }));
            break;
          case 'measure':
            setMetrics(prev => ({
              ...prev,
              measures: [...prev.measures, entry as PerformanceMeasure].slice(-20)
            }));
            break;
        }
      });
    });

    observer.observe({ entryTypes: ['resource', 'mark', 'measure'] });

    return () => observer.disconnect();
  }, []);

  return metrics;
}

// Component for detailed performance analysis (development only)
export function PerformanceAnalyzer() {
  const vitals = useWebVitals();
  const metrics = usePerformanceMetrics();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const slowResources = metrics.resources
    .filter(resource => resource.duration > 1000)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/90 text-white text-xs font-mono p-4 rounded border border-[#3FD3C6]/30 max-w-lg">
      <div className="text-[#3FD3C6] font-bold mb-3">PERFORMANCE ANALYZER</div>
      
      {/* Navigation Timing */}
      {metrics.navigation && (
        <div className="mb-4">
          <div className="text-[#3FD3C6] mb-2">Navigation Timing:</div>
          <div className="pl-2 space-y-1">
            <div>DNS: {Math.round(metrics.navigation.domainLookupEnd - metrics.navigation.domainLookupStart)}ms</div>
            <div>Connect: {Math.round(metrics.navigation.connectEnd - metrics.navigation.connectStart)}ms</div>
            <div>Request: {Math.round(metrics.navigation.responseStart - metrics.navigation.requestStart)}ms</div>
            <div>Response: {Math.round(metrics.navigation.responseEnd - metrics.navigation.responseStart)}ms</div>
            <div>DOM Loading: {Math.round(metrics.navigation.domContentLoadedEventEnd - metrics.navigation.domLoading)}ms</div>
          </div>
        </div>
      )}

      {/* Slow Resources */}
      {slowResources.length > 0 && (
        <div className="mb-4">
          <div className="text-yellow-400 mb-2">Slow Resources (>1s):</div>
          <div className="pl-2 space-y-1">
            {slowResources.map((resource, index) => (
              <div key={index} className="truncate">
                <span className="text-red-400">{Math.round(resource.duration)}ms</span> - 
                <span className="text-gray-400 ml-1">
                  {resource.name.split('/').pop()?.slice(0, 30)}...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div>
        <div className="text-[#3FD3C6] mb-2">Summary:</div>
        <div className="pl-2 space-y-1">
          <div>Resources: {metrics.resources.length}</div>
          <div>Marks: {metrics.marks.length}</div>
          <div>Measures: {metrics.measures.length}</div>
          <div className="text-xs text-gray-400 mt-2">
            Overall Score: {
              vitals.lcp !== null && vitals.lcp < 2500 &&
              vitals.cls !== null && vitals.cls < 0.1 &&
              (vitals.fid === null || vitals.fid < 100)
                ? 'GOOD ✓' : 'NEEDS IMPROVEMENT ⚠'
            }
          </div>
        </div>
      </div>
    </div>
  );
}