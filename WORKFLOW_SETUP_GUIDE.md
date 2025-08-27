# Workflow Automation Setup Guide

## 📋 Prerequisites Checklist

Before setting up the workflow automation, ensure you have the following:

### Required Tools
- [ ] Git (version 2.28 or higher)
- [ ] GitHub CLI (`gh`) - [Install](https://cli.github.com/)
- [ ] Node.js (version 18 or higher)
- [ ] pnpm (version 8.15.6 or higher)
- [ ] Python (version 3.8 or higher)
- [ ] Docker Desktop - [Install](https://www.docker.com/products/docker-desktop/)
- [ ] AWS CLI - [Install](https://aws.amazon.com/cli/)

### Optional Tools (Recommended)
- [ ] act (for local workflow testing) - [Install](https://github.com/nektos/act)
- [ ] actionlint (workflow linting) - [Install](https://github.com/rhysd/actionlint)
- [ ] Pre-commit framework - Will be installed by setup script

## 🚀 Quick Start

### Step 1: Clone and Navigate
```bash
git clone https://github.com/candlefish-ai/candlefish-ai.git
cd candlefish-ai
```

### Step 2: Run Setup Scripts

#### 2.1 Set up GitHub Secrets
```bash
./scripts/setup-github-secrets.sh setup
```

This will prompt you for:
- AWS credentials (Access Key, Secret Key, Role ARNs)
- Docker Hub credentials
- NPM token (optional)
- Monitoring tokens (Slack, Datadog)
- Security scanning tokens (Snyk, SonarCloud)

#### 2.2 Install Pre-commit Hooks
```bash
./scripts/setup-pre-commit.sh
```

This will:
- Install pre-commit framework
- Set up git hooks
- Install linting tools
- Create commit message template

#### 2.3 Verify Setup
```bash
# Verify GitHub secrets are configured
./scripts/setup-github-secrets.sh verify

# Validate workflow files
./scripts/test-workflows.sh validate
```

## 📦 GitHub Secrets Configuration

### Essential Secrets

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | AWS access key | AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | AWS IAM Console |
| `AWS_ROLE_ARN` | IAM role for staging | AWS IAM Console |
| `AWS_PROD_ROLE_ARN` | IAM role for production | AWS IAM Console |
| `SEMANTIC_RELEASE_TOKEN` | GitHub PAT for releases | [Create PAT](https://github.com/settings/tokens/new?scopes=repo) |

### Optional but Recommended

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `DOCKER_USERNAME` | Docker Hub username | Docker Hub account |
| `DOCKER_PASSWORD` | Docker Hub password | Docker Hub account |
| `NPM_TOKEN` | NPM registry token | `npm token create` |
| `SLACK_WEBHOOK` | Slack notifications | Slack App settings |
| `SNYK_TOKEN` | Security scanning | [Snyk account](https://app.snyk.io/account) |
| `SONAR_TOKEN` | Code quality | [SonarCloud](https://sonarcloud.io/account/security) |
| `CODECOV_TOKEN` | Code coverage | [Codecov](https://codecov.io/) |

### Manual Secret Setup (Alternative)

If you prefer to set secrets manually:

```bash
# Using GitHub CLI
gh secret set AWS_ACCESS_KEY_ID --repo candlefish-ai/candlefish-ai
gh secret set AWS_SECRET_ACCESS_KEY --repo candlefish-ai/candlefish-ai

# List all secrets
gh secret list --repo candlefish-ai/candlefish-ai
```

## 🔧 AWS Configuration

### IAM Role Setup

Create IAM roles with the following trust policy for GitHub Actions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:candlefish-ai/candlefish-ai:*"
        }
      }
    }
  ]
}
```

### Required AWS Permissions

The IAM roles need the following permissions:
- ECS: UpdateService, RegisterTaskDefinition
- ECR: GetAuthorizationToken, PushImage
- CloudWatch: PutMetricData, CreateLogGroup
- S3: PutObject (for artifacts)
- CloudFront: CreateInvalidation

## 🧪 Testing Workflows

### Test Locally with act

```bash
# Install act (macOS)
brew install act

# Test CI/CD workflow locally
./scripts/test-workflows.sh cicd local

# Test security scanning locally
./scripts/test-workflows.sh security local
```

### Test on GitHub

```bash
# Trigger CI/CD workflow
./scripts/test-workflows.sh cicd remote

# Trigger security scan
./scripts/test-workflows.sh security remote

# Watch workflow runs
./scripts/test-workflows.sh watch

# Check workflow status
./scripts/test-workflows.sh status
```

### Manual Workflow Triggers

```bash
# Trigger CI/CD pipeline
gh workflow run security-dashboard-ci-cd.yml \
  --ref main \
  -f environment=staging

# Trigger security scan
gh workflow run security-compliance-scan.yml \
  --ref main \
  -f scan_type=full

# Trigger release
gh workflow run release-automation.yml \
  --ref main \
  -f release_type=patch
```

## 📊 Monitoring Setup

### Slack Integration

1. Create a Slack App: https://api.slack.com/apps
2. Create an Incoming Webhook
3. Add webhook URL as `SLACK_WEBHOOK` secret

### Datadog Integration

1. Sign up for Datadog: https://www.datadoghq.com/
2. Get API and App keys from Account Settings
3. Add as `DATADOG_API_KEY` and `DATADOG_APP_KEY` secrets

### Monitoring Dashboard Access

After deployment, access monitoring at:
- Grafana: https://grafana.candlefish.ai
- CloudWatch: AWS Console
- Datadog: https://app.datadoghq.com/

## 🔐 Security Setup

### Pre-commit Security Checks

The following security checks run automatically:
- Secret detection (detect-secrets)
- Dependency scanning (safety)
- Code security analysis (bandit)
- License compliance checking

### Manual Security Scan

```bash
# Run full security scan
gh workflow run security-compliance-scan.yml \
  --ref main \
  -f scan_type=full

# Check specific areas
gh workflow run security-compliance-scan.yml \
  --ref main \
  -f scan_type=dependencies  # or containers, infrastructure, compliance
```

### Security Baseline

Create a secrets baseline to prevent false positives:
```bash
detect-secrets scan --baseline .secrets.baseline
```

## 🚢 Deployment

### Staging Deployment

Automatic deployment on merge to `develop`:
```bash
git checkout develop
git merge feature/your-feature
git push origin develop
# Workflow automatically deploys to staging
```

### Production Deployment

Automatic deployment on merge to `main`:
```bash
git checkout main
git merge develop
git push origin main
# Workflow automatically deploys to production
```

### Manual Deployment

```bash
# Deploy to specific environment
gh workflow run security-dashboard-ci-cd.yml \
  --ref main \
  -f environment=production
```

## 📦 Release Process

### Automatic Semantic Release

On push to `main`, semantic-release automatically:
1. Analyzes commits
2. Determines version bump
3. Creates changelog
4. Tags release
5. Publishes to registries

### Manual Release

```bash
# Create patch release (1.2.3 -> 1.2.4)
gh workflow run release-automation.yml \
  --ref main \
  -f release_type=patch

# Create minor release (1.2.3 -> 1.3.0)
gh workflow run release-automation.yml \
  --ref main \
  -f release_type=minor

# Create major release (1.2.3 -> 2.0.0)
gh workflow run release-automation.yml \
  --ref main \
  -f release_type=major
```

## 🐛 Troubleshooting

### Common Issues

#### Issue: Workflow fails with "Resource not accessible by integration"
**Solution**: Check GitHub token permissions
```bash
gh auth refresh -h github.com -s admin:repo_hook,repo,workflow
```

#### Issue: AWS deployment fails
**Solution**: Verify AWS credentials and permissions
```bash
aws sts get-caller-identity
aws ecs describe-services --cluster production-cluster --services security-dashboard
```

#### Issue: Docker push fails
**Solution**: Verify Docker credentials
```bash
docker login
echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
```

#### Issue: Pre-commit hooks fail
**Solution**: Fix issues or skip temporarily
```bash
# Fix automatically fixable issues
pre-commit run --all-files

# Skip hooks in emergency (not recommended)
git commit --no-verify
```

### Debug Workflows

```bash
# View workflow runs
gh run list --workflow=security-dashboard-ci-cd.yml

# View specific run details
gh run view <run-id>

# Download workflow logs
gh run download <run-id>

# Re-run failed workflow
gh run rerun <run-id>
```

### Check Logs

```bash
# View CloudWatch logs
aws logs tail /ecs/security-dashboard --follow

# View GitHub Actions logs
gh run view --log

# View local act logs
act -v push
```

## 📚 Additional Resources

### Documentation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Release Guide](https://semantic-release.gitbook.io/)
- [Pre-commit Documentation](https://pre-commit.com/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)

### Workflow Files
- CI/CD Pipeline: `.github/workflows/security-dashboard-ci-cd.yml`
- Security Scanning: `.github/workflows/security-compliance-scan.yml`
- Monitoring: `.github/workflows/monitoring-alerting.yml`
- Release: `.github/workflows/release-automation.yml`

### Configuration Files
- Pre-commit: `.pre-commit-config.yaml`
- Semantic Release: `.releaserc.js`
- Docker: `deployment/docker/Dockerfile.security-dashboard-frontend`

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] GitHub secrets are configured (`./scripts/setup-github-secrets.sh verify`)
- [ ] Pre-commit hooks trigger on commit
- [ ] Workflows pass validation (`./scripts/test-workflows.sh validate`)
- [ ] Can trigger workflows manually
- [ ] Slack notifications are received (if configured)
- [ ] Security scans complete successfully
- [ ] Staging deployment works
- [ ] Monitoring endpoints are accessible

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review workflow logs in GitHub Actions
3. Check the [implementation guide](WORKFLOW_AUTOMATION_IMPLEMENTATION.md)
4. Contact the DevOps team at devops@candlefish.ai
5. Open an issue in the repository

---

*Last Updated: 2025-08-26*
*Version: 1.0.0*