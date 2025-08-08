# Paintbox Project Context - Security Implementation

## Project State (January 2025)

### Overview

Paintbox is a sophisticated Excel-to-web application that replicates 14,000+ formulas from a complex Excel workbook (bart3.20.xlsx) into a modern Next.js web application. The project recently underwent a major security overhaul to address critical vulnerabilities in the Railway backend deployment.

### Current Architecture

#### Technology Stack

- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript 5 with strict mode
- **Styling**: Tailwind CSS v4 with custom Paintbox design system
- **State Management**: Zustand 5.0.7 with persistence
- **Calculations**: decimal.js, mathjs, formula-parser
- **Integrations**:
  - Salesforce CRM (jsforce)
  - Company Cam API
  - AWS Secrets Manager
- **Caching**: Redis with ioredis client
- **Monitoring**: Sentry, OpenTelemetry, CloudWatch

### Recent Security Implementation

#### Critical Issues Addressed

1. **Exposed Production Credentials**: Removed plaintext secrets from .env files
2. **Insecure Deployment Scripts**: Replaced deploy-railway-direct.sh that exposed secrets
3. **Weak Security Tokens**: Implemented cryptographically secure token generation
4. **Mixed Secret Management**: Centralized all secrets in AWS Secrets Manager

#### New Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                Production Environment                 │
├─────────────────────────┬───────────────────────────┤
│   Railway/Vercel        │      AWS Security         │
│   ┌──────────────┐      │   ┌─────────────────┐    │
│   │ Next.js App  │      │   │ Secrets Manager │    │
│   └──────┬───────┘      │   └────────┬────────┘    │
│          │              │            │              │
│   ┌──────▼───────┐      │   ┌────────▼────────┐    │
│   │ Backend API  │◄─────┼───┤      KMS        │    │
│   └──────┬───────┘      │   └─────────────────┘    │
│          │              │                          │
├──────────┼──────────────┴───────────────────────────┤
│          │              Database Layer              │
│   ┌──────▼───────┐   ┌─────────────┐   ┌────────┐ │
│   │ PostgreSQL   │   │ Audit Logs  │   │ Redis  │ │
│   └──────────────┘   └─────────────┘   └────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Key Components Implemented

1. **Secrets Service** (`/lib/services/secrets-service.ts`)
   - AWS Secrets Manager integration
   - Redis caching with TTL
   - Automatic retry and fallback

2. **Security Middleware**
   - JWT authentication with RS256
   - Rate limiting per endpoint
   - Request validation (JSON Schema)
   - Comprehensive audit logging

3. **Security UI Components**
   - SecretsManagementDashboard
   - ServiceStatusMonitor
   - AuditLogViewer
   - SecurityConfigurationPanel

4. **CI/CD Pipeline**
   - GitHub Actions with security scanning
   - Container vulnerability scanning (Trivy)
   - Secret detection (TruffleHog)
   - Infrastructure security (Checkov)

### Current File Structure

```
/projects/paintbox/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── v1/           # Versioned API endpoints
│   ├── estimate/          # Multi-step workflow pages
│   └── admin/            # Admin interfaces
├── components/            # React components
│   ├── workflow/         # Workflow-specific components
│   ├── ui/              # Reusable UI components
│   └── secrets/         # Security management UI
├── lib/                  # Core business logic
│   ├── calculations/    # Excel formula engine
│   ├── services/       # External service integrations
│   ├── middleware/     # Security middleware
│   └── cache/         # Redis caching layer
├── stores/              # Zustand state management
├── hooks/              # Custom React hooks
├── scripts/            # Deployment and utility scripts
├── terraform/          # Infrastructure as Code
├── monitoring/         # CloudWatch dashboards
└── __tests__/         # Comprehensive test suite
```

### Key Architectural Decisions

#### 1. Excel Formula Engine

- **Decision**: Translate Excel formulas to TypeScript rather than embedding Excel
- **Rationale**: Better performance, type safety, and maintainability
- **Implementation**: Custom formula parser with decimal.js for precision

#### 2. State Management

- **Decision**: Zustand over Redux or Context API
- **Rationale**: Simpler API, better TypeScript support, built-in persistence
- **Implementation**: Separate stores for workflow, calculations, and UI state

#### 3. Security Architecture

- **Decision**: AWS Secrets Manager with runtime fetching
- **Rationale**: Enterprise-grade security, automatic rotation, audit trail
- **Implementation**: Secrets service with Redis caching for performance

#### 4. API Design

- **Decision**: RESTful API with versioning (/api/v1/)
- **Rationale**: Clear contracts, easier testing, backward compatibility
- **Implementation**: Next.js API routes with middleware stack

#### 5. Deployment Strategy

- **Decision**: Multi-environment with blue-green deployment
- **Rationale**: Zero-downtime updates, easy rollback
- **Implementation**: GitHub Actions + Terraform + Docker

### Integration Points

#### Salesforce Integration

- **Authentication**: OAuth 2.0 with refresh token flow
- **Data Sync**: Bi-directional sync for projects and estimates
- **Error Handling**: Circuit breaker pattern with exponential backoff

#### Company Cam Integration

- **Photo Management**: Automatic woodwork detection and tagging
- **Webhook Processing**: Real-time photo updates
- **Rate Limiting**: Respects API limits with queuing

### Performance Optimizations

1. **Calculation Engine**
   - Memoization of formula results
   - Lazy evaluation of dependent formulas
   - WebWorker for heavy calculations

2. **API Caching**
   - Redis caching with smart invalidation
   - Edge caching for static resources
   - Service Worker for offline support

3. **Frontend Optimization**
   - Code splitting by route
   - Dynamic imports for heavy components
   - Image optimization with next/image

### Security Measures

1. **Authentication**
   - JWT tokens with short expiry
   - Refresh token rotation
   - MFA support (planned)

2. **Authorization**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - Audit trail for all actions

3. **Data Protection**
   - Encryption at rest (AES-256)
   - TLS 1.3 for transit
   - PII data masking in logs

### Monitoring & Observability

1. **Application Monitoring**
   - Sentry for error tracking
   - Custom CloudWatch metrics
   - Real-time dashboards

2. **Infrastructure Monitoring**
   - AWS CloudWatch for resources
   - Route 53 health checks
   - Automated alerting

3. **Security Monitoring**
   - AWS GuardDuty for threats
   - CloudTrail for audit logs
   - Security Hub for compliance

### Known Issues & Technical Debt

1. **Excel Parity**
   - Some complex array formulas not yet implemented
   - Date handling differences between Excel and JavaScript

2. **Performance**
   - Large projects (1000+ items) can be slow
   - Real-time sync needs optimization

3. **Testing**
   - Integration tests need expansion
   - E2E tests don't cover all workflows

### Future Roadmap

1. **Q1 2025**
   - Complete MFA implementation
   - Add offline-first PWA features
   - Implement automated secret rotation

2. **Q2 2025**
   - GraphQL API migration
   - Advanced caching strategies
   - Performance optimization phase

3. **Q3 2025**
   - Machine learning for pricing optimization
   - Advanced reporting features
   - Multi-tenant architecture

### Development Guidelines

1. **Code Standards**
   - Strict TypeScript with no any types
   - Functional components only
   - Comprehensive JSDoc comments

2. **Testing Requirements**
   - Minimum 80% code coverage
   - Security tests for all endpoints
   - Performance benchmarks

3. **Security Practices**
   - Never commit secrets
   - Use approved cryptography
   - Regular dependency updates

### Environment Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Deployment Process

```bash
# Deploy to staging
./scripts/secure-deploy.sh --environment staging

# Run security scan
npm run security:scan

# Deploy to production (after approval)
./scripts/zero-downtime-deploy.sh --environment production
```

## Contact & Resources

- **Technical Lead**: Patrick Smith
- **Original Excel**: bart3.20.xlsx (source of truth)
- **Documentation**: See /docs directory
- **Support**: Check IMPLEMENTATION_STATUS.md

---

Last Updated: January 2025
Security Implementation: Complete
Next Review: February 2025
