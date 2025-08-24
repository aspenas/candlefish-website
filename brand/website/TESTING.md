# Netlify Extension Management - Comprehensive Testing Guide

This document provides a complete guide to the comprehensive test suite created for the Netlify Extension Management system.

## Overview

The test suite covers all aspects of the Netlify extension management functionality with the following test types:

- ✅ **Unit Tests** - Jest + React Testing Library
- ✅ **API Endpoint Tests** - Jest + Supertest
- ✅ **Component Tests** - React Testing Library
- ✅ **Integration Tests** - Cross-feature workflows
- ✅ **E2E Tests** - Playwright with Page Object Model
- ✅ **Performance Tests** - K6 load testing
- ✅ **WebSocket Tests** - Real-time feature testing
- ✅ **Accessibility Tests** - axe-core WCAG 2.1 AA compliance
- ✅ **Security Tests** - Authentication, XSS, rate limiting
- ✅ **Coverage Validation** - 80% minimum, 85% for Netlify code

## Quick Start

```bash
# Run all tests
npm run test:netlify

# Run only unit tests (fastest)
npm run test:netlify:unit

# Skip slow tests (no E2E/performance)
npm run test:netlify:quick

# CI mode with detailed output
npm run test:netlify:ci

# Individual test suites
npm run test:netlify-components
npm run test:netlify-performance
npm run test:netlify-accessibility
npm run test:netlify-security
```

## Test Structure

```
__tests__/
├── api/
│   ├── netlify-api-client.test.ts      # API client unit tests
│   └── netlify-endpoints.test.ts       # API endpoint tests
├── components/netlify/
│   ├── ExtensionCatalog.test.tsx       # Extension catalog tests
│   ├── BulkDeploymentInterface.test.tsx # Bulk deployment tests
│   └── HealthMonitoringDashboard.test.tsx # Health monitoring tests
├── integration/
│   └── netlify-workflows.test.ts       # Cross-feature integration tests
├── e2e/
│   └── netlify-extension-management.spec.ts # End-to-end tests
├── performance/k6/
│   ├── netlify-api-load-test.js        # API performance tests
│   └── websocket-performance-test.js   # WebSocket performance tests
├── accessibility/
│   └── netlify-accessibility.test.ts   # WCAG compliance tests
├── security/
│   └── netlify-security.test.ts        # Security tests
└── factories/
    └── netlify-factory.ts              # Test data factories
```

## Performance Requirements

All tests are designed to validate these performance targets:

- **API Response Time**: < 50ms average
- **Concurrent Users**: Support for 1000 concurrent users
- **WebSocket Latency**: < 100ms for real-time updates
- **Memory Usage**: Stable under load testing
- **Error Rate**: < 0.1% under normal load

## Coverage Requirements

- **Global Coverage**: 80% minimum (branches, functions, lines, statements)
- **Netlify Specific**: 85% minimum for Netlify extension code
- **Critical Paths**: 95% for authentication and deployment workflows

## Test Categories

### 1. Unit Tests

**Location**: `__tests__/api/netlify-api-client.test.ts`

Tests the core API client with comprehensive mocking:
- All API methods (GET, POST, PUT, DELETE)
- Error handling and retry logic
- WebSocket connection management
- Authentication token handling
- Rate limiting behavior

```bash
npm test -- __tests__/api/netlify-api-client.test.ts
```

### 2. API Endpoint Tests

**Location**: `__tests__/api/netlify-endpoints.test.ts`

Tests Next.js API routes:
- Extension listing and filtering
- Site management operations
- Bulk deployment workflows
- Health monitoring endpoints
- Input validation and sanitization

```bash
npm test -- __tests__/api/netlify-endpoints.test.ts
```

### 3. Component Tests

**Location**: `__tests__/components/netlify/`

Tests React components with user interactions:
- **ExtensionCatalog**: Search, filter, selection, bulk actions
- **BulkDeploymentInterface**: Progress tracking, error handling
- **HealthMonitoringDashboard**: Real-time updates, charts

```bash
npm test -- __tests__/components/netlify/
```

### 4. Integration Tests

**Location**: `__tests__/integration/netlify-workflows.test.ts`

Tests complete workflows:
- Extension discovery → deployment → monitoring
- Bulk operations with partial failures
- Real-time WebSocket updates
- Cross-component state consistency

```bash
npm test -- __tests__/integration/netlify-workflows.test.ts
```

### 5. E2E Tests (Playwright)

**Location**: `__tests__/e2e/netlify-extension-management.spec.ts`

Tests user journeys across the full application:
- Extension catalog browsing and search
- Single and bulk deployment workflows
- Error recovery and retry mechanisms
- Real-time status updates
- Responsive design across devices

```bash
npx playwright test __tests__/e2e/netlify-extension-management.spec.ts
```

### 6. Performance Tests (K6)

**Location**: `__tests__/performance/k6/`

Load testing with realistic scenarios:
- **API Load**: 1000 concurrent users, <50ms response
- **WebSocket**: High-frequency messaging, connection stability
- **Stress Testing**: Peak load scenarios
- **Spike Testing**: Sudden traffic bursts

```bash
k6 run __tests__/performance/k6/netlify-api-load-test.js
k6 run __tests__/performance/k6/websocket-performance-test.js
```

### 7. Accessibility Tests

**Location**: `__tests__/accessibility/netlify-accessibility.test.ts`

WCAG 2.1 AA compliance testing:
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation
- ARIA attributes and labels
- Focus management

```bash
npx playwright test __tests__/accessibility/netlify-accessibility.test.ts
```

### 8. Security Tests

**Location**: `__tests__/security/netlify-security.test.ts`

Security validation:
- XSS prevention
- SQL injection protection
- CSRF token validation
- Rate limiting enforcement
- Authentication bypass attempts
- Input sanitization
- HTTP security headers

```bash
npm test -- __tests__/security/netlify-security.test.ts
```

## CI/CD Integration

### GitHub Actions Workflow

The test suite is fully integrated into GitHub Actions (`/.github/workflows/website-testing.yml`):

```yaml
# Runs on:
- Push to brand/website/**
- Pull requests
- Daily scheduled runs
- Manual dispatch

# Test Jobs:
- unit-tests: Jest + coverage validation
- performance-tests: K6 load testing
- e2e-tests: Playwright (Chrome/Firefox + Desktop/Mobile)
- accessibility-tests: WCAG compliance
- security-scan: Security testing + OWASP ZAP
- test-summary: Comprehensive reporting
```

### Coverage Reporting

- **Codecov Integration**: Automatic coverage uploads
- **HTML Reports**: Detailed coverage visualization
- **Threshold Enforcement**: CI fails if coverage drops below 80%
- **Netlify-Specific Tracking**: Higher requirements (85%) for extension code

## Local Development

### Setup

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install --with-deps

# Install K6 (macOS)
brew install k6

# Install K6 (Linux)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Running Tests

```bash
# Full test suite
npm run test:netlify

# Development workflow
npm run test:netlify:unit           # Fast unit tests only
npm run test:netlify:quick          # Skip slow E2E/performance
npm test -- --watch               # Watch mode for TDD

# Coverage analysis
npm run test:coverage              # Generate coverage report
node scripts/check-coverage.js    # Validate coverage thresholds

# Individual categories
npm run test:netlify-components    # Component tests only
npm run test:netlify-accessibility # Accessibility only
npm run test:netlify-performance   # Performance only
```

### Test Data Management

The `netlify-factory.ts` provides consistent test data:

```typescript
import { createMockExtension, createMockSite, createWebSocketMessage } from '../factories/netlify-factory';

// In your tests
const extension = createMockExtension({ name: 'Custom Extension' });
const site = createMockSite({ id: 'test-site-123' });
const wsMessage = createWebSocketMessage('deployment_complete', { siteId: 'test-site' });
```

## Debugging Tests

### Common Issues

1. **Flaky E2E Tests**
   ```bash
   # Run with retry
   npx playwright test --retries=3
   
   # Debug mode
   npx playwright test --debug
   ```

2. **Performance Test Failures**
   ```bash
   # Check if application is running
   curl http://localhost:3000/health
   
   # Run with reduced load
   k6 run --vus=10 --duration=30s __tests__/performance/k6/netlify-api-load-test.js
   ```

3. **Coverage Below Threshold**
   ```bash
   # See uncovered lines
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

### Test Environment Variables

```bash
# Set test timeout
JEST_TIMEOUT=30000

# Skip slow tests
SKIP_E2E_TESTS=true
SKIP_PERFORMANCE_TESTS=true

# Performance test configuration
PERFORMANCE_VUS=100
PERFORMANCE_DURATION=60s
```

## Best Practices

### Writing Tests

1. **Use Page Object Model** for E2E tests
2. **Mock external APIs** consistently
3. **Test error scenarios** not just happy paths
4. **Use data factories** for consistent test data
5. **Write descriptive test names** that explain behavior

### Maintaining Tests

1. **Update tests** when features change
2. **Keep factories updated** with new fields
3. **Review failing tests** promptly
4. **Monitor performance trends** over time
5. **Update browser versions** regularly

## Reporting

### Coverage Reports

- **HTML**: `coverage/lcov-report/index.html`
- **JSON**: `coverage/coverage-summary.json`
- **Markdown**: `coverage/report.md`

### Test Results

- **JSON**: `reports/test-suite-results.json`
- **HTML**: `reports/test-summary.html`
- **CI Summary**: GitHub Actions step summary

### Performance Metrics

- **K6 Results**: `performance-results/`
- **Memory Usage**: Tracked during tests
- **Response Times**: Percentile analysis

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout in jest.config.js |
| Browser crashes | Update Playwright browsers |
| K6 not found | Install K6 via package manager |
| Coverage fails | Check that all files are being tested |
| E2E flaky | Add better wait conditions |
| Performance varies | Run on consistent hardware |

## Contributing

When adding new features to the Netlify extension system:

1. **Add unit tests** for new functions
2. **Update component tests** for UI changes  
3. **Add E2E scenarios** for new user flows
4. **Update performance tests** if adding new endpoints
5. **Test accessibility** for new UI components
6. **Add security tests** for new input handling

---

This comprehensive test suite ensures the Netlify Extension Management system is reliable, performant, secure, and accessible. All tests are designed to run in both local development and CI/CD environments with consistent results.
