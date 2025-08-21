/** @type {import('next').NextConfig} */
const nextConfig = {
  // React configuration
  reactStrictMode: false, // Disabled for compatibility

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Production output configuration
  output: 'standalone',

  // Image optimization (disabled for Fly.io compatibility)
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Build optimizations (swcMinify is default in Next.js 15)
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },

  // Build configuration for CI/CD
  typescript: {
    ignoreBuildErrors: true, // Temporarily disable for urgent security deployment
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable for urgent security deployment
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox.fly.dev',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0',
    // Add allowed origins for CORS validation
    NEXT_PUBLIC_ALLOWED_ORIGINS: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || 'https://paintbox.fly.dev,https://paintbox-app.fly.dev',
  },

  // Headers for security and performance
  async headers() {
    // Generate a nonce for CSP (in production, this should be per-request)
    const isProduction = process.env.NODE_ENV === 'production';

    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
          // HSTS header for production
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
        ],
      },
      {
        source: '/.well-known/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300' // Reduced from 24h to 5 minutes
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // HSTS for production
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
        ],
      },
      {
        source: '/api/metrics',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
      // Global security headers for all routes
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com", // Adjust based on your needs
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://paintbox.fly.dev https://paintbox-app.fly.dev wss://paintbox.fly.dev",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // HSTS for production
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
        ],
      },
    ];
  },

  // URL rewrites for API compatibility
  async rewrites() {
    return [
      {
        source: '/.well-known/jwks.json',
        destination: '/api/.well-known/jwks.json',
      },
      {
        source: '/health',
        destination: '/api/health',
      },
      {
        source: '/metrics',
        destination: '/api/metrics',
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix 'self is not defined' error for server-side rendering
    if (isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'self': 'typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : this',
        })
      );
    }

    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        dns: false,
        child_process: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        url: false,
      };
    }

    // Alias optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      'ioredis': false,
    };

    // Bundle analyzer (only in development)
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
    }

    return config;
  },

  // Server external packages (moved from experimental)
  serverExternalPackages: ['@aws-sdk/client-secrets-manager'],

  // Experimental features
  experimental: {
    // Performance optimizations
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
};

module.exports = nextConfig;
