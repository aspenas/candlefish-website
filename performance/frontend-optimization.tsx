/**
 * Frontend Performance Optimization
 * React Bundle Size and Runtime Performance
 */

import React, { lazy, Suspense, useMemo, useCallback, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

// ===========================
// 1. Code Splitting Strategy
// ===========================

/**
 * Route-based code splitting with lazy loading
 */
export const OptimizedRoutes = () => {
  // Lazy load route components
  const Dashboard = lazy(() =>
    import(/* webpackChunkName: "dashboard" */ '../pages/Dashboard')
  );

  const Analytics = lazy(() =>
    import(/* webpackChunkName: "analytics" */ '../pages/Analytics')
  );

  const Settings = lazy(() =>
    import(/* webpackChunkName: "settings" */ '../pages/Settings')
  );

  const Reports = lazy(() =>
    import(/* webpackChunkName: "reports" */ '../pages/Reports')
  );

  const Organization = lazy(() =>
    import(/* webpackChunkName: "organization" */ '../pages/Organization')
  );

  // Prefetch critical routes
  useEffect(() => {
    // Prefetch dashboard after initial load
    const timer = setTimeout(() => {
      import(/* webpackPrefetch: true */ '../pages/Dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Suspense fallback={<OptimizedLoadingScreen />}>
      <Routes>
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/analytics/*" element={<Analytics />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="/reports/*" element={<Reports />} />
        <Route path="/organization/*" element={<Organization />} />
      </Routes>
    </Suspense>
  );
};

/**
 * Component-level code splitting for heavy components
 */
export const LazyChart = lazy(() =>
  import(/* webpackChunkName: "charts" */ '../components/Charts')
    .then(module => ({ default: module.Chart }))
);

export const LazyTable = lazy(() =>
  import(/* webpackChunkName: "tables" */ '../components/Tables')
    .then(module => ({ default: module.DataTable }))
);

export const LazyEditor = lazy(() =>
  import(/* webpackChunkName: "editor" */ '../components/Editor')
    .then(module => ({ default: module.RichEditor }))
);

// ===========================
// 2. React Performance Optimizations
// ===========================

/**
 * Virtualized List for large datasets
 */
export const VirtualizedList = React.memo(({
  items,
  itemHeight = 50,
  containerHeight = 500,
  renderItem
}: {
  items: any[];
  itemHeight?: number;
  containerHeight?: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight)
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const invisibleItemsHeight = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight }}>
        <div style={{ transform: `translateY(${invisibleItemsHeight}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * Optimized Dashboard Widget with memoization
 */
export const OptimizedWidget = React.memo(({
  widgetId,
  config,
  data
}: {
  widgetId: string;
  config: any;
  data: any;
}) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    if (!data) return null;

    // Heavy data processing
    return processData(data, config);
  }, [data, config]);

  // Memoize callbacks
  const handleResize = useCallback((size: { width: number; height: number }) => {
    // Handle resize without re-rendering
    requestAnimationFrame(() => {
      updateWidgetSize(widgetId, size);
    });
  }, [widgetId]);

  const handleRefresh = useCallback(() => {
    // Debounced refresh
    debounce(() => refreshWidget(widgetId), 300)();
  }, [widgetId]);

  // Use IntersectionObserver for lazy rendering
  const [isVisible, setIsVisible] = React.useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    if (widgetRef.current) {
      observer.observe(widgetRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={widgetRef} className="widget-container">
      {isVisible ? (
        <Suspense fallback={<WidgetSkeleton />}>
          {renderWidget(processedData, config)}
        </Suspense>
      ) : (
        <WidgetPlaceholder />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.widgetId === nextProps.widgetId &&
    JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config) &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});

// ===========================
// 3. Bundle Optimization Configuration
// ===========================

export const webpackOptimization = {
  optimization: {
    // Code splitting
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor splitting
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // Common components
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        // Separate large libraries
        charts: {
          test: /[\\/]node_modules[\\/](recharts|d3|victory)[\\/]/,
          name: 'charts',
          priority: 15,
        },
        apollo: {
          test: /[\\/]node_modules[\\/](@apollo|graphql)[\\/]/,
          name: 'apollo',
          priority: 15,
        },
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|@headlessui)[\\/]/,
          name: 'ui-components',
          priority: 15,
        },
      },
    },
    // Tree shaking
    usedExports: true,
    sideEffects: false,
    // Minification
    minimize: true,
    minimizer: [
      // TerserPlugin configuration
      {
        terserOptions: {
          parse: { ecma: 8 },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log'],
          },
          mangle: { safari10: true },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
      },
    ],
  },
};

// ===========================
// 4. Image Optimization
// ===========================

/**
 * Progressive Image Loading Component
 */
export const OptimizedImage = ({
  src,
  alt,
  placeholder,
  sizes,
  ...props
}: {
  src: string;
  alt: string;
  placeholder?: string;
  sizes?: string;
  [key: string]: any;
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);
  const [isInView, setIsInView] = React.useState(false);

  useEffect(() => {
    let observer: IntersectionObserver;

    if (imageRef && !isInView) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observer.disconnect();
            }
          });
        },
        { threshold: 0.01 }
      );
      observer.observe(imageRef);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [imageRef, isInView]);

  useEffect(() => {
    if (isInView) {
      const img = new Image();
      img.src = src;
      img.onload = () => setImageSrc(src);
    }
  }, [isInView, src]);

  return (
    <picture>
      {/* WebP format for modern browsers */}
      <source
        type="image/webp"
        srcSet={`${src.replace(/\.[^.]+$/, '.webp')} 1x, ${src.replace(/\.[^.]+$/, '@2x.webp')} 2x`}
        sizes={sizes}
      />
      {/* AVIF format for next-gen browsers */}
      <source
        type="image/avif"
        srcSet={`${src.replace(/\.[^.]+$/, '.avif')} 1x, ${src.replace(/\.[^.]+$/, '@2x.avif')} 2x`}
        sizes={sizes}
      />
      {/* Fallback to original format */}
      <img
        ref={setImageRef}
        src={imageSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </picture>
  );
};

// ===========================
// 5. CSS Optimization
// ===========================

/**
 * Critical CSS extraction for above-the-fold content
 */
export const criticalCSS = `
  /* Reset and base styles */
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }

  /* Layout critical styles */
  .app-container { min-height: 100vh; display: flex; flex-direction: column; }
  .header { height: 64px; background: #fff; border-bottom: 1px solid #e5e7eb; }
  .main-content { flex: 1; display: flex; }
  .sidebar { width: 240px; background: #f9fafb; }
  .content { flex: 1; padding: 24px; }

  /* Loading states */
  .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%; animation: loading 1.5s infinite; }
  @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
`;

/**
 * CSS-in-JS optimization with emotion
 */
export const optimizedStyles = {
  // Use CSS variables for theming
  theme: {
    colors: {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      background: 'var(--color-background)',
    },
  },

  // Atomic CSS classes
  utilities: {
    '.flex': { display: 'flex' },
    '.flex-1': { flex: '1 1 0%' },
    '.grid': { display: 'grid' },
    '.hidden': { display: 'none' },
    '.relative': { position: 'relative' },
    '.absolute': { position: 'absolute' },
  },

  // Component styles with CSS containment
  components: {
    '.widget': {
      contain: 'layout style paint',
      willChange: 'transform',
    },
    '.chart-container': {
      contain: 'layout size style paint',
    },
  },
};

// ===========================
// 6. Performance Monitoring
// ===========================

/**
 * Performance monitoring HOC
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const renderStart = useRef<number>(0);

    useEffect(() => {
      renderStart.current = performance.now();

      return () => {
        const renderTime = performance.now() - renderStart.current;

        // Log slow renders
        if (renderTime > 16.67) { // More than one frame
          console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);

          // Send to analytics
          if (typeof window !== 'undefined' && window.analytics) {
            window.analytics.track('Slow Component Render', {
              component: componentName,
              renderTime,
              timestamp: new Date().toISOString(),
            });
          }
        }
      };
    });

    return <Component {...props} ref={ref} />;
  });
};

// Helper functions
function processData(data: any, config: any): any {
  // Implementation would process widget data
  return data;
}

function updateWidgetSize(widgetId: string, size: { width: number; height: number }): void {
  // Implementation would update widget size
}

function refreshWidget(widgetId: string): void {
  // Implementation would refresh widget data
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Loading components
const OptimizedLoadingScreen = () => <div className="skeleton">Loading...</div>;
const WidgetSkeleton = () => <div className="skeleton widget-skeleton" />;
const WidgetPlaceholder = () => <div className="widget-placeholder" />;

function renderWidget(data: any, config: any): React.ReactNode {
  // Implementation would render widget based on type
  return <div>Widget</div>;
}

// Type declarations for window
declare global {
  interface Window {
    analytics: {
      track: (event: string, properties: any) => void;
    };
  }
}

export default {
  OptimizedRoutes,
  VirtualizedList,
  OptimizedWidget,
  OptimizedImage,
  withPerformanceMonitoring,
};
