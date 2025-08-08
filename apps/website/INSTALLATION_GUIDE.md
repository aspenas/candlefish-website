# Candlefish AI Dashboard - Installation Guide

## Single Command Installation

The entire Candlefish AI Dashboard can now be installed and configured with a single command:

```bash
npx @candlefish/create-dashboard setup
```

This command will:
- ✅ Check system requirements (Node.js 18+, npm 9+, Git)
- ✅ Install all dependencies with the correct package manager  
- ✅ Set up environment variables with comprehensive .env.example
- ✅ Configure deployment targets (Netlify integration)
- ✅ Initialize git repository with proper .gitignore
- ✅ Run initial build and validation
- ✅ Consolidate all deployment scripts into unified system

## Available Commands

Once installed, use these commands to manage your dashboard:

### Development
```bash
npx @candlefish/create-dashboard dev        # Start dev server (port 5173)
npx @candlefish/create-dashboard dev --port 3000 --open  # Custom port, auto-open
```

### Building
```bash
npx @candlefish/create-dashboard build      # Standard production build
npx @candlefish/create-dashboard build --config family  # Family dashboard build
npx @candlefish/create-dashboard build --analyze        # With bundle analysis
```

### Deployment
```bash
npx @candlefish/create-dashboard deploy           # Deploy main site
npx @candlefish/create-dashboard deploy family    # Deploy family dashboard  
npx @candlefish/create-dashboard deploy --preview # Deploy as preview
```

### Testing & Validation
```bash
npx @candlefish/create-dashboard test             # Run unit tests
npx @candlefish/create-dashboard test --coverage  # With coverage report
npx @candlefish/create-dashboard test --e2e       # End-to-end tests
npx @candlefish/create-dashboard validate         # Check configuration
npx @candlefish/create-dashboard validate --fix   # Auto-fix issues
```

## Pre-Installation Requirements

### Required
- **Node.js 18+**: [Install from nodejs.org](https://nodejs.org/)
- **npm 9+**: Comes with Node.js 18+
- **Git**: [Install from git-scm.com](https://git-scm.com/)

### Optional (for deployment)
- **Netlify CLI**: `npm install -g netlify-cli`

## Environment Configuration

The installation creates a comprehensive `.env.example` file with 50+ configuration options:

```env
# Core Application
VITE_APP_NAME="Candlefish AI Dashboard"
VITE_ENVIRONMENT=development
VITE_API_URL=https://api.candlefish.ai

# Deployment (Netlify)
NETLIFY_AUTH_TOKEN=your-token
NETLIFY_SITE_ID_MAIN=ed200909-886f-47ca-950c-58727dca0b9c
NETLIFY_SITE_ID_CLAUDE=9650bb87-e619-4fdf-9b9b-7ff2eae31ba6

# Feature Flags
VITE_FEATURE_FAMILY_DASHBOARD=true
VITE_FEATURE_CLAUDE_INTEGRATION=true
VITE_FEATURE_ANALYTICS=false

# Analytics & Monitoring
VITE_GOOGLE_ANALYTICS_ID=
VITE_SENTRY_DSN=
VITE_PERFORMANCE_BUDGET_JS=244
```

Copy `.env.example` to `.env` and fill in your values.

## Deployment Configuration

The installation creates `deployment.config.json` with multiple deployment targets:

```json
{
  "main": {
    "platform": "netlify",
    "siteId": "ed200909-886f-47ca-950c-58727dca0b9c", 
    "buildDir": "dist",
    "domain": "candlefish.ai"
  },
  "family": {
    "platform": "netlify",
    "siteId": "FAMILY-SITE-ID",
    "buildCommand": "npm run family:build"
  }
}
```

## Migrating Existing Project

If you already have a Candlefish project:

```bash
cd your-existing-project
npx @candlefish/create-dashboard setup
```

The setup will:
- Preserve all existing files
- Update package.json with optimized dependencies
- Consolidate deployment scripts
- Add missing configuration files
- Validate and fix issues

## What Gets Installed

### Dependencies Cleaned Up
- ✅ React 18 + TypeScript + Vite (core)
- ✅ Tailwind CSS + animations (styling) 
- ✅ React Router (navigation)
- ✅ ESLint + Prettier (code quality)
- ✅ Moved optional dependencies to optionalDependencies
- ✅ Removed duplicate/unused packages

### Scripts Added/Updated
```json
{
  "scripts": {
    "setup": "npx @candlefish/create-dashboard setup",
    "dev": "vite", 
    "build": "vite build",
    "deploy": "npx @candlefish/create-dashboard deploy",
    "test": "npx @candlefish/create-dashboard test",
    "validate": "npx @candlefish/create-dashboard validate",
    "family:deploy": "npx @candlefish/create-dashboard deploy family"
  }
}
```

### Files Created
- `.env.example` - Comprehensive environment template
- `deployment.config.json` - Multi-target deployment config
- `scripts/deploy.js` - Unified deployment script  
- Updated `.gitignore` with all necessary patterns
- `tsconfig.json` (if missing)
- `netlify.toml` (if missing)

## Deployment Script Consolidation

The installation consolidates these deployment scripts into one unified system:
- ❌ `deploy.sh` (replaced)
- ❌ `deploy-now.sh` (replaced) 
- ❌ `deploy-claude-site.sh` (replaced)
- ❌ `deploy-family-dashboard.sh` (replaced)
- ❌ `direct-netlify-deploy.sh` (replaced)
- ❌ `netlify-deploy-api.sh` (replaced)

All functionality is now available through:
- `npx @candlefish/create-dashboard deploy [target]`
- `scripts/deploy.js` (generated unified script)

## Health Checks & Validation

The validate command checks:
- ✅ package.json completeness
- ✅ Environment configuration
- ✅ Build configuration (Vite)
- ✅ Deployment configuration (Netlify)  
- ✅ Git ignore patterns
- ✅ TypeScript configuration
- ✅ ESLint rules
- ✅ Type checking

Auto-fix with: `npx @candlefish/create-dashboard validate --fix`

## Troubleshooting

### Port Already in Use
```bash
npx @candlefish/create-dashboard dev --port 3000
```

### Build Fails  
```bash
npx @candlefish/create-dashboard validate --fix
```

### Deployment Authentication
```bash
netlify login
# or set NETLIFY_AUTH_TOKEN environment variable
```

### Missing Dependencies
```bash
npx @candlefish/create-dashboard setup --skip-git
```

## CI/CD Integration

Example GitHub Action:
```yaml
name: Deploy Dashboard
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npx @candlefish/create-dashboard validate
      - run: npx @candlefish/create-dashboard test
      - run: npx @candlefish/create-dashboard deploy
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

## Support

- 📖 Documentation: https://docs.candlefish.ai  
- 🐛 Issues: https://github.com/candlefish-ai/candlefish-ai/issues
- 💬 Discussions: https://github.com/candlefish-ai/candlefish-ai/discussions

## Summary

This installation system provides:
- **Zero Configuration**: Single command setup
- **Production Ready**: Optimized dependencies and build
- **Multi-Target Deployment**: Main site, family dashboard, previews
- **Health Monitoring**: Validation and auto-fix
- **Developer Experience**: Hot reload, TypeScript, testing
- **CI/CD Ready**: GitHub Actions integration

Transform any directory into a production-ready Candlefish dashboard with one command!
