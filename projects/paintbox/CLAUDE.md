# Eggshell Project - Claude Code Configuration

## Project Overview

Eggshell is a sophisticated Excel-to-web application that replicates 14,000+ formulas from a complex Excel workbook (bart3.20.xlsx) into a modern Next.js web application. The project features real-time calculations, Salesforce CRM integration, Company Cam photo management, and offline-first architecture.

## Technology Stack

- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript 5 with strict mode
- **Styling**: Tailwind CSS v4 with custom Eggshell design system
- **State**: Zustand 5.0.7 with persistence
- **Calculations**: decimal.js, mathjs, formula-parser
- **Integrations**: jsforce (Salesforce), Company Cam API
- **Caching**: Redis with ioredis client
- **Security**: AWS Secrets Manager, Infisical
- **Monitoring**: Sentry, OpenTelemetry

## Core Business Logic

The application centers around:

- **14,000+ Excel formulas** translated to TypeScript
- **Multi-step workflow**: Client Info → Exterior → Interior → Review → Finalize
- **Real-time calculations** with high precision
- **Good/Better/Best pricing** options
- **PDF generation** for professional estimates

## Agent Configurations

### 1. Excel Formula Specialist (excel-formula-specialist)

**Purpose**: Maintain and extend the Excel formula engine
**Focus Areas**:

- `/lib/excel-engine/` - Formula translation and execution
- `/lib/calculations/` - Pricing engine implementation
- `/analyze_*.py` - Excel analysis scripts
- `excel_analysis.json` - Formula mapping data

**Key Tasks**:

- Translate new Excel formulas to TypeScript
- Debug calculation discrepancies
- Optimize formula performance
- Maintain Excel parity testing

### 2. Integration Specialist (api-integration-specialist)

**Purpose**: Manage external service integrations
**Focus Areas**:

- `/lib/services/salesforce.ts` - CRM integration
- `/lib/services/companycam*.ts` - Photo management
- `/app/api/v1/salesforce/` - API endpoints
- `/app/api/webhooks/` - Webhook handlers

**Key Tasks**:

- Implement new Salesforce objects/fields
- Enhance Company Cam woodwork tagging
- Handle OAuth token refresh
- Add webhook event processing

### 3. Performance Optimizer (performance-optimizer)

**Purpose**: Optimize calculation speed and caching
**Focus Areas**:

- `/lib/cache/` - Redis caching layer
- `/lib/calculations/real-time-calculator.ts`
- `/lib/services/websocket-service.ts`
- `/hooks/useWebSocket.ts`

**Key Tasks**:

- Implement formula result caching
- Optimize real-time update performance
- Reduce calculation latency
- Enhance WebSocket efficiency

### 4. Test Coverage Specialist (test-coverage-specialist)

**Purpose**: Expand test coverage across the application
**Focus Areas**:

- `/lib/calculations/__tests__/`
- `/scripts/test-*.ts` - Service testing
- Excel parity validation
- Integration test suites

**Key Tasks**:

- Add missing unit tests for services
- Create integration test suites
- Implement Excel parity validation
- Test error handling paths

### 5. Mobile PWA Specialist (mobile-pwa-specialist)

**Purpose**: Enhance tablet and mobile experience
**Focus Areas**:

- `/components/workflow/` - Touch-optimized components
- `/app/manifest.json` - PWA configuration
- Service worker implementation
- Offline functionality

**Key Tasks**:

- Optimize touch interactions
- Implement service worker caching
- Enhance offline capabilities
- Add PWA install prompts

### 6. Security & Compliance Agent (security-compliance)

**Purpose**: Ensure enterprise-grade security
**Focus Areas**:

- `/lib/middleware/` - Security middleware
- `/lib/services/secrets-manager.ts`
- API authentication mechanisms
- CORS and CSP policies

**Key Tasks**:

- Implement API rate limiting
- Enhance request validation
- Add audit logging
- Strengthen authentication

## Development Workflow

### Running the Project

```bash
npm install
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Test specific services
npm run test:companycam
npm run test:salesforce
npm run test:calculations
```

### Building for Production

```bash
npm run build
npm start
```

### Deployment

```bash
# Deploy to Vercel
./scripts/deploy.sh vercel

# Deploy to Docker
./scripts/deploy.sh docker

# Deploy to Render
./scripts/deploy.sh render
```

## Key Files and Directories

### Core Application

- `/app/` - Next.js pages and API routes
- `/components/` - React components
- `/lib/` - Business logic and services
- `/stores/` - Zustand state management

### Configuration

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript settings
- `vercel.json` - Deployment configuration
- `.env.local` - Environment variables

### Documentation

- `README.md` - Project overview
- `COMPREHENSIVE_IMPLEMENTATION_PLAN.md` - Technical roadmap
- `excel_to_webapp_mapping.md` - Excel formula documentation
- `/docs/` - Additional documentation

## Critical Considerations

### Excel Formula Accuracy

- All calculations must match Excel exactly
- Use decimal.js for financial precision
- Test against original Excel file regularly

### Integration Reliability

- Handle API rate limits gracefully
- Implement circuit breakers for external services
- Cache responses appropriately

### Performance Requirements

- Calculations should complete < 100ms
- Real-time updates via WebSocket
- Optimize for tablet devices in field

### Security Requirements

- Never expose API keys in client code
- Use AWS Secrets Manager for production
- Validate all user inputs
- Implement proper CORS policies

## Common Tasks

### Adding a New Formula

1. Analyze formula in Excel workbook
2. Implement in `/lib/excel-engine/formula-engine.ts`
3. Add tests in `/lib/calculations/__tests__/`
4. Verify against Excel output

### Adding a New Integration

1. Create service in `/lib/services/`
2. Add API routes in `/app/api/v1/`
3. Implement caching strategy
4. Add error handling and retries

### Optimizing Performance

1. Profile with Chrome DevTools
2. Identify calculation bottlenecks
3. Implement memoization/caching
4. Test on actual tablets

## Project-Specific Patterns

### State Management

- Use Zustand for global state
- Persist to localStorage
- Sync with server periodically

### Error Handling

- Graceful degradation for offline
- User-friendly error messages
- Log errors to Sentry
- Implement retry logic

### Code Style

- Strict TypeScript types
- Functional components with hooks
- Service layer for business logic
- Comprehensive JSDoc comments

## Contact and Resources

- **Original Excel**: `bart3.20.xlsx` (source of truth)
- **Salesforce Sandbox**: Available for testing
- **Company Cam API**: Test credentials in secrets
- **Support**: Check implementation status in `IMPLEMENTATION_STATUS.md`
