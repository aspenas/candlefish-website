#!/bin/bash
# Script to set up Fly.io API token as GitHub secret
# This fetches the token from AWS Secrets Manager and sets it as a GitHub secret

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Fly.io GitHub secret...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
    exit 1
fi

# Fetch the token from AWS Secrets Manager
echo -e "${YELLOW}Fetching Fly.io API token from AWS Secrets Manager...${NC}"
FLY_TOKEN=$(aws secretsmanager get-secret-value \
    --secret-id "fly-io/api-token" \
    --region us-west-2 \
    --query SecretString \
    --output text)

if [ -z "$FLY_TOKEN" ]; then
    echo -e "${RED}Failed to fetch Fly.io API token from AWS Secrets Manager${NC}"
    exit 1
fi

# Get the repository name (owner/repo format)
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
if [ -z "$REPO" ]; then
    echo -e "${RED}Could not determine repository. Make sure you're in a git repository.${NC}"
    exit 1
fi

echo -e "${YELLOW}Setting secret for repository: $REPO${NC}"

# Set the GitHub secret
gh secret set FLY_API_TOKEN --body "$FLY_TOKEN" --repo "$REPO"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully set FLY_API_TOKEN secret in GitHub repository${NC}"
    echo -e "${GREEN}  The GitHub Actions workflow can now use this token for deployments${NC}"
else
    echo -e "${RED}Failed to set GitHub secret${NC}"
    exit 1
fi

# Verify the secret was set (just check it exists, not the value)
if gh secret list --repo "$REPO" | grep -q "FLY_API_TOKEN"; then
    echo -e "${GREEN}✓ Verified: FLY_API_TOKEN secret exists in repository${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Could not verify secret was set${NC}"
fi

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "The Fly.io deployment token is now available in:"
echo -e "  • AWS Secrets Manager: ${YELLOW}fly-io/api-token${NC}"
echo -e "  • GitHub Secrets: ${YELLOW}FLY_API_TOKEN${NC}"
echo -e "\nDeployment methods:"
echo -e "  • GitHub Actions: Will automatically use the secret"
echo -e "  • Local deployment: Run ${YELLOW}./deployment/deploy-to-fly.sh${NC}"
