import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Tyler Setup Management System',
        short_name: 'Tyler Setup',
        description: 'Comprehensive web frontend for managing Tyler\'s development environment setup',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/graphql': {
        target: 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'wss://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod',
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'apollo': ['@apollo/client'],
          'charts': ['recharts'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          'utils': ['date-fns', 'zod', 'clsx'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@apollo/client', 'graphql', 'react', 'react-dom'],
  },
});
