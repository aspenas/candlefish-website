import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2}'],
        runtimeCaching: [
          // Cache API responses
          {
            urlPattern: /^https:\/\/5470-inventory\.fly\.dev\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300 // 5 minutes
              },
            }
          },
          // Cache images with longer expiration
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          // Cache fonts
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              }
            }
          },
          // Cache CSS and JS files
          {
            urlPattern: /\.(?:css|js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ],
        skipWaiting: true,
        clientsClaim: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '5470 S Highline Circle Inventory',
        short_name: 'Highline Inventory',
        description: 'Professional inventory management and photo capture system with offline support',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'en-US',
        categories: ['productivity', 'business', 'utilities', 'photo'],
        screenshots: [
          {
            src: '/screenshot-mobile-1.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Photo capture interface on mobile'
          },
          {
            src: '/screenshot-desktop-1.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Inventory management on desktop'
          }
        ],
        icons: [
          {
            src: '/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Take Photos',
            short_name: 'Capture',
            description: 'Start a photo capture session',
            url: '/photos/capture',
            icons: [
              {
                src: '/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'View Inventory',
            short_name: 'Inventory',
            description: 'View inventory items',
            url: '/inventory',
            icons: [
              {
                src: '/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Scan Barcode',
            short_name: 'Scanner',
            description: 'Scan barcodes and QR codes',
            url: '/scanner',
            icons: [
              {
                src: '/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Analytics',
            short_name: 'Analytics',
            description: 'View inventory analytics',
            url: '/analytics',
            icons: [
              {
                src: '/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          }
        ],
        related_applications: [],
        prefer_related_applications: false
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4050',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          ui: ['@headlessui/react', '@heroicons/react'],
          utils: ['clsx', 'date-fns'],
          gestures: ['@use-gesture/react', 'react-spring'],
          scanner: ['html5-qrcode'],
          pwa: ['workbox-precaching', 'workbox-routing', 'workbox-strategies', 'workbox-window']
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@use-gesture/react',
      'react-spring',
      'html5-qrcode'
    ],
  },
});
