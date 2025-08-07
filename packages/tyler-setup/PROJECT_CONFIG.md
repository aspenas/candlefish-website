# Tyler Setup Project Configuration

## Project Identity
- **Name**: Tyler Setup Management System
- **Type**: Development Environment Setup Manager
- **Location**: `/Users/patricksmith/candlefish-ai/packages/tyler-setup/`
- **Independence**: Completely separate from PromoterOS

## Infrastructure (Isolated)
- **Netlify Site ID**: `ef0d6f05-62ba-46dd-82ad-39afbaa267ae`
- **Netlify URL**: https://tyler-setup-frontend.netlify.app
- **Authentication**: Basic Auth (tyler / c@ndlef!sh)
- **No custom domain** - uses Netlify subdomain

## Components
- **Frontend**: `/packages/tyler-setup/frontend/`
  - React 18 with TypeScript
  - Redux Toolkit for state management
  - Apollo GraphQL client
- **Backend**: `/packages/tyler-setup/backend/`
  - Node.js/Express API
  - GraphQL server
  - AWS Secrets Manager integration
- **Mobile**: `/packages/tyler-setup/mobile/`
  - React Native application

## Security Configuration
- **Secrets Storage**: AWS Secrets Manager
- **Secret Name**: `tyler-setup/production/config`
- **Password Protection**: Netlify Basic Auth

## Deployment
- **Frontend Script**: `./frontend/quick-deploy.sh`
- **Command**: `netlify deploy --prod --site ef0d6f05-62ba-46dd-82ad-39afbaa267ae --dir dist`
- **No shared resources with PromoterOS**

## Features
- Setup Wizard
- AWS Secrets Management
- System Metrics Dashboard
- Configuration Management
- Telemetry Monitoring
- Settings Management

## Development Workflow
1. Frontend: `cd frontend && npm run dev`
2. Backend: `cd backend && npm run dev`
3. Deploy: `./quick-deploy.sh`
4. Never reference PromoterOS infrastructure

## Verification
```bash
# Verify Tyler Setup deployment (with auth)
curl -u tyler:c@ndlef!sh https://tyler-setup-frontend.netlify.app

# Check specific pages
curl -u tyler:c@ndlef!sh https://tyler-setup-frontend.netlify.app/dashboard
curl -u tyler:c@ndlef!sh https://tyler-setup-frontend.netlify.app/setup
```

## Important Notes
- **NO CROSS-REFERENCES** to PromoterOS
- **NO SHARED INFRASTRUCTURE** with other projects
- **INDEPENDENT NPM PACKAGE**: @candlefish/tyler-setup
- **SEPARATE DEPLOYMENT** pipeline