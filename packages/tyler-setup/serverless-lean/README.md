# Candlefish Employee Setup - Production Ready Backend

A secure, scalable, and cost-optimized serverless backend for employee onboarding and secrets management, designed for teams of 5-20 people with a target cost of $50-100/month.

## 🚀 Features

### Security
- **JWT Authentication** with secure token management via AWS Secrets Manager
- **Argon2 Password Hashing** - Industry standard password security
- **Role-based Access Control** (RBAC) with granular permissions
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive sanitization using Joi
- **Security Headers** - OWASP recommended headers
- **Audit Logging** - Complete trail of all security events

### Architecture
- **Serverless-first** - AWS Lambda + API Gateway for cost efficiency
- **DynamoDB** - Pay-per-request scaling with built-in encryption
- **AWS Secrets Manager** - Secure credential storage with rotation
- **CloudWatch** - Comprehensive monitoring and alerting
- **Multi-environment** - Development, staging, and production ready

### Developer Experience
- **OpenAPI Specification** - Complete API documentation
- **Comprehensive Testing** - Unit tests with 80%+ coverage
- **Type Safety** - Full input validation and sanitization
- **Automated Deployment** - One-command deployment with validation
- **Monitoring Dashboard** - Real-time metrics and alerts

## 📋 Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate permissions
- Serverless Framework v3.38+
- Docker (for local development)

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   cd /Users/patricksmith/candlefish-ai/packages/tyler-setup/serverless-lean
   npm install
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure
   ```

3. **Deploy to development environment:**
   ```bash
   ./scripts/deploy.sh dev --test
   ```

## 🏗️ Architecture Overview

### API Endpoints

```
GET    /health              - System health check
POST   /auth/login          - User authentication
POST   /auth/refresh        - Token refresh
POST   /auth/logout         - User logout
GET    /users               - List users
POST   /users               - Create user
GET    /users/{id}          - Get user details
PUT    /users/{id}          - Update user
DELETE /users/{id}          - Delete user
GET    /secrets             - List secrets
POST   /secrets             - Create secret
GET    /secrets/{name}      - Get secret value
PUT    /secrets/{name}      - Update secret
DELETE /secrets/{name}      - Delete secret
GET    /contractors/access/{token} - Contractor access
POST   /contractors/invite  - Invite contractor
POST   /contractors/revoke/{id} - Revoke contractor access
GET    /config              - Get configuration
PUT    /config              - Update configuration
GET    /audit               - Get audit logs
```

### AWS Resources

- **11 Lambda Functions** - Optimized for cost and performance
- **5 DynamoDB Tables** - Users, contractors, audit, config, refresh tokens
- **API Gateway** - RESTful API with custom authorizer
- **CloudWatch Alarms** - Monitoring and alerting
- **SNS Topic** - Alert notifications
- **S3 Bucket** - Static frontend hosting

## 🔒 Security Features

### Authentication Flow

1. **Login** - Email/password → JWT + refresh token
2. **Token Validation** - Custom authorizer validates JWT on each request
3. **Token Refresh** - Refresh token → new JWT (token rotation)
4. **Logout** - Revokes refresh token

### Role-Based Access Control

- **Admin** - Full access to all resources
- **Manager** - Limited admin access (no user deletion, config changes)
- **Employee** - Read access to own data and authorized secrets
- **Contractor** - Temporary, limited access to specific secrets

### Rate Limiting

- Authentication endpoints: 5 requests/15 minutes per IP
- General API endpoints: 100 requests/15 minutes per IP
- Secrets endpoints: 20 requests/5 minutes per IP

## 🧪 Testing

Run the complete test suite:

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# CI mode (for deployment)
npm run test:ci
```

### Test Coverage Requirements

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## 🚀 Deployment

### Development Environment

```bash
./scripts/deploy.sh dev --test
```

### Staging Environment

```bash
./scripts/deploy.sh staging --test
```

### Production Environment

```bash
./scripts/deploy.sh prod --test --validate
```

### Deployment Features

- **Automated Testing** - Runs full test suite before production deployment
- **Configuration Validation** - Validates serverless.yml and environment
- **Secret Management** - Automatically creates JWT secrets if missing
- **Health Checks** - Validates deployment with API tests
- **Rollback Ready** - CloudFormation stack management
- **Deployment Reports** - Generates detailed deployment logs

## 📊 Monitoring

### CloudWatch Dashboards

Access the monitoring dashboard:
1. AWS Console → CloudWatch → Dashboards
2. Select: `candlefish-employee-setup-lean-[stage]-monitoring`

### Key Metrics

- API Gateway request count and error rates
- Lambda function duration and error rates
- DynamoDB read/write consumption
- Authentication success/failure rates
- Rate limiting events
- Health check status

### Alerts

Configured CloudWatch alarms for:
- API Gateway 4XX/5XX error rates
- Lambda function errors and timeouts
- DynamoDB throttling
- Authentication failures
- Rate limit exceeded events
- Health check failures

## 💰 Cost Optimization

### Current Architecture Costs (Estimated)

**Development Environment:** ~$15-25/month
- Lambda: ~$5/month (1M requests)
- DynamoDB: ~$8/month (pay-per-request)
- API Gateway: ~$7/month (1M requests)
- CloudWatch: ~$3/month
- Secrets Manager: ~$2/month

**Production Environment:** ~$50-100/month
- Lambda: ~$15-30/month
- DynamoDB: ~$20-40/month
- API Gateway: ~$10-20/month
- CloudWatch: ~$5-10/month

### Cost Optimization Features

- **Pay-per-request DynamoDB** - No minimum costs
- **Lambda memory optimization** - 512MB for cost/performance balance
- **Reserved concurrency limits** - Prevents runaway costs
- **CloudWatch log retention** - 14 days to minimize storage costs
- **Efficient bundling** - Webpack optimization reduces cold starts

## 🔧 Configuration

### Environment Variables

```yaml
SECRETS_PREFIX: candlefish-employee-setup-lean-${stage}
ENABLE_CONTRACTOR_ACCESS: true
MAX_TEAM_SIZE: 20
CORS_ORIGIN: https://your-frontend-domain.com
```

### DynamoDB Tables

1. **Users** - Employee accounts and authentication
2. **Contractors** - Temporary contractor access tokens
3. **Audit** - Security and activity audit trail
4. **Config** - System configuration settings
5. **Refresh Tokens** - JWT refresh token management

### Secrets Manager

- **JWT Secret** - Secure token signing key (auto-created)
- **Database Credentials** - If using RDS (optional)
- **Third-party API Keys** - External service integrations

## 🐛 Troubleshooting

### Common Issues

1. **Deployment Fails**
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity
   
   # Validate configuration
   ./scripts/deploy.sh dev --validate
   ```

2. **Authentication Errors**
   ```bash
   # Check JWT secret exists
   aws secretsmanager get-secret-value --secret-id "candlefish-employee-setup-lean-dev/jwt-secret"
   ```

3. **CORS Issues**
   - Update `CORS_ORIGIN` environment variable
   - Check frontend domain configuration

4. **Rate Limiting**
   - Monitor CloudWatch logs for rate limit events
   - Adjust limits in `src/utils/security.js`

### Debugging

```bash
# View function logs
serverless logs -f auth --stage dev --tail

# Test individual functions locally
serverless invoke local -f health

# Run offline for development
npm run dev
```

## 📈 Scaling Considerations

### Current Limits

- **API Gateway**: 10,000 requests/second (default)
- **Lambda Concurrent Executions**: 1,000 (default)
- **DynamoDB**: 40,000 read/write requests/second per table

### Scaling Strategies

1. **Horizontal Scaling**
   - Lambda auto-scales based on demand
   - DynamoDB auto-scales with on-demand pricing

2. **Performance Optimization**
   - Connection pooling for DynamoDB
   - Lambda memory optimization
   - API Gateway caching

3. **Cost Management**
   - Monitor usage with CloudWatch
   - Set up billing alerts
   - Review and optimize resource allocation monthly

## 🤝 Contributing

1. **Development Setup**
   ```bash
   npm install
   npm run dev  # Start offline development server
   npm run test:watch  # Run tests in watch mode
   ```

2. **Code Standards**
   - ES6+ JavaScript with modules
   - JSDoc comments for functions
   - 80%+ test coverage required
   - ESLint for code formatting

3. **Pull Request Process**
   - All tests must pass
   - Update documentation if needed
   - Add tests for new features
   - Follow semantic versioning

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: [API Specification](./docs/api-spec.yml)
- **Issues**: Create GitHub issues for bugs and feature requests
- **Email**: support@candlefish.ai

---

Built with ❤️ by the Candlefish AI team for secure, scalable employee onboarding.