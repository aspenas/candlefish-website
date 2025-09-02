/**
 * Webpack Performance Configuration
 * Optimized for React frontend with aggressive code splitting and caching
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const WorkboxPlugin = require('workbox-webpack-plugin');
const PreloadWebpackPlugin = require('@vue/preload-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  
  entry: {
    // Main app entry
    app: './src/index.tsx',
    
    // Separate vendor bundle
    vendor: [
      'react',
      'react-dom',
      'react-router-dom',
      '@apollo/client',
      'graphql',
    ],
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction 
      ? 'js/[name].[contenthash:8].js'
      : 'js/[name].js',
    chunkFilename: isProduction
      ? 'js/[name].[contenthash:8].chunk.js'
      : 'js/[name].chunk.js',
    publicPath: '/',
    clean: true,
  },

  optimization: {
    minimize: isProduction,
    minimizer: [
      // JavaScript minification
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
            drop_console: isProduction,
            drop_debugger: isProduction,
            pure_funcs: ['console.log', 'console.info'],
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
      }),
      
      // CSS minification
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

    // Advanced code splitting
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      maxAsyncRequests: 25,
      cacheGroups: {
        // React and core libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
          name: 'react',
          priority: 40,
          enforce: true,
        },
        
        // GraphQL and Apollo
        graphql: {
          test: /[\\/]node_modules[\\/](@apollo|graphql|apollo-link|apollo-cache|apollo-utilities)[\\/]/,
          name: 'graphql',
          priority: 35,
          enforce: true,
        },
        
        // UI components library
        ui: {
          test: /[\\/]node_modules[\\/](@mui|@material-ui|@emotion)[\\/]/,
          name: 'ui',
          priority: 30,
        },
        
        // Utilities
        utils: {
          test: /[\\/]node_modules[\\/](lodash|moment|date-fns|axios)[\\/]/,
          name: 'utils',
          priority: 25,
        },
        
        // All other vendor code
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 20,
        },
        
        // Common modules used across features
        common: {
          minChunks: 2,
          priority: 10,
          reuseExistingChunk: true,
          name: 'common',
        },
        
        // Async chunks
        async: {
          test: /[\\/]src[\\/]components[\\/]/,
          chunks: 'async',
          name(module, chunks) {
            return chunks.map(chunk => chunk.name).join('~');
          },
          priority: 5,
        },
      },
    },

    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime',
    },

    // Module IDs for better caching
    moduleIds: 'deterministic',
  },

  module: {
    rules: [
      // TypeScript and JavaScript
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  useBuiltIns: 'entry',
                  corejs: 3,
                  targets: {
                    browsers: ['>0.25%', 'not dead'],
                  },
                }],
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
              plugins: [
                // Dynamic imports for code splitting
                '@babel/plugin-syntax-dynamic-import',
                
                // React optimizations
                isProduction && 'transform-react-remove-prop-types',
                isProduction && '@babel/plugin-transform-react-inline-elements',
                isProduction && '@babel/plugin-transform-react-constant-elements',
                
                // Lodash optimization
                'lodash',
              ].filter(Boolean),
              cacheDirectory: true,
            },
          },
        ],
      },

      // CSS and SCSS
      {
        test: /\.(css|scss|sass)$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: !isProduction,
              modules: {
                auto: true,
                localIdentName: isProduction
                  ? '[hash:base64:5]'
                  : '[name]__[local]--[hash:base64:5]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'postcss-preset-env',
                  'autoprefixer',
                  isProduction && 'cssnano',
                ].filter(Boolean),
              },
            },
          },
          'sass-loader',
        ],
      },

      // Images
      {
        test: /\.(png|jpg|jpeg|gif|webp|avif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },

      // SVG as React components
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader'],
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },

  plugins: [
    // HTML generation with optimizations
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: true,
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false,
    }),

    // Extract CSS
    isProduction && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css',
    }),

    // Preload critical resources
    new PreloadWebpackPlugin({
      rel: 'preload',
      as(entry) {
        if (/\.css$/.test(entry)) return 'style';
        if (/\.woff$/.test(entry)) return 'font';
        if (/\.png|jpg|jpeg|gif|webp$/.test(entry)) return 'image';
        return 'script';
      },
      include: 'initial',
      fileBlacklist: [/\.map$/, /hot-update/],
    }),

    // Prefetch async chunks
    new PreloadWebpackPlugin({
      rel: 'prefetch',
      include: 'asyncChunks',
    }),

    // Compression
    isProduction && new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),

    // Brotli compression
    isProduction && new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        level: 11,
      },
      threshold: 8192,
      minRatio: 0.8,
      filename: '[path][base].br',
    }),

    // Service Worker for offline support
    isProduction && new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 5 * 60, // 5 minutes
            },
            networkTimeoutSeconds: 3,
          },
        },
        {
          urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
          },
        },
        {
          urlPattern: /\.(woff|woff2|eot|ttf|otf)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'font-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
            },
          },
        },
      ],
    }),

    // Image optimization
    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminMinify,
        options: {
          plugins: [
            ['imagemin-gifsicle', { interlaced: true }],
            ['imagemin-mozjpeg', { progressive: true, quality: 80 }],
            ['imagemin-pngquant', { quality: [0.6, 0.8] }],
            ['imagemin-svgo', {
              plugins: [
                { name: 'removeViewBox', active: false },
              ],
            }],
          ],
        },
      },
      generator: [
        {
          type: 'asset',
          preset: 'webp-custom-name',
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: ['imagemin-webp'],
          },
        },
      ],
    }),

    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),

    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:8080'),
      'process.env.WS_URL': JSON.stringify(process.env.WS_URL || 'ws://localhost:8080'),
    }),

    // Module concatenation for smaller bundles
    new webpack.optimize.ModuleConcatenationPlugin(),

  ].filter(Boolean),

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      
      // Optimize lodash imports
      'lodash': 'lodash-es',
    },
  },

  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    hot: true,
    compress: true,
    port: 3000,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },

  // Performance hints
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000, // 500kb
  },

  // Source maps
  devtool: isProduction 
    ? 'hidden-source-map' 
    : 'eval-cheap-module-source-map',

  // Stats output
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  },
};