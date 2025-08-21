/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // output: 'export', // Commented out to enable API routes for PDF generation
}

module.exports = nextConfig
