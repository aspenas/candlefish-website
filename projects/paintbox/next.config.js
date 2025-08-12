/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  reactStrictMode: false, // Disabled temporarily for compatibility

  // Image configuration - SECURED: Only allow specific domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.candlefish.ai',
      },
      {
        protocol: 'https',
        hostname: 'candlefish.ai',
      },
      {
        protocol: 'https',
        hostname: 'app.companycam.com', // Company Cam photos
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Build configuration - SECURED: Enable validation
  typescript: {
    ignoreBuildErrors: false, // Changed from true - enforce type safety
  },
  eslint: {
    ignoreDuringBuilds: false, // Changed from true - enforce linting
  },

  // Runtime configuration
  trailingSlash: false,
  compress: true,
  poweredByHeader: false,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox-api.railway.app',
  },

  // Experimental features (minimal for stability)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Static generation timeout
  staticPageGenerationTimeout: 60,

  // Basic security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ];
  },

  // Minimal webpack configuration
  webpack: (config, { isServer }) => {
    // Client-side fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        path: false,
        os: false,
        dns: false,
        http: false,
        https: false,
        buffer: false,
        url: false,
        querystring: false,
        zlib: false,
        assert: false,
        child_process: false,
        worker_threads: false,
      };
    }

    // Stub dependencies that should not be bundled client-side
    config.resolve.alias = {
      ...config.resolve.alias,
      '@aws-sdk/client-s3': require.resolve('./lib/stubs/@aws-sdk-client-s3.ts'),
      'cloudinary': require.resolve('./lib/stubs/cloudinary.ts'),
      'idb': require.resolve('./lib/stubs/idb.ts'),
    };

    // Exclude server-only modules from client bundle
    if (!isServer) {
      config.externals = config.externals || {};
      config.externals = {
        ...config.externals,
        'ioredis': 'ioredis',
        'redis': 'redis',
        'bull': 'bull',
        'nodemailer': 'nodemailer',
        'jsforce': 'jsforce',
        'sharp': 'sharp',
      };

      // Fallback for IndexedDB during SSR (already included in main fallbacks above)
    }

    return config;
  },
}

module.exports = nextConfig
