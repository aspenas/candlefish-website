# PromoterOS - Baseline Audit Report

## Current State Summary

### 🔴 Critical Findings
1. **No Monorepo Integration**: PromoterOS exists at `/projects/promoterOS` but is NOT integrated into the monorepo structure (`apps/`, `services/`, `libs/`)
2. **Legacy Netlify Functions**: Using outdated serverless functions instead of proper services
3. **No Database**: No real database, using mock data and in-memory storage
4. **No Authentication**: Basic JWT implementation without proper user management
5. **No Frontend Framework**: Static HTML with vanilla JS, not Next.js
6. **No Worker Service**: No background job processing
7. **No CI/CD Integration**: Standalone deployment scripts, not integrated with monorepo

### 📁 Current File Structure
```
/projects/promoterOS/
├── netlify/functions/        # Legacy serverless functions
├── src/middleware/          # Basic middleware (auth, validation, rate limiter)
├── tests/                   # Jest tests (minimal coverage)
├── scripts/                 # Standalone deployment scripts
├── index.html              # Static HTML entry point
└── Various config files
```

### 🔧 Existing Infrastructure
- **Deployment**: Netlify (Site ID: ef0d6f05-62ba-46dd-82ad-39afbaa267ae)
- **URL**: https://promoteros.candlefish.ai
- **Testing**: Jest with Playwright for E2E
- **Package Manager**: npm (not pnpm as required by monorepo)

### ✅ What to Keep
1. Security middleware concepts (will be rewritten in TypeScript)
2. Test fixtures and data structures
3. Domain configuration (promoteros.candlefish.ai)
4. Some deployment scripts for reference

### 🗑️ What to Remove
1. All Netlify functions (replace with proper services)
2. Static HTML files (replace with Next.js)
3. Standalone deployment scripts
4. npm package files (convert to pnpm)
5. Mock implementation code

## Migration Plan

### Phase 1: Monorepo Integration
- Move to proper monorepo structure
- Create `apps/promoteros-web` (Next.js)
- Create `services/promoteros-api` (tRPC)
- Create `services/promoteros-worker` (BullMQ)
- Create `libs/ts/promoteros-types` (shared types)

### Phase 2: Database & Auth
- Set up PostgreSQL with Prisma
- Implement NextAuth with multi-tenancy
- Create proper RBAC system

### Phase 3: Features
- Build intake forms
- Create internal console
- Implement kanban workflow
- Add calendar views
- Generate runsheets

### Phase 4: Deployment
- Fly.io configuration
- AWS Secrets Manager integration
- CI/CD with GitHub Actions

## Immediate Actions Required
1. Create new branch: `feat/promoteros-mvp`
2. Initialize monorepo structure
3. Set up database schema
4. Build API service
5. Create Next.js frontend
6. Deploy to production

## Time Estimate
- Total rebuild time: 4-6 hours
- MVP feature complete: Today
- Production ready: Today

## Risk Assessment
- **Low Risk**: Clean rebuild eliminates technical debt
- **Medium Risk**: Data migration (minimal existing data)
- **Resolved**: All secrets available in AWS Secrets Manager
