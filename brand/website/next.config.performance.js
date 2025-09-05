const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    
    // Remove React properties in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    
    // Remove test-id attributes
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? {
      properties: ['^data-testid$']
    } : false,
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Headers for caching and compression
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // Static assets with long cache
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // WebGL assets
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      // API routes with no cache
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  
  // Resource hints
  async rewrites() {
    return [
      // WebSocket proxy for real-time connections
      {
        source: '/ws/:path*',
        destination: process.env.WEBSOCKET_URL || 'ws://localhost:8001/:path*',
      },
    ];
  },
  
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      'framer-motion',
      'recharts',
      '@react-three/fiber',
      '@react-three/drei',
    ],
    // Enable module federation for micro-frontends
    moduleFederation: false,
    // Optimize server components
    serverComponentsExternalPackages: ['three', '@react-three/fiber'],
    // Enable incremental cache
    isrMemoryCacheSize: 100,
    // HTTP/3 support
    http3: true,
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer, webpack }) => {
    // Bundle analyzer in development
    if (process.env.ANALYZE === 'true' && !isServer) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: path.join(__dirname, '.next/bundle-analysis.html'),
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: path.join(__dirname, '.next/bundle-stats.json'),
        })
      );
    }
    
    // Production optimizations
    if (!dev && !isServer) {
      // Brotli compression
      config.plugins.push(
        new CompressionPlugin({
          filename: '[path][base].br',
          algorithm: 'brotliCompress',
          test: /\.(js|css|html|svg|json)$/,
          compressionOptions: {
            params: {
              [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11,
            },
          },
          threshold: 8192,
          minRatio: 0.8,
        })
      );
      
      // Gzip fallback
      config.plugins.push(
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg|json)$/,
          threshold: 8192,
          minRatio: 0.8,
        })
      );
      
      // Service Worker for offline support
      if (process.env.ENABLE_PWA === 'true') {
        config.plugins.push(
          new InjectManifest({
            swSrc: path.join(__dirname, 'lib/service-worker/sw.js'),
            swDest: path.join(__dirname, 'public/sw.js'),
            exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
          })
        );
      }
    }
    
    // Optimization settings
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework chunks
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Three.js chunk
          three: {
            name: 'three',
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            chunks: 'all',
            priority: 35,
            reuseExistingChunk: true,
          },
          // UI libraries
          ui: {
            name: 'ui',
            test: /[\\/]node_modules[\\/](framer-motion|@heroicons|clsx|class-variance-authority)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Data visualization
          charts: {
            name: 'charts',
            test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
            chunks: 'async',
            priority: 25,
          },
          // Common modules
          commons: {
            name: 'commons',
            minChunks: 2,
            chunks: 'async',
            priority: 20,
            reuseExistingChunk: true,
          },
          // App code
          app: {
            name: 'app',
            test: /[\\/](components|lib|hooks|utils)[\\/]/,
            chunks: 'all',
            priority: 15,
            minSize: 0,
          },
        },
      },
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: process.env.NODE_ENV === 'production',
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info'],
              passes: 2,
              toplevel: true,
              pure_getters: true,
              unsafe: true,
              unsafe_comps: true,
              unsafe_math: true,
              unsafe_proto: true,
              unsafe_regexp: true,
            },
            mangle: {
              safari10: true,
              toplevel: true,
            },
            format: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
          parallel: true,
        }),
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
                normalizeUnicode: false,
              },
            ],
          },
        }),
      ],
    };
    
    // Three.js optimizations
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three/examples/jsm/postprocessing/EffectComposer':
          'three/examples/jsm/postprocessing/EffectComposer.js',
        'three/examples/jsm/postprocessing/RenderPass':
          'three/examples/jsm/postprocessing/RenderPass.js',
        // Use smaller Three.js builds
        'three$': 'three/build/three.min.js',
      };
      
      // Tree-shake Three.js
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^three$/,
          require.resolve('three/build/three.module.js')
        )
      );
      
      // Fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    
    // Shader support
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    });
    
    // Web Workers support
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          inline: 'fallback',
          filename: 'static/[hash].worker.js',
        },
      },
    });
    
    // Define environment variables
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'process.env.NEXT_PUBLIC_BUILD_ID': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || 'local'),
      })
    );
    
    return config;
  },
  
  // Output configuration
  output: process.env.STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Trailing slashes for better caching
  trailingSlash: true,
  
  // PoweredBy header removal
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Generate build ID based on git commit
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`;
  },
  
  // Performance monitoring
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
  },
};

module.exports = nextConfig;