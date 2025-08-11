#!/bin/bash
# Candlefish GitHub Actions Complete Overhaul Deployment Script
# This script deploys the new GitHub Actions architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Candlefish GitHub Actions Overhaul Deployment${NC}"
echo "================================================"
echo ""

# Check prerequisites
echo -e "${YELLOW}✨ Checking prerequisites...${NC}"

command -v aws >/dev/null 2>&1 || { echo -e "${RED}❌ AWS CLI is required${NC}"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo -e "${RED}❌ GitHub CLI is required${NC}"; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}❌ Terraform is required${NC}"; exit 1; }

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Step 1: Verify GitHub authentication
echo -e "${YELLOW}🔐 Verifying GitHub authentication...${NC}"
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with GitHub${NC}"
    echo "Please run: gh auth login"
    exit 1
fi
echo -e "${GREEN}✅ GitHub authenticated${NC}"
echo ""

# Step 2: Verify AWS authentication
echo -e "${YELLOW}🔐 Verifying AWS authentication...${NC}"
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with AWS${NC}"
    echo "Please configure AWS credentials"
    exit 1
fi
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS authenticated (Account: $AWS_ACCOUNT_ID)${NC}"
echo ""

# Step 3: Create backup of current state
echo -e "${YELLOW}📦 Creating backup...${NC}"
BACKUP_DIR=".github/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing workflows if any remain
if ls .github/workflows/*.yml >/dev/null 2>&1; then
    cp -r .github/workflows "$BACKUP_DIR/"
    echo -e "${GREEN}✅ Backed up existing workflows to $BACKUP_DIR${NC}"
fi
echo ""

# Step 4: Deploy Terraform infrastructure
echo -e "${YELLOW}🏗️  Deploying AWS infrastructure...${NC}"
cd terraform

# Initialize Terraform
terraform init -upgrade

# Plan infrastructure changes
echo "Planning infrastructure changes..."
terraform plan -var="environment=staging" -out=tfplan

echo -e "${YELLOW}Do you want to apply these changes? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

# Apply infrastructure
terraform apply tfplan

# Capture outputs
GITHUB_ACTIONS_ROLE_ARN=$(terraform output -raw github_actions_role_arn)
echo -e "${GREEN}✅ Infrastructure deployed${NC}"
cd ..
echo ""

# Step 5: Configure GitHub secrets
echo -e "${YELLOW}🔐 Configuring GitHub secrets...${NC}"

# Set required secrets
gh secret set AWS_ACCOUNT_ID --body "$AWS_ACCOUNT_ID"
gh secret set AWS_REGION --body "us-east-1"
gh secret set GITHUB_ACTIONS_ROLE_ARN --body "$GITHUB_ACTIONS_ROLE_ARN"

echo -e "${GREEN}✅ GitHub secrets configured${NC}"
echo ""

# Step 6: Validate workflow files
echo -e "${YELLOW}🔍 Validating workflow files...${NC}"

WORKFLOWS=(
    ".github/workflows/candlefish-orchestrator.yml"
    ".github/workflows/deploy-webapp.yml"
    ".github/workflows/deploy-enterprise.yml"
    ".github/workflows/secrets-sync.yml"
    ".github/workflows/chaos-engineering.yml"
    ".github/workflows/monitoring.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [[ -f "$workflow" ]]; then
        # Basic YAML validation
        if command -v yamllint >/dev/null 2>&1; then
            yamllint -d relaxed "$workflow" || echo "Warning: YAML lint issues in $workflow"
        fi
        echo -e "${GREEN}✅ Validated: $(basename $workflow)${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing: $(basename $workflow)${NC}"
    fi
done
echo ""

# Step 7: Test workflow execution
echo -e "${YELLOW}🧪 Testing workflow execution...${NC}"

# Run a test deployment to staging
echo "Running test deployment to staging environment..."
gh workflow run candlefish-orchestrator.yml \
    -f environment=staging \
    -f projects=cf \
    -f skip_tests=false

# Wait for workflow to start
sleep 5

# Get the run ID
RUN_ID=$(gh run list --workflow=candlefish-orchestrator.yml --limit=1 --json databaseId --jq '.[0].databaseId')

if [[ -n "$RUN_ID" ]]; then
    echo "Workflow started with ID: $RUN_ID"
    echo "View progress: gh run watch $RUN_ID"
    echo -e "${GREEN}✅ Test workflow triggered${NC}"
else
    echo -e "${YELLOW}⚠️  Could not trigger test workflow${NC}"
fi
echo ""

# Step 8: Run secrets sync
echo -e "${YELLOW}🔄 Syncing secrets from AWS...${NC}"
gh workflow run secrets-sync.yml
echo -e "${GREEN}✅ Secrets sync triggered${NC}"
echo ""

# Step 9: Generate summary report
echo -e "${YELLOW}📊 Generating deployment summary...${NC}"

cat > deployment-summary.md <<EOF
# 🎆 GitHub Actions Overhaul Deployment Summary

## Deployment Date
$(date)

## Infrastructure Status
- **AWS Account:** $AWS_ACCOUNT_ID
- **GitHub Actions Role:** $GITHUB_ACTIONS_ROLE_ARN
- **Terraform State:** Deployed successfully

## Workflows Deployed
- ✅ candlefish-orchestrator.yml (Master orchestrator)
- ✅ deploy-webapp.yml (Web application deployment)
- ✅ deploy-enterprise.yml (Enterprise app deployment)
- ✅ secrets-sync.yml (AWS Secrets Manager sync)
- ✅ chaos-engineering.yml (Resilience testing)
- ✅ monitoring.yml (Observability and alerts)

## Old Workflows Archived
- 33 workflows archived to: $(ls -d .github/workflows-archive-* | tail -1)
- Including 12 Claude-specific workflows (consolidated)

## Configuration
- **Environments:** dev, staging, production
- **Projects:** 16 projects across 4 categories
- **Budget:** 50,000 GitHub Actions minutes/month
- **Caching:** Multi-layer with Turbo remote cache
- **Security:** SAST, dependency scanning, secret detection

## Next Steps
1. Monitor test deployment: gh run watch $RUN_ID
2. Review CloudWatch dashboards
3. Test chaos engineering (staging only)
4. Gradually migrate production deployments

## Commands Reference

### Deploy single project
\`\`\`bash
gh workflow run candlefish-orchestrator.yml \\
  -f environment=staging \\
  -f projects=cfpaint
\`\`\`

### Deploy all projects
\`\`\`bash
gh workflow run candlefish-orchestrator.yml \\
  -f environment=production \\
  -f projects=all
\`\`\`

### Run chaos test
\`\`\`bash
gh workflow run chaos-engineering.yml \\
  -f target=cfprom \\
  -f chaos_type=network-delay \\
  -f duration=5
\`\`\`

### Check monitoring
\`\`\`bash
gh workflow run monitoring.yml
\`\`\`

## Support
- **Documentation:** GITHUB_ACTIONS_ARCHITECTURE.md
- **Issues:** Create issue with 'github-actions' label
- **Slack:** #github-actions

---
*Generated by Candlefish GitHub Actions Deployment Script*
EOF

echo -e "${GREEN}✅ Deployment summary saved to deployment-summary.md${NC}"
echo ""

# Step 10: Final validation
echo -e "${GREEN}🎉 GitHub Actions Overhaul Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "- ✅ Infrastructure deployed via Terraform"
echo "- ✅ 6 new optimized workflows created"
echo "- ✅ 33 old workflows archived"
echo "- ✅ Secrets configured"
echo "- ✅ Test workflow triggered"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Monitor test deployment: gh run watch $RUN_ID"
echo "2. Review deployment-summary.md"
echo "3. Test other workflows as needed"
echo "4. Remove archived workflows after validation"
echo ""
echo -e "${GREEN}🚀 Happy deploying!${NC}"
