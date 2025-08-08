#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build for Vercel...');

// Step 1: Create minimal next.config.js
const minimalConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox-api.railway.app',
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig
`;

// Backup original config
const configPath = path.join(process.cwd(), 'next.config.js');
const backupPath = path.join(process.cwd(), 'next.config.js.backup');
fs.copyFileSync(configPath, backupPath);

// Write minimal config
fs.writeFileSync(configPath, minimalConfig);

try {
  // Step 2: Run build with optimized settings
  console.log('📦 Running Next.js build...');
  execSync('NODE_OPTIONS="--max-old-space-size=7168" next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_ENV: 'production',
    }
  });

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  // Restore original config
  fs.copyFileSync(backupPath, configPath);
  fs.unlinkSync(backupPath);
  process.exit(1);
}

// Restore original config
fs.copyFileSync(backupPath, configPath);
fs.unlinkSync(backupPath);

console.log('🎉 Build process complete!');
