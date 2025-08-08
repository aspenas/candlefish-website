/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  typescript: {
    // Skip TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
  // Environment variables that will be inlined at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox-api.railway.app',
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
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
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
