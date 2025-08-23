# Netlify Environment Configuration

## Required Environment Variables

Configure these environment variables in your Netlify dashboard under Site Settings > Environment Variables:

### Email Service
- `RESEND_API_KEY`: Your Resend API key for sending emails (starts with `re_`)

### API Configuration
- `NEXT_PUBLIC_CANDLEFISH_API_BASE`: Base URL for Candlefish API endpoints
  - Production: `https://api.candlefish.ai`
  - Development: `http://localhost:3001` (or your local API server)
  - Note: This is a public variable (NEXT_PUBLIC_) and will be exposed to the browser

### CORS Configuration (Optional)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
  - Default: `https://candlefish.ai,https://www.candlefish.ai,https://test.candlefish.ai`

### Build Configuration
- `NODE_VERSION`: `20` (already set in netlify.toml)
- `NPM_FLAGS`: `--production=false` (already set in netlify.toml)
- `NODE_ENV`: `production` (already set in netlify.toml)

## Deployment Setup

1. Connect your repository to Netlify
2. Set the build command to: `npm ci --include=dev && npm run export`
3. Set the publish directory to: `out/`
4. Configure the environment variables above
5. Deploy

## Functions

The following Netlify Functions are configured:
- `/api/consideration` -> `/.netlify/functions/consideration`
- `/api/contact` -> `/.netlify/functions/contact`

## Build Issues Resolved

✅ Fixed postcss-nesting dependency issue by moving to production dependencies
✅ Fixed PostCSS configuration to work with Tailwind CSS nesting
✅ Replaced hardcoded API keys with environment variables
✅ Added proper CORS configuration
✅ Ensured consistent Node.js version (20)
✅ Added proper caching headers for static assets
✅ Added proper redirects for SPA routing and API functions

## Testing Locally

To test the build locally:

```bash
npm install
npm run export
```

The output will be in the `out/` directory.
