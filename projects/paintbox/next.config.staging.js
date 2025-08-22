/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Ensure API routes work
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  // Skip problematic optimizations
  swcMinify: false,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
