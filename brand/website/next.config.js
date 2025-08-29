/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Conditionally enable static export based on environment
  ...(process.env.STATIC_EXPORT === 'true' && {
    output: 'export',
  }),
  trailingSlash: true,
  // Webpack configuration for Three.js and WebGL
  webpack: (config, { isServer }) => {
    // Ignore fs module for client-side builds (Three.js compatibility)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Optimize Three.js imports
    config.resolve.alias = {
      ...config.resolve.alias,
      three: 'three',
    };

    // Handle .glsl, .vert, .frag shader files
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      use: ['raw-loader'],
    });

    return config;
  },
  // Performance optimizations for static export
  experimental: {
    optimizeCss: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
