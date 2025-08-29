import { useEffect, useCallback } from 'react';
import { performanceMonitor } from '../monitoring/performance-monitor';

export interface UsePerformanceMonitoringOptions {
  enabled?: boolean;
  reportInterval?: number; // in milliseconds
  routeChange?: boolean; // track route changes
}

export const usePerformanceMonitoring = (options: UsePerformanceMonitoringOptions = {}) => {
  const {
    enabled = true,
    reportInterval = 30000, // 30 seconds
    routeChange = true
  } = options;

  // Track component mount/unmount performance
  const trackComponentMount = useCallback((componentName: string) => {
    if (!enabled) return;
    performanceMonitor.markInteraction(`component-mount-${componentName}`);
  }, [enabled]);

  const trackComponentUnmount = useCallback((componentName: string) => {
    if (!enabled) return;
    performanceMonitor.measureInteraction(`component-mount-${componentName}`);
  }, [enabled]);

  // Track user interactions
  const trackInteraction = useCallback((interactionName: string) => {
    if (!enabled) return;
    performanceMonitor.markInteraction(interactionName);
  }, [enabled]);

  const measureInteraction = useCallback((interactionName: string) => {
    if (!enabled) return;
    performanceMonitor.measureInteraction(interactionName);
  }, [enabled]);

  // Report current metrics
  const reportMetrics = useCallback(() => {
    if (!enabled) return;
    performanceMonitor.reportMetrics();
  }, [enabled]);

  // Get session ID
  const getSessionId = useCallback(() => {
    return performanceMonitor.getSessionId();
  }, []);

  // Set up periodic reporting
  useEffect(() => {
    if (!enabled || !reportInterval) return;

    const intervalId = setInterval(() => {
      performanceMonitor.reportMetrics();
    }, reportInterval);

    return () => clearInterval(intervalId);
  }, [enabled, reportInterval]);

  // Track route changes if enabled
  useEffect(() => {
    if (!enabled || !routeChange) return;

    const handleRouteChange = () => {
      // Small delay to let the route change complete
      setTimeout(() => {
        performanceMonitor.reportMetrics();
      }, 100);
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleRouteChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleRouteChange();
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [enabled, routeChange]);

  return {
    trackComponentMount,
    trackComponentUnmount,
    trackInteraction,
    measureInteraction,
    reportMetrics,
    getSessionId,
    enabled
  };
};

// Hook for tracking specific component lifecycle
export const useComponentPerformance = (componentName: string, enabled = true) => {
  const { trackComponentMount, trackComponentUnmount } = usePerformanceMonitoring({ enabled });

  useEffect(() => {
    if (!enabled) return;
    
    trackComponentMount(componentName);
    
    return () => {
      trackComponentUnmount(componentName);
    };
  }, [componentName, enabled, trackComponentMount, trackComponentUnmount]);
};

// Hook for tracking API calls
export const useApiPerformance = () => {
  const trackApiCall = useCallback((operationName: string, startTime?: number) => {
    const start = startTime || performance.now();
    
    return {
      complete: (success: boolean = true) => {
        const duration = performance.now() - start;
        
        // Report API performance
        if (navigator.sendBeacon && import.meta.env.VITE_API_PERFORMANCE_ENDPOINT) {
          const data = JSON.stringify({
            type: 'api-call',
            operationName,
            duration,
            success,
            timestamp: new Date().toISOString(),
            sessionId: performanceMonitor.getSessionId()
          });
          
          navigator.sendBeacon(import.meta.env.VITE_API_PERFORMANCE_ENDPOINT, data);
        }
        
        return duration;
      }
    };
  }, []);

  return { trackApiCall };
};