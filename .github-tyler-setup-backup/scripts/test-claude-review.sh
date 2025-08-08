#!/bin/bash
set -euo pipefail

echo "🧪 Testing Claude Review Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check AWS Secret
echo "1️⃣ Testing AWS Secret Access..."
if aws secretsmanager get-secret-value --secret-id "candlefish-ai/anthropic/api-key" --region us-east-1 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ AWS Secret is accessible${NC}"
else
    echo -e "${RED}❌ Cannot access AWS Secret${NC}"
    exit 1
fi

# Test 2: Check IAM Role
echo ""
echo "2️⃣ Testing IAM Role..."
ROLE_ARN=$(aws iam get-role --role-name "github-actions-claude-review" --query 'Role.Arn' --output text 2>/dev/null || echo "")
if [ -n "$ROLE_ARN" ]; then
    echo -e "${GREEN}✅ IAM Role exists: $ROLE_ARN${NC}"
else
    echo -e "${RED}❌ IAM Role not found${NC}"
    exit 1
fi

# Test 3: Check GitHub Secret
echo ""
echo "3️⃣ Testing GitHub Secret..."
if gh secret list --repo "aspenas/candlefish-ai" | grep -q "AWS_ROLE_ARN"; then
    echo -e "${GREEN}✅ GitHub secret AWS_ROLE_ARN is set${NC}"
else
    echo -e "${RED}❌ GitHub secret AWS_ROLE_ARN not found${NC}"
    exit 1
fi

# Test 4: Check workflow files
echo ""
echo "4️⃣ Checking workflow files..."
WORKFLOWS=(
    ".github/workflows/claude-auto-review.yml"
    ".github/workflows/claude-pr-review-advanced.yml"
    ".github/workflows/claude-official-review.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        echo -e "${GREEN}✅ Found: $workflow${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing: $workflow${NC}"
    fi
done

# Test 5: Validate API key format
echo ""
echo "5️⃣ Validating API key format..."
API_KEY_LENGTH=$(aws secretsmanager get-secret-value \
    --secret-id "candlefish-ai/anthropic/api-key" \
    --region us-east-1 \
    --query SecretString \
    --output text | jq -r '.ANTHROPIC_API_KEY' | wc -c | tr -d ' ')

if [ "$API_KEY_LENGTH" -gt 20 ]; then
    echo -e "${GREEN}✅ API key appears to be valid format${NC}"
else
    echo -e "${RED}❌ API key seems invalid or missing${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tests passed! Claude Review is ready to use.${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Commit and push these changes:"
echo "     - .github/workflows/*.yml"
echo "     - .github/scripts/*.sh"
echo "  2. Create a test pull request"
echo "  3. The review will run automatically"
echo ""
echo "💡 Manual trigger: Comment '/claude-review' on any PR"
echo ""
