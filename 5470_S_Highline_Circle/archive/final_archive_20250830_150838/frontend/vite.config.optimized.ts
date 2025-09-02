import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }) as any,
  ],
  server: {
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3050,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimize bundle splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'ui-vendor': ['@headlessui/react', '@heroicons/react', 'clsx'],
          // Data fetching and state
          'data-vendor': ['@tanstack/react-query', 'axios', 'zustand'],
          // Charts - largest dependency
          'charts': ['recharts', 'react-chartjs-2', 'chart.js'],
          // Forms
          'forms': ['react-hook-form'],
          // Utilities
          'utils': ['date-fns', 'react-hot-toast'],
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-${facadeModuleId}-[hash].js`;
        },
      },
    },
    // Increase chunk size warning limit since we're code splitting
    chunkSizeWarningLimit: 1000,
    // Optimize CSS
    cssCodeSplit: true,
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
    // Asset optimization
    assetsInlineLimit: 4096,
    // Report compressed size
    reportCompressedSize: true,
  },
  optimizeDeps: {
    // Pre-bundle heavy dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'recharts',
      'chart.js',
      'axios',
      'date-fns',
    ],
    // Exclude rarely used dependencies
    exclude: [],
  },
  // Enable caching
  cacheDir: 'node_modules/.vite',
});