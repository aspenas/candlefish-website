# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| development | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in candlefish-ai, please follow these steps:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: <security@candlefish.ai> (or repository owner)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Timeline**: Based on severity (Critical: 24h, High: 7d, Medium: 30d, Low: 90d)

## Security Measures

### Code Security

- Pre-commit hooks with gitleaks for secret scanning
- Automated security scanning in CI/CD
- Regular dependency updates via Dependabot
- Code review required for all merges

### Secret Management

- All secrets stored in AWS Secrets Manager or Infisical
- No hardcoded credentials in code
- API keys rotated regularly
- OIDC preferred for cloud authentication

### Access Control

- Branch protection on main branch
- Required PR reviews (2 reviewers for critical paths)
- CODEOWNERS enforcement for sensitive areas
- Admin permissions required for force-push

### CI/CD Security

- Minimal permissions for GitHub Actions
- Secrets never logged or exposed
- Workflow approval required for external contributors
- Container scanning for Docker images

## Security Checklist for Contributors

Before submitting a PR:

- [ ] No secrets or credentials in code
- [ ] Dependencies are up-to-date
- [ ] Security tests pass
- [ ] Pre-commit hooks pass
- [ ] No sensitive data in logs
- [ ] API endpoints have proper authentication
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info

## Vulnerability Disclosure

We follow responsible disclosure:

1. Security issues are fixed before public disclosure
2. Credits given to security researchers (if desired)
3. Security advisories published after fixes are deployed

## Contact

For security concerns, contact the repository maintainers directly.
For general issues, use GitHub Issues.
