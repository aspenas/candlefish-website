# PromoterOS Workflow Automation Guide

## 🚀 Overview

PromoterOS now has comprehensive workflow automation for development, testing, security, and deployment. This guide covers all automated processes and how to use them.

## 📋 Quick Start

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd promoterOS

# 2. Run automated setup
npm run setup

# 3. Install dependencies (if not done by setup)
npm install

# 4. Start development
npm run dev
```

### Deploy to Production

```bash
# Automated deployment with all checks
npm run deploy

# Quick deployment (skip some checks)
npm run deploy:quick
```

## 🔄 GitHub Actions Workflows

### 1. CI/CD Pipeline (`ci-cd.yml`)

**Triggers:**

- Push to `main` or `develop`
- Pull requests to `main`
- Manual workflow dispatch

**Steps:**

1. **Security & Quality Checks**
   - ESLint code analysis
   - Secret scanning with TruffleHog
   - npm security audit
   - OWASP dependency check

2. **Testing**
   - Unit tests with Jest
   - Integration tests
   - Coverage reporting to Codecov

3. **Build & Deploy**
   - Bundle and optimize functions
   - Deploy to Netlify
   - Set environment variables

4. **Verification**
   - Health checks
   - API smoke tests
   - Performance monitoring

### 2. Security Scanning (`security-scan.yml`)

**Triggers:**

- Push to main branches
- Pull requests
- Weekly schedule (Sundays)
- Manual dispatch

**Security Checks:**

- Secret detection (TruffleHog, Gitleaks)
- Dependency vulnerabilities (Snyk, npm audit)
- SAST with Semgrep and CodeQL
- Infrastructure scanning with Checkov
- Custom security validations

### 3. Dependency Updates (`dependency-update.yml`)

**Triggers:**

- Weekly schedule (Mondays at 2 AM)
- Manual dispatch

**Actions:**

- Updates npm dependencies
- Fixes known vulnerabilities
- Creates automated PR with changes

## 🛠️ Local Development Scripts

### Setup Script (`scripts/setup-dev.sh`)

Automates complete development environment setup:

```bash
npm run setup
```

**What it does:**

- Checks prerequisites (Node.js, npm, git)
- Installs all dependencies
- Sets up environment variables
- Installs development tools
- Configures Git hooks
- Creates project structure
- Sets up test infrastructure
- Generates documentation

### Deployment Script (`scripts/deploy-automated.sh`)

Automated production deployment with safety checks:

```bash
npm run deploy
```

**Deployment steps:**

1. Pre-deployment checks (git status, branch)
2. Install/update dependencies
3. Apply security middleware
4. Run test suite
5. Optimize functions for production
6. Deploy to Netlify
7. Verify deployment
8. Generate deployment report

## 📝 Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local development server |
| `npm run deploy` | Full automated deployment |
| `npm run deploy:quick` | Quick deployment (fewer checks) |
| `npm run deploy:staging` | Deploy to staging environment |
| `npm run deploy:production` | Direct production deployment |
| `npm test` | Run test suite |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:security` | Run security audit |
| `npm run lint` | Check code quality |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run security:check` | Check for vulnerabilities |
| `npm run security:fix` | Fix vulnerabilities |
| `npm run bundle` | Bundle functions for production |
| `npm run ci` | Run CI checks locally |
| `npm run commit` | Create conventional commit |

## 🔐 Security Automation

### Implemented Security Measures

1. **Authentication Middleware** (`src/middleware/auth.js`)
   - JWT token validation
   - Role-based access control
   - Automatic token refresh

2. **Input Validation** (`src/middleware/validation.js`)
   - XSS prevention
   - SQL injection protection
   - Data sanitization

3. **Rate Limiting** (`src/middleware/rateLimiter.js`)
   - Request throttling
   - IP-based blocking
   - DDoS protection

### Security Workflow

```bash
# Run security scan
npm run security:check

# Fix vulnerabilities
npm run security:fix

# Generate security report
npm run security:scan
```

## 🧪 Testing Automation

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/           # End-to-end tests
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Security tests only
npm run test:security
```

## 📊 Monitoring & Alerts

### Health Checks

- Automated health checks in CI/CD
- Post-deployment verification
- API endpoint monitoring

### Performance Monitoring

- Response time tracking
- Cold start optimization
- Bundle size analysis

## 🚦 Git Workflow

### Branch Strategy

- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Commit Convention

Use conventional commits:

```bash
npm run commit
```

Types:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

## 🔄 Continuous Improvement

### Weekly Tasks (Automated)

- Dependency updates (Mondays)
- Security scans (Sundays)
- Performance reports

### Manual Reviews

- Monthly security audit
- Quarterly dependency review
- Performance optimization

## 📈 Deployment Metrics

After each deployment, check:

- Deployment report in project root
- GitHub Actions summary
- Netlify deployment logs
- API health status

## 🆘 Troubleshooting

### Common Issues

**1. Deployment fails**

```bash
# Check logs
cat deployment-report-*.md

# Verify environment
npm run ci

# Try manual deployment
npm run deploy:production
```

**2. Tests failing**

```bash
# Run tests locally
npm test

# Check specific test
npm test -- --testNamePattern="test-name"
```

**3. Security vulnerabilities**

```bash
# Audit and fix
npm audit fix --force

# Check specific package
npm ls package-name
```

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/)
- [Jest Testing Documentation](https://jestjs.io/docs/getting-started)
- [ESLint Configuration](https://eslint.org/docs/user-guide/configuring/)

## 🎯 Best Practices

1. **Always run tests before deployment**

   ```bash
   npm run ci
   ```

2. **Use conventional commits**

   ```bash
   npm run commit
   ```

3. **Keep dependencies updated**

   ```bash
   npm update
   npm audit fix
   ```

4. **Monitor deployment reports**
   - Check `deployment-report-*.md` files
   - Review GitHub Actions logs

5. **Security first**
   - Never commit secrets
   - Use environment variables
   - Regular security scans

## 📞 Support

For issues or questions:

1. Check deployment reports
2. Review GitHub Actions logs
3. Check this documentation
4. Open an issue in the repository

---

*Last updated: August 2025*
*Version: 1.0.0*
