# 🎨 Paintbox Netlify Deployment Guide

## Overview

Paintbox will be deployed as a static site on Netlify with API functions for lightweight operations. Complex backend operations will need a separate backend service.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Netlify      │────▶│   Backend API   │────▶│   Database/     │
│  (Static Site)  │     │  (Railway/etc)  │     │     Redis       │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Step 1: Deploy to Netlify

### Option A: Deploy with Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from paintbox directory
cd projects/paintbox
netlify deploy --prod
```

### Option B: Deploy via GitHub

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub and select `aspenas/candlefish-ai`
4. Configure:
   - **Base directory**: `projects/paintbox`
   - **Build command**: `npm run build`
   - **Publish directory**: `out`
   - **Branch**: `paintbox-deployment`

## Step 2: Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

### Public Variables (Safe for Frontend)

```
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_API_URL=https://your-backend-api.railway.app
NEXT_PUBLIC_COMPANYCAM_ENABLED=true
NEXT_PUBLIC_SALESFORCE_ENABLED=true
```

### Build-Time Variables

```
NODE_VERSION=20
NEXT_TELEMETRY_DISABLED=1
```

## Step 3: Deploy Backend API (Required)

Since Netlify can't run the full Next.js API routes, deploy the backend separately:

### Option 1: Railway (Recommended)

1. Create new project on [Railway](https://railway.app)
2. Deploy the API server code
3. Configure environment variables
4. Get the deployment URL

### Option 2: Fly.io

1. Install Fly CLI: `brew install flyctl`
2. Deploy: `fly launch`
3. Configure: `fly secrets set`

### Option 3: Heroku

1. Create app: `heroku create paintbox-api`
2. Deploy: `git push heroku main`
3. Configure: `heroku config:set`

## Step 4: Update API Endpoints

After backend deployment, update the API URL:

1. In Netlify Dashboard → Environment Variables:

   ```
   NEXT_PUBLIC_API_URL=https://your-actual-backend-url.railway.app
   ```

2. Redeploy Netlify site to use new API URL

## Step 5: Test Deployment

1. **Frontend**: Visit your Netlify URL
2. **API Health**: Check `https://your-api.railway.app/health`
3. **Integrations**: Test Salesforce and Company Cam features

## Environment Variables Reference

### Required for Backend API

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Salesforce
SALESFORCE_CLIENT_ID=...
SALESFORCE_CLIENT_SECRET=...
SALESFORCE_USERNAME=...
SALESFORCE_PASSWORD=...
SALESFORCE_SECURITY_TOKEN=...
SALESFORCE_LOGIN_URL=https://test.salesforce.com

# Company Cam
COMPANYCAM_API_KEY=...
COMPANYCAM_COMPANY_ID=...

# Security
JWT_SECRET=...
ENCRYPTION_KEY=...
```

### Optional Services

```env
# Monitoring
SENTRY_DSN=...

# Analytics
LOGROCKET_APP_ID=...
```

## Limitations on Netlify

1. **No Server-Side Rendering** - All pages are static
2. **No WebSocket Support** - Real-time features need external service
3. **Function Timeouts** - 10 seconds max for Netlify Functions
4. **No Background Jobs** - Queue processing needs external service

## Migration Path

If you need full Next.js features later:

1. **Vercel** - Zero-config Next.js deployment
2. **Railway** - Full Node.js app support
3. **Fly.io** - Global edge deployment
4. **AWS Amplify** - Full AWS integration

## Quick Deploy Script

```bash
#!/bin/bash
# deploy-netlify.sh

echo "🎨 Deploying Paintbox to Netlify..."

# Build the static site
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=out

echo "✅ Frontend deployed!"
echo "⚠️  Remember to deploy backend API separately"
```

## Support

- Netlify Docs: <https://docs.netlify.com>
- Next.js Static Export: <https://nextjs.org/docs/app/building-your-application/deploying/static-exports>
- Railway Docs: <https://docs.railway.app>
