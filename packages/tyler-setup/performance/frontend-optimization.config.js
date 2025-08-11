// Tyler Setup Frontend Performance Optimization Configuration
// Comprehensive webpack and build optimizations

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import viteImagemin from 'vite-plugin-imagemin';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import path from 'path';

/**
 * Frontend Performance Optimization Configuration
 * Target: Bundle size < 500KB, Load time < 3s
 */
export default defineConfig({
  plugins: [
    // React with SWC for faster builds
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
        ],
      },
    }),

    // PWA for offline support and caching
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Tyler Setup Management',
        short_name: 'Tyler Setup',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 604800, // 1 week
              },
            },
          },
          {
            urlPattern: /\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400, // 1 day
              },
            },
          },
        ],
        // Precache critical assets
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp}',
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),

    // Compression plugins
    compression({
      algorithm: 'gzip',
      threshold: 1024,
      deleteOriginalAssets: false,
      include: /\.(js|css|html|svg|json)$/,
    }),
    compression({
      algorithm: 'brotliCompress',
      threshold: 1024,
      deleteOriginalAssets: false,
      include: /\.(js|css|html|svg|json)$/,
    }),

    // Image optimization
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 85,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: true },
        ],
      },
      webp: {
        quality: 85,
      },
    }),

    // HTML minification
    ViteMinifyPlugin({
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
    }),

    // Bundle analyzer
    visualizer({
      open: false,
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },

  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2,
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
        ecma: 2020,
      },
    },

    // Rollup optimizations
    rollupOptions: {
      output: {
        // Manual chunks for optimal caching
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }

          // Apollo GraphQL
          if (id.includes('@apollo') || id.includes('graphql')) {
            return 'apollo';
          }

          // UI components
          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'ui';
          }

          // Charts and data visualization
          if (id.includes('recharts') || id.includes('d3')) {
            return 'charts';
          }

          // Forms and validation
          if (id.includes('react-hook-form') || id.includes('zod')) {
            return 'forms';
          }

          // Utilities
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind')) {
            return 'utils';
          }

          // Tables
          if (id.includes('@tanstack/react-table')) {
            return 'tables';
          }

          // All other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },

        // Asset naming for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }

          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }

          return `assets/[name]-[hash][extname]`;
        },

        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },

      // Tree shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },

    // CSS optimizations
    cssCodeSplit: true,
    cssMinify: true,

    // Source maps only in development
    sourcemap: process.env.NODE_ENV !== 'production',

    // Chunk size warnings
    chunkSizeWarningLimit: 500,

    // Asset inlining threshold
    assetsInlineLimit: 4096, // 4kb
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      '@apollo/client',
      'graphql',
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
      'recharts',
      'date-fns',
      'zod',
      'clsx',
    ],
    exclude: [],
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'globalThis',
      },
    },
  },

  // Server configuration for development
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://api.tyler-setup.candlefish.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/graphql': {
        target: process.env.VITE_GRAPHQL_URL || 'https://graphql.tyler-setup.candlefish.ai',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'wss://ws.tyler-setup.candlefish.ai',
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },

  // Preview server configuration
  preview: {
    port: 3001,
    host: true,
  },

  // Environment variable prefix
  envPrefix: 'VITE_',

  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});

/**
 * Additional webpack configuration for advanced optimizations
 */
export const webpackOptimizations = {
  // Module federation for micro-frontends
  moduleFederation: {
    name: 'tylerSetup',
    filename: 'remoteEntry.js',
    exposes: {
      './Dashboard': './src/components/dashboard/Dashboard',
      './UserManagement': './src/pages/users/Users',
      './ContractorManagement': './src/pages/contractors/Contractors',
      './SecretsManagement': './src/pages/secrets/Secrets',
    },
    shared: {
      react: { singleton: true, requiredVersion: '^18.2.0' },
      'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      '@apollo/client': { singleton: true },
    },
  },

  // Advanced optimization plugins
  plugins: [
    // Preload critical chunks
    {
      name: 'preload-critical-chunks',
      apply: (compiler) => {
        compiler.hooks.compilation.tap('PreloadPlugin', (compilation) => {
          compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync(
            'PreloadPlugin',
            (data, callback) => {
              const criticalChunks = ['react', 'apollo', 'ui'];

              data.assetTags.styles.forEach((tag) => {
                if (criticalChunks.some(chunk => tag.attributes.href.includes(chunk))) {
                  tag.attributes.rel = 'preload';
                  tag.attributes.as = 'style';
                }
              });

              data.assetTags.scripts.forEach((tag) => {
                if (criticalChunks.some(chunk => tag.attributes.src.includes(chunk))) {
                  const preloadTag = {
                    tagName: 'link',
                    attributes: {
                      rel: 'preload',
                      as: 'script',
                      href: tag.attributes.src,
                    },
                  };
                  data.assetTags.styles.unshift(preloadTag);
                }
              });

              callback(null, data);
            }
          );
        });
      },
    },

    // Resource hints for better performance
    {
      name: 'resource-hints',
      apply: (compiler) => {
        compiler.hooks.compilation.tap('ResourceHints', (compilation) => {
          compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapAsync(
            'ResourceHints',
            (data, callback) => {
              // DNS prefetch for API domains
              data.assets.dns = [
                'api.tyler-setup.candlefish.ai',
                'graphql.tyler-setup.candlefish.ai',
                'ws.tyler-setup.candlefish.ai',
              ];

              // Preconnect to critical origins
              data.assets.preconnect = [
                'https://api.tyler-setup.candlefish.ai',
                'https://fonts.googleapis.com',
              ];

              callback(null, data);
            }
          );
        });
      },
    },
  ],

  // Performance budgets
  performance: {
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 256000, // 250KB
    hints: 'error',
    assetFilter: (assetFilename) => {
      return !/(\.map$)|(^(main\.|favicon\.))/.test(assetFilename);
    },
  },
};

/**
 * Critical CSS extraction configuration
 */
export const criticalCSSConfig = {
  // Inline critical CSS
  inline: true,

  // Extract critical CSS for above-the-fold content
  extract: true,

  // Viewport dimensions for critical CSS
  dimensions: [
    { width: 375, height: 667 },  // Mobile
    { width: 768, height: 1024 }, // Tablet
    { width: 1920, height: 1080 }, // Desktop
  ],

  // Pages to extract critical CSS from
  pages: [
    '/',
    '/dashboard',
    '/users',
    '/contractors',
    '/secrets',
  ],

  // Minify critical CSS
  minify: true,

  // Ignore certain CSS rules
  ignore: {
    atrule: ['@font-face'],
    rule: [/\.no-critical/],
  },
};
