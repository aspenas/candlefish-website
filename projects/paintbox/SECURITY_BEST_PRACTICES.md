# Security Best Practices - Paintbox Application

## Table of Contents
1. [JWT & Authentication Security](#jwt--authentication-security)
2. [AWS Integration Security](#aws-integration-security)
3. [API Security](#api-security)
4. [Secrets Management](#secrets-management)
5. [Monitoring & Logging](#monitoring--logging)
6. [Incident Response](#incident-response)
7. [Compliance Checklist](#compliance-checklist)

---

## JWT & Authentication Security

### Key Management Best Practices

#### 1. Key Generation
```typescript
// Use cryptographically secure key generation
import { generateKeyPairSync } from 'crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,  // Use 4096-bit keys for enhanced security
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',  // Encrypt private key at rest
    passphrase: process.env.KEY_PASSPHRASE
  }
});
```

#### 2. Key Rotation Schedule
- **Automatic Rotation**: Every 30 days
- **Grace Period**: 7 days for old keys
- **Emergency Rotation**: Within 1 hour of compromise

#### 3. Token Security
```typescript
// Secure JWT signing configuration
const jwtConfig = {
  algorithm: 'RS256',
  expiresIn: '15m',  // Short-lived access tokens
  issuer: 'https://paintbox.fly.dev',
  audience: 'https://paintbox.fly.dev/api',
  notBefore: '0s',
  jwtid: crypto.randomUUID(),  // Unique token ID for tracking
};

// Add token binding for enhanced security
const tokenBinding = {
  cnf: {
    jkt: sha256(clientCertificate)  // Certificate thumbprint
  }
};
```

### OAuth2 Security

#### Configuration Checklist
- ✅ Use state parameter to prevent CSRF
- ✅ Validate redirect URIs exactly
- ✅ Use PKCE for public clients
- ✅ Short-lived authorization codes (max 10 minutes)
- ✅ One-time use authorization codes

#### Implementation
```typescript
// Secure OAuth configuration
const oauthConfig = {
  responseType: 'code',
  responseMode: 'query',
  scope: 'openid profile email',
  state: crypto.randomBytes(32).toString('hex'),
  nonce: crypto.randomBytes(32).toString('hex'),
  codeChallenge: base64url(sha256(codeVerifier)),
  codeChallengeMethod: 'S256',
  prompt: 'consent',
};
```

---

## AWS Integration Security

### IAM Best Practices

#### 1. Principle of Least Privilege
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["secretsmanager:GetSecretValue"],
    "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:paintbox/production/jwt/*",
    "Condition": {
      "StringEquals": {
        "secretsmanager:ResourceTag/Environment": "production"
      }
    }
  }]
}
```

#### 2. Service Account Security
- Separate IAM users per environment
- Programmatic access only (no console access)
- Mandatory MFA for administrative operations
- Access key rotation every 90 days

#### 3. Resource Tagging Strategy
```bash
# Tag all resources consistently
aws secretsmanager tag-resource \
  --secret-id "paintbox/production/jwt/keys" \
  --tags \
    Key=Environment,Value=production \
    Key=Service,Value=paintbox \
    Key=Sensitivity,Value=high \
    Key=Compliance,Value=pci-dss
```

### Secrets Manager Configuration

#### 1. Encryption at Rest
```typescript
// Use KMS customer-managed keys
const secretConfig = {
  KmsKeyId: 'arn:aws:kms:us-east-1:xxx:key/xxx',
  SecretString: JSON.stringify(secretData),
  Tags: [
    { Key: 'AutoRotate', Value: 'true' },
    { Key: 'RotationInterval', Value: '30' }
  ]
};
```

#### 2. Automatic Rotation
```python
# Lambda function for secret rotation
def lambda_handler(event, context):
    service_client = boto3.client('secretsmanager')
    arn = event['SecretId']
    token = event['Token']
    step = event['Step']
    
    if step == "createSecret":
        create_new_secret(service_client, arn, token)
    elif step == "setSecret":
        set_secret(service_client, arn, token)
    elif step == "testSecret":
        test_secret(service_client, arn, token)
    elif step == "finishSecret":
        finish_secret(service_client, arn, token)
```

---

## API Security

### Rate Limiting Implementation

#### 1. Tiered Rate Limits
```typescript
const rateLimits = {
  public: { requests: 100, window: '1m' },
  authenticated: { requests: 1000, window: '1m' },
  premium: { requests: 10000, window: '1m' },
  admin: { requests: 100000, window: '1m' }
};
```

#### 2. DDoS Protection
```typescript
// Implement exponential backoff
const backoffMultiplier = Math.pow(2, attemptNumber);
const delay = Math.min(1000 * backoffMultiplier, 30000);
```

### CORS Configuration

#### Strict CORS Policy
```typescript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://paintbox.fly.dev',
      'https://paintbox.candlefish.ai'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  maxAge: 86400,  // 24 hours
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining']
};
```

### Security Headers

#### Essential Headers
```typescript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',  // Disabled in favor of CSP
  'Content-Security-Policy': generateCSP(),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

function generateCSP() {
  return [
    "default-src 'self'",
    "script-src 'self' 'nonce-${nonce}'",
    "style-src 'self' 'nonce-${nonce}'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.paintbox.fly.dev",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
}
```

---

## Secrets Management

### Environment Variables

#### Never Store in Code
```bash
# Bad - Never do this
export API_KEY="sk_live_abcd1234"

# Good - Use secret management
export API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id paintbox/api-key \
  --query SecretString --output text)
```

### Secret Rotation Workflow

1. **Generate New Secret**
```bash
openssl rand -hex 32 > new-secret.txt
```

2. **Update in Secrets Manager**
```bash
aws secretsmanager update-secret \
  --secret-id paintbox/production/jwt/private-key \
  --secret-string file://new-secret.txt
```

3. **Deploy with Zero Downtime**
```bash
# Blue-green deployment
flyctl deploy --strategy blue-green
```

4. **Verify and Clean Up**
```bash
# Verify new deployment
curl https://paintbox.fly.dev/health

# Remove old secret version after grace period
aws secretsmanager update-secret-version-stage \
  --secret-id paintbox/production/jwt/private-key \
  --remove-from-version-id OLD_VERSION \
  --version-stage AWSPREVIOUS
```

---

## Monitoring & Logging

### Security Event Monitoring

#### Critical Events to Monitor
1. **Authentication Failures**
   - Multiple failed login attempts
   - Invalid JWT signatures
   - Expired token usage

2. **Authorization Violations**
   - Access to unauthorized resources
   - Privilege escalation attempts
   - API key misuse

3. **Anomalous Behavior**
   - Unusual request patterns
   - Geographic anomalies
   - Time-based anomalies

#### CloudWatch Alarms
```typescript
const alarms = [
  {
    name: 'HighAuthFailureRate',
    metric: 'AuthenticationFailures',
    threshold: 10,
    period: 300,  // 5 minutes
    statistic: 'Sum'
  },
  {
    name: 'SuspiciousAPIUsage',
    metric: 'APIRequestRate',
    threshold: 10000,
    period: 60,  // 1 minute
    statistic: 'Sum'
  },
  {
    name: 'SecretAccessAnomaly',
    metric: 'SecretsManagerAccess',
    threshold: 100,
    period: 3600,  // 1 hour
    statistic: 'Sum'
  }
];
```

### Audit Logging

#### What to Log
```typescript
const auditLog = {
  timestamp: new Date().toISOString(),
  eventType: 'AUTHENTICATION',
  userId: user.id,
  sessionId: session.id,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  action: 'LOGIN_SUCCESS',
  metadata: {
    mfaUsed: true,
    loginMethod: 'oauth2',
    provider: 'google'
  }
};
```

#### What NOT to Log
- Passwords or password hashes
- Full credit card numbers
- Social Security numbers
- API keys or secrets
- Session tokens
- Private keys

---

## Incident Response

### Security Incident Playbook

#### 1. Detection Phase (0-15 minutes)
- [ ] Identify the nature of the incident
- [ ] Assess severity (Critical/High/Medium/Low)
- [ ] Notify security team
- [ ] Begin incident documentation

#### 2. Containment Phase (15-60 minutes)
- [ ] Isolate affected systems
- [ ] Revoke compromised credentials
- [ ] Block malicious IPs
- [ ] Enable emergency rate limiting

#### 3. Investigation Phase (1-4 hours)
- [ ] Review audit logs
- [ ] Analyze attack vectors
- [ ] Identify data exposure
- [ ] Document timeline

#### 4. Recovery Phase (4-24 hours)
- [ ] Rotate all secrets
- [ ] Patch vulnerabilities
- [ ] Restore from clean backups
- [ ] Implement additional controls

#### 5. Post-Incident Phase (24-72 hours)
- [ ] Complete incident report
- [ ] Notify affected users (if required)
- [ ] Update security procedures
- [ ] Schedule post-mortem meeting

### Emergency Contacts

```yaml
security_team:
  primary:
    name: "Security Lead"
    phone: "+1-xxx-xxx-xxxx"
    email: "security@paintbox.com"
  secondary:
    name: "DevOps Lead"
    phone: "+1-xxx-xxx-xxxx"
    email: "devops@paintbox.com"
  
external:
  aws_support: "https://console.aws.amazon.com/support"
  fly_io_support: "support@fly.io"
```

---

## Compliance Checklist

### OWASP Top 10 (2021)

- [ ] **A01** - Broken Access Control
  - Implement RBAC
  - Validate permissions on every request
  - Deny by default

- [ ] **A02** - Cryptographic Failures
  - Use strong encryption (AES-256)
  - Secure key management
  - TLS 1.3 only

- [ ] **A03** - Injection
  - Parameterized queries
  - Input validation
  - Output encoding

- [ ] **A04** - Insecure Design
  - Threat modeling
  - Security requirements
  - Secure design patterns

- [ ] **A05** - Security Misconfiguration
  - Hardened configurations
  - Minimal permissions
  - Regular updates

- [ ] **A06** - Vulnerable Components
  - Dependency scanning
  - Regular updates
  - Component inventory

- [ ] **A07** - Authentication Failures
  - MFA implementation
  - Secure session management
  - Account lockout

- [ ] **A08** - Data Integrity Failures
  - Digital signatures
  - Integrity checks
  - Secure deserialization

- [ ] **A09** - Logging Failures
  - Comprehensive logging
  - Log monitoring
  - Incident detection

- [ ] **A10** - SSRF
  - URL validation
  - Network segmentation
  - Allowlist approach

### Regulatory Compliance

#### GDPR (if applicable)
- [ ] Privacy by design
- [ ] Data minimization
- [ ] Right to erasure
- [ ] Consent management
- [ ] Data breach notification (72 hours)

#### PCI DSS (if handling payments)
- [ ] Network segmentation
- [ ] Encryption of cardholder data
- [ ] Access control
- [ ] Regular security testing
- [ ] Security policies

#### SOC 2 Type II
- [ ] Security controls
- [ ] Availability monitoring
- [ ] Processing integrity
- [ ] Confidentiality measures
- [ ] Privacy controls

---

## Security Tools & Resources

### Recommended Security Tools

1. **Static Analysis**
   - SonarQube
   - Semgrep
   - CodeQL
   - ESLint security plugin

2. **Dynamic Analysis**
   - OWASP ZAP
   - Burp Suite
   - Nikto
   - SQLMap

3. **Dependency Scanning**
   - Snyk
   - npm audit
   - OWASP Dependency Check
   - GitHub Dependabot

4. **Secret Scanning**
   - TruffleHog
   - git-secrets
   - detect-secrets
   - Vault

5. **Runtime Protection**
   - AWS WAF
   - Cloudflare
   - fail2ban
   - ModSecurity

### Security Training Resources

1. **OWASP Resources**
   - [OWASP Top 10](https://owasp.org/Top10/)
   - [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
   - [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

2. **Cloud Security**
   - [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
   - [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)

3. **Secure Coding**
   - [SANS Secure Coding](https://www.sans.org/secure-coding/)
   - [SEI CERT Coding Standards](https://wiki.sei.cmu.edu/confluence/display/seccode)

---

## Maintenance Schedule

### Daily Tasks
- Review security alerts
- Check rate limiting metrics
- Monitor error rates

### Weekly Tasks
- Review access logs
- Update security patches
- Test backup restoration

### Monthly Tasks
- Rotate API keys
- Security assessment
- Update documentation
- Vulnerability scanning

### Quarterly Tasks
- Penetration testing
- Security training
- Policy review
- Compliance audit

### Annual Tasks
- Full security audit
- Disaster recovery drill
- Policy updates
- Third-party assessment

---

**Document Version:** 1.0.0  
**Last Updated:** August 20, 2025  
**Next Review:** September 20, 2025  
**Owner:** Security Team  
**Classification:** Internal Use Only
