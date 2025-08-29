# Security Dashboard - Comprehensive Testing Suite

This document outlines the comprehensive testing strategy and implementation for the Security Operations Platform, covering all aspects of testing from unit tests to security penetration testing.

## Testing Philosophy

Our testing approach follows the **Testing Pyramid** with emphasis on:
- **Many unit tests** - Fast feedback and high coverage
- **Some integration tests** - Component interaction validation
- **Few E2E tests** - Critical user journey verification
- **Specialized tests** - Performance, security, and accessibility

## Test Coverage Goals

- **Minimum 80% code coverage** across all categories
- **Branch coverage**: 80%
- **Function coverage**: 80%
- **Line coverage**: 80%
- **Statement coverage**: 80%

## Testing Stack

### Frontend Testing
- **Unit Tests**: Vitest + React Testing Library
- **Component Testing**: Cypress Component Testing
- **E2E Testing**: Cypress + Playwright
- **Visual Regression**: Playwright Screenshots
- **Accessibility**: axe-core + Playwright

### Backend Testing
- **Unit Tests**: Vitest
- **GraphQL Testing**: Apollo Server Testing
- **Integration Tests**: Supertest + Test Containers
- **WebSocket Testing**: Custom WebSocket test utilities

### Mobile Testing
- **Unit Tests**: Jest + React Native Testing Library
- **E2E Testing**: Detox
- **Device Testing**: Expo Development Build

### Performance Testing
- **Load Testing**: K6
- **Stress Testing**: K6 + Custom Scripts
- **Memory Testing**: Clinic.js
- **Bundle Analysis**: Webpack Bundle Analyzer

### Security Testing
- **Penetration Testing**: K6 + Custom Security Scripts
- **OWASP Testing**: ZAP Baseline Scan
- **Dependency Scanning**: npm audit + Snyk
- **Code Security**: ESLint Security Plugin

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm ci

# Install mobile dependencies
cd mobile && npm ci && cd ..

# Install K6 (for performance testing)
# macOS
brew install k6

# Linux
curl -s https://github.com/grafana/k6/releases/latest | grep "browser_download_url.*linux-amd64.tar.gz" | cut -d : -f 2,3 | tr -d \" | wget -qi -
tar -xf k6-*-linux-amd64.tar.gz
sudo mv k6-*-linux-amd64/k6 /usr/local/bin/

# Windows
choco install k6
```

### Running Tests

#### All Tests (Comprehensive Suite)
```bash
# Run complete test suite with quality gates
npm run test:all

# Run specific test categories
npm run test:unit
npm run test:integration  
npm run test:e2e
npm run test:performance
npm run test:security
npm run test:accessibility
npm run test:mobile
```

#### Development Workflow
```bash
# Watch mode for development
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Coverage with watch
npm run test:coverage -- --watch
```

## Test Suite Structure

```
tests/
├── unit/                           # Unit tests
│   ├── components/                 # React component tests
│   ├── hooks/                      # Custom hooks tests
│   ├── utils/                      # Utility function tests
│   └── services/                   # Service layer tests
├── integration/                    # Integration tests
│   ├── api/                        # GraphQL API tests
│   ├── database/                   # Database integration tests
│   ├── websocket/                  # Real-time feature tests
│   └── external/                   # External service tests
├── e2e/                           # End-to-end tests
│   ├── cypress/                    # Cypress E2E tests
│   └── playwright/                 # Playwright E2E tests
├── performance/                    # Performance tests
│   └── k6/                         # K6 load tests
├── security/                       # Security tests
│   ├── penetration-tests.js        # Penetration testing
│   └── owasp-tests/                # OWASP security tests
├── accessibility/                  # Accessibility tests
│   └── playwright/                 # Playwright a11y tests
└── mobile/                         # Mobile app tests
    ├── unit/                       # Mobile unit tests
    └── e2e/                        # Mobile E2E tests (Detox)
```

## Testing Patterns & Best Practices

### Unit Testing

#### Component Testing Pattern
```typescript
// Example: SecurityDashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import SecurityDashboard from '../SecurityDashboard';

describe('SecurityDashboard', () => {
  it('displays security metrics correctly', async () => {
    const mockData = mockSecurityMetrics();
    
    render(<SecurityDashboard />, {
      apolloMocks: [mockData],
      reduxState: { dashboard: { loading: false } }
    });

    await waitFor(() => {
      expect(screen.getByText('1,247')).toBeInTheDocument();
      expect(screen.getByText('Total Threats')).toBeInTheDocument();
    });
  });
});
```

#### Service Testing Pattern
```typescript
// Example: apollo-client.test.ts
import { createTestClient } from '@apollo/client/testing';
import { GET_SECURITY_EVENTS } from '../queries';

describe('Apollo Client', () => {
  it('fetches security events correctly', async () => {
    const { query } = createTestClient({
      mocks: [mockSecurityEventsQuery]
    });

    const result = await query({ query: GET_SECURITY_EVENTS });
    
    expect(result.errors).toBeUndefined();
    expect(result.data.securityEvents).toHaveLength(5);
  });
});
```

### Integration Testing

#### GraphQL Resolver Testing
```typescript
// Example: security-resolvers.test.ts
describe('Security Resolvers', () => {
  it('creates security event with authentication', async () => {
    const result = await execute({
      schema: testSchema,
      document: parse(CREATE_SECURITY_EVENT),
      rootValue: securityResolvers,
      contextValue: mockAuthenticatedContext,
      variableValues: { input: mockEventInput }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.createSecurityEvent.id).toBeDefined();
  });
});
```

### E2E Testing

#### Cypress Testing Pattern
```typescript
// Example: security-dashboard.cy.ts
describe('Security Dashboard E2E', () => {
  beforeEach(() => {
    cy.login();
    cy.seedTestData();
  });

  it('completes incident response workflow', () => {
    cy.visit('/incidents');
    cy.get('[data-testid="create-incident"]').click();
    
    cy.fillIncidentForm({
      title: 'Critical Security Breach',
      severity: 'HIGH'
    });
    
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/incidents/');
    cy.get('[data-testid="incident-status"]').should('contain', 'OPEN');
  });
});
```

#### Playwright Testing Pattern
```typescript
// Example: security-dashboard.spec.ts
test('handles real-time threat updates', async ({ page }) => {
  await page.goto('/threats');
  
  // Mock WebSocket connection
  await page.addInitScript(() => {
    window.mockWebSocket = new MockWebSocket();
  });
  
  // Simulate threat detection
  await page.evaluate(() => {
    window.mockWebSocket.emit('threat_detected', mockThreatData);
  });
  
  await expect(page.locator('[data-testid="new-threat"]')).toBeVisible();
});
```

### Performance Testing

#### K6 Load Testing Pattern
```javascript
// Example: Basic load test structure
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '10m', target: 100 },  // Stay at load
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.02'],    // Error rate under 2%
  }
};

export default function() {
  const response = http.get('http://localhost:3005/api/dashboard');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}
```

### Security Testing

#### Penetration Testing Pattern
```javascript
// Example: SQL Injection Test
function testSQLInjection() {
  const payloads = ["' OR '1'='1", "'; DROP TABLE users;--"];
  
  payloads.forEach(payload => {
    const response = http.post('/api/login', {
      email: payload,
      password: 'test'
    });
    
    check(response, {
      'SQL injection blocked': (r) => r.status === 400 || r.status === 401,
      'No database errors exposed': (r) => !r.body.includes('SQL'),
    });
  });
}
```

## Test Data Management

### Factory Pattern
```typescript
// SecurityEventFactory.ts
export class SecurityEventFactory {
  static create(overrides = {}): SecurityEvent {
    return {
      id: faker.string.uuid(),
      type: 'MALWARE_DETECTED',
      severity: 'HIGH',
      timestamp: faker.date.recent().toISOString(),
      ...overrides
    };
  }
}
```

### Mock Data Strategies
- **Factories**: Generate realistic test data
- **Fixtures**: Static test data files
- **Builders**: Fluent API for complex objects
- **Seeders**: Database population for integration tests

## Quality Gates

### Coverage Requirements
- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: 70% minimum coverage
- **E2E Tests**: Critical paths covered

### Performance Requirements
- **Page Load**: < 2 seconds (95th percentile)
- **API Response**: < 1 second (95th percentile)  
- **WebSocket Latency**: < 100ms
- **Error Rate**: < 1%

### Security Requirements
- **Zero Critical Vulnerabilities**
- **OWASP Top 10 Compliance**
- **Authentication Required** for all protected endpoints
- **Input Validation** on all user inputs

### Accessibility Requirements
- **WCAG 2.1 AA Compliance**
- **axe-core**: Zero violations
- **Keyboard Navigation**: Full support
- **Screen Reader**: Compatible

## CI/CD Integration

### GitHub Actions Workflow
The testing pipeline includes:

1. **Code Quality**: Linting, type checking, security audit
2. **Unit Tests**: Frontend, backend, and mobile
3. **Integration Tests**: API, database, WebSocket
4. **E2E Tests**: Multi-browser testing
5. **Performance Tests**: Load and stress testing
6. **Security Tests**: Penetration and vulnerability testing
7. **Accessibility Tests**: WCAG compliance
8. **Quality Gates**: Coverage and performance thresholds

### Running in CI
```yaml
# Example CI configuration
- name: Run comprehensive tests
  run: npm run test:all
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/security_test
    REDIS_URL: redis://localhost:6379
```

## Test Environment Setup

### Local Development
```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Run database migrations
npm run db:migrate:test

# Seed test data
npm run db:seed:test

# Run tests
npm run test:all
```

### Docker Test Environment
```dockerfile
# Test-specific Docker configuration
FROM node:18-alpine

# Install testing dependencies
RUN apk add --no-cache chromium firefox

# Set up test user
RUN adduser -D testuser
USER testuser

# Copy and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Run tests
CMD ["npm", "run", "test:all"]
```

## Debugging Tests

### Test Debugging Commands
```bash
# Debug specific test
npm run test -- --inspect-brk SecurityDashboard.test.tsx

# Debug E2E tests
npm run test:e2e:cypress:open  # Opens Cypress UI
npm run test:e2e:playwright:headed  # Runs Playwright with browser

# Debug performance tests
k6 run --http-debug tests/performance/k6/security-dashboard-load-test.js
```

### Common Debugging Patterns
- **Test Isolation**: Run single tests to isolate issues
- **Mock Inspection**: Log mock calls to verify interactions
- **Screenshot Capture**: Take screenshots at failure points
- **Network Inspection**: Monitor API calls during tests
- **State Inspection**: Log component/application state

## Test Reporting

### Coverage Reports
- **HTML Report**: `coverage/index.html`
- **LCOV Format**: For CI integration
- **JSON Format**: For programmatic analysis

### Performance Reports
- **K6 HTML Report**: Detailed performance metrics
- **Trend Analysis**: Performance over time
- **Threshold Violations**: Performance regression detection

### Security Reports
- **ZAP HTML Report**: Security vulnerability assessment
- **npm audit**: Dependency vulnerability report
- **Custom Security**: Penetration test results

## Best Practices

### Test Organization
- **Co-location**: Tests next to source code
- **Naming**: Clear, descriptive test names
- **Structure**: AAA pattern (Arrange, Act, Assert)
- **Isolation**: Independent, stateless tests

### Test Data
- **Factories**: Generate realistic test data
- **Cleanup**: Clean up test data after tests
- **Isolation**: Each test uses fresh data
- **Realistic**: Data reflects production scenarios

### Test Maintenance
- **Regular Updates**: Keep tests updated with features
- **Refactoring**: Improve test quality over time
- **Documentation**: Document complex test scenarios
- **Review**: Include tests in code reviews

## Troubleshooting

### Common Issues

#### Tests Failing in CI but Passing Locally
- Check environment variables
- Verify service dependencies
- Review timing issues (add appropriate waits)
- Check browser/Node version differences

#### Flaky Tests
- Add explicit waits instead of arbitrary sleeps
- Mock external dependencies
- Use deterministic test data
- Review race conditions

#### Performance Test Failures
- Check test environment capacity
- Review baseline performance metrics
- Verify network stability
- Monitor resource utilization

#### Memory Leaks in Tests
- Clean up event listeners
- Clear timers and intervals
- Reset global state
- Use proper test isolation

### Getting Help

1. **Check test logs** for specific error messages
2. **Review test documentation** for patterns
3. **Run tests locally** to reproduce issues
4. **Check CI/CD logs** for environment-specific issues
5. **Consult team members** for complex scenarios

## Performance Metrics

### Test Execution Times
- **Unit Tests**: < 30 seconds
- **Integration Tests**: < 2 minutes
- **E2E Tests**: < 10 minutes
- **Performance Tests**: < 5 minutes
- **Security Tests**: < 3 minutes

### Resource Usage
- **Memory**: < 2GB during test execution
- **CPU**: Efficient parallel execution
- **Disk**: Minimal test artifact storage
- **Network**: Optimized external calls

---

This comprehensive testing suite ensures high quality, performance, and security for the Security Operations Platform. Regular maintenance and updates to this testing strategy will maintain its effectiveness as the platform evolves.