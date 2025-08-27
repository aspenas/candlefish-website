import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    // Compression plugins for gzip and brotli
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Bundle analyzer
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/bundle-analysis.html',
    }),
    // PWA Configuration
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.candlefish\.ai\/graphql/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'graphql-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /\.(webp|png|jpg|jpeg|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Candlefish Security Dashboard',
        short_name: 'Security Dashboard',
        description: 'Enterprise Security Monitoring Dashboard',
        theme_color: '#1976d2',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: 'hidden', // Generate but don't reference in prod
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
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core vendor chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@apollo') || id.includes('graphql')) {
              return 'apollo-graphql';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-vendor';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts-vendor';
            }
            if (id.includes('@tanstack') || id.includes('zustand')) {
              return 'state-vendor';
            }
            return 'vendor';
          }
          // Application chunks
          if (id.includes('src/pages')) {
            const pageName = id.split('src/pages/')[1].split('/')[0].split('.')[0];
            return `page-${pageName.toLowerCase()}`;
          }
          if (id.includes('src/components')) {
            return 'components';
          }
          if (id.includes('src/hooks') || id.includes('src/store')) {
            return 'app-core';
          }
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(woff2?|ttf|eot)$/i.test(assetInfo.name)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (extType === 'css') {
            return 'assets/styles/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
      external: [],
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    cssMinify: true,
    reportCompressedSize: false, // Faster builds
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@apollo/client',
      'graphql',
    ],
    exclude: [],
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.candlefish.ai wss://api.candlefish.ai",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
  },
});