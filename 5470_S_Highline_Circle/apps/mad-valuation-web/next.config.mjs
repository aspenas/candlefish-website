/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  assetPrefix: '',
  basePath: ''
};
export default nextConfig;
