#!/bin/bash
set -euo pipefail

# Script to set up AWS Secrets Manager for Claude Auto Review
# This script helps create the necessary AWS resources and GitHub secrets

echo "🚀 Setting up Claude Auto Review for GitHub Actions"
echo "================================================"

# Check for required tools
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed. Aborting." >&2; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "❌ GitHub CLI is required but not installed. Aborting." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required but not installed. Aborting." >&2; exit 1; }

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
SECRET_NAME="candlefish-ai/anthropic/api-key"
GITHUB_REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

echo "📋 Configuration:"
echo "  - AWS Region: $AWS_REGION"
echo "  - Secret Name: $SECRET_NAME"
echo "  - GitHub Repo: $GITHUB_REPO"
echo ""

# Step 1: Check if the secret already exists
echo "🔍 Checking if AWS secret exists..."
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "✅ Secret already exists: $SECRET_NAME"

    # Check if we need to update it
    read -p "Do you want to update the existing secret? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your Anthropic API key: " -s ANTHROPIC_API_KEY
        echo

        # Update the secret
        aws secretsmanager put-secret-value \
            --secret-id "$SECRET_NAME" \
            --secret-string "{\"ANTHROPIC_API_KEY\":\"$ANTHROPIC_API_KEY\"}" \
            --region "$AWS_REGION"

        echo "✅ Secret updated successfully"
    fi
else
    echo "📝 Secret doesn't exist. Creating it now..."

    read -p "Enter your Anthropic API key: " -s ANTHROPIC_API_KEY
    echo

    # Create the secret
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "Anthropic API key for Claude PR reviews" \
        --secret-string "{\"ANTHROPIC_API_KEY\":\"$ANTHROPIC_API_KEY\"}" \
        --region "$AWS_REGION"

    echo "✅ Secret created successfully"
fi

# Step 2: Set up IAM role for GitHub Actions
echo ""
echo "🔐 Setting up IAM role for GitHub Actions..."
echo "This step requires you to have already configured OIDC provider for GitHub Actions."
echo "If you haven't, follow: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services"
echo ""

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="github-actions-claude-review"

# Create trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_REPO}:*"
        }
      }
    }
  ]
}
EOF

# Create permissions policy
cat > permissions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${SECRET_NAME}*"
    }
  ]
}
EOF

# Check if role exists
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    echo "✅ IAM role already exists: $ROLE_NAME"

    # Update the trust policy
    aws iam update-assume-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-document file://trust-policy.json

    # Update the permissions
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "claude-review-secrets-access" \
        --policy-document file://permissions-policy.json
else
    echo "📝 Creating IAM role..."

    # Create the role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file://trust-policy.json \
        --description "Role for GitHub Actions to access Claude API key"

    # Attach the permissions policy
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "claude-review-secrets-access" \
        --policy-document file://permissions-policy.json

    echo "✅ IAM role created successfully"
fi

# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "📋 IAM Role ARN: $ROLE_ARN"

# Clean up temporary files
rm -f trust-policy.json permissions-policy.json

# Step 3: Set GitHub secrets
echo ""
echo "🔧 Setting GitHub secrets..."

# Set the AWS role ARN as a GitHub secret
gh secret set AWS_ROLE_ARN --body "$ROLE_ARN" --repo "$GITHUB_REPO"

echo "✅ GitHub secret 'AWS_ROLE_ARN' has been set"

# Step 4: Final instructions
echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Summary:"
echo "  - AWS Secret: $SECRET_NAME"
echo "  - IAM Role: $ROLE_NAME ($ROLE_ARN)"
echo "  - GitHub Secret: AWS_ROLE_ARN"
echo ""
echo "🎯 Next steps:"
echo "  1. Commit and push the workflow files in .github/workflows/"
echo "  2. Create a pull request to test the Claude review"
echo "  3. The review will run automatically on new PRs"
echo ""
echo "💡 Trigger reviews manually by commenting on a PR:"
echo "  - /claude-review (comprehensive review)"
echo "  - /claude-review security"
echo "  - /claude-review performance"
echo "  - /claude-review quick"
echo ""
echo "📚 For more information, see the workflow files in .github/workflows/"
