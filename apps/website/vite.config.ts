import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Brotli compression for better performance
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false
    }),
    // Gzip compression as fallback
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
      deleteOriginFile: false
    }),
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        // Optimize chunk names for caching
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',

        // Advanced manual chunks for optimal caching
        manualChunks: (id) => {
          // Node modules chunking strategy
          if (id.includes('node_modules')) {
            // Three.js and 3D libraries - separate heavy 3D deps
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            // React ecosystem core
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-core';
            }
            // React ecosystem extensions
            if (id.includes('react-') && !id.includes('react-three')) {
              return 'react-vendor';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // Framer Motion - separate animation library
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // GSAP animations
            if (id.includes('gsap')) {
              return 'gsap';
            }
            // React Spring animations
            if (id.includes('@react-spring') || id.includes('react-spring')) {
              return 'react-spring';
            }
            // UI libraries
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Utilities
            if (id.includes('clsx') || id.includes('zod') || id.includes('class-variance')) {
              return 'utils';
            }
            // All other vendor code
            return 'vendor';
          }

          // Application code chunking
          // AI Visualization components - separate heavy components
          if (id.includes('AIVisualization') || id.includes('NeuralNetwork') || id.includes('AIAnimation')) {
            return 'ai-visualizations';
          }
          // Particle effects
          if (id.includes('Particle')) {
            return 'particle-effects';
          }
          // Section components
          if (id.includes('src/components/sections')) {
            return 'sections';
          }
          // Common components
          if (id.includes('src/components')) {
            return 'components';
          }
          // Hooks
          if (id.includes('src/hooks')) {
            return 'hooks';
          }
          // Utils
          if (id.includes('src/utils')) {
            return 'app-utils';
          }
        }
      },
      // Tree-shaking optimizations
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: 'no-external'
      }
    },
    // Performance optimizations
    reportCompressedSize: false,
    chunkSizeWarningLimit: 250,
    // CSS optimizations
    cssCodeSplit: true,
    cssMinify: true,
    // Asset optimizations
    assetsInlineLimit: 4096, // Inline assets < 4kb
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@vite/client', '@vite/env']
  },
  server: {
    port: 3000,
    host: true,
    // Enable HMR with better performance
    hmr: {
      overlay: true
    },
    // Optimize for development
    fs: {
      strict: false
    }
  },
  preview: {
    port: 3000,
    host: true,
    // Enable compression in preview
    compression: true
  }
})
