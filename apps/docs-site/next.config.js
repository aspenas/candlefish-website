/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  trailingSlash: true,
  experimental: {
    optimizePackageImports: ['@candlefish-ai/shared', 'lucide-react'],
  },
  images: {
    domains: ['candlefish.ai', 'docs.candlefish.ai'],
  },
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: process.env.GRAPHQL_ENDPOINT || 'https://api.candlefish.ai/graphql',
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
}

module.exports = nextConfig
