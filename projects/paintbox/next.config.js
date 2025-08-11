/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Disable static optimization for deployment
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  typescript: {
    // Skip TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
  // Skip static optimization for deployment
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  // Environment variables that will be inlined at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox-api.railway.app',
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Force dynamic rendering for deployment
  // dynamicIO: false, // Invalid option removed
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
  // Webpack configuration to handle Node.js modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        querystring: false,
        buffer: false,
        child_process: false,
        worker_threads: false,
      };
    }

    // Add aliases for missing optional dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@aws-sdk/client-s3': require.resolve('./lib/stubs/@aws-sdk-client-s3.ts'),
      'cloudinary': require.resolve('./lib/stubs/cloudinary.ts'),
    };

    return config;
  },
}

module.exports = nextConfig
