#!/bin/bash

# Setup GitHub Secrets for Autonomous Deployment
# This script generates the commands to manually add AWS credentials to GitHub

echo "=================================="
echo "GitHub Secrets Manual Setup"
echo "=================================="
echo ""
echo "Please manually add these secrets to your GitHub repository:"
echo "Go to: https://github.com/candlefish-ai/candlefish-ai/settings/secrets/actions"
echo ""
echo "1. AWS_ACCESS_KEY_ID:"
aws secretsmanager get-secret-value --secret-id "github/actions/aws-access-key-id" --query SecretString --output text
echo ""
echo "2. AWS_SECRET_ACCESS_KEY:"
aws secretsmanager get-secret-value --secret-id "github/actions/aws-secret-access-key" --query SecretString --output text
echo ""
echo "=================================="
echo "After adding these secrets, the autonomous deployment workflow will be ready."
echo ""
echo "To trigger deployment, run:"
echo "gh workflow run autonomous-deployment.yml \\"
echo "  --field platform=all \\"
echo "  --field mode=autonomous \\"
echo "  --field use_max_tokens=true"