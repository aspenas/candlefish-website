# Security Testing Guide

This document provides comprehensive guidance for running and understanding the security test suite for the Paintbox application.

## Test Suite Overview

The security test suite covers multiple layers of security testing:

### 1. Unit Tests for API Endpoints (`__tests__/api/`)

- **Purpose**: Test individual API endpoints with security-focused edge cases
- **Coverage**: Authentication, authorization, input validation, rate limiting
- **Files**:
  - `secrets.test.ts` - Secrets management API endpoints
  - `services.test.ts` - Service authentication and status endpoints
  - `audit.test.ts` - Audit logging and retrieval endpoints

### 2. Integration Tests (`__tests__/integration/`)

- **Purpose**: Test integration with external services like AWS Secrets Manager
- **Coverage**: Connection security, error handling, retry logic
- **Files**:
  - `aws-secrets-manager.test.ts` - AWS integration testing

### 3. Component Tests (`__tests__/components/`)

- **Purpose**: Test React components with security considerations
- **Coverage**: XSS prevention, data sanitization, access controls
- **Files**:
  - `SecretsManagementDashboard.test.tsx`
  - `ServiceStatusMonitor.test.tsx`
  - `AuditLogViewer.test.tsx`
  - `SecurityConfigurationPanel.test.tsx`

### 4. End-to-End Tests (`e2e/`)

- **Purpose**: Test complete security workflows in browser environment
- **Coverage**: Authentication flows, session management, CSRF protection
- **Files**:
  - `security-authentication.spec.ts` - Login, MFA, session security
  - `security-secrets-management.spec.ts` - Secrets dashboard workflows
  - `security-api-endpoints.spec.ts` - API security via browser

### 5. Performance Tests (`__tests__/performance/`)

- **Purpose**: Test security under load conditions
- **Coverage**: Rate limiting, DoS protection, resource exhaustion
- **Files**:
  - `secret-retrieval-load.test.ts` - Load testing for secret operations

### 6. Penetration Tests (`__tests__/security/`)

- **Purpose**: Simulate real-world attacks against the application
- **Coverage**: SQL injection, XSS, CSRF, authentication bypass
- **Files**:
  - `penetration-tests.test.ts` - Comprehensive security attack simulations

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure development environment is running
npm run dev:next
```

### Individual Test Categories

```bash
# Run all unit tests
npm test

# Run specific security test categories
npm run test:security      # Security and penetration tests
npm run test:api          # API endpoint tests
npm run test:components   # React component tests
npm run test:integration  # Integration tests
npm run test:performance  # Performance and load tests

# Run E2E tests
npm run test:e2e          # All E2E tests
npm run test:e2e:headed   # E2E tests with browser UI
npm run test:e2e:debug    # E2E tests with debugging

# Run load tests
npm run test:load         # Artillery load testing
npm run test:load:report  # Load testing with detailed report
```

### Complete Test Suite

```bash
# Run all tests (unit, integration, E2E, load)
npm run test:all
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- Test environment setup
- Mock configurations for AWS SDK, Redis, external APIs
- Coverage thresholds (80% minimum)
- Security-specific test helpers

### Playwright Configuration (`playwright.config.ts`)

- Browser testing setup for E2E tests
- Multiple browser support (Chrome, Firefox, Safari)
- Mobile device testing
- Security-focused timeouts and retry logic

### Artillery Configuration (`artillery-config.yml`)

- Load testing scenarios
- Rate limiting validation
- Security injection testing
- Performance thresholds

## Security Test Scenarios

### Authentication & Authorization Tests

1. **Login Security**
   - Password strength enforcement
   - Rate limiting on failed attempts
   - Account lockout protection
   - Session security

2. **Multi-Factor Authentication**
   - MFA requirement for admin accounts
   - Code validation and rate limiting
   - Backup code functionality

3. **Authorization**
   - Role-based access control
   - Privilege escalation prevention
   - Resource-level permissions

### Input Validation Tests

1. **SQL Injection**
   - Traditional SQL injection
   - Blind SQL injection
   - Second-order SQL injection
   - NoSQL injection

2. **Cross-Site Scripting (XSS)**
   - Reflected XSS
   - Stored XSS
   - DOM-based XSS
   - Content Security Policy validation

3. **Other Injection Attacks**
   - Command injection
   - LDAP injection
   - XML External Entity (XXE)
   - Server-Side Request Forgery (SSRF)

### Session Management Tests

1. **Session Security**
   - Secure cookie attributes
   - Session fixation prevention
   - Concurrent session limits
   - Session timeout enforcement

2. **CSRF Protection**
   - Token validation
   - SameSite cookie protection
   - Origin header validation

### Business Logic Tests

1. **Workflow Security**
   - Step bypassing prevention
   - Race condition protection
   - Parameter pollution handling

2. **Data Protection**
   - Sensitive data redaction
   - Information disclosure prevention
   - Error message sanitization

## Interpreting Test Results

### Test Success Criteria

1. **Unit Tests**: >95% pass rate
2. **Integration Tests**: All AWS connectivity tests pass
3. **Component Tests**: No XSS vulnerabilities, proper data sanitization
4. **E2E Tests**: All authentication flows secure, no session vulnerabilities
5. **Performance Tests**: API responses <500ms under load, rate limiting effective
6. **Penetration Tests**: All injection attacks blocked, OWASP Top 10 compliance

### Common Test Failures and Solutions

#### Authentication Failures

```
FAIL: should require MFA for admin accounts
```

**Solution**: Ensure MFA middleware is properly configured and admin routes are protected.

#### Rate Limiting Failures

```
FAIL: should implement rate limiting on login attempts
```

**Solution**: Verify rate limiting middleware is active and configured with appropriate thresholds.

#### XSS Prevention Failures

```
FAIL: should prevent reflected XSS in URL parameters
```

**Solution**: Ensure all user input is properly escaped/sanitized before being reflected in responses.

#### SQL Injection Failures

```
FAIL: should prevent SQL injection in login forms
```

**Solution**: Use parameterized queries and input validation for all database operations.

## Security Test Maintenance

### Regular Updates

1. **Monthly**: Update security test scenarios based on new threats
2. **Quarterly**: Review and update OWASP Top 10 compliance tests
3. **After changes**: Run full security test suite before deploying

### Adding New Tests

1. **New API Endpoint**: Add corresponding security tests to `__tests__/api/`
2. **New Component**: Add XSS and data sanitization tests to `__tests__/components/`
3. **New Authentication Flow**: Add E2E tests to `e2e/security-authentication.spec.ts`

### Test Data Management

- Use realistic but non-sensitive test data
- Rotate test credentials regularly
- Ensure test data doesn't contain actual secrets or PII

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Security Tests
on: [push, pull_request]
jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run security tests
        run: npm run test:security
      - name: Run E2E security tests
        run: npm run test:e2e
      - name: Run load tests
        run: npm run test:load
```

## Security Testing Best Practices

### Test Design

1. **Assume Breach**: Test assumes attackers have some level of access
2. **Defense in Depth**: Test multiple layers of security controls
3. **Real-World Scenarios**: Use actual attack patterns and payloads
4. **Positive and Negative**: Test both expected behavior and attack scenarios

### Test Data

1. **No Real Secrets**: Never use production secrets in tests
2. **Realistic Payloads**: Use actual malicious patterns found in the wild
3. **Edge Cases**: Test boundary conditions and unusual inputs
4. **Internationalization**: Test with various character sets and encodings

### Test Environment

1. **Isolated**: Tests should not affect production systems
2. **Repeatable**: Tests should produce consistent results
3. **Fast Feedback**: Critical security tests should run quickly
4. **Comprehensive**: Cover all attack vectors and entry points

## Compliance and Reporting

### Security Standards Coverage

- **OWASP Top 10**: All categories covered with specific tests
- **CWE Top 25**: Common weakness enumeration coverage
- **NIST Cybersecurity Framework**: Controls testing alignment
- **ISO 27001**: Information security management testing

### Reporting

1. **Daily**: Automated test results in CI/CD pipeline
2. **Weekly**: Security test coverage reports
3. **Monthly**: Comprehensive security posture assessment
4. **Quarterly**: External security audit preparation

### Metrics Tracking

- Test coverage percentage
- Security defect discovery rate
- Mean time to fix security issues
- False positive rate for security tests

## Emergency Response

### Security Test Failures in Production

1. **Immediate**: Stop deployment if critical security tests fail
2. **Assessment**: Determine severity and impact of the failure
3. **Mitigation**: Implement temporary fixes if needed
4. **Root Cause**: Investigate why tests didn't catch the issue
5. **Prevention**: Update tests to prevent similar issues

### Zero-Day Response

1. **Rapid Testing**: Quickly create tests for new vulnerabilities
2. **Validation**: Verify fixes with updated test suite
3. **Regression**: Ensure fixes don't break existing security controls

## Tools and Resources

### Testing Tools

- **Jest**: Unit and integration testing framework
- **Playwright**: End-to-end testing with security focus
- **Artillery**: Load testing and DoS simulation
- **OWASP ZAP**: Web application security scanner (manual integration)

### Security Resources

- **OWASP Testing Guide**: Web application security testing methodology
- **NIST SP 800-53**: Security controls catalog
- **CWE/SANS Top 25**: Most dangerous software errors
- **CVE Database**: Known vulnerabilities reference

## Contact and Support

For questions about security testing:

- **Security Team**: <security@paintbox.com>
- **DevOps Team**: <devops@paintbox.com>
- **Development Team**: <dev@paintbox.com>

For security incident reporting:

- **Email**: <security-incident@paintbox.com>
- **Phone**: +1-555-SECURITY
- **Slack**: #security-incidents
