# Fly.io Deployment Configuration

## Overview
This document describes the Fly.io deployment setup for the RTPM (Real-time Performance Monitoring) applications.

## Applications
- **rtpm-api-candlefish**: Backend API service
- **rtpm-dashboard-candlefish**: Frontend dashboard

## Token Management

### Storage Locations
1. **AWS Secrets Manager**: `fly-io/api-token` (us-west-2 region)
2. **GitHub Secrets**: `FLY_API_TOKEN` (for GitHub Actions)

### Token Format
The Fly.io token is a long string starting with `FlyV1 fm2_...` and contains two comma-separated parts.

### Updating the Token

#### In AWS Secrets Manager:
```bash
aws secretsmanager update-secret \
  --secret-id "fly-io/api-token" \
  --secret-string "NEW_TOKEN_HERE" \
  --region us-west-2
```

#### In GitHub (for Actions):
```bash
# Use the provided script
./scripts/setup-fly-github-secret.sh

# Or manually with gh CLI
gh secret set FLY_API_TOKEN --body "NEW_TOKEN_HERE"
```

## Deployment Methods

### 1. Local Deployment
```bash
# Deploy all services
./deployment/deploy-to-fly.sh --all

# Deploy API only
./deployment/deploy-to-fly.sh --api

# Deploy Dashboard only
./deployment/deploy-to-fly.sh --dashboard
```

### 2. GitHub Actions
The deployment is triggered automatically on push to main branch when files change in:
- `apps/rtpm-api/**`
- `deployment/rtpm-dashboard/**`
- `.github/workflows/deploy-rtpm.yml`

Manual deployment via GitHub Actions:
```bash
gh workflow run deploy-rtpm.yml
```

## Configuration Files

### Fly.io Configuration
- API: `/deployment/fly/rtpm-api/fly.toml`
- Dashboard: `/deployment/fly/rtpm-dashboard/fly.toml`

### GitHub Actions Workflow
- `.github/workflows/deploy-rtpm.yml`

## Security Notes

1. **Never commit tokens**: The Fly.io API token should never be committed to the repository
2. **Use AWS Secrets Manager**: Always fetch tokens from AWS Secrets Manager in scripts
3. **GitHub Secrets**: For GitHub Actions, ensure the `FLY_API_TOKEN` secret is set
4. **Token Rotation**: Regularly rotate the Fly.io API token for security

## Troubleshooting

### Token Issues
If deployment fails with authentication errors:
1. Verify token in AWS Secrets Manager: 
   ```bash
   aws secretsmanager get-secret-value --secret-id "fly-io/api-token" --region us-west-2
   ```
2. Update GitHub secret if using Actions:
   ```bash
   ./scripts/setup-fly-github-secret.sh
   ```

### Deployment Script Issues
- Ensure AWS CLI is configured with proper credentials
- Check that flyctl is installed (script will auto-install if missing)
- Verify you have permissions to access AWS Secrets Manager

## Related Files
- Deployment script: `/deployment/deploy-to-fly.sh`
- GitHub secret setup: `/scripts/setup-fly-github-secret.sh`
- GitHub workflow: `/.github/workflows/deploy-rtpm.yml`
- API config: `/deployment/fly/rtpm-api/fly.toml`
- Dashboard config: `/deployment/fly/rtpm-dashboard/fly.toml`
