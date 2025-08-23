# Candlefish Website Testing Suite

This document describes the comprehensive testing strategy implemented for the Candlefish website, ensuring exceptional quality standards for our operational atelier.

## Overview

The testing suite follows the test pyramid approach with extensive automation:

```
         /\
        /  \       E2E Tests (Cypress)
       /    \      Visual & Accessibility (Playwright) 
      /      \     Performance & Load Testing (K6)
     /________\    
    /          \   Integration Tests (API Routes)
   /____________\  Unit Tests (Jest + React Testing Library)
```

## Test Categories

### 1. Unit Tests

**Location**: `__tests__/components/`, `__tests__/hooks/`, `__tests__/utils/`
**Framework**: Jest + React Testing Library
**Coverage Target**: 80% minimum

#### Key Components Tested:
- **HeaderText**: Rotation mechanics, mist effect animation, client-side hydration
- **SystemActivity**: Bar animation, smooth noise generation, device pixel ratio handling
- **SystemArchitecture**: WebGL rendering, node interactions, status cycling

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### 2. Integration Tests

**Location**: `__tests__/integration/`
**Framework**: Jest with real API route handlers

#### Covered Areas:
- Health check endpoint reliability
- Contact form validation and processing
- Request logging and data flow integrity
- Error handling across API routes

```bash
# Run integration tests
npm run test:integration
```

### 3. End-to-End Tests

**Location**: `cypress/e2e/`
**Framework**: Cypress
**Coverage**: Critical user journeys

#### Test Scenarios:
- Homepage loading and animation performance
- Responsive design across devices
- Accessibility compliance
- Animation behavior with reduced motion
- WebGL fallback handling

```bash
# Run E2E tests
npm run test:e2e

# Open Cypress GUI
npm run test:e2e:open
```

### 4. Performance Tests

**Location**: `__tests__/performance/`
**Frameworks**: Jest (animation), K6 (load), Lighthouse (audit)

#### Performance Metrics:
- **Animation FPS**: Target 60fps, graceful degradation
- **Memory Usage**: Leak detection, cleanup verification
- **Load Time**: <5 seconds with complex animations
- **Lighthouse Score**: Performance >90, Accessibility >95

```bash
# Run animation performance tests
npm run test:animation

# Run load tests (requires K6)
npm run test:performance

# Full performance audit
npm run lighthouse
```

### 5. Visual Regression Tests

**Location**: `tests/playwright/`
**Framework**: Playwright

#### Visual Coverage:
- Component rendering consistency
- Animation state capture
- Cross-browser visual differences
- Mobile vs desktop layouts

```bash
# Run visual tests
npm run test:visual
```

### 6. Accessibility Tests

**Framework**: Playwright with @axe-core
**Standards**: WCAG 2.1 AA compliance

#### Accessibility Checks:
- Canvas element ARIA attributes
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- Motion preference handling

```bash
# Run accessibility tests
npm run test:accessibility
```

## Automation & CI/CD

### GitHub Actions Workflow

**File**: `.github/workflows/website-testing.yml`

The workflow runs on:
- Every push to `brand/website/**`
- Pull requests
- Daily schedule (2 AM UTC)
- Manual dispatch

#### Test Matrix:
- **Browsers**: Chrome, Firefox
- **Viewports**: Desktop (1920x1080), Mobile
- **Node Version**: 18.x

### Pre-commit Hooks

**Setup**: Husky + lint-staged + pre-commit

```bash
# Install hooks
npm run prepare

# Manual hook setup
npx husky install
```

#### Pre-commit Checks:
1. ESLint fixes
2. Prettier formatting
3. TypeScript type checking
4. Unit test execution
5. Coverage threshold validation

#### Pre-push Checks:
1. Full build verification
2. Complete test suite
3. Accessibility audit
4. Security vulnerability scan

### Coverage Requirements

**Minimum Thresholds** (enforced by pre-commit):
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Coverage reports are generated in multiple formats:
- HTML: `coverage/lcov-report/index.html`
- LCOV: `coverage/lcov.info`
- JSON: `coverage/coverage-final.json`
- Summary: `coverage/report.md`

## Test Commands Reference

```bash
# Development
npm test                    # Run tests in watch mode
npm run test:watch         # Same as above
npm run test:related       # Test files related to changes

# Continuous Integration
npm run test:ci            # All unit/integration tests with coverage
npm run test:all           # Complete test suite (all types)

# Specific Test Types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:animation     # Animation performance tests
npm run test:e2e           # End-to-end tests
npm run test:accessibility # Accessibility tests
npm run test:visual        # Visual regression tests
npm run test:performance   # Load testing with K6

# Utilities
npm run type-check         # TypeScript type checking
npm run lint               # ESLint checking
```

## Test Configuration

### Jest Configuration
**File**: `jest.config.js`
- Custom test environment for Next.js
- Path mapping for imports
- Coverage thresholds
- Setup files for mocks

### Cypress Configuration
**File**: `cypress.config.ts`
- Viewport configurations
- Custom commands
- Screenshot/video settings
- Base URL configuration

### Playwright Configuration
**File**: `playwright.config.ts`
- Browser matrix
- Accessibility testing setup
- Visual comparison settings

## Best Practices

### Unit Testing
1. **Test Behavior, Not Implementation**: Focus on what components do, not how they do it
2. **Mock External Dependencies**: Isolate units under test
3. **Use Descriptive Test Names**: Clear intent and expected behavior
4. **Test Edge Cases**: Error states, empty data, loading states

### Animation Testing
1. **Mock requestAnimationFrame**: Control animation timing
2. **Test Cleanup**: Ensure animations don't leak memory
3. **Performance Monitoring**: Track FPS and memory usage
4. **Reduced Motion**: Test fallbacks for accessibility

### E2E Testing
1. **User-Centric Scenarios**: Test real user workflows
2. **Cross-Browser Testing**: Ensure compatibility
3. **Mobile Responsiveness**: Test across viewports
4. **Performance Budgets**: Enforce load time limits

### Performance Testing
1. **Realistic Load Patterns**: Model actual user behavior
2. **Memory Leak Detection**: Monitor long-running animations
3. **Frame Rate Monitoring**: Ensure smooth animations
4. **Network Conditions**: Test under slow connections

## Debugging Tests

### Failed Unit Tests
```bash
# Run specific test file
npm test -- HeaderText.test.tsx

# Debug mode
npm test -- --detectOpenHandles --forceExit

# Coverage for specific files
npm test -- --coverage --collectCoverageFrom="components/HeaderText.tsx"
```

### Failed E2E Tests
```bash
# Open Cypress with debugging
npm run test:e2e:open

# Run specific spec
npx cypress run --spec "cypress/e2e/homepage.cy.ts"
```

### Performance Issues
```bash
# Run with detailed timing
npm run test:animation -- --verbose

# Memory profiling
node --inspect-brk ./node_modules/.bin/jest --testNamePattern="memory"
```

## Monitoring & Reporting

### Coverage Reports
- **HTML Report**: Interactive browseable coverage
- **CI Integration**: Automatic PR comments
- **Trends**: Track coverage changes over time

### Performance Metrics
- **Lighthouse CI**: Automated performance auditing  
- **Animation FPS**: Frame rate monitoring
- **Memory Usage**: Leak detection and cleanup verification
- **Load Times**: Real user metric simulation

### Quality Gates
- **Coverage Thresholds**: Enforced at 80% minimum
- **Performance Budgets**: Load time <5s, FPS >30
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: No high/critical vulnerabilities

## Troubleshooting

### Common Issues

**WebGL Tests Failing**:
- Ensure headless browser supports WebGL
- Check Three.js mock implementations
- Verify cleanup in test teardown

**Animation Tests Flaky**:
- Use fake timers for consistent timing
- Mock requestAnimationFrame
- Ensure proper cleanup between tests

**Coverage Below Threshold**:
- Check uncovered branches in report
- Add tests for error conditions
- Test component lifecycle methods

**E2E Tests Timing Out**:
- Increase wait timeouts for animations
- Verify application is properly starting
- Check for network request blocking

### Getting Help

1. **Check Test Output**: Read error messages carefully
2. **Review Coverage Report**: Identify missing test coverage
3. **Inspect CI Logs**: GitHub Actions provide detailed logs
4. **Run Tests Locally**: Reproduce issues in development

For additional support, refer to the individual testing framework documentation or create an issue in the repository.

---

This testing suite ensures the Candlefish website maintains exceptional quality standards while supporting rapid development and deployment cycles. The comprehensive automation provides confidence in every change while maintaining the site's complex animations and interactions.
