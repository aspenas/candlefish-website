/** @type {import('next').NextConfig} */
const CompressionPlugin = require('compression-webpack-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
  },
  
  // Conditionally enable static export based on environment
  ...(process.env.STATIC_EXPORT === 'true' && {
    output: 'export',
  }),
  
  trailingSlash: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Compress output
  compress: true,
  
  // Generate build ID for cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
  // Headers for compression and caching
  async headers() {
    return [
      {
        source: '/:all*(js|css|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(jpg|jpeg|png|webp|avif|svg|gif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for optimization
  webpack: (config, { dev, isServer }) => {
    // Ignore fs module for client-side builds (Three.js compatibility)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Optimize Three.js imports with tree shaking
    config.resolve.alias = {
      ...config.resolve.alias,
      three: 'three/src/Three.js', // Use source for tree-shaking
    };

    // Handle shader files
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      use: ['raw-loader'],
    });

    // Production optimizations
    if (!dev && !isServer) {
      // Replace React with Preact in production (saves ~30KB)
      if (process.env.USE_PREACT === 'true') {
        config.resolve.alias = {
          ...config.resolve.alias,
          'react': 'preact/compat',
          'react-dom': 'preact/compat',
        };
      }

      // Minification
      config.optimization = {
        ...config.optimization,
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: process.env.NODE_ENV === 'production',
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info'],
                passes: 2,
              },
              format: {
                comments: false,
              },
              mangle: {
                safari10: true,
              },
            },
            extractComments: false,
          }),
          new CssMinimizerPlugin({
            minimizerOptions: {
              preset: [
                'default',
                {
                  discardComments: { removeAll: true },
                  normalizeWhitespace: true,
                },
              ],
            },
          }),
        ],
        
        // Code splitting
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            
            // Framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            
            // Three.js chunk
            three: {
              name: 'three',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              priority: 30,
              enforce: true,
            },
            
            // Libraries chunk
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1];
                return `npm.${packageName.replace('@', '')}`;
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
            
            // Common chunk
            commons: {
              name: 'commons',
              chunks: 'initial',
              minChunks: 2,
              priority: 5,
            },
          },
        },
        
        // Runtime optimization
        runtimeChunk: {
          name: 'runtime',
        },
        
        // Module IDs
        moduleIds: 'deterministic',
      };

      // Compression plugins
      config.plugins.push(
        // Gzip compression
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg|json)$/,
          threshold: 8192,
          minRatio: 0.8,
        }),
        
        // Brotli compression (better than gzip)
        new BrotliPlugin({
          asset: '[path].br[query]',
          test: /\.(js|css|html|svg|json)$/,
          threshold: 8192,
          minRatio: 0.8,
        })
      );
    }

    return config;
  },
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    gzipSize: true,
    craCompat: true,
  },
  
  // Build optimizations
  productionBrowserSourceMaps: false,
  
  // Ignore linting during builds for speed
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Bundle analyzer (run with ANALYZE=true npm run build)
  ...(process.env.ANALYZE && {
    webpack(config) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: true,
        })
      );
      return config;
    },
  }),
};

module.exports = nextConfig;