/**
 * Real-time Performance Monitoring Component
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PerformanceMonitor as PerfMonitor, checkPerformanceBudgets } from '@/utils/performance';

interface PerformanceMetrics {
  FCP: number | null; // First Contentful Paint
  LCP: number | null; // Largest Contentful Paint
  FID: number | null; // First Input Delay
  CLS: number | null; // Cumulative Layout Shift
  TTFB: number | null; // Time to First Byte
  TTI: number | null; // Time to Interactive
  memoryUsage: number | null;
  jsHeapSize: number | null;
}

interface NetworkMetrics {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export const PerformanceMonitorComponent: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    FCP: null,
    LCP: null,
    FID: null,
    CLS: null,
    TTFB: null,
    TTI: null,
    memoryUsage: null,
    jsHeapSize: null,
  });

  const [networkInfo, setNetworkInfo] = useState<NetworkMetrics>({
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
  });

  const [customMetrics, setCustomMetrics] = useState<Record<string, any>>({});
  const observerRef = useRef<PerformanceObserver | null>(null);

  // Observe Core Web Vitals
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Observe paint metrics
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, FCP: Math.round(entry.startTime) }));
            PerfMonitor.mark('FCP');
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Observe LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const lcp = Math.round(lastEntry.startTime);
          setMetrics(prev => ({ ...prev, LCP: lcp }));
          PerfMonitor.mark('LCP');
          
          // Check performance budget
          if (lcp > 2500) {
            console.warn(`⚠️ LCP exceeded budget: ${lcp}ms > 2500ms`);
          }
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-input') {
            const fid = Math.round(entry.processingStart - entry.startTime);
            setMetrics(prev => ({ ...prev, FID: fid }));
            PerfMonitor.mark('FID');
            
            // Check performance budget
            if (fid > 100) {
              console.warn(`⚠️ FID exceeded budget: ${fid}ms > 100ms`);
            }
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Observe CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            setMetrics(prev => ({ ...prev, CLS: Math.round(clsValue * 1000) / 1000 }));
          }
        }
        
        // Check performance budget
        if (clsValue > 0.1) {
          console.warn(`⚠️ CLS exceeded budget: ${clsValue} > 0.1`);
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      observerRef.current = lcpObserver;

      return () => {
        paintObserver.disconnect();
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (error) {
      console.error('Performance monitoring error:', error);
    }
  }, []);

  // Monitor navigation timing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const measureNavigationTiming = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const ttfb = Math.round(navigation.responseStart - navigation.fetchStart);
        const tti = Math.round(navigation.loadEventEnd - navigation.fetchStart);
        
        setMetrics(prev => ({
          ...prev,
          TTFB: ttfb,
          TTI: tti,
        }));

        // Check performance budgets
        if (ttfb > 600) {
          console.warn(`⚠️ TTFB exceeded budget: ${ttfb}ms > 600ms`);
        }
        if (tti > 3800) {
          console.warn(`⚠️ TTI exceeded budget: ${tti}ms > 3800ms`);
        }
      }
    };

    // Wait for page load
    if (document.readyState === 'complete') {
      measureNavigationTiming();
    } else {
      window.addEventListener('load', measureNavigationTiming);
      return () => window.removeEventListener('load', measureNavigationTiming);
    }
  }, []);

  // Monitor memory usage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1048576), // Convert to MB
          jsHeapSize: Math.round(memory.jsHeapSizeLimit / 1048576),
        }));

        // Warn if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 90) {
          console.warn(`⚠️ High memory usage: ${usagePercent.toFixed(1)}%`);
        }
      }
    };

    measureMemory();
    const interval = setInterval(measureMemory, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Monitor network information
  useEffect(() => {
    if (typeof window === 'undefined' || !('connection' in navigator)) return;

    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setNetworkInfo({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
        });

        // Adapt performance based on network
        if (connection.effectiveType === '2g' || connection.saveData) {
          console.log('📶 Slow network detected, reducing quality...');
          // Implement quality reduction logic
        }
      }
    };

    updateNetworkInfo();
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  // Custom metric tracking
  const trackCustomMetric = useCallback((name: string, value: number) => {
    PerfMonitor.mark(name);
    setCustomMetrics(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Send metrics to analytics
  useEffect(() => {
    const sendMetrics = () => {
      const allMetrics = {
        ...metrics,
        ...customMetrics,
        network: networkInfo,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      // Send to analytics service (e.g., Google Analytics, custom endpoint)
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to custom analytics endpoint
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allMetrics),
        }).catch(error => console.error('Failed to send metrics:', error));
      } else {
        console.log('📊 Performance Metrics:', allMetrics);
      }
    };

    // Send metrics every 30 seconds
    const interval = setInterval(sendMetrics, 30000);
    return () => clearInterval(interval);
  }, [metrics, customMetrics, networkInfo]);

  // Render performance indicator (only in development)
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono shadow-xl z-50 max-w-sm">
      <h3 className="text-sm font-bold mb-2">Performance Monitor</h3>
      
      {/* Core Web Vitals */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <MetricDisplay 
          label="FCP" 
          value={metrics.FCP} 
          unit="ms" 
          good={1800} 
          poor={3000} 
        />
        <MetricDisplay 
          label="LCP" 
          value={metrics.LCP} 
          unit="ms" 
          good={2500} 
          poor={4000} 
        />
        <MetricDisplay 
          label="FID" 
          value={metrics.FID} 
          unit="ms" 
          good={100} 
          poor={300} 
        />
        <MetricDisplay 
          label="CLS" 
          value={metrics.CLS} 
          unit="" 
          good={0.1} 
          poor={0.25} 
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-700">
        <MetricDisplay 
          label="TTFB" 
          value={metrics.TTFB} 
          unit="ms" 
          good={600} 
          poor={1800} 
        />
        <MetricDisplay 
          label="TTI" 
          value={metrics.TTI} 
          unit="ms" 
          good={3800} 
          poor={7300} 
        />
      </div>

      {/* Memory Usage */}
      {metrics.memoryUsage !== null && (
        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span>Memory:</span>
            <span className="text-yellow-400">
              {metrics.memoryUsage}MB / {metrics.jsHeapSize}MB
            </span>
          </div>
        </div>
      )}

      {/* Network Info */}
      <div className="pt-2 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span>Network:</span>
          <span className={getNetworkColor(networkInfo.effectiveType)}>
            {networkInfo.effectiveType} ({networkInfo.downlink}Mbps)
          </span>
        </div>
      </div>
    </div>
  );
};

// Helper component for metric display
const MetricDisplay: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  good: number;
  poor: number;
}> = ({ label, value, unit, good, poor }) => {
  const getColor = () => {
    if (value === null) return 'text-gray-500';
    if (value <= good) return 'text-green-400';
    if (value <= poor) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}:</span>
      <span className={getColor()}>
        {value !== null ? `${value}${unit}` : '-'}
      </span>
    </div>
  );
};

// Helper function for network color
const getNetworkColor = (type: string): string => {
  switch (type) {
    case '4g': return 'text-green-400';
    case '3g': return 'text-yellow-400';
    case '2g': return 'text-red-400';
    case 'slow-2g': return 'text-red-600';
    default: return 'text-gray-400';
  }
};

export default PerformanceMonitorComponent;