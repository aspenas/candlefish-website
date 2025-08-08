# 🎨 Paintbox is Ready for Netlify! ✅

## Status

- ✅ Static export configured
- ✅ Build successful (3 pages exported)
- ✅ netlify.toml configured
- ✅ Deployment script ready
- ✅ Environment variables documented

## Quick Deploy

### Option 1: Using the Script (Recommended)

```bash
./deploy-netlify.sh
```

### Option 2: Manual Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=out
```

### Option 3: GitHub Integration

1. Go to <https://app.netlify.com>
2. "Add new site" → "Import an existing project"
3. Connect GitHub repo: `aspenas/candlefish-ai`
4. Settings:
   - Base directory: `projects/paintbox`
   - Build command: `npm run build`
   - Publish directory: `out`

## Environment Variables to Set in Netlify

```env
# Public (safe for frontend)
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_API_URL=https://your-backend-api.railway.app

# Build settings
NODE_VERSION=20
```

## Important Notes

### What Works on Netlify

- ✅ Static pages (Home, About, etc.)
- ✅ Client-side routing
- ✅ Static assets (images, CSS, JS)
- ✅ Environment variables at build time

### What Needs Separate Backend

- ❌ API routes → Deploy to Railway/Heroku
- ❌ Database operations → Use external service
- ❌ WebSocket connections → Not supported
- ❌ Server-side rendering → Static only

## Next Steps

1. **Deploy Frontend**:

   ```bash
   ./deploy-netlify.sh
   ```

2. **Deploy Backend API** (Required for full functionality):
   - Railway: <https://railway.app>
   - Fly.io: <https://fly.io>
   - Heroku: <https://heroku.com>

3. **Update API URL**:
   After backend deployment, update `NEXT_PUBLIC_API_URL` in Netlify

## Files Created/Modified

- `next.config.js` - Configured for static export
- `netlify.toml` - Deployment configuration
- `deploy-netlify.sh` - Automated deployment script
- `NETLIFY_DEPLOYMENT_GUIDE.md` - Detailed guide

## Testing Locally

```bash
# Build and preview
npm run build
npx serve out

# Open http://localhost:3000
```

## Alternative: Vercel (Recommended)

If you want full Next.js features without a separate backend:

```bash
npm i -g vercel
vercel
```

Vercel handles everything automatically with zero configuration! 🚀
