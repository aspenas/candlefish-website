/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Skip static generation for heavy pages
  experimental: {
    largePageDataBytes: 512 * 1000,
    optimizePackageImports: ['@heroicons/react', 'lucide-react', 'framer-motion'],
  },

  // Disable static optimization for problematic pages
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // Skip image optimization for deployment
  images: {
    unoptimized: true,
    domains: ['localhost', 'paintbox-graphql.fly.dev'],
  },

  // Minimal webpack config
  webpack: (config, { isServer }) => {
    // Reduce bundle size
    config.optimization = {
      ...config.optimization,
      minimize: true,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    };

    // Handle node modules
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
      };
    }

    return config;
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://paintbox-graphql.fly.dev/graphql',
    NEXT_PUBLIC_GRAPHQL_WS_URL: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'wss://paintbox-graphql.fly.dev/graphql',
  },

  // Disable telemetry
  telemetry: false,
};

module.exports = nextConfig;