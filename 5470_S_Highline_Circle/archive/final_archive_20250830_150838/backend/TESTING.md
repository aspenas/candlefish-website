# Comprehensive Testing Guide

This document describes the testing strategy and implementation for the Item Valuation and Pricing System across all platforms.

## Overview

Our testing strategy follows the testing pyramid approach with comprehensive coverage across:

- **Go Backend**: Unit, integration, and performance tests
- **React Frontend**: Component and integration tests
- **React Native Mobile**: Component, offline sync, and performance tests  
- **End-to-End**: Critical user flows with Playwright
- **Real-time**: WebSocket subscription tests

## Coverage Targets

- **Backend**: 80% minimum, 90% for critical services
- **Frontend**: 75% minimum
- **Mobile**: 70% minimum
- **E2E**: All critical user paths covered

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── valuation_service_test.go
│   ├── cache_service_test.go
│   └── market_data_service_test.go
├── integration/             # Integration tests
│   ├── valuation_api_test.go
│   └── websocket_subscriptions_test.go
├── e2e/                     # End-to-end tests
│   └── valuation-workflow.spec.ts
├── performance/             # Performance tests
│   └── valuation_performance_test.go
├── fixtures/                # Test data and factories
│   ├── item_fixtures.go
│   └── valuation_fixtures.go
├── __mocks__/              # Mock implementations
│   └── valuationMocks.ts
└── config/                 # Test configuration
    ├── coverage.config.js
    ├── jest.setup.js
    └── global-setup.js
```

## Running Tests

### Backend Tests (Go)

```bash
# Run all tests with coverage
go test -v -race -coverprofile=coverage.out ./...

# Run specific test suites
go test -v ./tests/unit/...
go test -v ./tests/integration/...
go test -v ./tests/performance/...

# Generate coverage report
go tool cover -html=coverage.out -o coverage.html

# Run benchmarks
go test -bench=. -benchmem ./tests/performance/...
```

### Frontend Tests (React)

```bash
# Run all tests with coverage
npm run test:coverage

# Run component tests
npm run test:components

# Run in watch mode
npm run test:watch

# Update snapshots
npm run test:update-snapshots
```

### Mobile Tests (React Native)

```bash
# Run all mobile tests
cd mobile && npm run test

# Run with coverage
npm run test:coverage

# Run offline sync tests
npm run test:offline

# Run performance tests
npm run test:performance
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npx playwright test

# Run specific browser
npx playwright test --project=chromium

# Run with UI mode
npx playwright test --ui

# Generate report
npx playwright show-report
```

### Load Testing

```bash
# Run load tests with K6
k6 run tests/load/valuation-load-test.js

# Run with custom parameters
k6 run -u 10 -d 30s tests/load/valuation-load-test.js
```

## Test Categories

### 1. Unit Tests

**Backend Unit Tests** (`tests/unit/`)
- **ValuationService**: Business logic, calculations, error handling
- **CacheService**: Storage operations, expiration, cleanup
- **MarketDataService**: External API integration, data processing

**Key Features Tested:**
- Depreciation calculations with various conditions
- Market comparison scoring algorithms
- Cache operations under concurrent access
- Error handling and edge cases
- Data validation and sanitization

### 2. Integration Tests

**API Integration** (`tests/integration/`)
- REST endpoint functionality
- GraphQL query and mutation operations
- WebSocket real-time subscriptions
- Database interactions
- External service integrations

**Key Scenarios:**
- Complete valuation request workflows
- Real-time update propagation
- Cross-service data consistency
- Authentication and authorization
- Rate limiting and error responses

### 3. Component Tests

**Frontend Components** (`frontend/tests/components/`)
- ValuationCard: Display logic, user interactions
- PricingInsightsDashboard: Data visualization, filtering
- Market comparisons rendering
- Error states and loading indicators

**Mobile Components** (`mobile/tests/components/`)
- ValuationScreen: Mobile-specific UI patterns
- Offline state handling
- Touch interactions and gestures
- Performance with large datasets

### 4. End-to-End Tests

**Critical User Flows** (`tests/e2e/`)
- Complete valuation workflow
- Dashboard interactions and filtering
- Mobile app navigation
- Real-time updates across platforms
- Error recovery scenarios

**Cross-browser Testing:**
- Chromium, Firefox, WebKit
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design validation

### 5. Performance Tests

**Backend Performance** (`tests/performance/`)
- High-volume valuation requests
- Concurrent database operations
- Cache performance under load
- Memory usage optimization

**Frontend Performance**
- Large dataset rendering
- Chart performance with real-time updates
- Mobile app memory usage
- Bundle size optimization

### 6. Offline Sync Tests

**Mobile Offline Capabilities** (`mobile/tests/offline/`)
- Queue management for offline actions
- Data synchronization on reconnection
- Conflict resolution strategies
- Storage quota handling
- Network state transitions

## Test Data and Fixtures

### Fixtures (`tests/fixtures/`)

**ItemBuilder Pattern:**
```go
item := NewItemBuilder().
    WithName("Modern Sofa").
    WithCategory(models.CategoryFurniture).
    WithPurchasePrice(1200.00).
    WithCondition("good").
    Build()
```

**Pre-defined Test Scenarios:**
- High-value items
- Depreciated electronics
- Appreciated vintage items
- Items without purchase data
- Large datasets for performance testing

### Mock Data (`tests/__mocks__/`)

**Consistent Mock Responses:**
- Current valuations
- Market comparisons
- Price history
- Error scenarios
- Loading states

## Configuration

### Coverage Configuration (`tests/config/coverage.config.js`)

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/services/valuation.go': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### Test Environment Setup

**Backend Setup:**
- PostgreSQL test database
- Redis test instance
- Mock external APIs
- Test data seeding

**Frontend Setup:**
- Mock API responses
- Jest configuration
- Testing Library setup
- Mock service workers

**Mobile Setup:**
- Mock native modules
- AsyncStorage mocking
- Network state simulation
- Performance monitoring

## CI/CD Integration

### GitHub Actions Pipeline (`.github/workflows/test-pipeline.yml`)

**Multi-stage Testing:**
1. **Backend Tests**: Go unit, integration, performance
2. **Frontend Tests**: React component and integration
3. **Mobile Tests**: React Native with offline sync
4. **E2E Tests**: Playwright cross-browser testing
5. **Security Tests**: Vulnerability scanning
6. **Load Tests**: Performance under load

**Coverage Reporting:**
- Codecov integration
- Per-platform coverage tracking
- Threshold enforcement
- Historical trend analysis

**Quality Gates:**
- Minimum coverage thresholds
- No failing tests
- Security vulnerability checks
- Performance regression detection

## Best Practices

### Test Writing Guidelines

**1. Test Naming**
```go
func TestValuationService_CalculateDepreciationValuation_WithValidData_ReturnsCorrectValue(t *testing.T)
```

**2. Arrange-Act-Assert Pattern**
```go
// Arrange
item := fixtures.TestFurnitureItem()
service := NewValuationService(mockDB, mockMarket, mockCache)

// Act
valuation, err := service.CalculateDepreciationValuation(ctx, item.ID)

// Assert
assert.NoError(t, err)
assert.Equal(t, expectedValue, valuation.EstimatedValue)
```

**3. Test Data Isolation**
- Use builders and factories
- Clean up test data
- Avoid shared mutable state
- Independent test execution

**4. Mock Strategy**
- Mock external dependencies
- Use interface-based mocking
- Verify mock interactions
- Reset mocks between tests

### Performance Testing

**Benchmark Guidelines:**
```go
func BenchmarkValuationService_GetCurrentValuation(b *testing.B) {
    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            service.GetCurrentValuation(ctx, itemID)
        }
    })
}
```

**Load Testing Metrics:**
- Response time percentiles (P50, P95, P99)
- Throughput (requests per second)
- Error rate thresholds
- Resource utilization

### Mobile Testing

**Offline Sync Validation:**
```javascript
it('should queue actions when offline', async () => {
  // Simulate offline state
  mockNetworkState(false);
  
  // Perform action
  await service.requestValuation(itemId);
  
  // Verify queued
  const queue = await offlineQueue.getQueue();
  expect(queue).toHaveLength(1);
});
```

**Performance Monitoring:**
- Memory leak detection
- Render performance
- Battery usage impact
- Network efficiency

## Troubleshooting

### Common Test Issues

**1. Flaky Tests**
- Use proper wait conditions
- Avoid hardcoded timeouts
- Mock time-dependent logic
- Isolate external dependencies

**2. Memory Leaks**
- Clean up event listeners
- Clear timers and intervals
- Reset global state
- Monitor memory usage

**3. Race Conditions**
- Use proper synchronization
- Mock async operations
- Test concurrent scenarios
- Verify thread safety

### Debugging Tests

**Backend Debugging:**
```bash
# Run with verbose output
go test -v -run TestSpecificFunction

# Run with race detection
go test -race ./...

# Profile memory usage
go test -memprofile mem.prof
```

**Frontend Debugging:**
```bash
# Run specific test file
npm test ValuationCard.test.tsx

# Debug mode
npm test -- --detectOpenHandles --forceExit
```

## Continuous Improvement

### Metrics Tracking
- Test execution time trends
- Coverage trend analysis
- Flaky test identification
- Performance regression detection

### Regular Maintenance
- Update test dependencies
- Review and refactor test code
- Add tests for new features
- Remove obsolete tests

### Team Practices
- Code review for test changes
- Test-driven development
- Regular testing strategy review
- Knowledge sharing sessions

## Resources

- [Go Testing Documentation](https://golang.org/pkg/testing/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)