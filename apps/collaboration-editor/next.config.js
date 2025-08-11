/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['localhost', 'api.candlefish.ai'],
    formats: ['image/webp', 'image/avif'],
  },
  env: {
    NEXT_PUBLIC_GRAPHQL_HTTP_URL: process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL || 'http://localhost:4000/graphql',
    NEXT_PUBLIC_GRAPHQL_WS_URL: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
