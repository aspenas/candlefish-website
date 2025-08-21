# Authentication Test Suite Documentation

This document describes the comprehensive test suite for the JWKS endpoint and authentication flow in the Paintbox application.

## Overview

The authentication test suite provides comprehensive coverage of:
- Unit tests for JWKS endpoint functionality
- Integration tests for AWS Secrets Manager
- End-to-end tests for authentication flows
- Load tests for performance validation
- Security tests for vulnerability assessment

## Test Structure

### 1. Unit Tests (`__tests__/api/auth/`)

#### `jwks-comprehensive.test.ts`
Comprehensive unit tests for the JWKS endpoint covering:

**Success Scenarios:**
- Valid JWKS with single/multiple keys
- JWKS format input handling
- ETag generation and conditional requests
- Response caching behavior

**Error Handling:**
- AWS service exceptions (ResourceNotFound, DecryptionFailure, etc.)
- JSON parsing errors
- Empty/missing secret handling
- Binary secret handling

**Input Validation:**
- Missing required key fields
- Empty keys object
- JWKS format validation

**Performance Features:**
- Caching efficiency
- Request tracing and metrics
- Concurrent request handling

**Security:**
- Security headers validation
- Error message sanitization
- Client info extraction safety

### 2. Integration Tests (`__tests__/integration/`)

#### `aws-secrets-jwks.test.ts`
Integration tests for AWS Secrets Manager functionality:

**Core Functionality:**
- Successful JWKS retrieval from AWS
- JWKS and key-value format handling
- Version-specific secret fetching
- Custom secret ID usage

**Error Scenarios:**
- Timeout handling
- AWS service exceptions
- Malformed JSON
- Binary/empty secrets
- Key validation failures

**Metadata Operations:**
- Secret metadata retrieval
- Version listing
- Connection testing

**Configuration:**
- AWS client configuration
- Credential handling
- Resource cleanup

### 3. End-to-End Tests (`__tests__/e2e/`)

#### `auth-flow-comprehensive.spec.ts`
Complete authentication flow testing using Playwright:

**JWKS Endpoint Validation:**
- Valid JWKS serving
- CORS handling
- HEAD request support
- Caching headers
- Conditional requests

**Authentication Pages:**
- Login page loading
- Protected page redirects
- Error message display

**OAuth Flow:**
- Google OAuth callbacks
- Error callback handling
- Invalid state handling

**Session Management:**
- Session persistence
- Logout functionality
- Concurrent sessions

**Security & CSRF:**
- Security headers
- CSRF protection
- Origin validation

**Error Handling:**
- Network failure recovery
- Service downtime handling
- Temporary failure recovery

**Performance:**
- Page load times
- Concurrent request handling
- JWKS caching efficiency

**Accessibility:**
- Keyboard navigation
- ARIA labels
- Screen reader support

### 4. Load Tests (`__tests__/performance/`)

#### `auth-load-tests.test.ts`
Performance and load testing:

**JWKS Endpoint Load:**
- 100+ concurrent requests
- Sustained load testing
- Cache efficiency under load
- ETag-based conditional requests

**Authentication Load:**
- Session validation requests
- OAuth callback simulation

**Rate Limiting:**
- Excessive request handling
- Rate limit recovery

**Resource Management:**
- Memory leak detection
- Connection pooling

**Performance Regression:**
- Baseline performance maintenance
- Response time thresholds

### 5. Security Tests (`__tests__/security/`)

#### `auth-security-tests.test.ts`
Comprehensive security vulnerability testing:

**Input Validation:**
- Malicious query parameter sanitization
- HTTP header validation
- Header injection prevention
- Oversized request handling

**Injection Prevention:**
- SQL injection testing
- XSS prevention
- Command injection protection

**CSRF Protection:**
- Origin header validation
- CORS policy enforcement

**Timing Attack Prevention:**
- Response timing consistency
- Key existence timing protection

**Information Disclosure:**
- Sensitive error message filtering
- Internal path protection
- Stack trace prevention

**DoS Prevention:**
- Malformed JSON handling
- Response size limiting
- Operation timeouts

**Authentication Security:**
- Malformed token handling
- JWT signature validation

**Configuration Security:**
- Environment variable protection
- Secure defaults

## Running Tests

### Prerequisites
```bash
npm install
```

### Individual Test Suites

```bash
# Unit tests
npm run test:api

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# Security tests
npm run test:security
```

### Complete Test Suite
```bash
# Run all authentication tests
npm run test:auth:all

# Run with coverage
npm run test:auth:coverage
```

### Specific Test Files
```bash
# JWKS unit tests
npx jest __tests__/api/auth/jwks-comprehensive.test.ts

# AWS integration tests
npx jest __tests__/integration/aws-secrets-jwks.test.ts

# E2E authentication flow
npx playwright test __tests__/e2e/auth-flow-comprehensive.spec.ts

# Load tests
npx jest __tests__/performance/auth-load-tests.test.ts

# Security tests
npx jest __tests__/security/auth-security-tests.test.ts
```

## Test Configuration

### Environment Variables
```bash
# Test environment URL
TEST_URL=http://localhost:3000

# AWS configuration (for integration tests)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test-key
AWS_SECRET_ACCESS_KEY=test-secret

# Test mode
NODE_ENV=test
```

### Test Configuration File
See `__tests__/auth-test-suite.config.ts` for centralized configuration including:
- Performance thresholds
- Load testing parameters
- Security test payloads
- Mock configurations
- Browser configurations for E2E

## Performance Thresholds

### JWKS Endpoint
- **Mean Response Time:** < 200ms
- **95th Percentile:** < 500ms
- **99th Percentile:** < 1000ms
- **Success Rate:** > 99%
- **Cache Hit Rate:** > 80% under load

### Authentication Endpoints
- **Mean Response Time:** < 500ms
- **95th Percentile:** < 1000ms
- **99th Percentile:** < 2000ms
- **Success Rate:** > 95%

## Security Test Coverage

### Input Validation
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Command injection prevention
- ✅ Header injection prevention
- ✅ Path traversal prevention

### Authentication Security
- ✅ JWT signature validation
- ✅ Token tampering detection
- ✅ Session security
- ✅ OAuth flow protection

### Information Security
- ✅ Error message sanitization
- ✅ Stack trace prevention
- ✅ Environment variable protection
- ✅ Internal path hiding

### Timing Attack Prevention
- ✅ Response timing consistency
- ✅ Key existence protection
- ✅ Error timing normalization

### DoS Protection
- ✅ Request size limiting
- ✅ Rate limiting
- ✅ Resource exhaustion prevention
- ✅ Timeout protection

## CI/CD Integration

### GitHub Actions
```yaml
# Example workflow step
- name: Run Authentication Tests
  run: |
    npm run test:auth:unit
    npm run test:auth:integration
    npm run test:auth:security
    
- name: Run E2E Tests
  run: |
    npm run build
    npm run start &
    sleep 10
    npm run test:e2e
    
- name: Run Load Tests
  run: |
    npm run test:performance
```

### Test Reports
- **Coverage Reports:** Generated in `coverage/` directory
- **Performance Reports:** JSON reports with timing data
- **Security Reports:** Vulnerability assessment results
- **E2E Reports:** Playwright HTML reports

## Monitoring and Alerts

### Performance Monitoring
- Response time degradation alerts
- Success rate drop notifications
- Cache hit rate monitoring

### Security Monitoring
- Failed security test alerts
- Vulnerability detection notifications
- Penetration test result tracking

## Troubleshooting

### Common Issues

**AWS Integration Tests Failing:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify AWS region
echo $AWS_REGION

# Test AWS Secrets Manager access
aws secretsmanager describe-secret --secret-id paintbox/production/jwt/public-keys
```

**E2E Tests Timing Out:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000

# Check if application is running
curl http://localhost:3000/health

# Verify JWKS endpoint
curl http://localhost:3000/.well-known/jwks.json
```

**Load Tests Failing:**
```bash
# Check system resources
top
free -h

# Verify network connectivity
ping localhost

# Check application logs
tail -f logs/application.log
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=true npm run test:auth:all

# Run specific test with debug
npx jest --verbose __tests__/api/auth/jwks-comprehensive.test.ts

# Playwright debug mode
npx playwright test --debug
```

## Contributing

### Adding New Tests

1. **Unit Tests:** Add to appropriate file in `__tests__/api/auth/`
2. **Integration Tests:** Add to `__tests__/integration/`
3. **E2E Tests:** Add to `__tests__/e2e/`
4. **Performance Tests:** Add to `__tests__/performance/`
5. **Security Tests:** Add to `__tests__/security/`

### Test Writing Guidelines

1. **Descriptive Names:** Use clear, descriptive test names
2. **Arrange-Act-Assert:** Follow AAA pattern
3. **Mock External Dependencies:** Use proper mocking
4. **Test Edge Cases:** Include error scenarios
5. **Performance Awareness:** Set appropriate timeouts
6. **Security Focus:** Consider security implications

### Code Review Checklist

- [ ] Tests cover happy path and error scenarios
- [ ] Proper mocking of external dependencies
- [ ] Performance thresholds are realistic
- [ ] Security tests include relevant attack vectors
- [ ] Test names are descriptive and clear
- [ ] Documentation is updated
- [ ] CI/CD integration works

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Next.js Testing](https://nextjs.org/docs/testing)
