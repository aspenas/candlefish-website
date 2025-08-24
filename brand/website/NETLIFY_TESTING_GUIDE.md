# Netlify Extension Management System - Testing Guide

This comprehensive testing suite ensures the Netlify Extension Management System meets enterprise-grade quality standards with full WCAG compliance, security best practices, and performance targets.

## 🚀 Quick Start

```bash
# Run all Netlify extension tests
npm run test:netlify

# Run only unit tests (fastest)
npm run test:netlify:unit

# Quick test without E2E and performance (moderate speed)
npm run test:netlify:quick

# Parallel execution (fastest, less verbose)
npm run test:netlify:parallel
```

## 📋 Test Categories

### 1. Unit Tests (Jest)
**Target**: 80% code coverage, <100ms per test
**Location**: `__tests__/`

#### API Client Tests
```bash
npm run test:netlify-api
```
- ✅ All API endpoint methods (GET, POST, DELETE)
- ✅ Error handling and retry logic
- ✅ Authentication token management
- ✅ Batch operations
- ✅ WebSocket connection handling
- ✅ Data validation and sanitization

#### Component Tests
```bash
npm run test:netlify-components
```
- ✅ NetlifyDashboard - Main dashboard component
- ✅ ExtensionCard - Individual extension management
- ✅ SiteSelector - Site switching and navigation
- ✅ PerformanceMetrics - Real-time metrics display
- ✅ RecommendationEngine - AI suggestions
- ✅ ConfigurationPanel - Extension settings

### 2. Integration Tests (Jest)
**Target**: Complete workflow validation, <5s per workflow
**Location**: `__tests__/integration/`

```bash
npm run test:netlify-workflows
```

**Tested Workflows**:
- Extension enablement with configuration
- AI recommendation application
- Batch extension management
- Performance monitoring integration
- Error recovery and rollback
- Multi-site coordination

### 3. End-to-End Tests (Cypress)
**Target**: Critical user journeys, <30s per journey
**Location**: `cypress/e2e/`

```bash
npm run test:netlify-e2e
```

**Critical User Journeys**:
1. **Enabling an Extension**
   - Select site → Find extension → Toggle enable → Verify success
   - Error handling and rollback scenarios
   - Bulk operations with mixed success/failure

2. **Configuring Extension Settings**
   - Open configuration modal → Modify settings → Preview changes → Save
   - Input validation and error recovery
   - Advanced configuration workflows

3. **Following AI Recommendations**
   - View recommendations → Apply suggestion → Monitor impact
   - Filtering and sorting recommendations
   - Recommendation failure handling

4. **Monitoring Performance Impact**
   - Real-time metrics display → Time range changes → Impact analysis
   - WebSocket updates → Deployment impact tracking

### 4. Performance Tests (K6)
**Target**: <50ms API response time, 1000 concurrent users
**Location**: `tests/performance/`

```bash
npm run test:netlify-performance
```

**Load Testing Scenarios**:
- **Normal Load**: 100-500 concurrent users
- **Peak Load**: 1000 concurrent users for 2 minutes
- **Stress Test**: 2000 concurrent users (breaking point)
- **Spike Test**: Sudden load increases

**API Endpoints Tested**:
- `GET /api/extensions` - List all extensions
- `GET /api/sites/{id}/extensions` - Site-specific extensions
- `POST /api/sites/{id}/extensions` - Enable extension
- `DELETE /api/sites/{id}/extensions/{ext}` - Disable extension
- `GET /api/recommendations/{id}` - ML recommendations
- `POST /api/extension-config/{site}/{ext}` - Configure extension

### 5. Security Tests (Jest)
**Target**: Zero security vulnerabilities, comprehensive auth testing
**Location**: `__tests__/security/`

```bash
npm run test:netlify-security
```

**Security Validations**:
- ✅ JWT token authentication and validation
- ✅ Authorization and permission enforcement
- ✅ Input validation and XSS prevention
- ✅ Rate limiting and DoS protection
- ✅ CSRF token validation
- ✅ Data sanitization and privacy protection
- ✅ HTTPS enforcement
- ✅ Secure error handling (no info leakage)

### 6. Accessibility Tests (Playwright + axe-core)
**Target**: WCAG 2.1 AA compliance, zero violations
**Location**: `tests/playwright/`

```bash
npm run test:netlify-accessibility
```

**Accessibility Coverage**:
- ✅ **Keyboard Navigation**: Full tab order, arrow keys, Enter/Space activation
- ✅ **Screen Reader Compatibility**: Proper ARIA labels, announcements, headings
- ✅ **Color Contrast**: WCAG AA compliance (4.5:1 ratio)
- ✅ **Motor Impairments**: 44px touch targets, click alternatives
- ✅ **Cognitive Accessibility**: Clear navigation, consistent patterns
- ✅ **Mobile Accessibility**: Responsive design, zoom support
- ✅ **High Contrast Mode**: Windows/macOS compatibility

## 📊 Test Data and Factories

### Mock Data Factory
**Location**: `__tests__/factories/netlify-factory.ts`

**Generated Test Data**:
- ✅ Mock sites (8 Candlefish sites)
- ✅ Mock extensions by category
- ✅ Performance metrics time series
- ✅ AI recommendations with confidence scores
- ✅ Extension configurations
- ✅ Deployment impact data

### Test Sites
The test suite validates against all Candlefish sites:
1. `candlefish.ai` - Main marketing site
2. `staging.candlefish.ai` - Staging environment
3. `paintbox.candlefish.ai` - Portfolio showcase
4. `inventory.candlefish.ai` - Inventory management
5. `promoteros.candlefish.ai` - Social media service
6. `claude.candlefish.ai` - Documentation site
7. `dashboard.candlefish.ai` - Operations dashboard
8. `ibm.candlefish.ai` - IBM portfolio

## 🎯 Performance Targets

| Metric | Target | Test Coverage |
|--------|--------|---------------|
| API Response Time | <50ms (95th percentile) | K6 Load Tests |
| Unit Test Speed | <100ms per test | Jest Performance |
| UI Render Time | <16ms (60 FPS) | Cypress Performance |
| Bundle Size Impact | <200KB total | Build Analysis |
| Memory Usage | <100MB peak | Memory Leak Tests |
| Error Rate | <0.1% | Reliability Tests |

## 🔒 Security Test Coverage

### Authentication Tests
- ✅ Valid JWT token acceptance
- ✅ Invalid token rejection
- ✅ Expired token handling
- ✅ Malformed token detection
- ✅ Token refresh workflows

### Authorization Tests
- ✅ Site-level permissions
- ✅ Operation-level permissions
- ✅ Role-based access control
- ✅ Organization membership validation

### Input Validation Tests
- ✅ XSS prevention (script injection)
- ✅ SQL injection prevention
- ✅ Path traversal prevention
- ✅ Command injection prevention
- ✅ Payload size limits

### Rate Limiting Tests
- ✅ API endpoint rate limits
- ✅ Write operation restrictions
- ✅ Exponential backoff
- ✅ Suspicious activity detection

## ♿ Accessibility Test Coverage

### WCAG 2.1 AA Compliance
- ✅ **Perceivable**: Color contrast, text alternatives, captions
- ✅ **Operable**: Keyboard access, timing, seizures prevention
- ✅ **Understandable**: Readable text, predictable functionality
- ✅ **Robust**: Compatible assistive technologies

### Detailed Accessibility Tests
1. **Keyboard Navigation**
   - Tab order through all interactive elements
   - Arrow key navigation for grouped controls
   - Enter/Space activation for buttons and toggles
   - Focus management during state changes

2. **Screen Reader Support**
   - Proper heading hierarchy (h1 → h2 → h3)
   - Descriptive ARIA labels and roles
   - Live region announcements for state changes
   - Form labels and error associations

3. **Visual Accessibility**
   - 4.5:1 color contrast ratio (WCAG AA)
   - No color-only information conveyance
   - High contrast mode compatibility
   - 200% zoom support without horizontal scrolling

4. **Motor Accessibility**
   - 44x44px minimum touch targets
   - Click alternatives for drag operations
   - No timing-based interactions
   - Multiple activation methods

## 🚀 Running Individual Test Suites

### Development Workflow
```bash
# Quick feedback during development
npm run test:watch

# Test specific component
npm run test -- ExtensionCard.test.tsx

# Test with coverage
npm run test:coverage

# Integration tests only
npm run test:integration
```

### CI/CD Pipeline
```bash
# Complete test suite (for CI)
npm run test:all

# Parallel execution (faster CI)
npm run test:netlify:parallel --continue-on-failure

# Pre-commit tests (fast)
npm run test:netlify:quick
```

### Debugging Tests
```bash
# Verbose output
npm run test:netlify -- --verbose

# Continue on failure (see all results)
npm run test:netlify -- --continue-on-failure

# Only unit tests (fastest debugging)
npm run test:netlify:unit
```

## 📈 Coverage Reports

### Coverage Thresholds
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Coverage Report Locations
- **HTML Report**: `coverage/lcov-report/index.html`
- **JSON Summary**: `coverage/coverage-summary.json`
- **LCOV Data**: `coverage/lcov.info`

### Coverage Analysis
```bash
# Generate detailed coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html

# Check coverage summary
cat coverage/coverage-summary.json | jq '.total'
```

## 🔧 Test Configuration

### Jest Configuration
**File**: `jest.config.js`
- Test environment: jsdom (for DOM testing)
- Module name mapping for TypeScript paths
- Coverage collection from components and utils
- Setup files for test environment

### Cypress Configuration
**File**: `cypress.config.ts`
- Base URL for E2E tests
- Video recording for failures
- Screenshot capture
- Test timeout settings

### Playwright Configuration
**File**: `playwright.config.ts`
- Multiple browser testing (Chromium, Firefox, Safari)
- Device emulation for mobile testing
- axe-core integration for accessibility
- Parallel test execution

### K6 Configuration
**File**: `tests/performance/netlify-api-load-test.js`
- Load test stages (ramp-up, sustained, ramp-down)
- Performance thresholds
- Custom metrics collection
- Multiple test scenarios

## 🐛 Debugging Failed Tests

### Common Issues and Solutions

#### Unit Test Failures
```bash
# Check for missing mocks
npm run test:netlify-api -- --verbose

# Verify test data factories
npm run test -- __tests__/factories/netlify-factory
```

#### E2E Test Failures
```bash
# Run with headed browser
npm run test:e2e:open

# Check Cypress videos/screenshots
ls cypress/videos cypress/screenshots
```

#### Performance Test Failures
```bash
# Check API connectivity
curl -I http://localhost:3000/api/health

# Verify K6 installation
k6 version
```

#### Accessibility Test Failures
```bash
# Run specific accessibility rules
npm run test:accessibility -- --grep "color-contrast"

# Check axe violations details
npm run test:accessibility -- --reporter=json
```

## 📋 Test Checklist

Before deploying the Netlify Extension Management System:

### ✅ Unit Tests
- [ ] All API client methods tested
- [ ] All React components tested
- [ ] Error boundaries tested
- [ ] Custom hooks tested
- [ ] Utility functions tested

### ✅ Integration Tests
- [ ] Complete user workflows tested
- [ ] API integration tested
- [ ] State management tested
- [ ] WebSocket connections tested

### ✅ E2E Tests
- [ ] Critical user journeys pass
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
- [ ] Error scenarios handled

### ✅ Performance Tests
- [ ] API responses <50ms
- [ ] 1000 concurrent users supported
- [ ] Memory usage within limits
- [ ] Bundle size optimized

### ✅ Security Tests
- [ ] Authentication enforced
- [ ] Authorization validated
- [ ] Input sanitization working
- [ ] Rate limiting active

### ✅ Accessibility Tests
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation working
- [ ] Screen reader compatible
- [ ] Color contrast adequate

## 🚨 Emergency Test Procedures

### Production Issue Investigation
```bash
# Quick health check
npm run test:netlify:unit

# Focused integration testing
npm run test:netlify-workflows

# Performance validation
npm run test:netlify-performance
```

### Rollback Validation
```bash
# Test current version
npm run test:netlify

# Compare with baseline
git checkout main
npm run test:netlify
```

### Security Incident Response
```bash
# Run security test suite
npm run test:netlify-security

# Check for new vulnerabilities
npm audit --audit-level=high

# Validate authentication flows
npm run test -- --grep "authentication"
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Cypress Documentation](https://docs.cypress.io/)
- [Playwright Documentation](https://playwright.dev/)
- [K6 Documentation](https://k6.io/docs/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Built with ⚡ by the Candlefish AI team**

Last updated: August 2024
