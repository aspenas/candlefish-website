import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-select'],
  },
  webpack: (config: any, { isServer }: any) => {
    if (isServer) {
      // Mock browser-only globals in server context
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Define self for server context
      config.plugins.push(
        new (require('webpack').DefinePlugin)({
          self: 'global',
        })
      );
    }

    // Ignore certain problematic modules
    config.externals = [
      ...(config.externals || []),
      'canvas',
      'jsdom',
    ];

    // Disable web workers in SSR
    config.module.rules.push({
      test: /\.worker\.ts$/,
      use: isServer ? 'null-loader' : 'worker-loader',
    });

    return config;
  },
  // Skip static optimization for problematic pages
  generateBuildId: async () => {
    return 'staging-' + Date.now();
  },
};

export default nextConfig;
