import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Memory optimization: Use SWC for faster builds and smaller output
  swcMinify: true,
  compress: true,

  // Optimize images
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: true,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    // Aggressive package optimization - add all heavy dependencies
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-switch',
      '@radix-ui/react-tooltip',
      '@heroicons/react',
      'framer-motion',
      'react-chartjs-2',
      'chart.js',
      '@react-pdf/renderer',
      'react-pdf',
      'xlsx-populate',
      'exceljs',
      'mathjs',
      'decimal.js',
      'lodash',
      'date-fns',
      '@sentry/nextjs',
      'jsforce',
    ],

    // Memory optimization features
    serverMinification: true,
    optimizeCss: true,

    // Reduce memory usage in production
    workerThreads: true,
    cpus: 2,

    // Advanced optimizations
    webpackBuildWorker: true,
  },

  // Module optimization
  modularizeImports: {
    '@heroicons/react': {
      transform: '@heroicons/react/24/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },

  webpack: (config: any, { dev, isServer }: any) => {
    // Production optimizations
    if (!dev) {
      // Aggressive minification
      config.optimization = {
        ...config.optimization,
        minimize: true,
        concatenateModules: true,
        sideEffects: false,
        usedExports: true,

        // Chunk splitting strategy
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            // Vendor splitting
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module: any) {
                const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)[\\/]/)?.[1];
                return `vendor-${packageName?.replace('@', '').replace('/', '-')}`;
              },
              priority: 10,
              reuseExistingChunk: true,
            },

            // Framework bundle
            framework: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
              name: 'framework',
              priority: 40,
              reuseExistingChunk: true,
            },

            // Excel engine bundle
            excel: {
              test: /[\\/](lib[\\/]excel-engine|lib[\\/]calculations|exceljs|xlsx-populate|formula-parser|mathjs|decimal\.js)[\\/]/,
              name: 'excel-engine',
              priority: 30,
              reuseExistingChunk: true,
            },

            // UI components bundle
            ui: {
              test: /[\\/](components[\\/]ui|@radix-ui|framer-motion|lucide-react|@heroicons)[\\/]/,
              name: 'ui-components',
              priority: 20,
              reuseExistingChunk: true,
            },

            // Common chunks
            commons: {
              minChunks: 2,
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Remove source maps in production
      config.devtool = false;

      // Add compression plugin
      const CompressionPlugin = require('compression-webpack-plugin');
      config.plugins.push(
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        })
      );
    }

    if (isServer) {
      // Mock browser-only globals in server context
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Externalize heavy server dependencies
      config.externals = [
        ...(config.externals || []),
        'canvas',
        'jsdom',
        '@prisma/client',
        'bcryptjs',
        'sharp',
      ];
    }

    // Memory limit for webpack
    config.performance = {
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };

    // Ignore moment locales to reduce bundle size
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );

    return config;
  },

  // Headers for caching
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Skip static optimization for problematic pages
  generateBuildId: async () => {
    return 'staging-' + Date.now();
  },
};

export default nextConfig;
