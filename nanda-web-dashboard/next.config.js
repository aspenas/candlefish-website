/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['localhost', 'paintbox.fly.dev', 'paintbox-staging.fly.dev'],
  },
  env: {
    NANDA_REGISTRY_URL: process.env.NANDA_REGISTRY_URL || 'https://nanda-registry.candlefish.ai:8000',
    PAINTBOX_STAGING_URL: process.env.PAINTBOX_STAGING_URL || 'https://paintbox-staging.fly.dev',
    PAINTBOX_PRODUCTION_URL: process.env.PAINTBOX_PRODUCTION_URL || 'https://paintbox.fly.dev',
  },
  // Enable standalone output for Docker/Fly.io
  output: 'standalone',
  // Optimize for production
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Redirect configuration
  async redirects() {
    return []
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Service', value: 'NANDA-Dashboard' },
          { key: 'X-Version', value: '1.0.0' },
        ],
      },
    ]
  },
};

module.exports = nextConfig;
