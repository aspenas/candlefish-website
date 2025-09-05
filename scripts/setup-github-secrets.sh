#!/bin/bash

# GitHub Secrets Setup Script
# Operational Design Atelier: Establishing trust through proper credentials

set -e

echo "🔐 GitHub Secrets Configuration"
echo "================================"
echo ""
echo "This script will help you set up the required GitHub secrets"
echo "for the Candlefish AI deployment pipeline."
echo ""

# Check if gh CLI is authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI is not authenticated"
    echo "Please run: gh auth login"
    exit 1
fi

REPO="aspenas/candlefish-website"
echo "Repository: $REPO"
echo ""

# Function to set a secret
set_secret() {
    local name=$1
    local prompt=$2
    local value=$3
    
    if [ -z "$value" ]; then
        echo "Enter value for $name:"
        echo "  $prompt"
        read -s value
        echo ""
    fi
    
    if [ -n "$value" ]; then
        echo "$value" | gh secret set "$name" --repo "$REPO"
        echo "✅ Set $name"
    else
        echo "⚠️  Skipped $name (no value provided)"
    fi
}

echo "Setting up required secrets..."
echo ""

# 1. Netlify Secrets
echo "1. Netlify Configuration"
echo "------------------------"
echo "You can find these in your Netlify account:"
echo "  - Go to: https://app.netlify.com/user/applications"
echo "  - Create a new personal access token"
echo "  - Site ID is in site settings"
echo ""

# Get Netlify auth token from environment or prompt
if [ -n "$NETLIFY_AUTH_TOKEN" ]; then
    echo "Using NETLIFY_AUTH_TOKEN from environment"
    set_secret "NETLIFY_AUTH_TOKEN" "" "$NETLIFY_AUTH_TOKEN"
else
    set_secret "NETLIFY_AUTH_TOKEN" "Personal access token from Netlify" ""
fi

# Get site ID - try to detect from netlify CLI first
if command -v netlify &>/dev/null && netlify status &>/dev/null; then
    DETECTED_SITE_ID=$(netlify status --json 2>/dev/null | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ -n "$DETECTED_SITE_ID" ]; then
        echo "Detected Netlify Site ID: $DETECTED_SITE_ID"
        read -p "Use this Site ID? (Y/n): " use_detected
        if [[ "$use_detected" != "n" && "$use_detected" != "N" ]]; then
            set_secret "NETLIFY_SITE_ID" "" "$DETECTED_SITE_ID"
        else
            set_secret "NETLIFY_SITE_ID" "Site ID from Netlify site settings" ""
        fi
    else
        set_secret "NETLIFY_SITE_ID" "Site ID from Netlify site settings" "${NETLIFY_SITE_ID:-}"
    fi
else
    set_secret "NETLIFY_SITE_ID" "Site ID from Netlify site settings" "${NETLIFY_SITE_ID:-}"
fi

echo ""

# 2. AWS Secrets (optional but recommended)
echo "2. AWS Configuration (Optional)"
echo "-------------------------------"
echo "For AWS deployments, you'll need:"
echo "  - AWS Account ID (12-digit number)"
echo "  - IAM role ARN for GitHub Actions"
echo ""

read -p "Configure AWS secrets? (y/N): " configure_aws
if [[ "$configure_aws" == "y" || "$configure_aws" == "Y" ]]; then
    # Try to get AWS account ID from current credentials
    if aws sts get-caller-identity &>/dev/null; then
        DETECTED_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        echo "Detected AWS Account: $DETECTED_ACCOUNT"
        read -p "Use this Account ID? (Y/n): " use_detected
        if [[ "$use_detected" != "n" && "$use_detected" != "N" ]]; then
            set_secret "AWS_ACCOUNT_ID" "" "$DETECTED_ACCOUNT"
        else
            set_secret "AWS_ACCOUNT_ID" "12-digit AWS Account ID" ""
        fi
    else
        set_secret "AWS_ACCOUNT_ID" "12-digit AWS Account ID" ""
    fi
    
    set_secret "AWS_REGION" "AWS Region (e.g., us-east-1)" "${AWS_REGION:-us-east-1}"
fi

echo ""
echo "================================"
echo "✅ GitHub Secrets Configuration Complete!"
echo ""
echo "Configured secrets for: $REPO"
echo ""
echo "To verify, run:"
echo "  gh secret list --repo $REPO"
echo ""
echo "To trigger a deployment, run:"
echo "  gh workflow run deploy-netlify-simple.yml --ref main -f environment=production"
echo ""
