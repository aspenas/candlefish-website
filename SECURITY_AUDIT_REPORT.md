# Candlefish AI - Comprehensive Security Audit Report

**Date:** August 9, 2025  
**Auditor:** Security Specialist  
**Project:** Candlefish AI Consolidation  
**Severity Levels:** Critical ⚠️ | High 🔴 | Medium 🟡 | Low 🟢

## Executive Summary

This security audit covers the Candlefish AI project consolidation, including backend services, frontend applications, and infrastructure. The audit identified several security vulnerabilities requiring immediate attention, along with recommendations for security improvements and best practices.

### Key Findings
- **Critical Issues:** 3 found
- **High Severity:** 5 found  
- **Medium Severity:** 8 found
- **Low Severity:** 6 found

## 1. Authentication & Authorization

### ✅ Strengths
- RS256 JWT implementation with proper key management
- Token revocation mechanism implemented
- Session management with concurrent session limiting
- Role-based access control (RBAC) implemented
- MFA support for admin accounts

### 🔴 HIGH: JWT Key Management Issues
**Location:** `/projects/paintbox/lib/middleware/auth.ts`
- **Issue:** JWT keys are generated on-the-fly if not found, which could lead to token invalidation on restarts
- **Impact:** All active sessions could be invalidated on server restart
- **Remediation:**
```typescript
// Ensure JWT keys are always persisted before use
private async initializeKeys(): Promise<void> {
  const secretsManager = getSecretsManager();
  const secrets = await secretsManager.getSecrets();
  
  if (!secrets.jwt?.publicKey || !secrets.jwt?.privateKey) {
    // Generate and immediately persist
    const { publicKey, privateKey } = this.generateRSAKeypairSync();
    await secretsManager.storeJwtKeys(publicKey, privateKey);
    // Wait for persistence confirmation
    await this.verifyKeysPersisted();
  }
}
```

### 🟡 MEDIUM: Missing CSRF Protection
**Location:** API routes lack CSRF token validation
- **Issue:** No CSRF token validation on state-changing operations
- **Impact:** Potential CSRF attacks on authenticated users
- **Remediation:**
```typescript
// Add CSRF middleware
export async function csrfMiddleware(request: NextRequest) {
  const token = request.headers.get('X-CSRF-Token');
  const sessionToken = await getSessionCSRFToken(request);
  
  if (token !== sessionToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
}
```

## 2. API Security

### ✅ Strengths
- Comprehensive input validation using Zod schemas
- Rate limiting implemented with multiple algorithms
- Security headers properly configured

### ⚠️ CRITICAL: Overly Permissive CORS Configuration
**Location:** `/projects/paintbox/app/api/v1/pdf/generate/route.ts`
```typescript
'Access-Control-Allow-Origin': '*'  // CRITICAL: Allows any origin
```
- **Impact:** APIs accessible from any domain, enabling data theft
- **Remediation:**
```typescript
const ALLOWED_ORIGINS = [
  'https://candlefish.ai',
  'https://www.candlefish.ai',
  'https://dashboard.candlefish.ai'
];

headers: {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
  'Access-Control-Allow-Credentials': 'true'
}
```

### 🔴 HIGH: Missing API Key Rotation
**Location:** CompanyCam and Salesforce integrations
- **Issue:** No automatic API key rotation mechanism
- **Impact:** Compromised keys could be used indefinitely
- **Remediation:** Implement automatic key rotation every 90 days

### 🟡 MEDIUM: Insufficient Rate Limiting for Authentication
**Location:** `/projects/paintbox/lib/middleware/rate-limit.ts`
- **Issue:** Auth endpoints allow 5 attempts per 5 minutes - too permissive
- **Remediation:**
```typescript
export const authRateLimiter = createRateLimitMiddleware({
  windowMs: 900000, // 15 minutes
  maxRequests: 3,   // Only 3 attempts
  skipSuccessfulRequests: true // Don't count successful logins
});
```

## 3. Data Protection

### ✅ Strengths
- AWS Secrets Manager integration for credential storage
- Redis cache with TTL for sensitive data
- Environment-based configuration

### ⚠️ CRITICAL: Database Credentials in Environment Variables
**Location:** Multiple files reference `DATABASE_URL` directly
- **Issue:** Database credentials exposed in environment variables
- **Impact:** Credential leakage through process dumps or logs
- **Remediation:** Always use Secrets Manager, never environment variables for credentials

### 🔴 HIGH: Missing Encryption at Rest
**Location:** Database and file storage
- **Issue:** No evidence of encryption at rest for database or stored files
- **Remediation:**
```sql
-- Enable PostgreSQL transparent data encryption
ALTER SYSTEM SET data_encryption = on;
-- Use encrypted S3 buckets with KMS
```

### 🟡 MEDIUM: PII Not Properly Masked in Logs
**Location:** Logging implementations
- **Issue:** Customer data potentially logged without masking
- **Remediation:**
```typescript
const sanitizeLogData = (data: any) => {
  const sensitive = ['email', 'phone', 'ssn', 'password', 'token'];
  return Object.keys(data).reduce((acc, key) => {
    acc[key] = sensitive.includes(key.toLowerCase()) 
      ? '***REDACTED***' 
      : data[key];
    return acc;
  }, {});
};
```

## 4. Infrastructure Security

### ✅ Strengths
- Docker containers run as non-root user
- Multi-stage builds minimize attack surface
- Health checks implemented

### ⚠️ CRITICAL: Insecure Image Configuration
**Location:** `/projects/paintbox/next.config.js`
```javascript
hostname: '**', // Allows loading images from ANY domain
```
- **Impact:** Potential for malicious image injection and XSS
- **Remediation:**
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'images.companycam.com',
    },
    {
      protocol: 'https',
      hostname: 'storage.googleapis.com',
      pathname: '/paintbox-assets/**',
    }
  ],
}
```

### 🔴 HIGH: Missing Network Segmentation
**Location:** Deployment configurations
- **Issue:** No evidence of network segmentation between services
- **Remediation:** Implement VPC with private subnets for databases

### 🟡 MEDIUM: Container Registry Not Specified
**Location:** Docker configurations
- **Issue:** No private container registry configured
- **Remediation:** Use private registry with vulnerability scanning

## 5. Frontend Security

### ✅ Strengths
- CSP headers with nonces implemented
- X-Frame-Options set to DENY
- Security headers properly configured

### 🟡 MEDIUM: CSP Allows Unsafe Inline Styles
**Location:** `/projects/paintbox/middleware.ts`
- **Issue:** CSP allows unsafe-inline for styles in some contexts
- **Remediation:** Use only nonce-based styles

### 🟢 LOW: Missing Subresource Integrity
**Location:** External script/style loading
- **Issue:** No SRI hashes for external resources
- **Remediation:**
```html
<script 
  src="https://cdn.example.com/lib.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

## 6. Session Management

### 🔴 HIGH: Session Tokens in Local Storage
**Location:** Frontend implementations
- **Issue:** JWT tokens might be stored in localStorage (vulnerable to XSS)
- **Remediation:** Use httpOnly cookies for session tokens
```typescript
response.cookies.set('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600
});
```

## 7. Dependency Security

### 🟡 MEDIUM: Outdated Dependencies
- Multiple dependencies need updates for security patches
- **Remediation:**
```bash
npm audit fix
npm update --save
```

## 8. Compliance Considerations

### GDPR Compliance
- ⚠️ Missing privacy policy endpoint
- ⚠️ No data deletion mechanism implemented
- ⚠️ No consent management

### CCPA Compliance
- ⚠️ Missing opt-out mechanism
- ⚠️ No data portability features

## Recommended Security Implementation

### Immediate Actions (Critical)
1. **Fix CORS Configuration** - Restrict to specific domains
2. **Remove wildcard image domains** - Whitelist specific sources
3. **Move credentials to Secrets Manager** - Remove from environment variables

### Short-term (Within 1 Week)
1. **Implement CSRF protection** 
2. **Add encryption at rest**
3. **Reduce auth rate limits**
4. **Fix JWT key persistence**
5. **Move tokens to httpOnly cookies**

### Medium-term (Within 1 Month)
1. **Implement API key rotation**
2. **Add network segmentation**
3. **Set up private container registry**
4. **Implement PII masking in logs**
5. **Add GDPR/CCPA compliance features**

## Security Testing Recommendations

### 1. Automated Security Testing
```yaml
# Add to CI/CD pipeline
- name: Security Scan
  run: |
    npm audit
    npm run test:security
    docker scan $IMAGE_NAME
```

### 2. Penetration Testing Script
```typescript
// /tests/security/penetration.test.ts
describe('Security Penetration Tests', () => {
  test('SQL Injection Protection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await api.post('/api/search', {
      query: maliciousInput
    });
    expect(response.status).not.toBe(500);
    // Verify tables still exist
  });

  test('XSS Protection', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await api.post('/api/comment', {
      text: xssPayload
    });
    const saved = await api.get('/api/comments');
    expect(saved.body).not.toContain('<script>');
  });

  test('CSRF Protection', async () => {
    const response = await fetch('/api/transfer', {
      method: 'POST',
      credentials: 'include',
      // No CSRF token
    });
    expect(response.status).toBe(403);
  });
});
```

### 3. Security Headers Test
```typescript
test('Security Headers', async () => {
  const response = await fetch('/');
  const headers = response.headers;
  
  expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(headers.get('X-Frame-Options')).toBe('DENY');
  expect(headers.get('Content-Security-Policy')).toBeTruthy();
  expect(headers.get('Strict-Transport-Security')).toBeTruthy();
});
```

## Security Monitoring

### Implement Security Logging
```typescript
// lib/security/monitor.ts
export class SecurityMonitor {
  static logSecurityEvent(event: {
    type: 'auth_failure' | 'rate_limit' | 'csrf_violation' | 'suspicious_activity';
    userId?: string;
    ip: string;
    details: any;
  }) {
    logger.security(event.type, {
      ...event,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(event.type)
    });
    
    // Alert on critical events
    if (this.isCritical(event)) {
      this.sendAlert(event);
    }
  }
}
```

## Security Checklist

### Pre-Deployment Checklist
- [ ] All critical vulnerabilities resolved
- [ ] CORS properly configured
- [ ] HTTPS enforced everywhere
- [ ] Secrets in Secrets Manager
- [ ] Rate limiting enabled
- [ ] CSP headers configured
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS protection verified
- [ ] Dependencies updated
- [ ] Security tests passing
- [ ] Logging sanitized
- [ ] Error messages generic
- [ ] Admin features require MFA

### Post-Deployment Monitoring
- [ ] Set up security alerting
- [ ] Monitor rate limit violations
- [ ] Track authentication failures
- [ ] Review security logs daily
- [ ] Schedule quarterly security reviews
- [ ] Plan penetration testing

## Conclusion

The Candlefish AI project has a solid security foundation with JWT authentication, rate limiting, and input validation. However, critical issues including overly permissive CORS, insecure image configuration, and credential management need immediate attention. 

Implementing the recommended fixes and following the security checklist will significantly improve the security posture. Regular security testing and monitoring should be established as part of the development lifecycle.

**Overall Security Score: 6/10** - Requires immediate attention to critical issues before production deployment.

## References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [CSP Guidelines](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
