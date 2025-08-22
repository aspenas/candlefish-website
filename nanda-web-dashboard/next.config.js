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
    domains: ['localhost'],
  },
  env: {
    NANDA_REGISTRY_URL: process.env.NANDA_REGISTRY_URL || 'https://nanda-registry.candlefish.ai:8000',
    PAINTBOX_STAGING_URL: process.env.PAINTBOX_STAGING_URL || 'https://paintbox-staging.fly.dev',
    PAINTBOX_PRODUCTION_URL: process.env.PAINTBOX_PRODUCTION_URL || 'https://paintbox.fly.dev',
  },
};

module.exports = nextConfig;