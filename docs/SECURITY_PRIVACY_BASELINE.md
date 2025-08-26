# Security & Privacy Baseline

## Executive Summary

This document establishes Candlefish.ai's security and privacy controls mapped to NIST SP 800-53 (Moderate) and ISO 27001:2022 Annex A. Our approach treats all user data with HIPAA-grade protection standards, implementing defense-in-depth with privacy-by-design principles.

## Control Frameworks Mapping

### NIST SP 800-53 Rev 5 (Moderate Baseline)

#### Access Control (AC)
| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| AC-2 | Account Management | JWT with 15-min access tokens, refresh rotation | ✅ Implemented |
| AC-3 | Access Enforcement | RBAC via GraphQL resolvers, field-level permissions | ✅ Implemented |
| AC-4 | Information Flow | Network segmentation, API gateway filtering | 🔄 In Progress |
| AC-6 | Least Privilege | Service accounts with minimal permissions | ✅ Implemented |
| AC-7 | Unsuccessful Logon Attempts | Rate limiting, account lockout after 5 attempts | ✅ Implemented |
| AC-11 | Device Lock | Auto-logout after 15 min inactivity | ✅ Implemented |
| AC-17 | Remote Access | TLS 1.3 only, certificate pinning | ✅ Implemented |

#### Audit and Accountability (AU)
| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| AU-2 | Event Logging | Structured logs to CloudWatch/Grafana | ✅ Implemented |
| AU-3 | Content of Records | User, timestamp, action, outcome, source IP | ✅ Implemented |
| AU-4 | Storage Capacity | 90-day retention, automated archival | ✅ Implemented |
| AU-5 | Response to Failures | Alert on log delivery failure | 🔄 In Progress |
| AU-6 | Review and Reporting | Weekly security report automation | 📋 Planned |
| AU-9 | Protection of Information | Log encryption at rest and in transit | ✅ Implemented |

#### Security Assessment (CA)
| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CA-2 | Control Assessments | Quarterly security audits | 📋 Planned |
| CA-7 | Continuous Monitoring | Prometheus + Grafana dashboards | ✅ Implemented |
| CA-8 | Penetration Testing | Annual third-party assessment | 📋 Planned |
| CA-9 | Internal Connections | Service mesh with mTLS | 🔄 In Progress |

#### Configuration Management (CM)
| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| CM-2 | Baseline Configuration | IaC via Terraform, GitOps | ✅ Implemented |
| CM-3 | Configuration Changes | PR review required, CI/CD gates | ✅ Implemented |
| CM-4 | Impact Analysis | Automated dependency scanning | ✅ Implemented |
| CM-6 | Configuration Settings | Hardened container images | ✅ Implemented |
| CM-7 | Least Functionality | Minimal container surfaces | ✅ Implemented |
| CM-8 | System Inventory | Asset tracking via tags | 🔄 In Progress |

#### Identification and Authentication (IA)
| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| IA-2 | User Identification | Email + password, optional MFA | ✅ Implemented |
| IA-3 | Device Identification | Device fingerprinting, trusted device list | 🔄 In Progress |
| IA-5 | Authenticator Management | Password complexity, rotation policy | ✅ Implemented |
| IA-6 | Authenticator Feedback | Masked password input | ✅ Implemented |
| IA-7 | Cryptographic Module Auth | HSM for key management | 📋 Planned |
| IA-8 | Non-repudiation | Digital signatures on critical ops | 🔄 In Progress |

#### Incident Response (IR)
| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| IR-4 | Incident Handling | Response runbook, on-call rotation | ✅ Implemented |
| IR-5 | Incident Monitoring | PagerDuty integration | ✅ Implemented |
| IR-6 | Incident Reporting | Automated stakeholder notification | 🔄 In Progress |
| IR-8 | Incident Response Plan | Documented IR procedures | ✅ Implemented |

#### System and Communications Protection (SC)
| Control | Description | Implementation | Status |
|---------|-------------|----------------|--------|
| SC-5 | Denial of Service Protection | CloudFlare, rate limiting | ✅ Implemented |
| SC-7 | Boundary Protection | WAF, API gateway | ✅ Implemented |
| SC-8 | Transmission Confidentiality | TLS 1.3 everywhere | ✅ Implemented |
| SC-13 | Cryptographic Protection | AES-256-GCM, RSA-2048 minimum | ✅ Implemented |
| SC-23 | Session Authenticity | CSRF tokens, SameSite cookies | ✅ Implemented |
| SC-28 | Protection at Rest | Encrypted volumes, database encryption | ✅ Implemented |

### ISO 27001:2022 Annex A Controls

#### A.5 Organizational Controls
- **A.5.1** Information security policies: Documented in `/docs/security/`
- **A.5.2** Information security roles: RACI matrix defined
- **A.5.7** Threat intelligence: Threat feeds integrated
- **A.5.10** Acceptable use: User agreements required
- **A.5.23** Information security in cloud: Cloud security posture management

#### A.6 People Controls  
- **A.6.1** Screening: Background checks for privileged access
- **A.6.2** Terms of employment: Security clauses in contracts
- **A.6.3** Awareness training: Quarterly security training
- **A.6.6** Confidentiality agreements: NDAs for all staff

#### A.7 Physical Controls
- **A.7.1** Physical perimeters: N/A (cloud-native)
- **A.7.9** Asset disposal: Secure data wiping procedures
- **A.7.10** Storage media: Encrypted storage only
- **A.7.14** Environmental protection: Geo-redundant deployment

#### A.8 Technological Controls
- **A.8.1** User endpoints: Endpoint detection and response
- **A.8.2** Privileged access: PAM solution, just-in-time access
- **A.8.3** Access restriction: Network segmentation
- **A.8.5** Secure authentication: MFA, passwordless options
- **A.8.9** Configuration management: GitOps, immutable infrastructure
- **A.8.10** Information deletion: Right to erasure implementation
- **A.8.12** Data leakage prevention: DLP policies active
- **A.8.16** Monitoring: SIEM with correlation rules
- **A.8.23** Web filtering: Content security policy
- **A.8.24** Cryptography: Key management service
- **A.8.25** Secure development: SAST/DAST in CI/CD
- **A.8.28** Secure coding: Peer review mandatory

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Internet (Public)                   │
└────────────────┬─────────────────────────────────────┘
                 │ HTTPS/TLS 1.3
        ┌────────▼────────┐
        │   CloudFlare    │ ← DDoS Protection
        │      WAF        │ ← OWASP Top 10
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   API Gateway   │ ← Rate Limiting
        │  (Kong/Envoy)   │ ← Auth Verification  
        └────────┬────────┘
                 │ mTLS
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐  ┌────▼────┐  ┌────▼────┐
│GraphQL│  │   REST  │  │WebSocket│
│  API  │  │   API   │  │   Hub   │
└───┬───┘  └────┬────┘  └────┬────┘
    │           │             │
    └───────────┼─────────────┘
                │ Internal Network (Private)
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│Service│  │Service│  │Service│
│   A   │  │   B   │  │   C   │
└───┬───┘  └───┬───┘  └───┬───┘
    │           │           │
    └───────────┼───────────┘
                │ Encrypted Storage
         ┌──────▼──────┐
         │  PostgreSQL │ ← At-rest encryption
         │    Redis    │ ← TLS in transit
         │     S3      │ ← Server-side encryption
         └─────────────┘
```

### Trust Boundaries
1. **Internet → CDN**: Public untrusted to semi-trusted
2. **CDN → API Gateway**: Semi-trusted to trusted perimeter
3. **API Gateway → Services**: Trusted perimeter to internal
4. **Services → Data**: Internal to sensitive

### Data Classification
| Level | Description | Examples | Protection |
|-------|-------------|----------|------------|
| Public | Open information | Marketing content | CDN caching OK |
| Internal | Business operations | Analytics, logs | Encrypted transit |
| Confidential | User data | PII, credentials | E2E encryption |
| Restricted | Critical secrets | Keys, tokens | HSM storage |

## Threat Model (STRIDE-lite)

### Spoofing
- **Threat**: Impersonation attacks
- **Controls**: MFA, device fingerprinting, session binding
- **Residual Risk**: Low

### Tampering
- **Threat**: Data modification in transit/rest
- **Controls**: TLS, integrity checks, append-only logs
- **Residual Risk**: Low

### Repudiation
- **Threat**: Denial of actions
- **Controls**: Audit logs, digital signatures
- **Residual Risk**: Medium (pending signature implementation)

### Information Disclosure
- **Threat**: Data leaks
- **Controls**: Encryption, DLP, access controls
- **Residual Risk**: Low

### Denial of Service
- **Threat**: Resource exhaustion
- **Controls**: Rate limiting, auto-scaling, CloudFlare
- **Residual Risk**: Low

### Elevation of Privilege
- **Threat**: Unauthorized access escalation
- **Controls**: Least privilege, RBAC, regular audits
- **Residual Risk**: Low

## Security Headers Configuration

```nginx
# nginx.conf security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-...' ; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.candlefish.ai wss://ws.candlefish.ai; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()" always;
```

## Privacy Controls

### Data Minimization
- Collect only essential data
- Automatic PII redaction in logs
- 90-day default retention
- User-controlled data deletion

### Consent Management
- Explicit opt-in for all processing
- Granular consent controls
- Consent audit trail
- Easy withdrawal mechanism

### Third-Party Services
| Service | Purpose | Data Shared | Alternative |
|---------|---------|-------------|-------------|
| CloudFlare | CDN/DDoS | IP, User-Agent | Self-host (complex) |
| AWS | Infrastructure | Encrypted data | On-premise (costly) |
| Stripe | Payments | Payment info | Self-process (PCI) |

### Telemetry Posture
- **Default**: Telemetry OFF
- **Opt-in**: Explicit user consent required
- **Minimal**: Only errors and performance
- **Local**: Metrics computed client-side when possible
- **Anonymous**: No user IDs in telemetry
- **Transparent**: Public telemetry dashboard

## Compliance Checklist

### GDPR Requirements
- [x] Privacy by Design
- [x] Data Protection Impact Assessment
- [x] Right to Access (30-day SLA)
- [x] Right to Rectification
- [x] Right to Erasure
- [x] Right to Portability
- [x] Consent Management
- [x] Breach Notification (72 hours)
- [x] DPO Designation

### CCPA Requirements
- [x] Privacy Policy
- [x] Opt-out Mechanism
- [x] Data Sale Prohibition
- [x] Access Rights
- [x] Deletion Rights
- [x] Non-discrimination

### SOC 2 Type II Criteria
- [x] Security (Common Criteria)
- [x] Availability (99.9% SLA)
- [x] Processing Integrity
- [x] Confidentiality
- [ ] Privacy (In Progress)

## Monitoring & Alerting

### Security Metrics Dashboard
- Failed authentication attempts
- Anomalous API usage patterns
- CSP violations
- TLS handshake failures
- WAF blocked requests
- Dependency vulnerabilities

### Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Failed Auth | > 10/min | > 50/min | Block IP |
| API Errors | > 1% | > 5% | Page on-call |
| CSP Violations | > 100/hour | > 1000/hour | Investigate |
| Storage Usage | > 80% | > 90% | Scale/cleanup |

## Incident Response Plan

### Severity Levels
- **P0**: Data breach, service down > 30 min
- **P1**: Partial outage, security vulnerability
- **P2**: Performance degradation, minor security issue
- **P3**: Non-critical bug, documentation issue

### Response Team
```yaml
roles:
  incident_commander: "@security-lead"
  communications: "@dev-rel"
  technical_lead: "@platform-lead"
  scribe: "@on-call-secondary"
```

### Response Phases
1. **Detection**: Automated alert or user report
2. **Triage**: Assess severity and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Root cause analysis
5. **Remediation**: Fix and verify
6. **Recovery**: Restore normal operations
7. **Post-mortem**: Document lessons learned

## Security Testing

### Automated Testing
```bash
# SAST (Static Application Security Testing)
pnpm audit
semgrep --config=auto

# DAST (Dynamic Application Security Testing)
zap-cli quick-scan --self-contained https://candlefish.ai

# Dependency Scanning
snyk test
npm audit

# Container Scanning
trivy image candlefish:latest

# Infrastructure Scanning
tfsec .
checkov -d .
```

### Manual Testing Checklist
- [ ] Authentication bypass attempts
- [ ] Authorization boundary testing
- [ ] Input validation fuzzing
- [ ] Session management verification
- [ ] Cryptography implementation review
- [ ] Business logic vulnerability assessment

## Vendor Security Matrix

| Vendor | Service | Risk Level | Assessment Date | Next Review |
|--------|---------|------------|-----------------|-------------|
| AWS | Infrastructure | Low | 2024-08-01 | 2025-02-01 |
| CloudFlare | CDN/Security | Low | 2024-07-15 | 2025-01-15 |
| GitHub | Code/CI/CD | Low | 2024-08-10 | 2025-02-10 |
| Stripe | Payments | Low | 2024-06-01 | 2024-12-01 |
| SendGrid | Email | Medium | 2024-07-01 | 2025-01-01 |

## Security Roadmap

### Q3 2024 (Completed)
- [x] NIST baseline implementation
- [x] Security headers deployment
- [x] Audit logging system
- [x] Encryption at rest

### Q4 2024 (Current)
- [ ] ISO 27001 gap analysis
- [ ] Penetration testing
- [ ] Security awareness training
- [ ] Incident response drills

### Q1 2025 (Planned)
- [ ] SOC 2 Type II audit
- [ ] Zero Trust architecture
- [ ] Advanced threat detection
- [ ] Security chaos engineering

### Q2 2025 (Future)
- [ ] ISO 27001 certification
- [ ] Bug bounty program
- [ ] ML-based anomaly detection
- [ ] Quantum-safe cryptography prep

## Security Contacts

```yaml
security_team:
  email: security@candlefish.ai
  pgp_key: https://candlefish.ai/.well-known/security.asc
  
vulnerability_disclosure:
  email: security@candlefish.ai
  response_time: 48 hours
  
emergency_contacts:
  primary: security-oncall@candlefish.ai
  escalation: cto@candlefish.ai
```

---

*This security baseline is a living document, version-controlled in git, with monthly reviews scheduled. Last updated: 2025-08-25*
