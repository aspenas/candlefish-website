import { lazy, Suspense, ComponentType } from 'react';
import React from 'react';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Error boundary for lazy-loaded components
class LazyBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
              Failed to load component
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced lazy loading with retry logic
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  });
}

// Wrapper component for lazy-loaded components
export function withLazyLoading<P extends object>(
  Component: React.LazyExoticComponent<ComponentType<P>>,
  fallback?: React.ReactNode
) {
  return (props: P) => (
    <LazyBoundary fallback={fallback}>
      <Suspense fallback={fallback || <LoadingFallback />}>
        <Component {...props} />
      </Suspense>
    </LazyBoundary>
  );
}

// Preload component for better UX
export function preloadComponent(
  importFn: () => Promise<any>
): void {
  // Start loading the component in the background
  importFn().catch(error => {
    console.error('Failed to preload component:', error);
  });
}

// Intersection Observer based lazy loading
export function lazyLoadOnVisible<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: IntersectionObserverInit
): React.FC<any> {
  const LazyComponent = lazy(importFn);

  return (props: any) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        },
        options || {
          rootMargin: '100px',
          threshold: 0.1,
        }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      };
    }, []);

    return (
      <div ref={ref}>
        {isVisible ? (
          <Suspense fallback={<LoadingFallback />}>
            <LazyComponent {...props} />
          </Suspense>
        ) : (
          <div className="min-h-[400px]" />
        )}
      </div>
    );
  };
}

// Route-based code splitting helper
export const lazyRoutes = {
  Dashboard: lazyWithRetry(() => import('../pages/Dashboard')),
  Inventory: lazyWithRetry(() => import('../pages/Inventory')),
  Analytics: lazyWithRetry(() => import('../pages/Analytics')),
  Insights: lazyWithRetry(() => import('../pages/Insights')),
  ItemDetail: lazyWithRetry(() => import('../pages/ItemDetail')),
  BuyerView: lazyWithRetry(() => import('../pages/BuyerView')),
  Settings: lazyWithRetry(() => import('../pages/Settings')),
};

// Prefetch routes for better navigation performance
export function prefetchRoute(routeName: keyof typeof lazyRoutes): void {
  const route = lazyRoutes[routeName];
  if (route) {
    // Trigger the lazy loading
    route._init?.();
  }
}

// Bundle size analyzer helper
export function measureBundleImpact(componentName: string): void {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();

    console.group(`📦 Bundle Impact: ${componentName}`);
    console.time('Load time');

    // Log when component is loaded
    requestIdleCallback(() => {
      console.timeEnd('Load time');
      const loadTime = performance.now() - startTime;

      console.log(`Component loaded in ${loadTime.toFixed(2)}ms`);

      // Estimate bundle size impact (rough estimate)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log(`Memory usage: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
      }

      console.groupEnd();
    });
  }
}
