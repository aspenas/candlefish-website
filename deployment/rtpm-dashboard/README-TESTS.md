# RTPM Dashboard Test Suite Documentation

## Overview

This comprehensive test suite provides complete coverage for the Real-time Performance Monitoring (RTPM) Dashboard, including backend APIs, frontend React components, end-to-end user workflows, and performance testing.

## Test Architecture

### Test Types

1. **Unit Tests** - Test individual components in isolation
   - **Backend**: API endpoints, database models, business logic
   - **Frontend**: React components, hooks, utility functions

2. **Integration Tests** - Test component interactions
   - API-database integration
   - Service-to-service communication
   - Authentication flow integration

3. **End-to-End Tests** - Test complete user workflows
   - Login and authentication flow
   - Dashboard navigation and functionality
   - Real-time data updates
   - Alert management

4. **Performance Tests** - Test system performance under load
   - API throughput testing
   - WebSocket connection stress testing
   - Database query performance
   - Memory and CPU usage analysis

### Test Coverage Goals

- **Minimum Coverage**: 80% for all components
- **Critical Paths**: 95% coverage required
- **Acceptable Coverage**: 70% for utility functions

## Quick Start

### Prerequisites

```bash
# Backend requirements
pip install pytest pytest-cov pytest-asyncio pytest-mock locust

# Frontend requirements  
npm install

# E2E requirements
npx playwright install
```

### Running Tests

```bash
# All unit tests
make test

# Specific test suites
make test-unit          # Backend + Frontend unit tests
make test-integration   # Integration tests
make test-e2e          # End-to-end tests
make test-performance  # Performance/load tests

# All tests (recommended for CI)
make test-all

# Everything including performance
make test-full
```

### Alternative Test Runner

```bash
# Using the comprehensive test runner
./test-runner.sh --help

# Example usage
./test-runner.sh --unit --integration
./test-runner.sh --all --coverage-threshold 85
./test-runner.sh --e2e
```

## Test Structure

### Backend Tests (`/apps/rtpm-api/tests/`)

```
tests/
├── conftest.py                 # Test fixtures and configuration
├── test_metrics_api.py        # Metrics ingestion and querying
├── test_alerts_api.py         # Alert rules and notifications
├── test_websocket.py          # Real-time WebSocket connections
├── test_database.py           # Database operations and queries
├── test_cache.py              # Redis caching functionality
├── test_auth.py               # Authentication and authorization
├── test_integration.py        # End-to-end backend workflows
└── performance/
    └── locustfile.py          # Load testing scenarios
```

### Frontend Tests (`/deployment/rtpm-dashboard/src/__tests__/`)

```
src/__tests__/
├── setup.ts                   # Jest test configuration
├── jest.config.js            # Jest configuration file
├── __mocks__/                # Mock implementations
│   ├── apiMock.ts           # API client mock
│   └── websocketMock.ts     # WebSocket client mock
├── App.test.tsx              # Main application component
├── Dashboard.test.tsx        # Dashboard component and panels
├── Login.test.tsx           # Authentication components
├── panels.test.tsx          # Individual panel components
├── hooks.test.tsx           # Custom React hooks
├── api.test.ts              # API client functionality
└── websocket.test.ts        # WebSocket client
```

### E2E Tests (`/deployment/rtpm-dashboard/e2e/`)

```
e2e/
├── playwright.config.ts      # Playwright configuration
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test cleanup
└── tests/
    ├── dashboard-flow.spec.ts    # Complete dashboard workflows
    └── authentication.spec.ts   # Authentication flows
```

## Test Configuration

### Backend Configuration

**pytest.ini** - Main pytest configuration:
- Coverage thresholds: 80%
- Test markers for categorization
- Environment variable setup
- Async test support

**conftest.py** - Test fixtures:
- Database session management
- Redis mock setup
- Authentication helpers
- Test data factories

### Frontend Configuration

**jest.config.js** - Jest configuration:
- TypeScript support with ts-jest
- jsdom environment for DOM testing
- Coverage reporting and thresholds
- Module path mapping

**setup.ts** - Test environment setup:
- jsdom extensions
- Custom matchers
- Global test utilities

### E2E Configuration

**playwright.config.ts** - Playwright configuration:
- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot and video capture
- Parallel test execution

## Test Data Management

### Fixtures and Factories

The test suite uses factory patterns for generating test data:

```python
# Backend test data factories
@pytest.fixture
def sample_metric():
    return {
        "metric_name": "response_time",
        "value": 156.7,
        "timestamp": datetime.utcnow().isoformat(),
        "labels": {"service": "api", "endpoint": "/users"}
    }
```

```typescript
// Frontend test data factories
export const createMockMetric = (overrides?: Partial<Metric>): Metric => ({
  id: 'test-metric-1',
  name: 'response_time',
  value: 156.7,
  timestamp: new Date().toISOString(),
  ...overrides
});
```

### Database State Management

- **Clean State**: Each test starts with a clean database state
- **Transactions**: Tests run in transactions that are rolled back
- **Isolation**: Tests are isolated and can run in parallel
- **Seeding**: Minimal seed data for testing relationships

## Performance Testing

### Load Testing with Locust

The performance test suite includes:

1. **Normal Load Testing**:
   ```bash
   locust -f locustfile.py --host=http://localhost:8000 --users 50 --spawn-rate 5 --run-time 300s
   ```

2. **Stress Testing**:
   ```bash
   locust -f locustfile.py --host=http://localhost:8000 --users 200 --spawn-rate 10 --run-time 300s StressTestUser
   ```

3. **High-Volume Metrics Ingestion**:
   ```bash
   locust -f locustfile.py --host=http://localhost:8000 --users 20 --spawn-rate 2 --run-time 600s HighVolumeMetricsUser
   ```

### Performance Criteria

The test suite validates:
- **Throughput**: > 1,000 metrics/second
- **Response Time**: Average < 500ms, 95th percentile < 1000ms
- **Error Rate**: < 1% under normal load
- **Concurrent Connections**: Support for 10,000+ WebSocket connections

## Continuous Integration

### GitHub Actions Workflow

The CI pipeline (`/.github/workflows/rtpm-tests.yml`) includes:

1. **Backend Tests**:
   - Unit tests with coverage
   - Integration tests
   - Dependency security scanning

2. **Frontend Tests**:
   - Unit tests with coverage
   - Linting and type checking
   - Bundle size analysis

3. **E2E Tests**:
   - Multi-browser testing
   - Visual regression testing
   - Performance budgets

4. **Performance Tests** (scheduled):
   - Weekly performance regression testing
   - Load testing with reporting

### Coverage Reporting

- **Codecov Integration**: Automatic coverage reporting on PRs
- **Coverage Gates**: Prevent merging if coverage drops below threshold
- **Historical Tracking**: Track coverage trends over time

## Local Development

### Setting Up Test Environment

1. **Install Dependencies**:
   ```bash
   make install
   ```

2. **Start Test Services**:
   ```bash
   make services
   ```

3. **Run Tests**:
   ```bash
   make test-all
   ```

4. **Generate Coverage Report**:
   ```bash
   make coverage
   ```

### Development Workflow

1. **Write Tests First**: Follow TDD principles
2. **Run Tests Locally**: Ensure tests pass before committing
3. **Check Coverage**: Maintain coverage above threshold
4. **Run E2E Tests**: Validate user workflows for major changes

### Debugging Tests

```bash
# Debug backend tests
cd apps/rtpm-api
python -m pytest tests/test_specific.py -v --pdb

# Debug frontend tests
npm run test:watch

# Debug E2E tests
cd e2e
npx playwright test --debug
```

## Test Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**: Keep test dependencies current
2. **Review Flaky Tests**: Fix or remove unstable tests
3. **Performance Baseline**: Update performance baselines
4. **Test Data**: Keep test data relevant and minimal

### Adding New Tests

1. **Backend**: Add to appropriate test file in `/apps/rtpm-api/tests/`
2. **Frontend**: Add to `/src/__tests__/` with `.test.tsx` extension  
3. **E2E**: Add to `/e2e/tests/` with `.spec.ts` extension
4. **Update Coverage**: Ensure new code is covered

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   ```bash
   # Restart test database
   make services-stop
   make services
   ```

2. **Port Conflicts**:
   - Check for running services on ports 5433, 6380, 3000, 8000
   - Kill conflicting processes or change ports in config

3. **Browser Issues (E2E)**:
   ```bash
   # Reinstall browsers
   cd e2e
   npx playwright install
   ```

4. **Permission Errors**:
   ```bash
   # Make test runner executable
   chmod +x test-runner.sh
   ```

### Getting Help

- **Test Logs**: Check test output for detailed error messages
- **Coverage Reports**: Use coverage reports to identify untested code
- **CI Logs**: Check GitHub Actions logs for CI failures
- **Documentation**: Refer to individual tool documentation (Jest, Pytest, Playwright)

## Best Practices

1. **Test Naming**: Use descriptive test names that explain the scenario
2. **Test Organization**: Group related tests together
3. **Mock Usage**: Mock external dependencies appropriately
4. **Test Data**: Use factories for consistent test data
5. **Assertions**: Use specific assertions with clear error messages
6. **Cleanup**: Ensure tests clean up after themselves
7. **Performance**: Keep tests fast and focused

---

For more detailed information about specific test suites or configuration, refer to the individual test files and configuration documentation.