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
    sourcemap: process.env.NODE_ENV !== 'production',
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
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // UI libraries
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Animation libraries
            if (id.includes('@react-spring') || id.includes('gsap')) {
              return 'animations';
            }
            // Utilities
            if (id.includes('clsx') || id.includes('zod') || id.includes('date-fns')) {
              return 'utils';
            }
            // All other vendor code
            return 'vendor';
          }

          // Application code chunking
          if (id.includes('src/components/sections/v2')) {
            return 'sections-v2';
          }
          if (id.includes('src/components/sections/v1')) {
            return 'sections-v1';
          }
          if (id.includes('src/hooks')) {
            return 'hooks';
          }
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
    chunkSizeWarningLimit: 500,
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
