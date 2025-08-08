# Deployment Instructions for Candlefish.ai React Site

## Build Status: ✅ READY

The React modernization is complete and the production build is ready in the `dist` directory.

## Option 1: Manual Netlify Deployment (Recommended)

1. **Go to Netlify Dashboard**:
   - Visit: <https://app.netlify.com/projects/candlefish-grotto>
   - Or navigate to your Netlify team dashboard

2. **Deploy the dist folder**:
   - Click on "Deploys" tab
   - Drag and drop the `apps/website/dist` folder onto the deployment area
   - Or use "Deploy manually" and select the `dist` folder

3. **Verify deployment**:
   - Check that the site loads at <https://candlefish.ai>
   - Verify security headers at <https://securityheaders.com>

## Option 2: GitHub Push (Automatic Deployment)

1. **Commit and push changes**:

   ```bash
   git add apps/website
   git commit -m "React modernization of Candlefish.ai website"
   git push origin main
   ```

2. **Netlify will automatically**:
   - Detect the push
   - Run the build command
   - Deploy the site

## Option 3: Fix Netlify CLI (If needed)

1. **Update the root netlify.toml** to properly handle the monorepo:

   ```toml
   [build]
     base = "apps/website"
     publish = "dist"
     command = "cd ../.. && pnpm install --frozen-lockfile && cd apps/website && pnpm build"
   ```

2. **Then deploy**:

   ```bash
   cd apps/website
   netlify deploy --prod
   ```

## What's Included

- ✅ React 18 with TypeScript
- ✅ All original content preserved
- ✅ WebGL particle animations
- ✅ GSAP scroll animations
- ✅ Responsive design
- ✅ A+ security headers configured
- ✅ Bundle size: 112.72 kB gzipped

## Post-Deployment Checklist

- [ ] Verify site loads at <https://candlefish.ai>
- [ ] Check security rating at <https://securityheaders.com> (should be A+)
- [ ] Test all animations and interactions
- [ ] Verify 404 page with fish animation
- [ ] Check mobile responsiveness
- [ ] Run Lighthouse audit

## Support

If you encounter any issues:

1. Check the Netlify build logs
2. Ensure all dependencies are installed
3. Verify the netlify.toml configuration
