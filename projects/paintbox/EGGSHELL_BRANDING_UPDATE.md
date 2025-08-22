# Eggshell Branding Update Summary

## Date: 2025-08-22

### Overview
All documentation and configuration files have been updated to reflect the Eggshell branding, replacing all references to Paintbox.

## Files Updated

### 1. Documentation Files (*.md)
- **README.md**: Updated project name, descriptions, and repository references
- **CLAUDE.md**: Updated project configuration documentation
- **PAINTBOX_COMPLETE.md**: Updated to "Eggshell Pro - Complete Implementation Summary"
- **PRODUCTION_DEPLOYMENT_GUIDE.md**: Updated all deployment references
- **PRODUCTION_IMPLEMENTATION_STATUS.md**: Updated status documentation
- **MONITORS.md**: Updated to "Eggshell SLOs and Monitors"

### 2. Configuration Files
- **package.json**: Already has "eggshell-app" as name
- **fly.toml**: Updated app name to "eggshell" and database path
- **fly.staging.toml**: Updated app name to "eggshell-staging"
- **tailwind.config.ts**: Updated color references from paintbox to eggshell_legacy
- **middleware.ts**: Updated API URLs from paintbox-api to eggshell-api

### 3. Scripts
- **scripts/init-database.sh**: Updated database name to eggshell.db
- **scripts/archive-iterations.sh**: Updated for Eggshell canonicalization
- **scripts/deploy-production.sh**: Updated APP_NAME to "eggshell"
- **Dockerfile.simple**: Updated comment for Eggshell deployment

### 4. Application Components
- **app/page.tsx**: Updated CSS classes from paintbox to eggshell
- **app/layout.tsx**: Already has Eggshell branding
- **app/login/page.tsx**: Updated to use EggshellLogo component
- **app/globals.css**: Updated all paintbox CSS classes to eggshell

### 5. React Components
- **Created new component**: `components/ui/EggshellLogo.tsx` (with 🥚 emoji)
- **components/layout/Navigation.tsx**: Updated to use EggshellLogo
- **components/ui/AppHeader.tsx**: Updated to use EggshellLogo
- **components/auth/OnboardingFlow.tsx**: Updated to use EggshellLogo and eggshell CSS classes

### 6. State Management
- **stores/useEstimateStore.ts**: Updated storage name to 'eggshell-estimate-store'
- **stores/useOfflineStore.ts**: Updated storage name to 'eggshell-offline-store'

## Key Changes

### Brand Identity
- Logo: Changed from 🎨 (paint palette) to 🥚 (egg)
- Primary brand name: Paintbox → Eggshell
- CSS prefix: paintbox- → eggshell-
- Storage keys: paintbox-* → eggshell-*

### Infrastructure Updates
- Fly.io app names: paintbox → eggshell
- Database names: paintbox.db → eggshell.db
- API endpoints: paintbox-api → eggshell-api
- Docker image references updated

### Color System
- Legacy paintbox colors renamed to eggshell_legacy in Tailwind config
- CSS variables updated from --color-paintbox- to --color-eggshell-legacy-
- Component classes updated from .paintbox- to .eggshell-

## Migration Notes

### For Developers
1. Clear browser localStorage to avoid conflicts with old paintbox-* keys
2. Update any local environment variables referencing paintbox
3. Update CI/CD pipelines to use new app names
4. Update DNS records if using custom domains

### For Production
1. Database migration: Rename paintbox.db to eggshell.db
2. Update Fly.io app names in deployment scripts
3. Update AWS Secrets Manager paths from paintbox/* to eggshell/*
4. Update monitoring dashboards and alerts

## Remaining Tasks
- Update any external documentation or wikis
- Update customer-facing materials
- Update email templates if they reference Paintbox
- Update any third-party integrations (Salesforce, Company Cam) app names

## Verification Checklist
- [x] All markdown files updated
- [x] Configuration files updated
- [x] Scripts updated
- [x] React components updated
- [x] CSS classes updated
- [x] State management updated
- [x] Logo component created
- [x] Build and deployment configs updated

## Notes
- The project directory name remains `/paintbox` for now to avoid breaking existing paths
- Git repository name can be updated separately if needed
- All functional code remains unchanged - this is purely a branding update

---

**Updated by**: Documentation Agent
**Status**: Complete
**Next Steps**: Deploy to staging for verification
