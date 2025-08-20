# Candlefish.ai Website - Comprehensive Test Suite Documentation

## Overview

This document outlines the comprehensive test suite implemented for the Candlefish.ai production website. The test suite ensures 80%+ code coverage and covers all critical aspects of the application including functionality, performance, accessibility, and security.

## Test Architecture

### Test Pyramid Structure
- **Unit Tests** (70%): Fast, isolated tests for individual components and functions
- **Integration Tests** (20%): Tests for API endpoints and component interactions
- **E2E Tests** (10%): End-to-end user journey tests

## Test Categories

### 1. Unit Tests 🧪

#### UI Components (`__tests__/components/`)
- **Button.test.tsx**: Complete button component testing including variants, states, events, and accessibility
- **Input.test.tsx**: Input field testing with validation, error states, icons, and form integration
- **Card.test.tsx**: Card component and all sub-components (Header, Title, Content, Footer)
- **Badge.test.tsx**: Badge variants, sizes, and semantic usage patterns
- **Progress.test.tsx**: Progress bars and stepped progress components
- **LoadingSpinner.test.tsx**: Loading states and spinner variations
- **AssessmentForm.test.tsx**: Complex form component with multi-step workflow

#### Custom Hooks (`__tests__/hooks/`)
- **useApi.test.tsx**: API state management, pagination, error handling
- **useAuth.test.tsx**: Authentication flow, token management, persistence
- **useForm.test.tsx**: Form validation, field management, submission handling
- **useLocalStorage.test.tsx**: Browser storage integration and SSR compatibility

#### Utility Functions (`__tests__/utils/`)
- **api.test.ts**: HTTP client, request/response handling, error management
- **cn.test.ts**: CSS class utility function for styling

### 2. Integration Tests 🔗

#### API Endpoints (`__tests__/integration/`)
- **api-endpoints.test.ts**: Complete API endpoint testing including:
  - Authentication (login, register, refresh, logout)
  - Assessment submission and retrieval
  - Lead management and CRM integration
  - Content management system
  - Case studies and blog content
  - Contact form submissions
  - Analytics and tracking
  - Error handling and validation

### 3. End-to-End Tests 🎭

#### Cypress Tests (`cypress/e2e/`)
- **homepage.cy.ts**: Homepage functionality, navigation, responsive design
- **assessment.cy.ts**: Complete assessment workflow from start to results
- Custom commands for common operations in `cypress/support/commands.ts`

### 4. Accessibility Tests ♿

#### Playwright Accessibility (`tests/playwright/`)
- **accessibility.test.ts**: WCAG 2.1 AA compliance testing including:
  - Automated accessibility scanning with axe-core
  - Keyboard navigation testing
  - Screen reader compatibility
  - Color contrast validation
  - Focus management
  - Semantic HTML structure
  - Error message accessibility
  - Responsive accessibility

### 5. Visual Regression Tests 👁️

#### Visual Testing (`tests/playwright/`)
- **visual.test.ts**: Visual consistency testing including:
  - Homepage visual snapshots across devices
  - Component state variations
  - Form validation visual states
  - Dark mode compatibility
  - Loading and error states
  - Responsive breakpoint testing
  - Animation consistency
  - Print styles

### 6. Performance Tests ⚡

#### Load Testing (`tests/performance/`)
- **load-test.js**: K6 performance testing including:
  - Smoke tests (basic functionality)
  - Load tests (normal expected traffic)
  - Stress tests (beyond normal capacity)
  - Spike tests (sudden traffic increases)
  - API response time validation
  - Resource usage monitoring
  - Performance budget enforcement

#### Lighthouse CI
- **lighthouserc.js**: Web performance and quality metrics:
  - Core Web Vitals monitoring
  - Performance scoring (target: 85+)
  - Accessibility compliance (target: 95+)
  - SEO optimization (target: 90+)
  - Best practices validation (target: 90+)
  - Resource budget monitoring

## Test Configuration Files

### Jest Configuration
- **jest.config.js**: Unit test configuration with Next.js integration
- **jest.setup.js**: Global test setup and mocks
- Coverage thresholds: 80% for branches, functions, lines, and statements

### Testing Framework Setup
- **React Testing Library**: Component testing with user-centric queries
- **Jest**: JavaScript testing framework with snapshot testing
- **Cypress**: E2E testing with real browser automation
- **Playwright**: Cross-browser testing for accessibility and visual regression
- **K6**: Load testing and performance validation
- **Axe-core**: Automated accessibility testing

## CI/CD Integration

### GitHub Actions (`.github/workflows/test.yml`)
The complete CI/CD pipeline includes:

1. **Unit & Integration Tests**
   - Linting and type checking
   - Jest test execution
   - Coverage reporting with Codecov

2. **Build Verification**
   - Next.js build validation
   - Static analysis

3. **E2E Testing**
   - Multi-browser Cypress tests (Chrome, Firefox, Edge)
   - Parallel test execution
   - Video/screenshot capture on failure

4. **Accessibility Testing**
   - WCAG compliance validation
   - Keyboard navigation testing
   - Screen reader compatibility

5. **Visual Regression Testing**
   - Cross-browser visual comparisons
   - Responsive design validation
   - Component state verification

6. **Performance Testing**
   - Load testing with K6
   - Lighthouse CI integration
   - Performance budget validation

7. **Security Testing**
   - Dependency vulnerability scanning
   - CodeQL analysis
   - Security audit reporting

## Test Data Management

### Mock Data
- API response mocking for consistent testing
- User fixtures for authentication testing
- Assessment data for form testing
- Error scenarios for error handling validation

### Test Environment Variables
- Separate configuration for test, development, and production
- API endpoint configuration
- Feature flag testing
- Security credential isolation

## Coverage Requirements

### Minimum Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Critical Path Coverage
- Assessment submission workflow: 95%+
- Authentication flow: 95%+
- Lead generation forms: 95%+
- Payment processing (if applicable): 100%

## Running Tests

### Local Development
```bash
# Unit tests
npm test                    # Run all unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report

# E2E tests
npm run test:e2e           # Run Cypress tests headless
npm run test:e2e:open      # Open Cypress test runner

# Accessibility tests
npm run test:accessibility # Run Playwright accessibility tests

# Visual regression tests
npm run test:visual        # Run visual regression tests

# Performance tests
npm run test:performance   # Run K6 load tests

# All tests
npm run test:all          # Run complete test suite
```

### CI Environment
Tests run automatically on:
- Every push to main/develop branches
- Every pull request
- Scheduled daily runs for performance monitoring

## Test Maintenance

### Regular Updates
- Test data refresh (monthly)
- Visual regression baseline updates (as needed)
- Performance benchmark adjustments (quarterly)
- Accessibility standards updates (as WCAG evolves)

### Test Debugging
- Detailed error reporting in CI
- Screenshot/video capture for E2E failures
- Performance metrics trending
- Accessibility violation reporting

## Quality Gates

### Pull Request Requirements
- All unit tests must pass
- Coverage thresholds must be met
- E2E tests must pass on all target browsers
- No accessibility violations
- Performance budget compliance
- No security vulnerabilities

### Production Deployment Gates
- Complete test suite passing
- Load testing validation
- Lighthouse score requirements met
- Visual regression approval
- Security scan clearance

## Future Enhancements

### Planned Improvements
1. **API Contract Testing**: Implement Pact for consumer-driven contract testing
2. **Cross-Browser Testing**: Expand browser matrix for comprehensive coverage
3. **Mobile Testing**: Add mobile device testing with real device cloud
4. **Mutation Testing**: Implement mutation testing for test quality validation
5. **Performance Monitoring**: Continuous performance monitoring in production

### Tool Considerations
- **Storybook**: Component documentation and visual testing
- **Chromatic**: Advanced visual regression testing
- **TestCafe**: Alternative E2E testing framework
- **WebdriverIO**: Additional browser automation
- **Artillery.io**: Alternative load testing tool

## Metrics and Reporting

### Test Metrics Tracked
- Test execution time trends
- Flaky test identification
- Coverage trend analysis
- Performance regression detection
- Accessibility compliance scoring

### Reporting Tools
- **Codecov**: Coverage reporting and trends
- **Lighthouse CI**: Performance monitoring
- **GitHub**: Test status and PR integration
- **Slack**: Failure notifications (if configured)

## Support and Documentation

### Getting Help
- Test-related issues: Create GitHub issue with `testing` label
- Performance concerns: Tag with `performance` label
- Accessibility questions: Tag with `accessibility` label

### Contributing to Tests
1. Follow existing test patterns and naming conventions
2. Ensure new features include corresponding tests
3. Update documentation for new testing utilities
4. Maintain test data fixtures
5. Review test coverage reports before merging

---

This comprehensive test suite ensures the Candlefish.ai website maintains high quality, performance, and accessibility standards while supporting rapid development and deployment cycles.