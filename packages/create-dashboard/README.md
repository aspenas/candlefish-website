# @candlefish/create-dashboard

> One-command setup for Candlefish AI dashboard applications

A comprehensive CLI tool that creates, configures, and manages Candlefish AI dashboard projects with zero configuration needed for basic setup.

## Quick Start

```bash
# Create a new dashboard project
npx @candlefish/create-dashboard setup my-dashboard

# Or setup in current directory
npx @candlefish/create-dashboard setup

# Start development server
npx @candlefish/create-dashboard dev

# Build for production
npx @candlefish/create-dashboard build

# Deploy to production
npx @candlefish/create-dashboard deploy
```

## Commands

### `setup [project-name]`
Initialize a new dashboard project or upgrade existing one.

```bash
# Create new project
npx @candlefish/create-dashboard setup my-dashboard

# Setup in current directory
npx @candlefish/create-dashboard setup

# Use specific template
npx @candlefish/create-dashboard setup my-dashboard --template family

# Skip dependency installation
npx @candlefish/create-dashboard setup my-dashboard --skip-install
```

### `dev`
Start development server with hot reload.

```bash
# Default port 5173
npx @candlefish/create-dashboard dev

# Custom port
npx @candlefish/create-dashboard dev --port 3000

# Open browser automatically
npx @candlefish/create-dashboard dev --open

# Custom host
npx @candlefish/create-dashboard dev --host 0.0.0.0
```

### `build`
Build project for production.

```bash
# Standard build
npx @candlefish/create-dashboard build

# Family dashboard build
npx @candlefish/create-dashboard build --config family

# Analyze bundle size
npx @candlefish/create-dashboard build --analyze
```

### `deploy`
Deploy to production platforms.

```bash
# Deploy main site
npx @candlefish/create-dashboard deploy

# Deploy family dashboard
npx @candlefish/create-dashboard deploy family

# Deploy as preview
npx @candlefish/create-dashboard deploy --preview

# Skip build step
npx @candlefish/create-dashboard deploy --skip-build
```

### `test`
Run comprehensive test suite.

```bash
# Run unit tests
npx @candlefish/create-dashboard test

# Run with coverage
npx @candlefish/create-dashboard test --coverage

# Run in watch mode
npx @candlefish/create-dashboard test --watch

# Run end-to-end tests
npx @candlefish/create-dashboard test --e2e
```

### `validate`
Validate project configuration and health.

```bash
# Validate configuration
npx @candlefish/create-dashboard validate

# Auto-fix issues
npx @candlefish/create-dashboard validate --fix
```

## Features

### 🚀 Zero Configuration
- Single command setup
- Automatic dependency management
- Environment configuration
- Build optimization

### 🏗️ Production Ready
- TypeScript support
- ESLint + Prettier
- Vite build system
- Tailwind CSS

### 🚢 Deployment
- Netlify integration
- Multiple site support
- Environment management
- Health checks

### 🧪 Testing
- Unit tests (Vitest)
- E2E tests (Playwright)
- Coverage reports
- Performance testing

### 🔍 Quality Assurance
- TypeScript validation
- Linting enforcement
- Build verification
- Security checks

## Templates

### Default Template
- React 18 + TypeScript
- Vite build system
- Tailwind CSS
- React Router

### Family Template
- Family dashboard features
- Authentication system
- Protected routes
- Document management

## System Requirements

- Node.js 18+ 
- npm 9+
- Git

### Optional Dependencies
- Netlify CLI (for deployment)
- Playwright (for E2E testing)

## Configuration

### Environment Variables
See `.env.example` for all available configuration options:

```env
# Application
VITE_APP_NAME="My Dashboard"
VITE_ENVIRONMENT=development

# Deployment
NETLIFY_AUTH_TOKEN=your-token
NETLIFY_SITE_ID=your-site-id

# Feature Flags
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_ERROR_TRACKING=true
```

### Deployment Configuration
The tool creates `deployment.config.json` for managing multiple deployment targets:

```json
{
  "main": {
    "platform": "netlify",
    "siteId": "your-main-site-id",
    "buildDir": "dist",
    "domain": "yourdomain.com"
  },
  "family": {
    "platform": "netlify", 
    "siteId": "your-family-site-id",
    "buildCommand": "npm run family:build"
  }
}
```

## Project Structure

```
my-dashboard/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── utils/
├── public/
├── scripts/
│   └── deploy.js          # Unified deployment script
├── .env.example           # Environment template
├── deployment.config.json # Deployment configuration
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Advanced Usage

### Custom Build Configurations
Create `vite.config.ts` variants:

```typescript
// vite.family.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        family: resolve(__dirname, 'src/family-dashboard/index.html')
      }
    }
  }
});
```

### Multiple Deployment Targets
Deploy to different environments:

```bash
# Production
npx @candlefish/create-dashboard deploy main

# Family dashboard
npx @candlefish/create-dashboard deploy family

# Preview/staging
npx @candlefish/create-dashboard deploy --preview
```

### CI/CD Integration
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

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
npx @candlefish/create-dashboard dev --port 3000
```

**Build Fails**
```bash
npx @candlefish/create-dashboard validate --fix
```

**Deployment Authentication**
```bash
netlify login
# or set NETLIFY_AUTH_TOKEN environment variable
```

**Missing Dependencies**
```bash
npx @candlefish/create-dashboard setup --skip-git
```

## Migration

### From Existing Project
```bash
cd your-existing-project
npx @candlefish/create-dashboard setup
```

The tool will:
- Preserve existing files
- Update configurations
- Consolidate build scripts
- Create missing files

## Support

- 📖 Documentation: https://docs.candlefish.ai
- 🐛 Issues: https://github.com/candlefish-ai/candlefish-ai/issues
- 💬 Discussions: https://github.com/candlefish-ai/candlefish-ai/discussions

## License

MIT © Candlefish AI
