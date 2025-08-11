#!/bin/bash

# Complete GitHub Actions Setup Script
# This script finalizes the GitHub Actions configuration

set -e

echo "🚀 Complete GitHub Actions Setup"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Step 1: Check current workflow status
echo "📊 Checking current workflow status..."
echo ""
gh run list --limit 5
echo ""

# Step 2: Configure secrets
echo "🔐 Step 1: Configure GitHub Secrets"
echo "------------------------------------"
echo ""
echo "We need to add the following secrets for full functionality:"
echo ""
echo "1. CODECOV_TOKEN - Code coverage reporting"
echo "2. SNYK_TOKEN - Security vulnerability scanning"
echo "3. SLACK_WEBHOOK - Team notifications"
echo "4. NVD_API_KEY - Dependency vulnerability database"
echo ""
echo "Would you like to add these secrets now? (y/n)"
read -r add_secrets

if [ "$add_secrets" = "y" ]; then
    # CODECOV_TOKEN
    echo ""
    echo "📊 CODECOV_TOKEN Setup"
    echo "1. Visit: https://app.codecov.io/gh/aspenas/candlefish-ai/settings"
    echo "2. Sign in with GitHub"
    echo "3. Copy the repository upload token"
    echo -n "Enter CODECOV_TOKEN (or press Enter to skip): "
    read -s codecov_token
    echo ""

    if [ -n "$codecov_token" ]; then
        echo "$codecov_token" | gh secret set CODECOV_TOKEN
        print_success "CODECOV_TOKEN configured"
    else
        print_warning "CODECOV_TOKEN skipped"
    fi

    # SNYK_TOKEN
    echo ""
    echo "🔒 SNYK_TOKEN Setup"
    echo "1. Visit: https://app.snyk.io/account"
    echo "2. Sign up/in with GitHub"
    echo "3. Go to Account Settings > Auth Token"
    echo -n "Enter SNYK_TOKEN (or press Enter to skip): "
    read -s snyk_token
    echo ""

    if [ -n "$snyk_token" ]; then
        echo "$snyk_token" | gh secret set SNYK_TOKEN
        print_success "SNYK_TOKEN configured"
    else
        print_warning "SNYK_TOKEN skipped"
    fi

    # SLACK_WEBHOOK
    echo ""
    echo "💬 SLACK_WEBHOOK Setup"
    echo "1. Visit: https://api.slack.com/apps"
    echo "2. Create new app or select existing"
    echo "3. Go to Incoming Webhooks > Add New Webhook"
    echo -n "Enter SLACK_WEBHOOK URL (or press Enter to skip): "
    read -s slack_webhook
    echo ""

    if [ -n "$slack_webhook" ]; then
        echo "$slack_webhook" | gh secret set SLACK_WEBHOOK
        print_success "SLACK_WEBHOOK configured"
    else
        print_warning "SLACK_WEBHOOK skipped"
    fi

    # NVD_API_KEY
    echo ""
    echo "📚 NVD_API_KEY Setup"
    echo "1. Visit: https://nvd.nist.gov/developers/request-an-api-key"
    echo "2. Fill out the form"
    echo "3. Check your email for the API key"
    echo -n "Enter NVD_API_KEY (or press Enter to skip): "
    read -s nvd_key
    echo ""

    if [ -n "$nvd_key" ]; then
        echo "$nvd_key" | gh secret set NVD_API_KEY
        print_success "NVD_API_KEY configured"
    else
        print_warning "NVD_API_KEY skipped"
    fi
fi

# Step 3: Display current secrets
echo ""
echo "📋 Current GitHub Secrets:"
echo "--------------------------"
gh secret list
echo ""

# Step 4: Trigger setup workflows
echo "🔧 Step 2: Run Setup Workflows"
echo "-------------------------------"
echo ""

# Run auto-security workflow
echo "Running security setup workflow..."
if gh workflow run auto-security.yml 2>/dev/null; then
    print_success "Security workflow triggered"
else
    print_warning "Security workflow already running or doesn't have manual trigger"
fi

# Run dependency workflow
echo "Running dependency check workflow..."
if gh workflow run auto-dependencies.yml 2>/dev/null; then
    print_success "Dependency workflow triggered"
else
    print_warning "Dependency workflow already running or doesn't have manual trigger"
fi

# Run performance workflow
echo "Running performance monitoring workflow..."
if gh workflow run auto-performance.yml 2>/dev/null; then
    print_success "Performance workflow triggered"
else
    print_warning "Performance workflow already running or doesn't have manual trigger"
fi

# Step 5: Monitor workflows
echo ""
echo "📈 Step 3: Monitor Workflow Progress"
echo "------------------------------------"
echo ""
echo "Waiting for workflows to start..."
sleep 5

# Show current runs
echo "Current workflow runs:"
gh run list --limit 10

# Step 6: Check for auto-created PRs
echo ""
echo "🔍 Step 4: Check for Auto-Created PRs"
echo "--------------------------------------"
echo ""
gh pr list --limit 5

# Step 7: Create monitoring dashboard
echo ""
echo "📊 Creating Monitoring Dashboard..."
cat > github-actions-dashboard.md << 'EOF'
# GitHub Actions Dashboard

## Quick Links
- [Actions Overview](https://github.com/aspenas/candlefish-ai/actions)
- [Workflow Runs](https://github.com/aspenas/candlefish-ai/actions/workflows)
- [Security Alerts](https://github.com/aspenas/candlefish-ai/security)
- [Dependabot](https://github.com/aspenas/candlefish-ai/security/dependabot)

## Monitor Commands

### Check Workflow Status
```bash
# List recent runs
gh run list --limit 10

# Watch specific workflow
gh run watch

# View failed runs
gh run list --status failure
```

### PR Management
```bash
# List open PRs
gh pr list

# Review PR
gh pr review --approve

# Merge PR
gh pr merge --auto --squash
```

### Secret Management
```bash
# List secrets
gh secret list

# Set a secret
echo "value" | gh secret set SECRET_NAME
```

## Workflow Status Badges

Add these to your README:

```markdown
[![CI](https://github.com/aspenas/candlefish-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/aspenas/candlefish-ai/actions/workflows/ci.yml)
[![Security](https://github.com/aspenas/candlefish-ai/actions/workflows/auto-security.yml/badge.svg)](https://github.com/aspenas/candlefish-ai/actions/workflows/auto-security.yml)
[![Dependencies](https://github.com/aspenas/candlefish-ai/actions/workflows/auto-dependencies.yml/badge.svg)](https://github.com/aspenas/candlefish-ai/actions/workflows/auto-dependencies.yml)
```
EOF

print_success "Dashboard created: github-actions-dashboard.md"

# Final summary
echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "✅ What's been done:"
echo "   • GitHub Actions workflows deployed"
echo "   • Secrets configuration checked"
echo "   • Setup workflows triggered"
echo "   • Monitoring dashboard created"
echo ""
echo "📋 Next Steps:"
echo "   1. Monitor workflow runs: gh run watch"
echo "   2. Review any auto-created PRs: gh pr list"
echo "   3. Check security alerts: https://github.com/aspenas/candlefish-ai/security"
echo "   4. View actions dashboard: https://github.com/aspenas/candlefish-ai/actions"
echo ""
echo "🎯 Quick Commands:"
echo "   • View runs: gh run list"
echo "   • Check PRs: gh pr list"
echo "   • Watch live: gh run watch"
echo "   • Open dashboard: open https://github.com/aspenas/candlefish-ai/actions"
echo ""

# Open browser to actions page
echo "Would you like to open the GitHub Actions dashboard in your browser? (y/n)"
read -r open_browser
if [ "$open_browser" = "y" ]; then
    open https://github.com/aspenas/candlefish-ai/actions
    print_success "Opened GitHub Actions dashboard"
fi

echo ""
print_success "🎉 GitHub Actions setup is complete and running!"
