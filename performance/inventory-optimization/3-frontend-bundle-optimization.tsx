/**
 * Frontend Bundle Size Optimization with Code Splitting and Tree Shaking
 * Implements lazy loading, dynamic imports, and optimized React components
 */

import React, { lazy, Suspense, memo, useCallback, useMemo, useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Webpack configuration for optimal bundling
export const webpackOptimizationConfig = {
  optimization: {
    usedExports: true, // Tree shaking
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module: any) {
            // Create separate vendor chunks for major libraries
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `vendor.${packageName.replace('@', '')}`;
          },
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 1,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
    moduleIds: 'deterministic',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false, // Preserve ES modules for tree shaking
                targets: {
                  browsers: ['last 2 versions', 'not dead', '> 0.2%'],
                },
              }],
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              ['@babel/plugin-transform-runtime', { corejs: 3 }],
              'babel-plugin-transform-imports', // Optimize material-ui imports
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: false,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['postcss-import', {}],
                  ['tailwindcss', {}],
                  ['autoprefixer', {}],
                  ['cssnano', { // CSS minification
                    preset: ['default', {
                      discardComments: { removeAll: true },
                      normalizeWhitespace: true,
                    }],
                  }],
                ],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
      analyzerMode: 'static',
      openAnalyzer: false,
      generateStatsFile: true,
    }),
    new (require('compression-webpack-plugin'))({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    new (require('terser-webpack-plugin'))({
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
        mangle: {
          safari10: true,
        },
        output: {
          ecma: 5,
          comments: false,
          ascii_only: true,
        },
      },
    }),
  ],
};

// Vite configuration for optimal bundling
export const viteOptimizationConfig = {
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'chart-vendor': ['recharts', 'd3'],
          'utility-vendor': ['lodash-es', 'date-fns', 'axios'],
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@vite/client', '@vite/env'],
  },
};

// Lazy-loaded components with proper loading states
const InventoryDashboard = lazy(() =>
  import(/* webpackChunkName: "inventory-dashboard" */ './components/InventoryDashboard')
);

const InventoryList = lazy(() =>
  import(/* webpackChunkName: "inventory-list" */ './components/InventoryList')
);

const ItemDetails = lazy(() =>
  import(/* webpackChunkName: "item-details" */ './components/ItemDetails')
);

const Analytics = lazy(() =>
  import(/* webpackChunkName: "analytics" */ './components/Analytics')
);

const Settings = lazy(() =>
  import(/* webpackChunkName: "settings" */ './components/Settings')
);

// Loading component with skeleton UI
const LoadingFallback: React.FC<{ type?: string }> = memo(({ type = 'default' }) => {
  return (
    <div className="animate-pulse">
      {type === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      )}
      {type === 'list' && (
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      )}
      {type === 'default' && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
});

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
};

// Optimized main app component with route-based code splitting
export const OptimizedInventoryApp: React.FC = () => {
  const [route, setRoute] = useState('dashboard');

  // Memoized route component
  const routeComponent = useMemo(() => {
    switch (route) {
      case 'dashboard':
        return <InventoryDashboard />;
      case 'list':
        return <InventoryList />;
      case 'details':
        return <ItemDetails />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <InventoryDashboard />;
    }
  }, [route]);

  // Preload components on hover
  const preloadComponent = useCallback((componentName: string) => {
    switch (componentName) {
      case 'list':
        import('./components/InventoryList');
        break;
      case 'analytics':
        import('./components/Analytics');
        break;
      case 'settings':
        import('./components/Settings');
        break;
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation with preloading */}
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-8">
              {['dashboard', 'list', 'analytics', 'settings'].map(item => (
                <button
                  key={item}
                  onClick={() => setRoute(item)}
                  onMouseEnter={() => preloadComponent(item)}
                  className={`py-4 px-2 text-sm font-medium ${
                    route === item ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main content with lazy loading */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<LoadingFallback type={route} />}>
            {routeComponent}
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
};

// Optimized image component with lazy loading
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}> = memo(({ src, alt, className = '', loading = 'lazy' }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (loading === 'lazy') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.disconnect();
            }
          });
        },
        { rootMargin: '50px' }
      );

      const img = document.getElementById(`img-${src}`);
      if (img) observer.observe(img);

      return () => observer.disconnect();
    } else {
      setImageSrc(src);
    }
  }, [src, loading]);

  return (
    <div id={`img-${src}`} className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded"></div>
      )}
      {error ? (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded">
          <span className="text-gray-400">Failed to load image</span>
        </div>
      ) : (
        imageSrc && (
          <img
            src={imageSrc}
            alt={alt}
            className={className}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError(true);
            }}
            loading={loading}
          />
        )
      )}
    </div>
  );
});

// Virtual scrolling component for large lists
export const VirtualList: React.FC<{
  items: any[];
  itemHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  containerHeight?: number;
}> = memo(({ items, itemHeight, renderItem, containerHeight = 600 }) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
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

// Service worker for asset caching
export const serviceWorkerScript = `
// Service Worker for inventory app
const CACHE_NAME = 'inventory-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Cache successful responses
              if (event.request.method === 'GET') {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`;

// Next.js specific optimizations
export const nextConfigOptimizations = {
  swcMinify: true,
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', '@mui/material', '@mui/icons-material'],
  },
  webpack: (config: any, { dev, isServer }: any) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            lib: {
              test(module: any) {
                return module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier());
              },
              name(module: any) {
                const hash = require('crypto').createHash('sha1');
                hash.update(module.identifier());
                return hash.digest('hex').substring(0, 8);
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
            shared: {
              name(module: any, chunks: any) {
                return require('crypto')
                  .createHash('sha1')
                  .update(chunks.reduce((acc: string, chunk: any) => acc + chunk.name, ''))
                  .digest('hex');
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};
