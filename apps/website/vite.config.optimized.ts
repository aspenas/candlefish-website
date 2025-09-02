import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import viteImagemin from 'vite-plugin-imagemin'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // React with automatic JSX runtime for smaller bundles
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          // Remove PropTypes in production
          process.env.NODE_ENV === 'production' && [
            'babel-plugin-transform-react-remove-prop-types',
            { removeImport: true }
          ]
        ].filter(Boolean)
      }
    }),
    
    // Split vendor chunks intelligently
    splitVendorChunkPlugin(),
    
    // Legacy browser support (optional - can save bundle size if not needed)
    process.env.LEGACY_SUPPORT && legacy({
      targets: ['defaults', 'not IE 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
    
    // PWA support for better caching
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    
    // Image optimization
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9] },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: true }
        ]
      }
    }),
    
    // Brotli compression for better performance
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Compress files > 1KB
      deleteOriginFile: false,
      compressionOptions: {
        level: 11 // Maximum compression
      }
    }),
    
    // Gzip compression as fallback
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
      compressionOptions: {
        level: 9 // Maximum compression
      }
    }),
    
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'sunburst' // Better visualization
    })
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Optimize React for production
      ...(process.env.NODE_ENV === 'production' && {
        'react': 'preact/compat',
        'react-dom': 'preact/compat'
      })
    },
  },
  
  build: {
    target: 'es2018', // More modern target for smaller output
    outDir: 'dist',
    sourcemap: false, // Disable in production for smaller builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 3, // More passes for better compression
        ecma: 2018,
        toplevel: true,
        unsafe: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        unused: true,
        dead_code: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        if_return: true,
        join_vars: true,
        reduce_vars: true
      },
      mangle: {
        safari10: true,
        toplevel: true,
        properties: {
          regex: /^_/ // Mangle private properties
        }
      },
      format: {
        comments: false,
        ascii_only: true
      }
    },
    
    rollupOptions: {
      output: {
        // Optimize chunk names for caching
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
            return `fonts/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        
        // Advanced manual chunks for optimal caching
        manualChunks: (id) => {
          // Node modules chunking strategy
          if (id.includes('node_modules')) {
            // Core React - smallest possible chunk
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler')) {
              return 'react-core';
            }
            
            // Heavy 3D libraries - lazy load these
            if (id.includes('three') || id.includes('@react-three') || id.includes('drei')) {
              return 'vendor-3d';
            }
            
            // Animation libraries - consider lazy loading
            if (id.includes('framer-motion') || id.includes('gsap') || id.includes('react-spring')) {
              return 'vendor-animation';
            }
            
            // Router - essential
            if (id.includes('react-router')) {
              return 'router';
            }
            
            // UI components - potentially lazy load
            if (id.includes('lucide-react') || id.includes('@radix-ui') || id.includes('headlessui')) {
              return 'vendor-ui';
            }
            
            // State management
            if (id.includes('zustand') || id.includes('redux') || id.includes('recoil')) {
              return 'vendor-state';
            }
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('formik')) {
              return 'vendor-forms';
            }
            
            // Date utilities
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
              return 'vendor-date';
            }
            
            // HTTP clients
            if (id.includes('axios') || id.includes('ky') || id.includes('graphql')) {
              return 'vendor-http';
            }
            
            // Utilities - small, frequently used
            if (id.includes('clsx') || id.includes('classnames') || id.includes('lodash')) {
              return 'vendor-utils';
            }
            
            // Everything else
            return 'vendor-misc';
          }
          
          // Application code chunking
          // Pages - split by route for lazy loading
          if (id.includes('src/pages/') || id.includes('src/routes/')) {
            const match = id.match(/src\/(pages|routes)\/([^/]+)/);
            if (match) {
              return `page-${match[2]}`;
            }
          }
          
          // Features - split by feature
          if (id.includes('src/features/')) {
            const match = id.match(/src\/features\/([^/]+)/);
            if (match) {
              return `feature-${match[1]}`;
            }
          }
          
          // Heavy components - separate chunks
          if (id.includes('AIVisualization') || id.includes('NeuralNetwork') || 
              id.includes('Particle') || id.includes('Canvas') || id.includes('Chart')) {
            return 'components-heavy';
          }
          
          // Shared components
          if (id.includes('src/components')) {
            return 'components-shared';
          }
          
          // Hooks and utilities
          if (id.includes('src/hooks') || id.includes('src/utils')) {
            return 'app-utils';
          }
          
          // Styles
          if (id.includes('src/styles')) {
            return 'styles';
          }
        }
      },
      
      // External dependencies (for libraries)
      external: process.env.BUILD_LIB ? [
        'react',
        'react-dom',
        'react/jsx-runtime'
      ] : [],
      
      // Tree-shaking optimizations
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false
      },
      
      // Optimize module loading
      experimentalLogSideEffects: false,
      perf: true
    },
    
    // Performance optimizations
    reportCompressedSize: false,
    chunkSizeWarningLimit: 200, // Stricter limit
    
    // CSS optimizations
    cssCodeSplit: true,
    cssMinify: 'lightningcss', // Faster and more efficient than default
    
    // Asset optimizations
    assetsInlineLimit: 4096, // Inline assets < 4kb
    
    // Module preload
    modulePreload: {
      polyfill: false // Smaller output
    },
    
    // Workers
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          entryFileNames: 'workers/[name]-[hash].js'
        }
      }
    }
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ],
    exclude: [
      '@vite/client',
      '@vite/env'
    ],
    esbuildOptions: {
      target: 'es2018',
      define: {
        global: 'globalThis'
      }
    }
  },
  
  // Development optimizations
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: true
    },
    fs: {
      strict: false
    },
    // Prebundle dependencies for faster cold start
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx'
      ]
    }
  },
  
  preview: {
    port: 3000,
    host: true,
    compression: true
  },
  
  // Define global constants for dead code elimination
  define: {
    __DEV__: process.env.NODE_ENV !== 'production',
    __PROD__: process.env.NODE_ENV === 'production',
    __TEST__: process.env.NODE_ENV === 'test'
  },
  
  // Enable build cache for faster builds
  cacheDir: 'node_modules/.vite',
  
  // JSON optimization
  json: {
    namedExports: true,
    stringify: false
  }
})