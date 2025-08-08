# System Analyzer Test Suite Documentation

Comprehensive test suite for the "run all open so we can analyze status" system analyzer, covering all implemented components across backend services, GraphQL API, React frontend, and React Native mobile app.

## 📋 Overview

This test suite implements a complete testing strategy following the test pyramid approach:

- **Unit Tests**: Many focused tests for individual components and functions
- **Integration Tests**: Fewer tests for component interactions and API integrations
- **End-to-End Tests**: Minimal but critical user journey tests

## 🏗️ Test Architecture

### Test Structure

```
__tests__/
├── factories/               # Mock data factories
│   ├── systemAnalyzerFactory.ts    # Core data generators
│   └── index.js            # Factory exports
├── mocks/                  # Mock implementations
│   ├── apolloMocks.ts      # GraphQL mocks
│   ├── handlers.js         # MSW handlers
│   └── server.js           # Mock server setup
├── unit/                   # Unit tests
│   ├── services/           # Backend service tests
│   ├── graphql/            # GraphQL resolver tests
│   └── components/         # React component tests
├── integration/            # Integration tests
│   ├── full-system.test.ts # Complete system tests
│   └── api-frontend-communication.test.js
├── e2e/                    # End-to-end tests
│   └── system-analyzer-workflow.spec.ts
├── performance/            # Performance tests
│   ├── system-load.test.ts # Load and performance tests
│   └── file-operations.test.js
├── security/              # Security tests
│   ├── api-validation.test.js
│   └── penetration-tests.test.ts
├── offline/               # Offline functionality tests
│   └── pwa-offline.test.ts
├── setup/                 # Test configuration
│   └── jest.setup.js      # Global test setup
└── scripts/               # Utility scripts
    └── run-all-tests.sh   # Master test runner
```

### Mobile App Tests

```
mobile/__tests__/
├── screens/               # React Native screen tests
│   └── DashboardScreen.test.tsx
├── components/            # Mobile component tests
├── services/              # Mobile service tests
├── setup/                 # Mobile test setup
└── mocks/                 # React Native mocks
```

## 🧪 Test Categories

### 1. Unit Tests

#### Backend Services (`__tests__/unit/services/`)

- **Discovery Service**: Service registration, auto-discovery, health checking
- **Monitoring Service**: Container and process monitoring, metrics collection
- **Analysis Service**: System analysis, performance insights, recommendations
- **Alert Service**: Alert rule management, notification processing

**Key Test Files:**

- `discovery-service.test.ts` - Service discovery and management
- `monitoring-service.test.ts` - System monitoring functionality
- `analysis-service.test.ts` - System analysis and insights
- `alert-service.test.ts` - Alert processing and notifications

#### GraphQL API (`__tests__/unit/graphql/`)

- **Schema Validation**: Type checking, field resolution
- **Resolver Testing**: Query, mutation, and subscription resolvers
- **Authorization**: Role-based access control, authentication
- **DataLoader**: Efficient data fetching and caching

**Key Test Files:**

- `resolvers.test.ts` - GraphQL resolver functionality
- `schema.test.ts` - Schema validation and type checking
- `subscriptions.test.ts` - Real-time subscription handling

#### React Components (`__tests__/unit/components/`)

- **Dashboard Components**: System overview, metrics display, real-time updates
- **Service Management**: Service grid, filtering, sorting, actions
- **Alert Management**: Alert lists, acknowledgment, rule management
- **UI Components**: Shared components, form validation, accessibility

**Key Test Files:**

- `SystemAnalyzerDashboard.test.tsx` - Main dashboard functionality
- `ServiceGrid.test.tsx` - Service display and management
- `AlertList.test.tsx` - Alert handling and display
- `MetricChart.test.tsx` - Data visualization components

#### React Native (`mobile/__tests__/screens/`)

- **Mobile Screens**: Dashboard, services, alerts, settings
- **Offline Support**: Data caching, background sync, network detection
- **Navigation**: Screen transitions, deep linking, state management
- **Device Features**: Push notifications, haptic feedback, biometrics

**Key Test Files:**

- `DashboardScreen.test.tsx` - Mobile dashboard functionality
- `ServicesScreen.test.tsx` - Mobile service management
- `AlertsScreen.test.tsx` - Mobile alert handling

### 2. Integration Tests

#### Full System Integration (`__tests__/integration/`)

- **Service Discovery**: End-to-end service registration and monitoring
- **Real-time Monitoring**: WebSocket connections, metric streaming
- **Alert Processing**: Rule evaluation, notification delivery
- **System Analysis**: Complete analysis workflows
- **Error Handling**: Graceful degradation, recovery scenarios

**Key Test Files:**

- `full-system.test.ts` - Complete system integration
- `api-frontend-communication.test.js` - API-UI communication
- `graphql-subscriptions.test.ts` - Real-time data flow

### 3. End-to-End Tests

#### User Workflows (`__tests__/e2e/`)

- **Dashboard Navigation**: Complete user journeys
- **Service Management**: Service registration, monitoring, actions
- **Alert Management**: Alert handling, acknowledgment, resolution
- **Real-time Features**: Live updates, WebSocket connections
- **Responsive Design**: Multi-device testing, accessibility

**Key Test Files:**

- `system-analyzer-workflow.spec.ts` - Complete user workflows
- `mobile-app-workflow.spec.ts` - Mobile app user journeys
- `accessibility.spec.ts` - Accessibility compliance

### 4. Performance Tests

#### Load and Performance (`__tests__/performance/`)

- **System Analysis**: Performance under load
- **Metric Ingestion**: High-volume data processing
- **WebSocket Connections**: Concurrent connection handling
- **Database Queries**: Query optimization validation
- **Memory Usage**: Memory leak detection

**Key Test Files:**

- `system-load.test.ts` - System performance under load
- `metric-ingestion.test.ts` - High-volume data handling
- `websocket-performance.test.ts` - Real-time connection performance

### 5. Security Tests

#### Security Validation (`__tests__/security/`)

- **Authentication**: Login, token validation, session management
- **Authorization**: Role-based access, permission enforcement
- **Input Validation**: SQL injection, XSS prevention
- **API Security**: Rate limiting, CORS, headers
- **Data Protection**: Sensitive data handling, encryption

### 6. Offline Tests

#### PWA and Offline (`__tests__/offline/`)

- **Service Worker**: Registration, caching strategies
- **Data Persistence**: IndexedDB storage, cache management
- **Background Sync**: Offline action queuing, sync on reconnect
- **Network Detection**: Online/offline state management
- **Progressive Enhancement**: Graceful degradation

## 🔧 Test Configuration

### Jest Configurations

#### Main Configuration (`jest.config.js`)

```javascript
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

#### GraphQL Configuration (`__tests__/jest.graphql.config.js`)

- Node environment for GraphQL testing
- GraphQL schema transformation
- Database and service mocking
- Performance monitoring

#### Mobile Configuration (`mobile/jest.config.js`)

- React Native preset with Expo
- Metro bundler compatibility
- Device API mocking
- Offline capability testing

### Mock Factories

#### System Analyzer Factory (`__tests__/factories/systemAnalyzerFactory.ts`)

Generates realistic test data:

```typescript
// Generate mock services
const services = ServiceFactory.createMany(10);
const healthyService = ServiceFactory.createHealthy();
const failingService = ServiceFactory.createUnhealthy();

// Generate mock system analysis
const analysis = SystemAnalysisFactory.createHealthy();
const degradedSystem = SystemAnalysisFactory.createDegraded();

// Generate complete system mock
const fullSystem = SystemMockFactory.createCompleteSystem(50);
```

#### Apollo Mocks (`__tests__/mocks/apolloMocks.ts`)

GraphQL operation mocks:

```typescript
// Create comprehensive mocks
const mocks = ApolloMockFactory.createComprehensiveMocks();

// Create specific scenario mocks
const errorMocks = ApolloMockFactory.createErrorMocks();
const loadingMocks = ApolloMockFactory.createLoadingMocks();
```

## 🚀 Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Advanced Usage

```bash
# Run specific test files
npm test -- --testPathPattern="services"
npm test -- --testPathPattern="components/dashboard"

# Run tests in parallel
npm test -- --maxWorkers=4

# Run tests with specific timeout
npm test -- --testTimeout=60000

# Generate coverage badge
npm run test:coverage && npm run coverage:badge
```

### Mobile Tests

```bash
# Navigate to mobile directory
cd mobile

# Run mobile tests
npm test

# Run with coverage
npm run test:coverage

# Run specific mobile test
npm test -- DashboardScreen.test.tsx
```

### CI/CD Integration

The comprehensive test script automatically runs all test suites:

```bash
# Run complete test suite (used by CI/CD)
./__tests__/scripts/run-all-tests.sh

# Environment variables for CI/CD
export TEST_ENV=ci
export COVERAGE_THRESHOLD=80
export SKIP_E2E=false
export PARALLEL_TESTS=true
```

### GitHub Actions

The GitHub Actions workflow (`.github/workflows/test-suite.yml`) provides:

- **Parallel Execution**: Different test suites run in parallel
- **Conditional Execution**: Tests run based on changed files
- **Coverage Reports**: Merged coverage from all test types
- **Artifact Upload**: Test reports and screenshots
- **Status Badges**: Real-time test status indicators

## 📊 Coverage Reports

### Coverage Targets

| Test Type | Target | Description |
|-----------|--------|-------------|
| Unit Tests | 85% | Individual component functionality |
| Integration | 80% | Component interaction testing |
| E2E | 70% | Critical user workflow coverage |
| Overall | 80% | Combined coverage threshold |

### Coverage Output

Coverage reports are generated in multiple formats:

- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Data**: `coverage/lcov.info`
- **JSON Summary**: `coverage/coverage-summary.json`
- **Text Summary**: Console output during test runs

## 🔍 Test Data Management

### Factory Pattern

Test data is generated using factories that create realistic, consistent test data:

```typescript
// Service factories
ServiceFactory.create()              // Single service
ServiceFactory.createMany(10)        // Multiple services
ServiceFactory.createHealthy()       // Healthy service
ServiceFactory.createUnhealthy()     // Failing service

// System analysis factories
SystemAnalysisFactory.create()       // Basic analysis
SystemAnalysisFactory.createHealthy() // Healthy system
SystemAnalysisFactory.createDegraded() // Degraded system

// Complete system factories
SystemMockFactory.createCompleteSystem(50) // Full system with 50 services
SystemMockFactory.createLoadTestScenario(100) // High-load scenario
```

### Data Consistency

- **Deterministic**: Tests use seeded random data for reproducibility
- **Realistic**: Data matches production patterns and constraints
- **Scalable**: Factories support generating data at any scale
- **Flexible**: Override any field for specific test scenarios

## 🛠️ Development Workflow

### Test-Driven Development (TDD)

1. **Write Test First**: Define expected behavior
2. **Implement Feature**: Make the test pass
3. **Refactor**: Improve code while maintaining test coverage
4. **Repeat**: Continue for each feature increment

### Testing Best Practices

#### Test Structure (AAA Pattern)

```typescript
describe('Component', () => {
  it('should behave correctly', () => {
    // Arrange: Set up test conditions
    const mockData = ServiceFactory.create();

    // Act: Execute the behavior
    const result = processService(mockData);

    // Assert: Verify the outcome
    expect(result.status).toBe('processed');
  });
});
```

#### Mock Management

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset any global state
});

afterEach(() => {
  jest.restoreAllMocks();
  // Clean up any side effects
});
```

### Debugging Tests

```bash
# Run tests in debug mode
npm test -- --detectOpenHandles --verbose

# Run single test file with detailed output
npm test -- --testPathPattern="specific-test" --verbose

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📈 Performance Monitoring

### Test Performance

Tests include performance monitoring to ensure:

- **Fast Feedback**: Unit tests complete in <10s
- **Reasonable Integration**: Integration tests complete in <60s
- **Acceptable E2E**: E2E tests complete in <300s
- **Performance Baseline**: Performance tests establish benchmarks

### Performance Thresholds

```typescript
const PERFORMANCE_THRESHOLDS = {
  systemAnalysis: 5000,     // 5 seconds max
  serviceQuery: 1000,       // 1 second max
  metricIngestion: 100,     // 100ms max per metric
  alertProcessing: 500,     // 500ms max
  webSocketConnection: 2000, // 2 seconds max
};
```

## 🔐 Security Testing

### Security Test Coverage

- **Authentication**: Login flow, token validation
- **Authorization**: Role-based access control
- **Input Validation**: XSS, injection prevention
- **API Security**: Rate limiting, CORS headers
- **Data Protection**: Encryption, sensitive data handling

### Security Assertions

```typescript
// Test authentication
expect(response.status).toBe(401); // Unauthorized without token
expect(response.headers['www-authenticate']).toBeDefined();

// Test authorization
expect(response.status).toBe(403); // Forbidden for insufficient permissions
expect(response.body.error).toMatch(/permission/i);

// Test input validation
expect(() => processInput('<script>')).toThrow('Invalid input');
```

## 🌐 Cross-Platform Testing

### Browser Compatibility

E2E tests run across multiple browsers:

- **Chromium**: Primary testing browser
- **Firefox**: Cross-browser compatibility
- **WebKit**: Safari compatibility
- **Mobile**: Mobile browser testing

### Device Testing

Mobile tests simulate various devices:

- **Phones**: iOS and Android phone sizes
- **Tablets**: iPad and Android tablet sizes
- **Desktop**: Various desktop resolutions
- **Orientations**: Portrait and landscape modes

## 🚨 Error Handling Tests

### Error Scenarios

Tests cover various error conditions:

- **Network Failures**: Offline, timeout, server errors
- **Data Corruption**: Invalid responses, malformed data
- **Resource Exhaustion**: Memory limits, storage quotas
- **Concurrent Access**: Race conditions, locking issues
- **Third-party Failures**: External service outages

### Recovery Testing

Tests verify system recovery:

- **Graceful Degradation**: Fallback to cached data
- **Automatic Retry**: Retry failed operations
- **User Notification**: Clear error messages
- **State Restoration**: Recover after errors

## 📖 Test Documentation

### Test Naming Convention

```typescript
describe('ServiceDiscovery', () => {
  describe('when service is registered', () => {
    it('should store service information', () => {
      // Test implementation
    });

    it('should emit service registered event', () => {
      // Test implementation
    });
  });

  describe('when service registration fails', () => {
    it('should throw appropriate error', () => {
      // Test implementation
    });
  });
});
```

### Documentation Standards

- **Clear Descriptions**: Test names describe expected behavior
- **Context Blocks**: Group related tests with describe blocks
- **Comments**: Explain complex test logic
- **Examples**: Provide usage examples in documentation
- **Edge Cases**: Document unusual scenarios and edge cases

## 🔄 Continuous Integration

### GitHub Actions Pipeline

The CI/CD pipeline automatically:

1. **Install Dependencies**: Set up Node.js and dependencies
2. **Run Linting**: Check code style and quality
3. **Execute Tests**: Run all test suites in parallel
4. **Generate Coverage**: Create merged coverage reports
5. **Upload Artifacts**: Store test reports and screenshots
6. **Update Badges**: Reflect current test status
7. **Deploy**: Deploy on successful test completion

### Quality Gates

Tests must pass these quality gates:

- **All Tests Pass**: No failing tests allowed
- **Coverage Threshold**: Minimum 80% code coverage
- **Performance**: Performance tests within thresholds
- **Security**: Security scans pass validation
- **Linting**: Code style checks pass

## 🎯 Future Enhancements

### Planned Improvements

- **Visual Regression Testing**: Screenshot comparisons
- **Mutation Testing**: Test quality validation
- **Chaos Engineering**: System resilience testing
- **Load Testing**: Automated performance benchmarking
- **A/B Test Framework**: Feature flag testing support

### Test Automation

- **Auto-generated Tests**: Generate tests from API schemas
- **Test Data Management**: Automated test data lifecycle
- **Parallel Execution**: Further optimize test execution time
- **Cloud Testing**: Multi-environment testing support
- **Real Device Testing**: Physical device test integration

---

## 📞 Support and Contributing

### Getting Help

- **Documentation**: Check this README and inline comments
- **Issues**: Create GitHub issues for bugs or questions
- **Code Reviews**: Request reviews for test-related changes
- **Best Practices**: Follow established testing patterns

### Contributing

1. **Fork Repository**: Create your feature branch
2. **Write Tests**: Include comprehensive test coverage
3. **Follow Conventions**: Use established naming and structure
4. **Update Documentation**: Keep documentation current
5. **Submit PR**: Include test results in pull request

Remember: **Every feature should have tests, and every test should have a purpose!** 🎯
