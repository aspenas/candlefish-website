#!/bin/bash

# Setup GitHub Secrets Script
# Run this to configure all required secrets for GitHub Actions

echo "🔐 GitHub Secrets Setup"
echo "======================="
echo ""
echo "This script will help you add the required secrets to your GitHub repository."
echo "You'll need to have the following tokens ready:"
echo ""
echo "1. CODECOV_TOKEN - Get from https://app.codecov.io/gh/aspenas/candlefish-ai/settings"
echo "2. SNYK_TOKEN - Get from https://app.snyk.io/account"
echo "3. SLACK_WEBHOOK - Get from your Slack app settings"
echo "4. NVD_API_KEY - Get from https://nvd.nist.gov/developers/request-an-api-key"
echo ""
echo "Press Enter to continue or Ctrl+C to exit..."
read

# Function to set a secret
set_secret() {
    local secret_name=$1
    local prompt_message=$2

    echo ""
    echo "Setting up: $secret_name"
    echo "$prompt_message"
    echo -n "Enter value (or press Enter to skip): "
    read -s secret_value
    echo ""

    if [ -n "$secret_value" ]; then
        echo "$secret_value" | gh secret set "$secret_name"
        echo "✅ $secret_name configured"
    else
        echo "⏭️  $secret_name skipped"
    fi
}

# Configure each secret
set_secret "CODECOV_TOKEN" "Visit https://app.codecov.io/gh/aspenas/candlefish-ai/settings and copy your token"
set_secret "SNYK_TOKEN" "Visit https://app.snyk.io/account and copy your API token"
set_secret "SLACK_WEBHOOK" "Copy your Slack incoming webhook URL"
set_secret "NVD_API_KEY" "Copy your NVD API key"

# Optional: AWS and other secrets
echo ""
echo "Would you like to configure additional secrets? (y/n)"
read configure_additional

if [ "$configure_additional" = "y" ]; then
    set_secret "AWS_ACCESS_KEY_ID" "Enter your AWS Access Key ID"
    set_secret "AWS_SECRET_ACCESS_KEY" "Enter your AWS Secret Access Key"
    set_secret "VERCEL_TOKEN" "Enter your Vercel deployment token"
    set_secret "NETLIFY_AUTH_TOKEN" "Enter your Netlify auth token"
    set_secret "DATADOG_API_KEY" "Enter your Datadog API key"
fi

echo ""
echo "✅ Secret configuration complete!"
echo ""
echo "Current secrets:"
gh secret list

echo ""
echo "🚀 Next steps:"
echo "1. Monitor workflow runs: gh run list --limit 10"
echo "2. View workflow status: gh run watch"
echo "3. Check specific workflow: gh workflow view auto-security.yml"
echo ""
echo "Dashboard: https://github.com/aspenas/candlefish-ai/actions"
