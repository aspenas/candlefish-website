# Security Audit Report - Candlefish Operational Maturity Map
**Date**: 2025-08-27  
**Auditor**: Security Analysis Team  
**Severity Levels**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

## Executive Summary
This security audit identifies vulnerabilities across the Candlefish Operational Maturity Map implementation, covering API security, frontend protection, data handling, and infrastructure security. Several critical and high-severity issues require immediate attention.

---

## 1. API Security

### 🔴 **CRITICAL: Weak JWT Secret**
**Location**: `/lib/graphql/auth/index.ts:13`
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```
**Issue**: Hardcoded fallback secret is insecure and predictable  
**Impact**: JWT tokens can be forged, allowing unauthorized access  
**OWASP**: A02:2021 - Cryptographic Failures  

**Remediation**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}
```

### 🔴 **CRITICAL: Missing Input Validation on Assessment API**
**Location**: `/app/api/assessment/process/route.ts`
```typescript
const { responses, sessionId } = await request.json()
// No validation of response content
```
**Issue**: No validation of user input before processing  
**Impact**: Potential for injection attacks, data corruption  
**OWASP**: A03:2021 - Injection  

**Remediation**:
```typescript
import { z } from 'zod';

const AssessmentSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string().uuid(),
    answer: z.string().max(1000),
    timestamp: z.number()
  })).length(14),
  sessionId: z.string().uuid()
});

const validated = AssessmentSchema.parse(await request.json());
```

### 🟠 **HIGH: Insufficient Rate Limiting**
**Location**: `/app/api/contact/route.ts:77-96`
```typescript
const rateLimitMap = new Map() // In-memory rate limiting
```
**Issue**: In-memory rate limiting doesn't work across multiple instances  
**Impact**: DDoS vulnerability, resource exhaustion  
**OWASP**: A05:2021 - Security Misconfiguration  

**Remediation**:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60s"),
  analytics: true
});

// In handler
const { success } = await ratelimit.limit(ip);
if (!success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

### 🟠 **HIGH: GraphQL Query Depth Not Properly Limited**
**Location**: `/lib/graphql/server.ts:399-426`
```typescript
function calculateQueryComplexity(document: any): number {
  // Simplified complexity calculation
```
**Issue**: Basic complexity calculation can be bypassed with nested queries  
**Impact**: Resource exhaustion through deeply nested queries  
**OWASP**: A06:2021 - Vulnerable and Outdated Components  

**Remediation**:
```typescript
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';

new ApolloServer({
  validationRules: [
    depthLimit(7),
    costAnalysis({
      maximumCost: 1000,
      defaultCost: 1,
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10
    })
  ]
});
```

---

## 2. Frontend Security

### 🔴 **CRITICAL: Token Storage in localStorage**
**Location**: `/components/auth/AuthProvider.tsx:30,63,74`
```typescript
const token = localStorage.getItem('auth-token')
localStorage.setItem('auth-token', mockToken)
```
**Issue**: Tokens in localStorage are vulnerable to XSS attacks  
**Impact**: Token theft through XSS  
**OWASP**: A07:2021 - Identification and Authentication Failures  

**Remediation**:
```typescript
// Use httpOnly cookies instead
const response = await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // Include cookies
  body: JSON.stringify(credentials)
});

// Server sets httpOnly cookie
res.setHeader('Set-Cookie', 
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
);
```

### 🟠 **HIGH: XSS Vulnerability in PDF Generation**
**Location**: `/app/api/assessment/generate-pdf/route.ts:244-249`
```typescript
${score.dimensions.map((d: any) => `
  <div class="dimension">
    <span class="dimension-name">${d.name}</span>
    <span class="dimension-score">${d.rawScore}/4</span>
  </div>
`).join('')}
```
**Issue**: User input directly inserted into HTML without escaping  
**Impact**: XSS attacks through malicious assessment data  
**OWASP**: A03:2021 - Injection  

**Remediation**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitize = (str: string) => DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });

${score.dimensions.map((d: any) => `
  <div class="dimension">
    <span class="dimension-name">${sanitize(d.name)}</span>
    <span class="dimension-score">${sanitize(d.rawScore.toString())}/4</span>
  </div>
`).join('')}
```

### 🟡 **MEDIUM: Weak CSP Policy**
**Location**: `/middleware.ts:36-49`
```typescript
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```
**Issue**: 'unsafe-inline' allows inline styles, weakening CSP  
**Impact**: Reduced XSS protection  
**OWASP**: A05:2021 - Security Misconfiguration  

**Remediation**:
```typescript
// Use nonces for inline styles
const nonce = crypto.randomBytes(16).toString('base64');
response.headers.set('Content-Security-Policy', `
  style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
`);
```

---

## 3. Data Protection

### 🟠 **HIGH: No Encryption for Sensitive Data at Rest**
**Issue**: Assessment data and PII stored without encryption  
**Impact**: Data breach exposure  
**OWASP**: A02:2021 - Cryptographic Failures  

**Remediation**:
```typescript
import { encrypt, decrypt } from '@/lib/crypto';

// Encrypt before storing
const encryptedData = await encrypt(JSON.stringify(assessmentData));
await db.assessment.create({
  data: { encryptedData }
});

// Decrypt when reading
const data = await db.assessment.findUnique({ where: { id } });
const decrypted = await decrypt(data.encryptedData);
```

### 🟡 **MEDIUM: Missing Audit Logging**
**Location**: Multiple API endpoints  
**Issue**: No audit trail for sensitive operations  
**Impact**: Cannot track security incidents or compliance violations  
**OWASP**: A09:2021 - Security Logging and Monitoring Failures  

**Remediation**:
```typescript
import { auditLog } from '@/lib/audit';

// Add to sensitive operations
await auditLog({
  action: 'ASSESSMENT_PROCESSED',
  userId: user?.id,
  metadata: { assessmentId, score: score.level },
  ip: request.ip,
  timestamp: new Date()
});
```

---

## 4. Infrastructure Security

### 🟠 **HIGH: Missing CORS Configuration for GraphQL**
**Location**: `/lib/graphql/server.ts:297-301`
```typescript
origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
```
**Issue**: Fallback to localhost in production if env var missing  
**Impact**: CORS bypass potential  
**OWASP**: A05:2021 - Security Misconfiguration  

**Remediation**:
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',');
if (!allowedOrigins || allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must be configured in production');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 🟡 **MEDIUM: Secrets in Environment Variables**
**Issue**: Using environment variables for secrets without encryption  
**Impact**: Potential exposure through process dumps or logs  
**OWASP**: A02:2021 - Cryptographic Failures  

**Remediation**:
```typescript
// Use AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });
const command = new GetSecretValueCommand({ SecretId: "candlefish/jwt-secret" });
const response = await client.send(command);
const JWT_SECRET = response.SecretString;
```

---

## 5. Authentication & Authorization

### 🔴 **CRITICAL: Demo Authentication in Production Code**
**Location**: `/components/auth/AuthProvider.tsx:34-41`
```typescript
setUser({
  id: 'demo-operator-1',
  email: 'operator@candlefish.ai',
  name: 'Demo Operator',
```
**Issue**: Hardcoded demo credentials in production  
**Impact**: Unauthorized access with known credentials  
**OWASP**: A07:2021 - Identification and Authentication Failures  

**Remediation**: Remove all demo/hardcoded credentials and implement proper authentication flow.

### 🟠 **HIGH: Missing MFA Implementation**
**Issue**: No multi-factor authentication available  
**Impact**: Single point of failure for authentication  
**OWASP**: A07:2021 - Identification and Authentication Failures  

**Remediation**:
```typescript
import speakeasy from 'speakeasy';

// Generate TOTP secret
const secret = speakeasy.generateSecret({ name: 'Candlefish' });

// Verify TOTP token
const verified = speakeasy.totp.verify({
  secret: user.totpSecret,
  encoding: 'base32',
  token: userToken,
  window: 2
});
```

---

## Immediate Action Items

### Priority 1 - Critical (Implement within 24 hours)
1. ✅ Replace hardcoded JWT secret with secure generation
2. ✅ Remove demo authentication code
3. ✅ Move tokens from localStorage to httpOnly cookies
4. ✅ Implement input validation on all API endpoints

### Priority 2 - High (Implement within 1 week)
1. ✅ Implement proper rate limiting with Redis
2. ✅ Add XSS protection to PDF generation
3. ✅ Configure CORS properly for production
4. ✅ Implement GraphQL depth limiting

### Priority 3 - Medium (Implement within 2 weeks)
1. ✅ Strengthen CSP policy
2. ✅ Add audit logging
3. ✅ Implement data encryption at rest
4. ✅ Add MFA support

---

## Security Testing Checklist

### API Security
- [ ] All endpoints have input validation
- [ ] Rate limiting is configured and tested
- [ ] JWT tokens use strong secrets (min 256 bits)
- [ ] GraphQL queries have depth and complexity limits
- [ ] SQL injection prevention tested
- [ ] NoSQL injection prevention tested

### Frontend Security
- [ ] XSS prevention on all user inputs
- [ ] CSP headers configured correctly
- [ ] No sensitive data in localStorage
- [ ] CSRF tokens implemented
- [ ] Security headers validated

### Data Protection
- [ ] PII encrypted at rest
- [ ] TLS 1.3 enforced for data in transit
- [ ] Secure session management
- [ ] Data retention policies implemented
- [ ] GDPR compliance verified

### Infrastructure
- [ ] Secrets managed through AWS Secrets Manager
- [ ] CORS properly configured
- [ ] Security groups reviewed
- [ ] Container security scanning enabled
- [ ] Dependency vulnerabilities scanned

---

## Recommended Security Headers

Add to middleware.ts:
```typescript
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'nonce-{nonce}'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.candlefish.ai; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
};
```

---

## Testing Tools & Commands

```bash
# Security scanning
npm audit
npm audit fix

# Dependency check
npx depcheck
npx snyk test

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://candlefish.ai

# SSL/TLS check
nmap --script ssl-enum-ciphers -p 443 candlefish.ai

# Security headers check
curl -I https://candlefish.ai | grep -E "X-Frame-Options|X-Content-Type|Strict-Transport"
```

---

## Compliance Considerations

### GDPR Requirements
- Implement data portability
- Add consent management
- Create data deletion workflows
- Document data processing activities

### SOC 2 Requirements
- Implement continuous monitoring
- Add security event logging
- Create incident response procedures
- Document security controls

---

## References
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [GraphQL Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Report Generated**: 2025-08-27  
**Next Review Date**: 2025-09-27  
**Contact**: security@candlefish.ai