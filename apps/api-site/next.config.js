/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['@candlefish-ai/shared', 'lucide-react', 'swagger-ui-react'],
  },
  images: {
    domains: ['candlefish.ai', 'api.candlefish.ai'],
  },
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      },
      {
        source: '/openapi.json',
        destination: process.env.OPENAPI_SPEC_URL || 'http://localhost:4000/openapi.json',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    // Handle swagger-ui-react CSS imports
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    })
    return config
  },
}

module.exports = nextConfig