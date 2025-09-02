# Deployment Infrastructure Testing Guide

This document provides a comprehensive overview of the testing strategy and implementation for the Candlefish AI deployment infrastructure.

## 🧪 Test Suite Overview

Our deployment infrastructure testing covers multiple layers:

1. **Unit Tests** - Individual API endpoints and React components
2. **Integration Tests** - Complete deployment workflows 
3. **End-to-End Tests** - Full user journey testing
4. **Performance Tests** - Load and stress testing
5. **Security Tests** - Authentication and authorization
6. **Rollback Tests** - Disaster recovery scenarios
7. **WebSocket Tests** - Real-time functionality

## 📁 Test Structure

```
__tests__/
├── deployment-api/
│   ├── unit/
│   │   └── deployment-endpoints.test.ts      # API endpoint unit tests
│   └── integration/
│       └── deployment-workflows.test.ts      # Full workflow tests
├── deployment-ui/
│   └── components/
│       ├── DeploymentDashboard.test.tsx      # Dashboard component tests
│       ├── EnvironmentSelector.test.tsx      # Environment selector tests
│       └── DeploymentHistory.test.tsx        # History component tests
├── e2e/
│   └── deployment-flows.cy.ts                # Cypress E2E tests
├── performance/
│   └── k6/
│       ├── deployment-api-load-test.js       # K6 load tests
│       └── deployment-api-stress-test.js     # K6 stress tests
├── security/
│   └── auth-security.test.ts                 # Security testing
├── rollback/
│   └── rollback-scenarios.test.ts            # Rollback testing
├── websocket/
│   └── websocket-connection.test.ts          # WebSocket testing
└── utils/
    ├── auth-helpers.ts                        # Authentication utilities
    ├── deployment-helpers.ts                  # Deployment utilities
    └── service-helpers.ts                     # Service management utilities
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ with pnpm
- PostgreSQL 14+
- Redis 6+
- K6 (for performance tests)
- Cypress (for E2E tests)

### Environment Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
export NODE_ENV=test
export TEST_DB_NAME=deployment_api_test
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=postgres
export TEST_REDIS_DB=1

# Create test database
createdb deployment_api_test
```

### Running Tests

#### All Tests
```bash
# Run complete test suite
./scripts/run-deployment-tests.sh

# Run with specific options
./scripts/run-deployment-tests.sh --no-performance --no-e2e
```

#### Individual Test Suites
```bash
# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# Component tests
pnpm test:frontend

# E2E tests
pnpm test:e2e

# Performance tests
pnpm test:performance

# Security tests
pnpm test:security
```

## 📋 Test Categories

### 1. Unit Tests

**Location**: `__tests__/deployment-api/unit/`

Tests individual API endpoints with mocked dependencies:
- POST /api/deployments - Deployment creation
- GET /api/deployments - Deployment listing with filters
- GET /api/deployments/{id} - Deployment details
- POST /api/deployments/{id}/rollback - Rollback initiation
- GET /api/health/{service} - Health checks
- GET /api/environments - Environment listing
- POST /api/secrets/rotate - Secret rotation
- GET /api/audit-logs - Audit log access

**Key Features**:
- Mocked external services
- Permission validation
- Input validation
- Error handling
- Response format verification

### 2. Integration Tests

**Location**: `__tests__/deployment-api/integration/`

Tests complete deployment workflows with real databases:
- Blue-green deployment cycles
- Rolling deployment strategies
- Deployment failure handling
- Zero-downtime deployments
- Environment variable updates
- Secret rotation workflows

**Key Features**:
- Real database and Redis instances
- External service mocking (Netlify, GitHub)
- Deployment status progression
- Step-by-step validation
- Cleanup and rollback testing

### 3. Component Tests

**Location**: `__tests__/deployment-ui/components/`

Tests React UI components with comprehensive user interactions:

#### DeploymentDashboard
- Real-time status updates via WebSocket
- Deployment creation workflow
- Filter and pagination
- Error handling and loading states

#### EnvironmentSelector  
- Environment dropdown functionality
- Permission-based filtering
- Validation and error states
- Keyboard navigation

#### DeploymentHistory
- Timeline display
- Deployment details expansion
- Action menus (rollback, copy URL)
- Historical data pagination

### 4. End-to-End Tests

**Location**: `__tests__/e2e/`

Full user journey testing with Cypress:
- Complete deployment flow from UI to completion
- Blue-green deployment monitoring
- Rollback scenarios
- Real-time updates
- Permission enforcement
- Error recovery

**Scenarios**:
- Successful production deployment
- Build failure handling
- Zero-downtime verification
- Rollback workflows
- Environment variable management
- Multi-user access control

### 5. Performance Tests

**Location**: `__tests__/performance/k6/`

K6-based load and stress testing:

#### Load Testing
- 10-100 concurrent users
- Mixed API endpoint usage
- Deployment creation under load
- Response time validation
- Error rate monitoring

#### Stress Testing
- Up to 500 concurrent users
- System stability under extreme load
- Recovery time measurement
- Memory pressure testing
- API saturation point detection

**Metrics Monitored**:
- Response times (P95 < 2s)
- Error rates (< 2%)
- Deployment success rates (> 95%)
- System recovery time
- Concurrent deployment limits

### 6. Security Tests

**Location**: `__tests__/security/`

Comprehensive security validation:

#### Authentication
- JWT token validation
- Expired token rejection
- Malformed token handling
- Signature verification
- Token replay attack prevention

#### Authorization
- Role-based access control
- Permission enforcement
- Privilege escalation prevention
- Environment-specific permissions

#### Input Validation
- SQL injection prevention
- XSS attack mitigation
- Request size limits
- Malformed data handling

### 7. Rollback Tests

**Location**: `__tests__/rollback/`

Disaster recovery scenario testing:
- Rollback to previous deployment
- Rollback to specific commit
- Failed deployment rollback
- Permission-based rollback control
- Concurrent rollback prevention
- Health check integration

**Scenarios**:
- Standard rollback workflows
- Rollback validation and constraints
- Force rollback scenarios
- Cross-environment restrictions
- Rollback cancellation

### 8. WebSocket Tests

**Location**: `__tests__/websocket/`

Real-time functionality testing:
- WebSocket authentication
- Real-time deployment updates
- Step-by-step progress updates
- Subscription management
- Connection handling
- Error recovery

**Features**:
- Multi-channel subscriptions
- Permission-based filtering
- Connection heartbeat
- Automatic reconnection
- Message queuing

## 🛠 Testing Utilities

### Authentication Helpers

```typescript
// Create test users with specific roles
const adminUser = await createTestUser({
  email: 'admin@candlefish.ai',
  role: 'admin',
  permissions: ['deployments:create', 'deployments:read', 'deployments:rollback']
});

// Generate JWT tokens for testing
const token = generateTestJWT({
  sub: 'user-123',
  role: 'admin',
  permissions: ['deployments:read']
});
```

### Deployment Helpers

```typescript
// Create test deployments
const deployment = await createTestDeployment({
  site_name: 'docs',
  environment: 'staging',
  commit_sha: 'abc123...',
  branch: 'main'
});

// Wait for deployment status
await waitForDeploymentStatus(deployment.id, 'success', 120000);
```

### Service Management

```typescript
// Start test services
const services = await startTestServices();

// Reset to clean state
await resetTestServices();

// Cleanup after tests
await stopTestServices();
```

## 📊 Test Coverage

### Coverage Goals
- **Unit Tests**: 90% line coverage
- **Integration Tests**: 80% workflow coverage
- **E2E Tests**: 100% critical path coverage
- **Security Tests**: 100% endpoint coverage

### Coverage Reporting
```bash
# Generate coverage report
pnpm test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## 🔧 Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'Backend',
      testMatch: ['<rootDir>/__tests__/deployment-api/**/*.test.ts'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Frontend', 
      testMatch: ['<rootDir>/__tests__/deployment-ui/**/*.test.tsx'],
      testEnvironment: 'jsdom'
    }
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Cypress Configuration

```javascript
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: '__tests__/e2e/support/e2e.ts',
    specPattern: '__tests__/e2e/**/*.cy.ts'
  }
});
```

### K6 Configuration

```javascript
// Performance test options
export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.02']
  }
};
```

## 🎯 Testing Best Practices

### Test Organization
- **Arrange-Act-Assert** pattern
- Clear test names describing behavior
- Independent tests with proper cleanup
- Realistic test data

### Mock Strategy
- Mock external services (GitHub, Netlify)
- Use real databases for integration tests
- Mock time-dependent operations
- Preserve authentication flows

### Performance Testing
- Gradual load ramp-up
- Monitor system resources
- Test recovery scenarios
- Validate SLA compliance

### Security Testing
- Test all authentication paths
- Validate authorization boundaries  
- Check input sanitization
- Verify audit logging

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check PostgreSQL status
systemctl status postgresql

# Create test database
createdb -U postgres deployment_api_test

# Verify connection
psql -U postgres -d deployment_api_test -c "SELECT 1;"
```

#### Redis Connection Errors
```bash
# Check Redis status
redis-cli ping

# Clear test database
redis-cli -n 1 FLUSHDB
```

#### Test Timeouts
- Increase timeout values for slow operations
- Check for resource leaks
- Verify mock service responses
- Monitor test database performance

#### WebSocket Test Issues
- Ensure test server is running
- Check port conflicts
- Verify authentication tokens
- Monitor connection cleanup

## 📈 Continuous Integration

### GitHub Actions Workflow

```yaml
name: Deployment Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: deployment_api_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: pnpm install
      - run: ./scripts/run-deployment-tests.sh --no-e2e
      - uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test-reports/
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)  
- [K6 Performance Testing](https://k6.io/docs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🤝 Contributing

### Adding New Tests

1. **Unit Tests**: Add to appropriate `__tests__/*/unit/` directory
2. **Integration Tests**: Add workflow tests to `integration/` directory  
3. **E2E Tests**: Add user journey tests to `e2e/` directory
4. **Performance Tests**: Add K6 scripts to `performance/k6/`

### Test Naming Convention

```typescript
// Unit tests
describe('POST /api/deployments', () => {
  it('should create deployment with valid data', () => {});
  it('should reject deployment with invalid commit SHA', () => {});
});

// Component tests  
describe('DeploymentDashboard', () => {
  it('renders deployment dashboard with all sections', () => {});
  it('handles API errors gracefully', () => {});
});

// E2E tests
describe('Deployment Flows E2E', () => {
  it('should complete full blue-green deployment', () => {});
  it('should handle rollback scenarios', () => {});
});
```

### Code Review Checklist

- [ ] Tests follow AAA pattern
- [ ] Test names are descriptive
- [ ] Mocks are properly configured
- [ ] Cleanup is handled correctly
- [ ] Edge cases are covered
- [ ] Performance implications considered

---

For questions or support, please contact the platform team or create an issue in the repository.
