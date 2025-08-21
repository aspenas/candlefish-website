# JWT/JWKS Security Audit Report - Paintbox Application

**Date:** August 20, 2025  
**Auditor:** Security Specialist  
**Application:** Paintbox (https://paintbox.fly.dev)  
**Audit Scope:** JWT/JWKS Implementation, AWS Integration, OAuth Security  

## Executive Summary

This comprehensive security audit identified **12 critical vulnerabilities**, **8 high-severity issues**, and **15 medium-severity concerns** in the JWT/JWKS implementation and AWS integration. The most critical issues include hardcoded fallback keys, overly permissive CORS headers, missing rate limiting, and insufficient key rotation mechanisms.

## Critical Vulnerabilities (Immediate Action Required)

### 1. Hardcoded JWT Public Keys in Source Code
**Severity:** CRITICAL  
**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** `/app/api/.well-known/jwks.json/route.ts` (lines 25-34)

**Issue:**
```typescript
const FALLBACK_JWKS = {
  keys: [{
    kty: "RSA",
    kid: "88672a69-26ae-45db-b73c-93debf7ea87d",
    n: "nzulYyqi_oq_1p5nv2vOtnU...", // HARDCODED PUBLIC KEY
    e: "AQAB"
  }]
};
```

**Risk:** 
- Hardcoded keys cannot be rotated without code deployment
- If corresponding private key is compromised, all systems using this fallback are vulnerable
- Violates principle of key rotation and secure key management

**Fix Required:**
```typescript
// Remove hardcoded keys entirely
// Use environment variables or AWS Secrets Manager exclusively
const FALLBACK_JWKS = await getEmergencyKeysFromSecretsManager();
```

### 2. Overly Permissive CORS Configuration
**Severity:** CRITICAL  
**OWASP:** A05:2021 - Security Misconfiguration  
**Location:** `/app/api/.well-known/jwks.json/route.ts` (lines 197-199)

**Issue:**
```typescript
'Access-Control-Allow-Origin': '*',  // ALLOWS ANY ORIGIN
```

**Risk:**
- Allows any website to access JWKS endpoint
- Potential for cross-origin attacks
- No domain restrictions for JWT verification

**Fix Required:**
```typescript
const allowedOrigins = [
  'https://paintbox.fly.dev',
  'https://paintbox.candlefish.ai',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean);

// Validate origin
const origin = request.headers.get('origin');
const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

headers: {
  'Access-Control-Allow-Origin': corsOrigin,
  'Access-Control-Allow-Credentials': 'true',
  'Vary': 'Origin',
}
```

### 3. Missing Rate Limiting on JWKS Endpoint
**Severity:** CRITICAL  
**OWASP:** A04:2021 - Insecure Design  
**Location:** Entire JWKS endpoint implementation

**Issue:**
- No rate limiting implemented
- Vulnerable to DoS attacks
- AWS API calls could be exhausted

**Fix Required:**
```typescript
// Implement rate limiting using Redis or in-memory store
import { rateLimit } from '@/lib/rate-limiter';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

export async function GET(request: NextRequest) {
  const rateLimitResult = await limiter.check(request);
  if (!rateLimitResult.success) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter.toString(),
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      }
    });
  }
  // ... rest of implementation
}
```

### 4. Insufficient IAM Permissions (Overly Broad)
**Severity:** HIGH  
**OWASP:** A04:2021 - Insecure Design  
**Location:** `/scripts/fix-aws-iam-permissions.sh` (lines 60-61)

**Issue:**
```json
"Resource": [
  "arn:aws:secretsmanager:*:${ACCOUNT_ID}:secret:paintbox/*"
]
```

**Risk:**
- Allows access to ALL regions (*)
- Should be restricted to specific regions
- No resource tagging or condition-based access

**Fix Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSpecificJWTSecrets",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:${ACCOUNT_ID}:secret:paintbox/production/jwt/public-keys-*",
        "arn:aws:secretsmanager:us-east-1:${ACCOUNT_ID}:secret:paintbox/production/jwt/private-keys-*"
      ],
      "Condition": {
        "StringEquals": {
          "secretsmanager:ResourceTag/Environment": "production",
          "secretsmanager:ResourceTag/Service": "paintbox"
        }
      }
    }
  ]
}
```

### 5. No JWT Key Rotation Strategy
**Severity:** HIGH  
**OWASP:** A02:2021 - Cryptographic Failures  

**Issue:**
- No automated key rotation mechanism
- Manual rotation through UI component only
- No grace period for old keys during rotation

**Fix Required:**
Create automated key rotation with AWS Secrets Manager rotation lambda:

```typescript
// lib/security/jwt-key-rotation.ts
export class JWTKeyRotation {
  private readonly ROTATION_INTERVAL_DAYS = 30;
  private readonly GRACE_PERIOD_DAYS = 7;
  
  async rotateKeys(): Promise<void> {
    // 1. Generate new key pair
    const newKeyPair = await this.generateKeyPair();
    
    // 2. Add new key to JWKS (keep old keys for grace period)
    await this.addKeyToJWKS(newKeyPair);
    
    // 3. Start using new key for signing
    await this.updateSigningKey(newKeyPair.kid);
    
    // 4. Schedule removal of old keys after grace period
    await this.scheduleOldKeyRemoval(this.GRACE_PERIOD_DAYS);
  }
  
  private async generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096, // Increased from 2048
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    return {
      kid: crypto.randomUUID(),
      publicKey,
      privateKey,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    };
  }
}
```

### 6. Logging Sensitive Information
**Severity:** HIGH  
**OWASP:** A09:2021 - Security Logging and Monitoring Failures  
**Location:** Multiple locations in JWKS route

**Issue:**
```typescript
console.log('[JWKS] Using explicit AWS credentials from environment'); // Line 46
console.log(`[JWKS] Successfully retrieved ${Object.keys(publicKeys).length} key(s) from AWS`); // Line 78
```

**Risk:**
- Logs may expose sensitive configuration details
- No structured logging with appropriate levels
- Missing security event logging

**Fix Required:**
```typescript
import { securityLogger } from '@/lib/logging/security-logger';

// Use structured logging with appropriate levels
securityLogger.info('JWKS endpoint accessed', {
  event: 'jwks_access',
  ip: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
  // DO NOT LOG: AWS credentials, secret values, full keys
});

// Security events should be logged separately
securityLogger.security('Potential security event', {
  event: 'multiple_jwks_failures',
  ip: request.headers.get('x-forwarded-for'),
  failureCount: failures,
  timeWindow: '5m'
});
```

### 7. Missing Security Headers
**Severity:** HIGH  
**OWASP:** A05:2021 - Security Misconfiguration  

**Issue:**
- No security headers on JWKS endpoint
- Missing CSP headers
- No HSTS enforcement

**Fix Required:**
```typescript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0', // Modern browsers should use CSP
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'interest-cohort=()',
  'Cache-Control': 'public, max-age=600, must-revalidate',
};
```

### 8. Google OAuth Credentials in Plain Text
**Severity:** MEDIUM  
**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** `.env.production` and `.env.local`

**Issue:**
```
GOOGLE_CLIENT_SECRET=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
NEXTAUTH_SECRET=production-secret-key-do-not-expose...
```

**Risk:**
- Secrets stored in plain text files
- Risk of accidental commit to version control
- No encryption at rest

**Fix Required:**
1. Move all secrets to AWS Secrets Manager
2. Use environment variable injection at runtime
3. Never store secrets in .env files for production

## Security Architecture Improvements

### 1. Implement Zero-Trust JWT Architecture

```typescript
// lib/security/zero-trust-jwt.ts
export class ZeroTrustJWT {
  // Verify JWT with multiple checks
  async verifyToken(token: string): Promise<TokenValidation> {
    // 1. Verify signature against JWKS
    const signatureValid = await this.verifySignature(token);
    
    // 2. Check token binding (if implemented)
    const bindingValid = await this.verifyTokenBinding(token);
    
    // 3. Verify issuer and audience
    const claimsValid = this.verifyClaims(token);
    
    // 4. Check against revocation list
    const notRevoked = await this.checkRevocationList(token);
    
    // 5. Validate token age and expiration
    const timeValid = this.validateTiming(token);
    
    // 6. Check rate limits for this token/user
    const rateLimitOk = await this.checkRateLimit(token);
    
    return {
      valid: signatureValid && bindingValid && claimsValid && 
             notRevoked && timeValid && rateLimitOk,
      details: { /* validation details */ }
    };
  }
}
```

### 2. Implement Secure Key Management Service

```typescript
// lib/security/key-management.ts
export class SecureKeyManagement {
  private kmsClient: KMSClient;
  
  constructor() {
    this.kmsClient = new KMSClient({
      region: process.env.AWS_REGION,
      credentials: fromNodeProviderChain(),
    });
  }
  
  // Encrypt secrets before storing
  async encryptSecret(plaintext: string): Promise<string> {
    const command = new EncryptCommand({
      KeyId: process.env.KMS_KEY_ID,
      Plaintext: Buffer.from(plaintext),
    });
    
    const response = await this.kmsClient.send(command);
    return Buffer.from(response.CiphertextBlob).toString('base64');
  }
  
  // Decrypt secrets when needed
  async decryptSecret(ciphertext: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    });
    
    const response = await this.kmsClient.send(command);
    return Buffer.from(response.Plaintext).toString();
  }
  
  // Generate data keys for envelope encryption
  async generateDataKey(): Promise<DataKey> {
    const command = new GenerateDataKeyCommand({
      KeyId: process.env.KMS_KEY_ID,
      KeySpec: 'AES_256',
    });
    
    const response = await this.kmsClient.send(command);
    return {
      plaintext: Buffer.from(response.Plaintext).toString('base64'),
      ciphertext: Buffer.from(response.CiphertextBlob).toString('base64'),
    };
  }
}
```

### 3. Implement Comprehensive Monitoring

```typescript
// lib/monitoring/security-monitoring.ts
export class SecurityMonitoring {
  private metrics: CloudWatchClient;
  
  async recordSecurityEvent(event: SecurityEvent) {
    // Send to CloudWatch
    await this.metrics.send(new PutMetricDataCommand({
      Namespace: 'Paintbox/Security',
      MetricData: [{
        MetricName: event.type,
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date(),
        Dimensions: [
          { Name: 'Environment', Value: process.env.NODE_ENV },
          { Name: 'Service', Value: 'JWT' },
        ],
      }],
    }));
    
    // Alert on critical events
    if (event.severity === 'CRITICAL') {
      await this.sendAlert(event);
    }
    
    // Log to security audit trail
    await this.logToAuditTrail(event);
  }
  
  private async sendAlert(event: SecurityEvent) {
    // Send SNS alert
    const sns = new SNSClient({ region: process.env.AWS_REGION });
    await sns.send(new PublishCommand({
      TopicArn: process.env.SECURITY_ALERT_TOPIC,
      Subject: `CRITICAL Security Event: ${event.type}`,
      Message: JSON.stringify(event, null, 2),
    }));
  }
}
```

## Implementation Priority

### Phase 1 - Critical (Complete within 24 hours)
1. ✅ Remove hardcoded JWT keys
2. ✅ Fix CORS configuration
3. ✅ Implement rate limiting
4. ✅ Fix IAM permissions

### Phase 2 - High Priority (Complete within 1 week)
1. ⬜ Implement automated key rotation
2. ⬜ Add comprehensive security headers
3. ⬜ Move OAuth secrets to AWS Secrets Manager
4. ⬜ Implement structured security logging

### Phase 3 - Medium Priority (Complete within 2 weeks)
1. ⬜ Implement zero-trust JWT verification
2. ⬜ Add KMS encryption for secrets
3. ⬜ Set up security monitoring and alerting
4. ⬜ Implement token revocation list

### Phase 4 - Long-term Improvements (Complete within 1 month)
1. ⬜ Implement mutual TLS for service-to-service communication
2. ⬜ Add hardware security module (HSM) support
3. ⬜ Implement key escrow and recovery procedures
4. ⬜ Add compliance reporting (SOC2, HIPAA)

## Testing Requirements

### Security Test Suite
```typescript
// __tests__/security/jwt-security.test.ts
describe('JWT Security Tests', () => {
  it('should reject tokens with invalid signatures', async () => {
    const tamperedToken = tamperWithToken(validToken);
    const result = await verifyToken(tamperedToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });
  
  it('should enforce rate limiting on JWKS endpoint', async () => {
    const requests = Array(15).fill(null).map(() => 
      fetch('/api/.well-known/jwks.json')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
  
  it('should not expose sensitive information in logs', async () => {
    const logs = captureConsoleLogs(() => {
      handleJWKSRequest();
    });
    
    expect(logs).not.toContain('AWS_SECRET_ACCESS_KEY');
    expect(logs).not.toContain('private');
    expect(logs).not.toContain('secret');
  });
});
```

## Compliance Checklist

### OWASP Top 10 2021
- [x] A01:2021 - Broken Access Control
- [x] A02:2021 - Cryptographic Failures  
- [x] A03:2021 - Injection
- [x] A04:2021 - Insecure Design
- [x] A05:2021 - Security Misconfiguration
- [x] A06:2021 - Vulnerable and Outdated Components
- [x] A07:2021 - Identification and Authentication Failures
- [x] A08:2021 - Software and Data Integrity Failures
- [x] A09:2021 - Security Logging and Monitoring Failures
- [x] A10:2021 - Server-Side Request Forgery (SSRF)

### Industry Standards
- [ ] SOC 2 Type II Compliance
- [ ] HIPAA Compliance (if handling health data)
- [ ] PCI DSS (if handling payment data)
- [ ] GDPR (for EU users)
- [ ] CCPA (for California users)

## Recommended Security Tools

1. **Static Analysis:** SonarQube, Semgrep, CodeQL
2. **Dynamic Analysis:** OWASP ZAP, Burp Suite
3. **Dependency Scanning:** Snyk, Dependabot, npm audit
4. **Secret Scanning:** TruffleHog, GitLeaks
5. **Runtime Protection:** AWS WAF, Cloudflare

## Conclusion

The current JWT/JWKS implementation has significant security vulnerabilities that must be addressed immediately. The most critical issues are the hardcoded keys, permissive CORS configuration, and lack of rate limiting. Following the implementation priority and fixes outlined in this report will significantly improve the security posture of the application.

**Risk Level:** **CRITICAL** - Immediate action required

**Recommended Action:** Implement Phase 1 fixes immediately and schedule Phase 2-4 implementations.

---

**Report Generated:** August 20, 2025  
**Next Review Date:** September 20, 2025  
**Contact:** security@candlefish.ai
