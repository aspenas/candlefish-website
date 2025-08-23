# WebGL Deployment Guide - Candlefish Website

## Overview

This guide covers the deployment of the new WebGL/Three.js animation features for the Candlefish website, including performance optimizations and monitoring setup.

## New Features Deployed

### 1. HeaderText Component
- **Location**: `components/HeaderText.tsx`
- **Features**: WebGL shader-based text transitions with project rotation
- **Dependencies**: Three.js, React Three Fiber, custom shaders
- **Fallback**: Automatic fallback for reduced motion preferences and WebGL unavailability

### 2. SystemActivity Component  
- **Location**: `components/SystemActivity.tsx`
- **Features**: Minimalist activity bar visualization
- **Real-time**: Displays live system metrics with mock data fallback

### 3. SystemArchitecture Component
- **Location**: `components/SystemArchitecture.tsx` 
- **Features**: NANDA-style 3D node graph visualization
- **Interactive**: Mouse interaction with responsive design

## Deployment Configuration

### Environment Variables (Netlify Dashboard)
```bash
# Required for production
NEXT_PUBLIC_CANDLEFISH_API_BASE=https://api.candlefish.ai

# Optional - email service  
RESEND_API_KEY=re_your_key_here

# CORS configuration (optional)
ALLOWED_ORIGINS=https://candlefish.ai,https://www.candlefish.ai
```

### Build Configuration
- **Platform**: Netlify Static Export
- **Build Command**: `npm ci --include=dev && npm run export`
- **Publish Directory**: `out/`
- **Node Version**: 20

## Performance Optimizations

### 1. Next.js Configuration
- WebGL-specific webpack configuration
- Three.js import optimization  
- Shader file handling with raw-loader
- Node.js polyfill fallbacks for client-side

### 2. Netlify Configuration
- WebGL-compatible CSP headers
- Optimized caching for 3D assets
- WASM file support
- Performance monitoring headers

### 3. WebGL Performance Monitoring
- **Monitor**: `lib/webgl-performance-monitor.ts`
- **Features**: FPS tracking, memory monitoring, context loss detection
- **Alerts**: Automatic performance degradation alerts
- **Fallbacks**: Graceful degradation on performance issues

## Browser Compatibility

### Supported Browsers
- Chrome 60+ (Full WebGL2 support)
- Firefox 58+ (Full WebGL2 support)  
- Safari 14+ (WebGL2 support)
- Edge 79+ (Full WebGL2 support)

### Fallback Strategy
1. WebGL2 → WebGL1 → Canvas → Static text
2. Automatic detection of reduced motion preferences
3. Performance-based quality reduction
4. Context loss recovery

## Monitoring & Analytics

### Performance Metrics
- Frame rate (FPS) monitoring
- Frame time tracking
- Memory usage alerts
- Draw call optimization
- WebGL context health

### Alert Thresholds
- **FPS Warning**: < 45 FPS
- **FPS Critical**: < 24 FPS  
- **Frame Time Warning**: > 22ms
- **Frame Time Critical**: > 40ms
- **Memory Warning**: > 90% heap usage

### Logging
- Development: Console warnings for performance issues
- Production: Silent monitoring with optional analytics integration

## Build Process

### 1. Dependency Installation
```bash
cd brand/website
npm ci --include=dev
```

### 2. Mock Data Refresh
```bash
npm run refresh-mocks  # Refreshes API fallbacks
```

### 3. Static Export
```bash
npm run export  # Generates static files in out/
```

### 4. Deployment
Files are automatically deployed to Netlify on push to main branch.

## CI/CD Pipeline

### GitHub Actions Workflow
- **File**: `.github/workflows/refresh_mocks.yml`
- **Schedule**: Nightly at 09:30 UTC
- **Purpose**: Refresh mock data from live APIs
- **Permissions**: Contents write for committing updates

### Build Process
1. Install Node.js 20
2. Install dependencies with dev packages
3. Refresh mock data (continues on API failure)
4. Build Next.js static export
5. Deploy to Netlify

## Troubleshooting

### Common Issues

#### 1. WebGL Context Loss
**Symptoms**: Black screens, missing animations
**Solution**: Automatic context recovery implemented
**Monitoring**: Performance monitor alerts on context loss

#### 2. Performance Degradation  
**Symptoms**: Low FPS, high memory usage
**Solution**: Automatic quality reduction, performance alerts
**Debug**: Check browser dev tools → Performance tab

#### 3. Build Failures
**Symptoms**: Webpack errors, missing dependencies
**Check**: 
- raw-loader installed for shader files
- Node.js fallbacks configured
- Three.js imports optimized

#### 4. Missing Mock Data
**Symptoms**: Empty animations, API errors
**Solution**: 
- Check `mock/` directory for JSON files
- Verify GitHub Actions workflow runs
- Manual refresh: `npm run refresh-mocks`

### Debug Commands
```bash
# Test build locally
npm run export

# Check WebGL support
# Open browser console: `WebGLRenderingContext` should exist

# Performance testing
npm run test:performance

# Visual regression testing  
npm run test:visual
```

## Security Considerations

### Content Security Policy
- WebGL worker and blob support enabled
- Three.js and shader execution allowed
- Memory and performance monitoring permitted

### Performance Limits
- Maximum 1000 draw calls per frame
- Memory usage alerts at 90% heap
- Automatic quality reduction on mobile devices

## Rollback Plan

### Immediate Rollback
1. Revert to previous deployment via Netlify dashboard
2. Disable WebGL features via environment variable:
   ```bash
   DISABLE_WEBGL=true
   ```

### Selective Rollback  
1. Edit `components/HeaderText.tsx`
2. Set `prefersReducedMotion` to `true` to force fallback mode
3. Deploy hotfix

### Complete Feature Removal
1. Remove WebGL components from `app/page.tsx`
2. Replace with static text versions
3. Remove Three.js dependencies (optional)

## Performance Targets

### Production Goals
- **FPS**: Maintain 60 FPS on desktop, 30 FPS on mobile
- **Memory**: < 100MB JavaScript heap usage  
- **Load Time**: < 2 seconds for WebGL initialization
- **Bundle Size**: < 500KB additional for Three.js features

### Monitoring Dashboard
Access performance metrics via:
1. Browser DevTools → Performance
2. Lighthouse scores for Core Web Vitals
3. Custom WebGL performance monitor (development)

## Contact & Support

For deployment issues or performance concerns:
- Check deployment logs in Netlify dashboard
- Review GitHub Actions workflow results
- Monitor WebGL performance alerts in browser console

## Next Steps

### Future Optimizations
1. **Level of Detail (LOD)**: Implement quality scaling based on device capabilities
2. **Web Workers**: Move heavy computations off main thread
3. **Progressive Loading**: Load WebGL features after initial page render
4. **Analytics Integration**: Connect performance monitor to analytics platform
