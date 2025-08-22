# Crown Trophy - Awards & Recognition Platform

## 🏆 Overview

Crown Trophy is a business management platform for trophy and awards businesses.

## 🚀 Quick Start

### GitHub Codespaces

1. Open in Codespaces - everything auto-configures
2. Load environment variables:
   ```bash
   bash ../../scripts/secrets-bootstrap.sh crown-trophy dev
   ```
3. Start development:
   ```bash
   pnpm dev
   ```

### Local Development

```bash
# From monorepo root
pnpm install
pnpm --filter crown-trophy dev

# Open http://localhost:3002
```

## 🔐 Environment Variables

Environment variables are automatically loaded from AWS Secrets Manager:

```bash
# Development
bash ../../scripts/secrets-bootstrap.sh crown-trophy dev

# Production (requires permissions)
bash ../../scripts/secrets-bootstrap.sh crown-trophy prod
```

## 📦 Deployment

### Preview Deployments

- **Automatic**: Every PR gets a preview URL
- **Platform**: Netlify
- **URL Format**: `https://deploy-preview-{PR-NUMBER}--crown-trophy.netlify.app`

### Production Deployment

- **Trigger**: Merge to `main` branch
- **URL**: `https://crown.candlefish.ai`
- **Platform**: Netlify with CDN

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm typecheck
```

## 📁 Project Structure

```
crown-trophy/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utilities and helpers
├── public/          # Static assets
├── styles/          # CSS/SCSS files
├── netlify.toml     # Netlify configuration
└── package.json     # Dependencies
```

## 🔗 Related Services

- **API**: `https://api.crown.candlefish.ai`
- **GraphQL**: `https://graphql.candlefish.ai`
- **Docs**: `https://docs.candlefish.ai/crown-trophy`

## 👥 Team

- **Owner**: Aaron Westphal (@aaron-westphal)
- **Review**: Patrick Smith (@aspenas)

## 📝 Notes

- Uses Next.js 14 with App Router
- Styled with Tailwind CSS
- Inventory management system
- Order tracking and fulfillment
