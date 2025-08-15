# Paintbox Test Suite Documentation

This document provides comprehensive documentation for the Paintbox paint estimation platform test suite, covering all aspects of testing from unit tests to performance benchmarks.

## Overview

The Paintbox test suite provides complete test coverage across all layers of the application:

- **Backend API Tests**: GraphQL resolvers, federation, pricing calculations, subscriptions, data validation
- **Frontend Component Tests**: React components, Zustand state management, Apollo Client cache, accessibility
- **Mobile App Tests**: React Native components, offline sync, camera integration, GPS tracking, background tasks
- **Integration Tests**: Company Cam API, Salesforce CRM sync, photo upload, real-time collaboration
- **End-to-End Tests**: Complete estimate workflow, manager approval process, offline-to-online sync
- **Performance Tests**: Load testing for 100+ concurrent users, response time benchmarks, database optimization

## Architecture

### Test Data Foundation
- **Excel Validation Cases**: Paul Sakry, Delores Huss, Grant Norell test scenarios
- **WW Tag Coverage**: Complete WW1-WW30 photo tagging system validation
- **Kind Home Paint Formula**: Validated pricing calculations using (Labor + Material) / 0.45 formula
- **Good/Better/Best Pricing**: Three-tier pricing system testing

### Technology Stack
- **Jest**: Unit and integration testing framework
- **Playwright**: End-to-end testing across browsers
- **Testing Library**: React component testing
- **Detox**: React Native mobile app testing
- **Artillery**: Load and performance testing
- **Codecov**: Coverage reporting and tracking

## Test Categories

### 1. Backend API Tests

#### GraphQL Resolvers (`apollo-graphos/subgraph-estimates/src/__tests__/`)

**Query Resolver Tests** (`resolvers/Query.test.ts`)
```typescript
describe('calculatePricing', () => {
  it('should calculate pricing using Kind Home Paint formula', async () => {
    const mockCalculation = {
      laborCost: 960.00, // 16 hours * $60/hour
      materialCost: 480.00, // 1200 sqft * $0.40/sqft
      overheadCost: 288.00, // 20% of labor + materials
      profitMargin: 345.60, // 24% profit margin
      subtotal: 2073.60,
      tax: 165.89, // 8% tax
      total: 2239.49,
    };
  });
});
```

**Mutation Resolver Tests** (`resolvers/Mutation.test.ts`)
- Estimate CRUD operations
- PDF generation
- Real-time updates

**Pricing Calculation Tests** (`pricing/calculation.test.ts`)
- Excel test case validation
- Material type multipliers
- Complexity adjustments

**Subscription Tests** (`subscriptions/realtime.test.ts`)
- WebSocket real-time updates
- Calculation progress tracking
- Error handling

### 2. Frontend Component Tests

#### React Components (`__tests__/components/`)

**Pricing Breakdown** (`ui/PricingBreakdown.test.tsx`)
```typescript
it('should show three pricing tiers (Good, Better, Best)', async () => {
  expect(screen.getByText('Good')).toBeInTheDocument();
  expect(screen.getByText('Better')).toBeInTheDocument();
  expect(screen.getByText('Best')).toBeInTheDocument();
});
```

**Customer Info Form** (`workflow/ClientInfoFormEnhanced.test.tsx`)
- Form validation
- Auto-complete functionality
- Search capabilities

**State Management** (`store/useEstimateStore.test.ts`)
- Zustand store testing
- State persistence
- Calculation accuracy

### 3. Mobile App Tests

#### React Native Components (`mobile/PaintboxMobile/__tests__/`)

**Camera Screen** (`screens/CameraScreen.test.tsx`)
```typescript
it('should generate sequential WW tags (WW15-001, WW15-002, etc.)', async () => {
  expect(mockCameraService.capturePhoto).toHaveBeenLastCalledWith(
    expect.objectContaining({
      filename: expect.stringMatching(/WW15-001/)
    })
  );
});
```

**Offline Sync** (`services/offlineSync.test.ts`)
- Photo storage and upload queue
- Background synchronization
- Conflict resolution

**Measurement Capture** (`components/measurement/MeasurementCapture.test.tsx`)
- GPS integration
- Area calculation
- Scale calibration

### 4. Integration Tests

#### Company Cam Integration (`__tests__/integration/companycam-integration.test.ts`)
```typescript
it('should handle WW1-WW30 tag range validation', async () => {
  const testCases = [
    { wwTag: 'WW1-001', valid: true },
    { wwTag: 'WW30-001', valid: true },
    { wwTag: 'WW31-001', valid: false },
  ];
});
```

#### Salesforce Sync (`__tests__/integration/salesforce-sync.test.ts`)
- Customer synchronization
- Opportunity creation
- Bidirectional data sync
- Conflict resolution

#### Real-time Collaboration (`__tests__/integration/realtime-collaboration.test.ts`)
- WebSocket connections
- Multi-user estimate editing
- Manager approval workflow

### 5. End-to-End Tests

#### Complete Workflow (`__tests__/e2e/complete-estimate-workflow.spec.ts`)
```typescript
test('should complete full estimate creation workflow', async ({ page }) => {
  await estimateWorkflow.startNewEstimate();
  await estimateWorkflow.addCustomerInfo({
    firstName: 'John',
    lastName: 'Smith',
  });
});
```

**Test Scenarios**:
- Desktop web workflow
- Mobile integration
- Manager approval process
- PDF generation and download
- Real-time collaboration

### 6. Performance Tests

#### Load Testing (`__tests__/performance/load-testing.test.ts`)
```typescript
test('should handle concurrent estimate creations', async () => {
  const concurrentRequests = 50;
  expect(successRate).toBeGreaterThan(0.95); // 95% success rate
  expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
});
```

**Performance Benchmarks**:
- 95% success rate for concurrent operations
- <2 second average response time
- <5 second maximum response time
- Memory usage under 100MB growth

## Test Data Setup

### Excel Validation Cases (`__tests__/data/test-data-setup.ts`)

The test suite includes comprehensive test data based on validated Excel calculations:

```typescript
export const EXCEL_VALIDATION_CASES = [
  {
    name: 'Paul Sakry - Exterior Stucco',
    expectedPricing: {
      laborHours: 28,
      laborRate: 60,
      laborCost: 1680,
      materialType: 'STANDARD',
      materialCostPerSqFt: 0.45,
    },
  },
  // ... additional test cases
];
```

### WW Tag Coverage
Complete coverage of WW1-WW30 photo tagging system:
- 30 unique work areas
- Photo lifecycle tracking (before, prep, after)
- Sequential tag generation
- Usage analytics

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Setup test database
npm run db:test:setup

# Seed test data
npm run test:data:seed

# Run all tests
npm run test:all

# Run specific test suites
npm run test:frontend:coverage
npm run test:backend:coverage
npm run test:integration:coverage
npm run test:e2e:run
npm run test:performance
```

### Individual Test Categories

```bash
# Frontend component tests
npm run test:components

# Backend API tests
npm run test:api

# Mobile app tests
cd mobile/PaintboxMobile && npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Accessibility tests
npm run test:a11y

# Security tests
npm run test:security
```

### Test Data Management

```bash
# Seed test database with Excel validation cases
npm run test:data:seed

# Validate Excel formula calculations
npm run test:data:validate

# Clean up test data
npm run test:data:cleanup

# Get test data summary
npm run test:data:summary
```

## CI/CD Integration

### GitHub Actions Workflow

The test suite runs automatically on:
- Push to `main`, `develop`, or `feature/*` branches
- Pull requests to `main` or `develop`
- Daily scheduled runs at 6 AM UTC

### Pipeline Stages

1. **Backend Tests**: GraphQL resolvers, pricing calculations, subscriptions
2. **Frontend Tests**: Component testing with accessibility validation
3. **Mobile Tests**: React Native component and service testing
4. **Integration Tests**: External API testing (Company Cam, Salesforce)
5. **End-to-End Tests**: Complete workflow validation across browsers
6. **Performance Tests**: Load testing and benchmark validation
7. **Security Tests**: Dependency scanning and vulnerability assessment
8. **Coverage Report**: Combined coverage analysis with 80%+ threshold

### Coverage Requirements

- **Overall**: 80% lines, 80% functions, 75% branches
- **Components**: 85% lines, 85% functions, 80% branches
- **Services**: 90% lines, 90% functions, 85% branches

## Performance Benchmarks

### Response Time Requirements
- **API Endpoints**: <500ms average, <1s 95th percentile
- **GraphQL Queries**: <1s average for complex queries
- **Pricing Calculations**: <200ms per calculation
- **File Uploads**: Based on size (2s per MB minimum)

### Concurrency Targets
- **Concurrent Users**: 100+ simultaneous users
- **Estimate Creation**: 50 concurrent requests with 95% success rate
- **GraphQL Queries**: 100 concurrent queries with 95% success rate

### Memory Usage Limits
- **Test Duration**: <100MB total memory growth
- **Peak Usage**: <50MB growth during operations

## Test Environment Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paintbox_test

# Redis
REDIS_URL=redis://localhost:6379

# External APIs
SALESFORCE_TEST_USERNAME=test@paintbox.com
SALESFORCE_TEST_PASSWORD=password123
SALESFORCE_TEST_TOKEN=token123
COMPANY_CAM_TEST_API_KEY=test_key_123

# AWS
AWS_TEST_ACCESS_KEY_ID=test_access_key
AWS_TEST_SECRET_ACCESS_KEY=test_secret_key
S3_TEST_BUCKET=paintbox-test-uploads

# Application
TEST_BASE_URL=http://localhost:3000
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:4000
TEST_AUTH_TOKEN=test_bearer_token
```

### Service Dependencies

**Required Services**:
- PostgreSQL 15+ for test database
- Redis 7+ for caching and sessions
- Node.js 18+ for application runtime

**External Service Mocks**:
- Salesforce API sandbox integration
- Company Cam test environment
- AWS S3 test bucket

## Debugging and Troubleshooting

### Test Failure Investigation

```bash
# Run tests with verbose output
npm run test -- --verbose

# Run specific test file
npm run test -- __tests__/components/ui/PricingBreakdown.test.tsx

# Debug E2E tests
npm run test:e2e:debug

# Check test data integrity
npm run test:data:summary
```

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Redis Connection**: Verify Redis service is available
3. **Port Conflicts**: Check that test ports (3000, 4000, 5432, 6379) are available
4. **Environment Variables**: Validate all required test environment variables are set
5. **Test Data**: Run `npm run test:data:seed` to ensure test data is present

### Performance Issues

```bash
# Run performance regression check
npm run test:perf:check-regression

# Generate performance report
npm run test:performance -- --generateReport

# Monitor memory usage during tests
npm run test -- --logHeapUsage
```

## Contributing

### Adding New Tests

1. **Create test files** in appropriate `__tests__/` directories
2. **Follow naming convention**: `*.test.ts` or `*.spec.ts`
3. **Include coverage** for new functionality
4. **Update test data** if needed using test-data-setup.ts
5. **Document performance expectations** for new features

### Test Categories

- **Unit Tests**: Single function/component testing
- **Integration Tests**: Multi-component interaction testing
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Load and benchmark testing
- **Security Tests**: Vulnerability and safety testing

### Code Quality

- **TypeScript**: All tests should be written in TypeScript
- **Coverage**: Maintain 80%+ coverage for new code
- **Performance**: Include performance assertions for critical paths
- **Documentation**: Update this README for significant changes

## Monitoring and Reporting

### Coverage Reports
- **Codecov**: Integrated coverage reporting
- **HTML Reports**: Generated in `coverage/` directory
- **LCOV**: Machine-readable coverage format

### Test Results
- **JUnit XML**: For CI/CD integration
- **JSON Reports**: For programmatic analysis
- **HTML Reports**: For human-readable results

### Performance Metrics
- **Response Times**: Tracked per endpoint
- **Success Rates**: Monitored for degradation
- **Memory Usage**: Tracked for memory leaks
- **Regression Detection**: Automatic performance regression alerts

## Security Testing

### Vulnerability Scanning
- **npm audit**: Dependency vulnerability checking
- **Security Headers**: HTTP security header validation
- **Input Validation**: SQL injection and XSS prevention
- **Authentication**: JWT token validation and security

### Data Privacy
- **PII Handling**: Personal information protection testing
- **Encryption**: Data encryption validation
- **Access Control**: Permission and authorization testing

## Future Enhancements

### Planned Improvements
- **Visual Regression Testing**: Screenshot comparison testing
- **API Contract Testing**: OpenAPI specification validation
- **Chaos Engineering**: Fault injection testing
- **Cross-Browser Testing**: Extended browser compatibility
- **Mobile Device Testing**: Real device testing integration

### Performance Optimization
- **Test Parallelization**: Improved concurrent test execution
- **Test Data Optimization**: Faster test data setup and teardown
- **Cache Optimization**: Improved test caching strategies
- **Resource Usage**: Reduced memory and CPU usage during testing

This comprehensive test suite ensures the Paintbox platform maintains high quality, performance, and reliability across all features and user interactions.