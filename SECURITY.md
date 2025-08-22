# Security Policy

## 🔐 Security Practices

### Reporting Security Vulnerabilities

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security@candlefish.ai with details
3. Include steps to reproduce if possible
4. Allow 48 hours for initial response

### Security Best Practices

#### Secrets Management
- **NEVER** commit secrets to version control
- Use AWS Secrets Manager for production secrets
- Use `.env.example` templates for documentation
- Rotate all credentials regularly (90 days max)
- Use strong, unique passwords for all services

#### Environment Configuration
```bash
# Copy template and configure locally
cp .env.example .env

# Never commit .env files
git status  # Should not show .env files
```

#### Required Security Headers
All production deployments must include:
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` (configured per app)

### Authentication & Authorization

#### JWT Configuration
- Use RS256 algorithm (asymmetric)
- Rotate signing keys monthly
- Short-lived tokens (1 hour default)
- Implement refresh token rotation

#### Access Control
- Implement RBAC for all endpoints
- Default deny for undefined permissions
- Audit logs for sensitive operations
- Rate limiting on all public endpoints

### Data Protection

#### Encryption
- TLS 1.3 for all connections
- Encrypt sensitive data at rest
- Use AWS KMS for key management
- No sensitive data in logs

#### PII Handling
- Minimize PII collection
- Implement data retention policies
- Support GDPR/CCPA requirements
- Provide data export/deletion tools

### Infrastructure Security

#### Container Security
- Use official base images only
- Scan images for vulnerabilities
- Run containers as non-root
- Implement resource limits

#### Network Security
- Use VPC isolation
- Implement WAF rules
- DDoS protection enabled
- Regular security audits

### Development Security

#### Code Review Requirements
- All PRs require security review
- Automated security scanning (Snyk/Dependabot)
- No direct commits to main branch
- Sign commits with GPG keys

#### Dependency Management
- Regular dependency updates
- Automated vulnerability scanning
- Lock file integrity checks
- License compliance validation

### Incident Response

#### Response Plan
1. **Detect**: Monitoring and alerting
2. **Contain**: Isolate affected systems
3. **Investigate**: Root cause analysis
4. **Remediate**: Fix vulnerabilities
5. **Recover**: Restore normal operations
6. **Review**: Post-incident analysis

#### Contact Information
- Security Team: security@candlefish.ai
- On-call: Use PagerDuty escalation
- Executives: Notify for severity 1 incidents

### Compliance

#### Standards
- SOC 2 Type II (in progress)
- GDPR compliant
- CCPA compliant
- HIPAA ready (future)

#### Audit Requirements
- Quarterly security reviews
- Annual penetration testing
- Continuous compliance monitoring
- Regular security training

### Security Checklist for Developers

Before deploying to production:

- [ ] No hardcoded secrets in code
- [ ] All inputs validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection implemented
- [ ] CSRF tokens for state-changing operations
- [ ] Authentication required for sensitive endpoints
- [ ] Rate limiting configured
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include PII/secrets
- [ ] Dependencies updated and scanned
- [ ] Security headers configured
- [ ] TLS/HTTPS enforced
- [ ] Backup and recovery tested

### Security Tools

#### Scanning Tools
- **Snyk**: Dependency vulnerabilities
- **GitHub Security**: Code scanning
- **Trivy**: Container scanning
- **OWASP ZAP**: Web app scanning

#### Monitoring Tools
- **Sentry**: Error tracking
- **Datadog**: Security monitoring
- **AWS GuardDuty**: Threat detection
- **CloudWatch**: Log analysis

### Version History

- v1.0.0 (2025-08-22): Initial security policy

---

*For security concerns, contact: security@candlefish.ai*
