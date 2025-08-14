# Enterprise Deployment Instructions for Candlefish Organization

## 🚀 Repository Migration to Candlefish Organization

This document provides step-by-step instructions for migrating the Apollo GraphOS Paintbox federation to the Candlefish enterprise GitHub organization.

## Prerequisites

- Admin access to the Candlefish GitHub organization
- GitHub CLI (`gh`) installed and authenticated
- Access to create repositories in the organization

## Step 1: Create Repository in Candlefish Organization

### Option A: Using GitHub Web Interface

1. Go to https://github.com/organizations/candlefish-ai/repositories/new
2. Repository settings:
   - **Name**: `apollo-graphos-paintbox`
   - **Description**: `Apollo GraphOS federation for Paintbox - Enterprise paint estimation platform`
   - **Visibility**: Private
   - **Initialize**: Do NOT initialize with README (we have existing code)
3. Click "Create repository"

### Option B: Using GitHub CLI (requires org admin permissions)

```bash
gh repo create candlefish-ai/apollo-graphos-paintbox \
  --private \
  --description "Apollo GraphOS federation for Paintbox - Enterprise paint estimation platform"
```

## Step 2: Update Local Repository Remote

From the `apollo-graphos-demo` directory:

```bash
cd ~/apollo-graphos-demo

# Remove old remote (if exists)
git remote remove origin

# Add new Candlefish organization remote
git remote add origin https://github.com/candlefish-ai/apollo-graphos-paintbox.git

# Verify remote
git remote -v
```

## Step 3: Push Code to Candlefish Repository

```bash
# Push all branches and tags
git push -u origin main
git push --all origin
git push --tags origin
```

## Step 4: Configure GitHub Secrets

Add the following secrets to the repository settings:

1. Go to: `https://github.com/candlefish-ai/apollo-graphos-paintbox/settings/secrets/actions`
2. Add these repository secrets:

### Required Secrets

| Secret Name | Value | Description |
|------------|-------|-------------|
| `APOLLO_KEY` | `user:gh.a8534bae-93f6-433e-9f32-d7e4808f467c:hT3f6BaKm7EsguGwmmulRQ` | Apollo GraphOS API key |
| `AWS_REGION` | `us-west-2` | AWS deployment region |
| `AWS_ACCESS_KEY_ID` | (your AWS key) | AWS access key for deployments |
| `AWS_SECRET_ACCESS_KEY` | (your AWS secret) | AWS secret key for deployments |
| `SALESFORCE_CLIENT_ID` | (your Salesforce ID) | Salesforce OAuth client ID |
| `SALESFORCE_CLIENT_SECRET` | (your Salesforce secret) | Salesforce OAuth secret |
| `COMPANYCAM_API_TOKEN` | (your Company Cam token) | Company Cam API token |

### Using GitHub CLI to Add Secrets

```bash
cd ~/apollo-graphos-demo

# Apollo GraphOS key
echo "user:gh.a8534bae-93f6-433e-9f32-d7e4808f467c:hT3f6BaKm7EsguGwmmulRQ" | \
  gh secret set APOLLO_KEY --repo candlefish-ai/apollo-graphos-paintbox

# AWS Region
echo "us-west-2" | \
  gh secret set AWS_REGION --repo candlefish-ai/apollo-graphos-paintbox

# Add other secrets as needed...
```

## Step 5: Update Repository Settings

### Enable GitHub Actions

1. Go to: `https://github.com/candlefish-ai/apollo-graphos-paintbox/settings/actions`
2. Ensure "Actions permissions" is set to "Allow all actions and reusable workflows"

### Branch Protection Rules

1. Go to: `https://github.com/candlefish-ai/apollo-graphos-paintbox/settings/branches`
2. Add rule for `main` branch:
   - Require pull request reviews before merging
   - Require status checks to pass (CI)
   - Require branches to be up to date

### Add Team Access

1. Go to: `https://github.com/candlefish-ai/apollo-graphos-paintbox/settings/access`
2. Add relevant teams with appropriate permissions:
   - Engineering team: Write access
   - DevOps team: Admin access

## Step 6: Verify Deployment

### Check GitHub Actions

```bash
# View workflow runs
gh run list --repo candlefish-ai/apollo-graphos-paintbox

# Watch latest run
gh run watch --repo candlefish-ai/apollo-graphos-paintbox
```

### Test Federation Locally

```bash
cd ~/apollo-graphos-demo

# Start services
npm run dev:estimates  # Port 4002
npm run dev:router     # Port 4100

# Test query
curl -X POST http://localhost:4100/ \
  -H "Content-Type: application/json" \
  -d '{"query":"query { estimate(id: \"1\") { id status } }"}'
```

## Step 7: Deploy to Staging

Once the repository is in the Candlefish organization:

```bash
# Create staging branch
git checkout -b staging
git push -u origin staging

# This will trigger the staging deployment workflow
```

## Step 8: Production Deployment

After staging validation:

```bash
# Merge to main for production deployment
git checkout main
git merge staging
git push origin main

# Monitor deployment
gh workflow view "Deploy to Production" --repo candlefish-ai/apollo-graphos-paintbox
```

## 🔗 Quick Commands for Migration

```bash
# Complete migration script
cd ~/apollo-graphos-demo

# Update remote
git remote set-url origin https://github.com/candlefish-ai/apollo-graphos-paintbox.git

# Push to new repo
git push -u origin main

# Set secrets (requires repo access)
cat ~/.config/rover/.key | gh secret set APOLLO_KEY --repo candlefish-ai/apollo-graphos-paintbox
echo "us-west-2" | gh secret set AWS_REGION --repo candlefish-ai/apollo-graphos-paintbox
```

## 📋 Post-Migration Checklist

- [ ] Repository created in Candlefish organization
- [ ] Code pushed to new repository
- [ ] GitHub Secrets configured
- [ ] GitHub Actions enabled
- [ ] Branch protection rules set
- [ ] Team access configured
- [ ] CI/CD pipelines verified
- [ ] Staging deployment tested
- [ ] Production deployment ready

## 🆘 Troubleshooting

### Permission Issues
If you encounter permission errors:
1. Ensure you have write access to the Candlefish organization
2. Check your GitHub token has the required scopes: `repo`, `workflow`, `admin:org`

### CI/CD Failures
1. Verify all secrets are properly set
2. Check workflow logs: `gh run view <run-id> --log`
3. Ensure AWS credentials have necessary permissions

### Federation Issues
1. Verify all subgraph services are running
2. Check Apollo Router logs
3. Validate schema composition: `rover supergraph compose`

## 📞 Support

For assistance with the migration:
- GitHub organization admin: Request access to create repositories
- DevOps team: AWS credentials and infrastructure setup
- Engineering team: Application configuration and testing

---

*Document created for Candlefish enterprise deployment*
*Last updated: August 14, 2025*
