# Netlify Extensions Deployment Scripts

Complete deployment system for Netlify extensions across all Candlefish sites.

## 🚀 Quick Start

```bash
# Make scripts executable
chmod +x *.sh

# Quick deployment (recommended for immediate setup)
./quick-deploy.sh

# Full deployment with all features
./deploy-extensions.sh
```

## 📦 Scripts Overview

### 1. `quick-deploy.sh` - Immediate Deployment
Fast deployment for essential plugins and configurations.

**What it does:**
- Installs core Netlify plugins (Lighthouse, Next.js, caching, image optimization)
- Sets up essential environment variables
- Deploys to priority sites first (main, dashboard, staging)
- Creates build hooks for continuous deployment

**Usage:**
```bash
./quick-deploy.sh
```

### 2. `deploy-extensions.sh` - Complete Deployment
Comprehensive deployment with all plugins and configurations.

**What it does:**
- Installs 15+ recommended plugins per site
- Configures environment variables
- Sets up build optimizations
- Deploys Edge Functions
- Generates site-specific configurations

**Usage:**
```bash
# Deploy to all sites
./deploy-extensions.sh

# Deploy to specific site
./deploy-extensions.sh candlefish.ai
```

### 3. `setup-monitoring.sh` - Monitoring Setup
Configures comprehensive monitoring and analytics.

**What it does:**
- Sets up Google Analytics
- Configures Sentry error tracking
- Implements Real User Monitoring (RUM)
- Creates performance monitoring
- Sets up alerting rules
- Configures uptime monitoring

**Usage:**
```bash
./setup-monitoring.sh
```

### 4. `deploy-edge-functions.sh` - Edge Functions
Deploys performance-optimizing Edge Functions.

**What it does:**
- Authentication at the edge
- Rate limiting
- Geolocation detection
- A/B testing
- Image optimization
- Cache control
- Security headers

**Usage:**
```bash
# Create edge functions
./deploy-edge-functions.sh

# Deploy to specific sites
./deploy-edge-functions.sh candlefish-main candlefish-dashboard
```

## 🎯 Sites Configuration

All scripts work with these 8 production sites:

| Domain | Site Name | Environment |
|--------|-----------|-------------|
| candlefish.ai | candlefish-main | Production |
| staging.candlefish.ai | candlefish-staging | Staging |
| paintbox.candlefish.ai | candlefish-paintbox | Production |
| inventory.candlefish.ai | candlefish-inventory | Production |
| promoteros.candlefish.ai | candlefish-promoteros | Production |
| claude.candlefish.ai | candlefish-claude | Production |
| dashboard.candlefish.ai | candlefish-dashboard | Production |
| ibm.candlefish.ai | candlefish-ibm | Production |

## 🔌 Installed Plugins

### Core Plugins (All Sites)
- `@netlify/plugin-lighthouse` - Performance monitoring
- `@netlify/plugin-nextjs` - Next.js optimization
- `netlify-plugin-cache-nextjs` - Build caching
- `netlify-plugin-submit-sitemap` - SEO sitemap submission
- `@sentry/netlify-build-plugin` - Error tracking
- `netlify-plugin-image-optim` - Image optimization
- `netlify-plugin-minify-html` - HTML minification
- `netlify-plugin-no-more-404` - 404 prevention
- `netlify-plugin-bundle-env` - Environment bundling

### Performance Plugins (Main & Dashboard)
- `netlify-plugin-checklinks` - Link validation
- `netlify-plugin-inline-critical-css` - Critical CSS inlining
- `netlify-plugin-precompress` - Asset pre-compression
- `netlify-plugin-hashfiles` - Cache busting

### Security Plugins (All Sites)
- `netlify-plugin-csp-generator` - Content Security Policy
- `netlify-plugin-security-headers` - Security headers
- `netlify-plugin-subresource-integrity` - SRI hashes

## 🔧 Environment Variables

Automatically configured per site:

```bash
NODE_VERSION=18
NEXT_PUBLIC_SITE_URL=https://[domain]
NEXT_PUBLIC_API_URL=https://api.candlefish.ai
NEXT_PUBLIC_ENV=[production|staging]
SENTRY_ORG=candlefish
SENTRY_PROJECT=[site-specific]
```

## 📊 Monitoring Features

After running `setup-monitoring.sh`:

- **Performance Metrics**: Core Web Vitals, TTFB, FCP, LCP
- **Error Tracking**: Sentry integration with source maps
- **Real User Monitoring**: Session recording, user flows
- **Uptime Monitoring**: Health checks, SSL monitoring
- **Custom Dashboards**: Site-specific and aggregated views
- **Alerting**: Email, Slack, PagerDuty notifications

## 🚦 Deployment Workflow

### Initial Setup (One-time)
```bash
# 1. Install Netlify CLI globally
npm install -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Clone and navigate to scripts
cd deployment/scripts/netlify-extension-deployment

# 4. Make scripts executable
chmod +x *.sh
```

### Regular Deployment
```bash
# Option 1: Quick deployment for immediate results
./quick-deploy.sh

# Option 2: Full deployment with all features
./deploy-extensions.sh

# Option 3: Deploy monitoring
./setup-monitoring.sh

# Option 4: Deploy edge functions
./deploy-edge-functions.sh
```

## 🔍 Verification

After deployment, verify:

1. **Check Netlify Dashboard**
   ```bash
   netlify open:admin
   ```

2. **Run Lighthouse Tests**
   ```bash
   netlify build
   ```

3. **Check Plugin Status**
   ```bash
   netlify plugins:list
   ```

4. **Verify Environment Variables**
   ```bash
   netlify env:list
   ```

5. **Test Edge Functions**
   ```bash
   curl -I https://candlefish.ai
   # Check for security headers and cache control
   ```

## 🐛 Troubleshooting

### Plugin Installation Fails
```bash
# Clear cache and retry
netlify plugins:remove [plugin-name]
netlify plugins:install [plugin-name]
```

### Authentication Issues
```bash
# Re-authenticate
netlify logout
netlify login
```

### Site Not Found
```bash
# List all sites
netlify sites:list

# Link to specific site
netlify link --name [site-name]
```

### Environment Variables Not Set
```bash
# Set manually
netlify env:set KEY "value" --scope builds
```

## 📈 Performance Targets

After deployment, sites should achieve:

- **Lighthouse Score**: >80 for all metrics
- **First Contentful Paint**: <1.8s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3.8s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms

## 🔐 Security Features

Deployed security measures include:

- CSP (Content Security Policy) headers
- HSTS (HTTP Strict Transport Security)
- XSS Protection
- Frame Options (Clickjacking protection)
- Subresource Integrity
- Rate limiting on API endpoints
- JWT authentication at edge

## 📝 Generated Files

After running scripts, find configurations in:

```
configs/
├── candlefish.ai.toml
├── staging.candlefish.ai.toml
├── paintbox.candlefish.ai.toml
├── inventory.candlefish.ai.toml
├── promoteros.candlefish.ai.toml
├── claude.candlefish.ai.toml
├── dashboard.candlefish.ai.toml
└── ibm.candlefish.ai.toml

monitoring/
├── [site]-ga.html
├── [site]-sentry.js
├── [site]-vitals.js
├── [site]-uptime.json
├── [site]-health.js
├── [site]-rum.js
├── [site]-alerts.yaml
└── [site]-dashboard.json

edge-functions/
├── auth.ts
├── rate-limit.ts
├── geolocation.ts
├── ab-testing.ts
├── image-optimization.ts
├── cache-control.ts
├── security-headers.ts
└── netlify.toml

logs/
└── deployment_[timestamp].log
```

## 🚀 Next Steps

1. **Run Quick Deploy**: Get essential features running immediately
2. **Verify Sites**: Check Netlify dashboard for successful deployments
3. **Add API Keys**: Update monitoring scripts with real API keys
4. **Configure Webhooks**: Set up Slack/PagerDuty notifications
5. **Test Performance**: Run Lighthouse audits on all sites
6. **Monitor Metrics**: Check analytics and error tracking
7. **Optimize Further**: Fine-tune based on real-world data

## 💡 Pro Tips

- Run `quick-deploy.sh` first for immediate results
- Use `deploy-extensions.sh` for comprehensive setup
- Monitor build times after adding plugins
- Some plugins may require additional configuration in `netlify.toml`
- Edge Functions run globally at Netlify's edge nodes
- Check Netlify's plugin directory for additional plugins

## 📚 Resources

- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/)
- [Netlify Build Plugins](https://docs.netlify.com/configure-builds/build-plugins/)
- [Edge Functions Guide](https://docs.netlify.com/edge-functions/overview/)
- [Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)

## 🤝 Support

For issues or questions:
1. Check deployment logs in `logs/` directory
2. Review Netlify build logs in dashboard
3. Verify site configurations in `configs/` directory
4. Check [Netlify Status](https://www.netlifystatus.com/) for platform issues

---

**Ready to deploy?** Start with `./quick-deploy.sh` for immediate results! 🚀
