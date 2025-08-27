# Threat Model

## System Overview

Candlefish.ai is a web-based platform implementing proportion-by-design principles for operational excellence. The system processes user data, provides collaboration features, and maintains privacy-preserving analytics.

## Assets

### Primary Assets
1. **User Data**
   - Personal information (PII)
   - Authentication credentials
   - Session data
   - User-generated content (fragments, notes)
   - Behavioral analytics

2. **System Assets**
   - API keys and secrets
   - Encryption keys
   - Database credentials
   - Infrastructure access tokens
   - Source code

3. **Business Assets**
   - Proprietary algorithms
   - Customer relationships
   - Brand reputation
   - Compliance status

## Threat Actors

| Actor | Motivation | Capability | Target |
|-------|------------|------------|--------|
| External Attacker | Financial gain, data theft | High (APT) | User data, credentials |
| Insider Threat | Revenge, financial | Medium | All assets |
| Script Kiddie | Recognition, disruption | Low | Public services |
| Competitor | Business advantage | Medium | Proprietary data |
| State Actor | Intelligence gathering | Very High | Everything |
| Hacktivist | Ideological | Medium | Public reputation |

## STRIDE Analysis

### Spoofing Identity

#### Threat: Account Takeover
- **Description**: Attacker gains unauthorized access to user accounts
- **Attack Vectors**:
  - Credential stuffing
  - Phishing attacks
  - Session hijacking
  - Social engineering
- **Impact**: High - Complete account compromise
- **Likelihood**: Medium
- **Mitigations**:
  - MFA enforcement
  - Device fingerprinting
  - Anomaly detection
  - Session binding to IP/User-Agent
  - Rate limiting on login attempts
- **Residual Risk**: Low

#### Threat: API Key Compromise
- **Description**: Stolen API keys used for unauthorized access
- **Attack Vectors**:
  - Code repository exposure
  - Man-in-the-middle attacks
  - Insider threat
- **Impact**: High - System-wide compromise possible
- **Likelihood**: Low
- **Mitigations**:
  - Key rotation policy
  - Environment-based key storage
  - API key scoping
  - Audit logging
  - Secret scanning in CI/CD
- **Residual Risk**: Low

### Tampering with Data

#### Threat: Data Modification in Transit
- **Description**: Attacker intercepts and modifies data
- **Attack Vectors**:
  - Man-in-the-middle attacks
  - DNS hijacking
  - BGP hijacking
- **Impact**: High - Data integrity compromised
- **Likelihood**: Low
- **Mitigations**:
  - TLS 1.3 everywhere
  - Certificate pinning
  - HSTS enforcement
  - Integrity checks (HMAC)
  - Mutual TLS for services
- **Residual Risk**: Low

#### Threat: Database Tampering
- **Description**: Direct database modification
- **Attack Vectors**:
  - SQL injection
  - Compromised database credentials
  - Insider threat
- **Impact**: Critical - Complete data integrity loss
- **Likelihood**: Low
- **Mitigations**:
  - Parameterized queries
  - Database access controls
  - Audit logging
  - Read replicas for verification
  - Database activity monitoring
- **Residual Risk**: Low

### Repudiation

#### Threat: Action Denial
- **Description**: User denies performing an action
- **Attack Vectors**:
  - Shared accounts
  - Compromised credentials
  - Insufficient logging
- **Impact**: Medium - Legal/compliance issues
- **Likelihood**: Medium
- **Mitigations**:
  - Comprehensive audit logs
  - Digital signatures on critical actions
  - Immutable log storage
  - User action confirmation
  - Legal terms acceptance
- **Residual Risk**: Medium

### Information Disclosure

#### Threat: Data Breach
- **Description**: Unauthorized access to sensitive data
- **Attack Vectors**:
  - SQL injection
  - Broken access controls
  - Misconfigured storage
  - Social engineering
- **Impact**: Critical - Regulatory fines, reputation damage
- **Likelihood**: Medium
- **Mitigations**:
  - Encryption at rest (AES-256)
  - Field-level encryption for PII
  - Access control lists
  - Data classification
  - DLP policies
  - Regular security audits
- **Residual Risk**: Low

#### Threat: Metadata Leakage
- **Description**: Sensitive information in logs/errors
- **Attack Vectors**:
  - Verbose error messages
  - Debug mode in production
  - Log aggregation services
- **Impact**: Medium - Information gathering for attacks
- **Likelihood**: Medium
- **Mitigations**:
  - Log sanitization
  - Error message filtering
  - Production/development separation
  - Secure log storage
  - PII redaction in logs
- **Residual Risk**: Low

### Denial of Service

#### Threat: Application DDoS
- **Description**: Service overwhelmed by requests
- **Attack Vectors**:
  - Volumetric attacks
  - Application layer attacks
  - Resource exhaustion
- **Impact**: High - Service unavailability
- **Likelihood**: Medium
- **Mitigations**:
  - CloudFlare DDoS protection
  - Rate limiting
  - Auto-scaling
  - Circuit breakers
  - Resource quotas
  - Geographic distribution
- **Residual Risk**: Low

#### Threat: Resource Exhaustion
- **Description**: Single user consuming excessive resources
- **Attack Vectors**:
  - Complex GraphQL queries
  - Large file uploads
  - Infinite loops
- **Impact**: Medium - Degraded performance
- **Likelihood**: Medium
- **Mitigations**:
  - Query complexity limits
  - File size limits
  - Timeout policies
  - Resource monitoring
  - User quotas
- **Residual Risk**: Low

### Elevation of Privilege

#### Threat: Privilege Escalation
- **Description**: User gains unauthorized permissions
- **Attack Vectors**:
  - Authorization bypass
  - JWT manipulation
  - Role confusion
  - Parameter pollution
- **Impact**: Critical - Full system compromise
- **Likelihood**: Low
- **Mitigations**:
  - Principle of least privilege
  - Role-based access control
  - JWT signature verification
  - Authorization at every layer
  - Regular permission audits
- **Residual Risk**: Low

#### Threat: Container Escape
- **Description**: Breaking out of containerized environment
- **Attack Vectors**:
  - Kernel vulnerabilities
  - Misconfigured containers
  - Privileged containers
- **Impact**: Critical - Host system compromise
- **Likelihood**: Very Low
- **Mitigations**:
  - Security scanning of images
  - Non-root containers
  - Read-only file systems
  - Network segmentation
  - Regular patching
  - Runtime protection
- **Residual Risk**: Low

## Attack Trees

### Tree 1: Steal User Data
```
Goal: Steal User Data
├── Gain Direct Access
│   ├── SQL Injection (Mitigated: Parameterized queries)
│   ├── Broken Access Control (Mitigated: RBAC)
│   └── Insider Threat (Mitigated: Audit logs, least privilege)
├── Intercept Communications
│   ├── MITM Attack (Mitigated: TLS 1.3)
│   ├── DNS Hijacking (Mitigated: DNSSEC)
│   └── BGP Hijacking (Mitigated: RPKI)
└── Compromise Account
    ├── Phishing (Mitigated: User education, MFA)
    ├── Credential Stuffing (Mitigated: Rate limiting, MFA)
    └── Session Hijacking (Mitigated: Secure cookies, binding)
```

### Tree 2: Disrupt Service
```
Goal: Disrupt Service
├── DDoS Attack
│   ├── Network Layer (Mitigated: CloudFlare)
│   ├── Application Layer (Mitigated: Rate limiting)
│   └── Amplification (Mitigated: Rate limiting)
├── Data Corruption
│   ├── Database Tampering (Mitigated: Access controls)
│   ├── Cache Poisoning (Mitigated: TTL, validation)
│   └── Supply Chain (Mitigated: Dependency scanning)
└── Resource Exhaustion
    ├── Memory Leak (Mitigated: Monitoring, limits)
    ├── CPU Intensive (Mitigated: Timeouts, queues)
    └── Storage Filling (Mitigated: Quotas, cleanup)
```

## Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Treatment |
|--------|------------|--------|------------|-----------|
| Data Breach | Medium | Critical | High | Mitigate |
| DDoS Attack | Medium | High | Medium | Mitigate |
| Account Takeover | Medium | High | Medium | Mitigate |
| Privilege Escalation | Low | Critical | Medium | Mitigate |
| SQL Injection | Low | Critical | Medium | Mitigate |
| Session Hijacking | Medium | Medium | Medium | Mitigate |
| Resource Exhaustion | Medium | Medium | Medium | Accept |
| Metadata Leakage | Medium | Low | Low | Accept |
| Container Escape | Very Low | Critical | Low | Monitor |

## Security Controls

### Preventive Controls
- Input validation and sanitization
- Secure coding practices
- Encryption (TLS, AES-256)
- Access control (RBAC)
- Security headers (CSP, HSTS)
- Rate limiting
- API authentication (JWT)
- MFA enforcement

### Detective Controls
- Audit logging
- Intrusion detection
- Anomaly detection
- Security monitoring
- File integrity monitoring
- Vulnerability scanning
- Dependency scanning
- Code analysis (SAST/DAST)

### Corrective Controls
- Incident response plan
- Automated rollback
- Backup and recovery
- Patch management
- Security updates
- Configuration management
- Access revocation
- Key rotation

### Deterrent Controls
- Security awareness training
- Acceptable use policy
- Terms of service
- Legal notices
- Audit trails
- Security badges/certifications

## Testing & Validation

### Security Testing Schedule
- **Daily**: Dependency scanning, SAST
- **Weekly**: Vulnerability scanning
- **Monthly**: Security review, access audit
- **Quarterly**: Penetration testing
- **Annually**: Full security audit, threat model review

### Validation Methods
1. **Automated Testing**
   - Unit tests for security functions
   - Integration tests for auth flows
   - Fuzzing for input validation
   - Regression tests for fixes

2. **Manual Testing**
   - Code review for security
   - Architecture review
   - Penetration testing
   - Social engineering tests

3. **Compliance Validation**
   - OWASP Top 10 coverage
   - NIST 800-53 controls
   - ISO 27001 requirements
   - GDPR compliance

## Incident Response

### Response Team
- **Incident Commander**: CTO
- **Technical Lead**: Security Engineer
- **Communications**: DevRel
- **Legal**: External Counsel

### Response Phases
1. **Detection & Analysis** (< 1 hour)
2. **Containment** (< 2 hours)
3. **Eradication** (< 24 hours)
4. **Recovery** (< 48 hours)
5. **Post-Incident** (< 1 week)

### Breach Notification
- **Users**: Within 72 hours
- **Regulators**: Within 72 hours (GDPR)
- **Partners**: Within 24 hours
- **Public**: As required

## Continuous Improvement

### Metrics
- Mean time to detect (MTTD): < 1 hour
- Mean time to respond (MTTR): < 4 hours
- Vulnerability density: < 1 per KLOC
- Security training completion: > 95%
- Patch compliance: > 99%

### Review Schedule
- Threat model: Quarterly
- Security controls: Monthly
- Incident procedures: After each incident
- Security policies: Annually

---

*Last Updated: 2025-08-25*
*Next Review: 2025-11-25*
*Owner: Security Team*
