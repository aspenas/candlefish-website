# Security Dashboard Test Suite

Comprehensive testing infrastructure for the Candlefish Security Dashboard, covering backend Go services, frontend React components, WebSocket real-time updates, and performance testing.

## Test Architecture Overview

This test suite implements a multi-layered testing strategy following the test pyramid:

- **Unit Tests**: 70% - Individual components, services, and functions
- **Integration Tests**: 20% - API endpoints, database operations, WebSocket connections
- **E2E Tests**: 10% - Complete user workflows and critical paths

## Coverage Requirements

- **Global Minimum**: 80% coverage across branches, functions, lines, and statements
- **Critical Components**: 85-90% coverage for security services and authentication
- **Performance**: Handle 15,000 events/second with <100ms response time

## Test Categories

### Backend Tests (Go)

#### Unit Tests - Security Service
**Location**: `backend/security-service.test.go`
- Security overview generation
- Asset CRUD operations
- Vulnerability management
- Security event creation and querying
- Performance metrics validation

#### Integration Tests - API Layer
**Location**: `backend/api-integration.test.go`
- Health check endpoints
- Authentication/authorization flows
- Rate limiting enforcement
- Error handling and validation
- Concurrent request processing

**Key Features Tested**:
- JWT RS256 authentication
- TimescaleDB time-series operations
- Redis caching and rate limiting
- WebSocket event broadcasting
- Organization-based data isolation

### Frontend Tests (React/TypeScript)

#### Component Tests
**Location**: `frontend/SecurityDashboard.test.tsx`

**Components Covered**:
- `SecurityDashboard` - Main dashboard with real-time updates
- `SecurityEventTimeline` - Event filtering and visualization
- `ThreatDetectionPanel` - Threat analysis with charts
- `IncidentManagementBoard` - Incident workflow management

**Test Features**:
- Real-time WebSocket updates
- State management (Zustand)
- API integration (React Query)
- Accessibility compliance
- User interaction flows

### WebSocket Tests

#### Real-time Communication
**Location**: `websocket/websocket-security.test.ts`
- Authentication and authorization
- Event subscription management
- Real-time event broadcasting
- Connection resilience and reconnection
- Performance under load

### End-to-End Tests (Cypress)

#### Critical User Workflows
**Location**: `e2e/security-dashboard-workflows.cy.ts`
- Complete authentication flow
- Dashboard navigation and overview
- Security event management
- Threat investigation workflows
- Incident response processes
- Real-time update verification

### Performance Tests (K6)

#### Load Testing
**Location**: `performance/k6-security-load-test.js`
- **Target**: 15,000 events/second
- Load progression from 10 to 1,000 concurrent users
- Stress testing up to 1,500 users
- Soak testing for 10-minute duration
- WebSocket connection scaling

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Go 1.21+
- Docker and Docker Compose
- PostgreSQL with TimescaleDB extension

### Installation

```bash
# Install dependencies
cd __tests__/security-dashboard
npm install

# Install Go test dependencies
cd ../../services/security-dashboard
go mod download

# Install additional tools
npm install -g @cypress/cli
brew install k6  # macOS
```

### Running Tests

#### All Tests (Recommended)
```bash
# Run complete test suite
./scripts/run-all-tests.sh

# CI mode (headless, no interactive prompts)
./scripts/run-all-tests.sh --ci

# Unit tests only (faster development)
./scripts/run-all-tests.sh --unit-only
```

#### Individual Test Suites

```bash
# Backend Go tests
cd services/security-dashboard
go test -v -race -coverprofile=coverage.out ./...

# Frontend component tests
npm run test                    # Watch mode
npm run test:coverage          # With coverage

# WebSocket tests
npm run test:websocket

# E2E tests
npm run test:e2e               # Headless
npm run test:e2e:open          # Interactive

# Performance tests
npm run test:performance
```

## Test Configuration

### Environment Variables

```bash
# Test database
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/security_dashboard_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret-key-for-testing

# API endpoints
API_BASE_URL=http://localhost:3001/api
WS_BASE_URL=ws://localhost:3001

# Test user credentials
TEST_USER_EMAIL=admin@candlefish.ai
TEST_USER_PASSWORD=SecurePassword123!
```

### Docker Services

The test suite automatically manages Docker containers:

```bash
# PostgreSQL with TimescaleDB
docker run -d --name postgres-test \
  -e POSTGRES_DB=security_dashboard_test \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_pass \
  -p 5433:5432 \
  timescale/timescaledb:latest-pg15

# Redis for caching
docker run -d --name redis-test \
  -p 6380:6379 \
  redis:7-alpine
```

## Coverage Reports

### Viewing Coverage

```bash
# Generate and open coverage reports
npm run test:coverage

# Backend coverage
go tool cover -html=coverage/backend-coverage.out

# Combined report location
open coverage/lcov-report/index.html
```

### Coverage Thresholds

| Component | Branches | Functions | Lines | Statements |
|-----------|----------|-----------|--------|------------|
| Global | 80% | 80% | 80% | 80% |
| Security Service | 90% | 90% | 90% | 90% |
| Dashboard Components | 85% | 85% | 85% | 85% |

## Performance Benchmarks

### Target Metrics

- **Throughput**: 15,000 security events/second
- **Response Time**: <100ms for 95th percentile
- **Concurrent Users**: 1,000 simultaneous connections
- **WebSocket Latency**: <50ms for real-time updates
- **Database Query Performance**: <10ms for time-series queries

### Load Test Scenarios

1. **Ramp-up**: 10 → 100 → 500 → 1,000 users over 5 minutes
2. **Stress Test**: Scale to 1,500 users (150% capacity)
3. **Soak Test**: Maintain 800 users for 10 minutes
4. **Spike Test**: Sudden load increase to test autoscaling

## CI/CD Pipeline

### GitHub Actions Workflow
**Location**: `.github/workflows/security-dashboard-tests.yml`

**Jobs**:
- **Backend Tests**: Go unit and integration tests
- **Frontend Tests**: React component and hook tests
- **E2E Tests**: Cypress workflow testing
- **Performance Tests**: K6 load testing
- **Security Tests**: Authentication and OWASP scanning
- **Coverage Report**: Combined coverage analysis

### Pipeline Triggers
- Pull requests to main branch
- Direct pushes to main branch
- Manual workflow dispatch
- Scheduled nightly runs

## Mock Data and Fixtures

### Test Data Factory
**Location**: `mocks/security-data.ts`

```typescript
// Generate mock security events
const events = generateMockSecurityEvents(100);

// Create test organizations and users
const org = createMockOrganization();
const user = createMockUser(org.id);

// Generate threat intelligence
const threats = generateMockThreats(20);
```

### Database Seeding

```bash
# Seed test database
npm run db:seed

# Clean up test data
npm run db:cleanup
```

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check if PostgreSQL is running
docker ps | grep postgres-test

# Reset test database
docker stop postgres-test && docker rm postgres-test
./scripts/run-all-tests.sh  # Will recreate containers
```

#### Frontend Test Failures
```bash
# Clear test cache
npm run test:clear-cache

# Update snapshots
npm run test -- --updateSnapshot
```

#### WebSocket Connection Issues
```bash
# Check if backend API is running
curl http://localhost:3001/api/health

# Verify WebSocket endpoint
wscat -c ws://localhost:3001/ws/security
```

#### Performance Test Failures
```bash
# Increase system limits (macOS)
ulimit -n 65536

# Monitor system resources
htop  # Check CPU and memory usage

# Run isolated performance test
k6 run --vus 100 --duration 30s performance/k6-security-load-test.js
```

### Test Environment Reset

```bash
# Complete environment reset
docker stop postgres-test redis-test 2>/dev/null || true
docker rm postgres-test redis-test 2>/dev/null || true
rm -rf coverage/ reports/
./scripts/run-all-tests.sh
```

## Development Workflow

### Adding New Tests

1. **Unit Tests**: Add to respective test files following existing patterns
2. **Integration Tests**: Extend API integration test suite
3. **E2E Tests**: Add new spec files to `e2e/` directory
4. **Mock Data**: Update `mocks/security-data.ts` with new fixtures

### Test-Driven Development

```bash
# Run tests in watch mode during development
npm run test:watch

# Run specific test file
npm test -- SecurityDashboard.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should handle real-time updates"
```

### Debugging Tests

```bash
# Run tests with debugger
npm test -- --inspect-brk
node --inspect-brk node_modules/.bin/jest

# Cypress debugging
npx cypress open  # Interactive mode with browser dev tools
```

## Test Metrics and Reporting

### Daily Reports
- Coverage trends
- Performance benchmarks
- Test execution time
- Flaky test identification

### Integration with External Tools
- **Codecov**: Coverage reporting and PR integration
- **Datadog**: Performance monitoring and alerting
- **Slack**: Test failure notifications
- **GitHub**: PR status checks and comments

## Security Testing

### Authentication Tests
- JWT token validation
- Role-based access control
- Session management
- Password policies

### OWASP Security Scanning
- SQL injection prevention
- XSS vulnerability testing
- CSRF protection validation
- Input sanitization verification

### Data Privacy Tests
- Organization data isolation
- PII encryption validation
- Audit log integrity
- Compliance reporting accuracy

---

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure coverage thresholds are met
3. Run full test suite before submitting PR
4. Update documentation if test patterns change

## Support

For test-related issues:
- Check existing GitHub issues
- Review troubleshooting section above
- Contact the development team via Slack #security-dashboard

---

**Last Updated**: Generated with comprehensive Security Dashboard test suite
**Test Suite Version**: 1.0.0
**Coverage Target**: 80%+ global, 90%+ critical components