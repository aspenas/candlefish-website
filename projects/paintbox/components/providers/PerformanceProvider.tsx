'use client';

import { useWebVitals } from '@/hooks/useWebVitals';
import { useEffect } from 'react';

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  // Track Web Vitals and report to telemetry endpoint
  useWebVitals({
    reportToAnalytics: true,
    debug: process.env.NODE_ENV === 'development',
    onReport: (vitals) => {
      // Log TTI achievement
      if (vitals.tti && vitals.tti < 2500) {
        console.log('[Performance] ✅ TTI target achieved:', vitals.tti, 'ms');
      } else if (vitals.tti) {
        console.warn('[Performance] ⚠️ TTI target missed:', vitals.tti, 'ms (target: <2500ms)');
      }
    },
  });

  // Additional performance monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Monitor long tasks that could affect TTI
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('[Performance] Long task detected:', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              });
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });

        return () => {
          longTaskObserver.disconnect();
        };
      } catch (error) {
        console.error('Failed to setup long task observer:', error);
      }
    }
  }, []);

  return <>{children}</>;
}
