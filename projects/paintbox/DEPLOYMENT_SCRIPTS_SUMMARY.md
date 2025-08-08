# 🎨 Paintbox Render Deployment Scripts Summary

This document provides a quick reference for all the deployment scripts created for the Paintbox application's Render.com deployment system.

## 📂 Script Files

| Script                               | Purpose                           | Type    | Key Features                                       |
| ------------------------------------ | --------------------------------- | ------- | -------------------------------------------------- |
| **`render-deploy.sh`**               | Master deployment script          | Bash    | Main entry point, workflow orchestration           |
| **`deploy-render-comprehensive.sh`** | Complete deployment pipeline      | Bash    | Full deployment with validation & health checks    |
| **`fetch-render-secrets.js`**        | AWS Secrets Manager integration   | Node.js | Secret fetching, validation, environment setup     |
| **`validate-render-config.js`**      | Pre-deployment validation         | Node.js | Configuration, dependencies, connectivity checks   |
| **`health-check-render.js`**         | Post-deployment health validation | Node.js | Endpoint testing, performance, security checks     |
| **`monitor-render-deployment.js`**   | Continuous monitoring & rollback  | Node.js | Real-time monitoring, alerting, automated rollback |

## 🚀 Quick Commands

### Essential Deployment Commands

```bash
# Full deployment workflow (recommended)
npm run deploy:render

# Individual steps
npm run deploy:validate        # Validate configuration
npm run deploy:secrets         # Fetch AWS secrets
./scripts/deploy-render-comprehensive.sh  # Deploy
npm run deploy:health          # Health check
npm run deploy:monitor         # Start monitoring

# Monitoring & maintenance
npm run deploy:status          # Check service status
npm run deploy:logs            # View service logs
npm run deploy:rollback        # Emergency rollback
```

### Direct Script Usage

```bash
# Master script (simplest interface)
./scripts/render-deploy.sh COMMAND [OPTIONS]

# Available commands:
./scripts/render-deploy.sh validate       # Validate config
./scripts/render-deploy.sh secrets        # Fetch secrets
./scripts/render-deploy.sh deploy         # Deploy app
./scripts/render-deploy.sh health         # Health check
./scripts/render-deploy.sh monitor        # Start monitoring
./scripts/render-deploy.sh rollback       # Rollback
./scripts/render-deploy.sh status         # Check status
./scripts/render-deploy.sh logs           # View logs
./scripts/render-deploy.sh full           # Complete workflow
```

## 📋 Script Details

### 1. Master Script (`render-deploy.sh`)

**Purpose:** Main entry point that orchestrates all deployment operations

**Key Features:**

- ✅ Unified interface for all deployment operations
- ✅ Automatic prerequisite checking
- ✅ Color-coded output and logging
- ✅ Built-in help and documentation
- ✅ Error handling and validation

**Usage Examples:**

```bash
./scripts/render-deploy.sh full --verbose     # Full deployment with detailed output
./scripts/render-deploy.sh validate --comprehensive  # Thorough validation
./scripts/render-deploy.sh monitor --watch    # Continuous monitoring
```

### 2. Comprehensive Deployment (`deploy-render-comprehensive.sh`)

**Purpose:** Complete deployment pipeline with all safety checks

**Key Features:**

- ✅ Automatic dependency installation (Render CLI, AWS CLI, jq)
- ✅ AWS credentials detection (Infisical, environment variables, AWS CLI)
- ✅ Secret fetching from AWS Secrets Manager
- ✅ Environment variable validation
- ✅ Application build with error checking
- ✅ Render authentication and deployment
- ✅ Deployment monitoring with timeout handling
- ✅ Post-deployment health checks
- ✅ Cleanup and error recovery

**Usage Examples:**

```bash
./scripts/deploy-render-comprehensive.sh                    # Standard deployment
./scripts/deploy-render-comprehensive.sh --dry-run          # Preview only
./scripts/deploy-render-comprehensive.sh --service my-app   # Custom service
./scripts/deploy-render-comprehensive.sh --skip-build      # Skip build step
```

### 3. Secrets Management (`fetch-render-secrets.js`)

**Purpose:** Secure integration with AWS Secrets Manager

**Key Features:**

- ✅ AWS Secrets Manager integration
- ✅ Multiple output formats (env, render config, both)
- ✅ Secret validation and format checking
- ✅ Support for nested JSON secret structures
- ✅ Fallback handling for missing secrets
- ✅ Environment variable generation
- ✅ Render configuration generation

**Secret Structure Support:**

```json
{
  "anthropic": { "apiKey": "sk-ant-..." },
  "companyCam": { "apiToken": "cc_...", "companyId": "12345" },
  "salesforce": { "clientId": "...", "clientSecret": "...", ... }
}
```

**Usage Examples:**

```bash
node scripts/fetch-render-secrets.js                      # Basic fetch
node scripts/fetch-render-secrets.js --output-format both # Multiple outputs
node scripts/fetch-render-secrets.js --validate-only      # Validation only
node scripts/fetch-render-secrets.js --secret-name custom # Custom secret
```

### 4. Configuration Validation (`validate-render-config.js`)

**Purpose:** Comprehensive pre-deployment validation

**Validation Categories:**

- 📁 **Files:** Required files, package.json, dependencies
- ⚙️ **Configuration:** render.yaml, service settings, build commands
- 🔑 **Environment:** Required variables, format validation
- 🌐 **Connectivity:** External service availability (optional)
- 🔨 **Build:** Build process validation (optional)

**Usage Examples:**

```bash
node scripts/validate-render-config.js                    # Basic validation
node scripts/validate-render-config.js --check-connectivity # Include network tests
node scripts/validate-render-config.js --validate-build   # Include build test
node scripts/validate-render-config.js --verbose          # Detailed output
```

### 5. Health Checks (`health-check-render.js`)

**Purpose:** Comprehensive post-deployment health validation

**Test Categories:**

- 🔗 **Endpoints:** API availability, response codes, content validation
- ⚡ **Performance:** Response times, first byte time, load performance
- 🔌 **Integrations:** External service connectivity (Salesforce, CompanyCam, Anthropic)
- 🔒 **Security:** HTTPS enforcement, security headers

**Health Check Endpoints:**

```
/                           # Main application page
/api/health                 # Basic health check
/api/v1/calculate          # Calculation engine
/api/v1/companycam/test    # CompanyCam integration
/api/v1/salesforce/search  # Salesforce integration
```

**Usage Examples:**

```bash
node scripts/health-check-render.js                       # Basic health check
node scripts/health-check-render.js --comprehensive       # All tests
node scripts/health-check-render.js --url https://my-app.com # Custom URL
node scripts/health-check-render.js --verbose             # Detailed output
```

### 6. Monitoring & Rollback (`monitor-render-deployment.js`)

**Purpose:** Real-time deployment monitoring with automated recovery

**Monitoring Features:**

- 🔍 **Real-time Tracking:** Deployment status monitoring every 30 seconds
- ❤️ **Health Monitoring:** Automated health checks with failure tracking
- 📊 **Performance Metrics:** Response time and error rate monitoring
- 🚨 **Alerting:** Automatic alerts for failures and performance issues
- ↩️ **Automated Rollback:** Intelligent rollback on critical failures
- 📝 **Comprehensive Logging:** Detailed logs with JSON output

**Monitoring Thresholds:**

- Response Time: 5 seconds maximum
- Error Rate: 10% maximum
- Consecutive Failures: 3 triggers rollback consideration

**Usage Examples:**

```bash
node scripts/monitor-render-deployment.js                 # One-time status check
node scripts/monitor-render-deployment.js --monitor       # Continuous monitoring
node scripts/monitor-render-deployment.js --rollback      # Emergency rollback
node scripts/monitor-render-deployment.js --watch --verbose # Detailed monitoring
```

## 🔧 Configuration Files

### `render.yaml`

Comprehensive Render service configuration with:

- Multi-service setup (web app, WebSocket, Redis, PostgreSQL)
- Environment variable management
- Health check configuration
- Performance optimization settings
- Scaling and resource allocation

### `.env.render`

Generated environment file containing:

- AWS Secrets Manager secrets
- Service configuration
- Fixed environment variables
- Performance settings

## 🛡️ Security Features

- ✅ **AWS Secrets Manager Integration:** Secure secret storage and retrieval
- ✅ **Environment Variable Validation:** Format and content checking
- ✅ **HTTPS Enforcement:** Security header validation
- ✅ **Access Control:** Service-level IP restrictions
- ✅ **Credential Isolation:** No secrets in code or logs
- ✅ **Automated Cleanup:** Temporary file removal

## 📊 Monitoring & Alerting

### Health Check Categories

1. **Critical:** Basic application availability
2. **Performance:** Response time and load metrics
3. **Integration:** External service connectivity
4. **Security:** HTTPS and security headers

### Alert Types

- **Deployment Failures:** Build or deploy errors
- **Health Check Failures:** Application unavailability
- **Performance Degradation:** Slow response times
- **Security Issues:** Missing security headers

### Recovery Actions

- **Automatic Retry:** Failed operations with exponential backoff
- **Health Check Monitoring:** Continuous validation post-deployment
- **Automated Rollback:** Intelligent rollback on critical failures
- **Alert Notifications:** File-based alerts (extensible to Slack, email, etc.)

## 🚀 Deployment Workflow

### Standard Deployment

```bash
1. npm run deploy:validate     # Pre-deployment validation
2. npm run deploy:secrets      # Fetch and configure secrets
3. npm run deploy:render       # Deploy application
4. npm run deploy:health       # Post-deployment validation
5. npm run deploy:monitor      # Start monitoring
```

### Emergency Rollback

```bash
npm run deploy:rollback        # Immediate rollback to previous version
```

### Continuous Monitoring

```bash
npm run deploy:monitor         # Start continuous monitoring
npm run deploy:status          # Check current status
npm run deploy:logs            # View service logs
```

## 📚 Additional Resources

- **`RENDER_DEPLOYMENT_GUIDE.md`:** Complete deployment documentation
- **`render.yaml`:** Service configuration reference
- **`package.json`:** NPM script definitions
- **Render CLI Documentation:** <https://render.com/docs/cli>
- **AWS Secrets Manager:** <https://aws.amazon.com/secrets-manager/>

---

This deployment system provides enterprise-grade reliability with automated monitoring, health checks, and rollback capabilities for the Paintbox application on Render.com. 🎨
