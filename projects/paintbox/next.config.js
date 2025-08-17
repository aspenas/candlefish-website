/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,

  // Force server-side rendering only
  output: 'standalone',

  // Skip image optimization completely
  images: {
    unoptimized: true,
  },

  // Minimal build configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Basic environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox-api.railway.app',
  },

  // Minimal webpack config
  webpack: (config, { isServer }) => {
    // Ensure dev uses webpack, not Turbopack
    config.experiments = {
      ...config.experiments,
    };
    // Only apply fallbacks for client-side builds
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

    // Ignore ioredis on client side
    config.resolve.alias = {
      ...config.resolve.alias,
      'ioredis': false,
    };

    return config;
  },
};

module.exports = nextConfig;
