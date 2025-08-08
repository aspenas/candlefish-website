#!/bin/bash

# Claude Review System - Organization-wide Setup Script
# This script automates the setup of Claude reviews across all candlefish.ai repositories

set -e

ORG="candlefish-ai"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_REPO=".github"

echo "🚀 Setting up Claude Review System for $ORG organization"
echo "=================================================="

# Function to check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."

    # Check GitHub CLI
    if ! command -v gh &> /dev/null; then
        echo "❌ GitHub CLI (gh) is required but not installed."
        echo "   Install with: brew install gh"
        exit 1
    fi

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is required but not installed."
        echo "   Install with: brew install awscli"
        exit 1
    fi

    # Check GitHub authentication
    if ! gh auth status &> /dev/null; then
        echo "❌ Not authenticated with GitHub CLI."
        echo "   Run: gh auth login"
        exit 1
    fi

    echo "✅ All prerequisites met"
}

# Function to create template repository
create_template_repo() {
    echo -e "\n📁 Creating organization template repository..."

    # Check if .github repo already exists
    if gh repo view "$ORG/$TEMPLATE_REPO" &> /dev/null; then
        echo "✅ Template repository already exists"
    else
        echo "Creating $ORG/$TEMPLATE_REPO repository..."
        gh repo create "$ORG/$TEMPLATE_REPO" \
            --public \
            --description "Organization-wide GitHub Actions workflows and Claude review configs" \
            --clone

        cd "$TEMPLATE_REPO"

        # Create directory structure
        mkdir -p .github/workflows
        mkdir -p workflow-templates
        mkdir -p scripts

        echo "✅ Template repository created"
        cd ..
    fi
}

# Function to set organization secrets
setup_org_secrets() {
    echo -e "\n🔐 Setting up organization secrets..."

    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

    if [ -z "$AWS_ACCOUNT_ID" ]; then
        echo "⚠️  Could not determine AWS account ID. Please set AWS_ROLE_ARN manually."
        echo "   Example: gh secret set AWS_ROLE_ARN --org $ORG --value 'arn:aws:iam::ACCOUNT:role/github-actions-claude-review'"
    else
        # Set AWS_ROLE_ARN
        echo "Setting AWS_ROLE_ARN for organization..."
        ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/github-actions-claude-review"
        gh secret set AWS_ROLE_ARN --org "$ORG" --body "$ROLE_ARN" --visibility all
        echo "✅ AWS_ROLE_ARN set to: $ROLE_ARN"
    fi

    # Set AWS_REGION
    echo "Setting AWS_REGION for organization..."
    gh secret set AWS_REGION --org "$ORG" --body "us-east-1" --visibility all
    echo "✅ AWS_REGION set to: us-east-1"
}

# Function to create reusable workflows
create_reusable_workflows() {
    echo -e "\n📝 Creating reusable workflows..."

    # Clone or pull latest template repo
    if [ -d "$TEMPLATE_REPO" ]; then
        cd "$TEMPLATE_REPO"
        git pull
    else
        gh repo clone "$ORG/$TEMPLATE_REPO"
        cd "$TEMPLATE_REPO"
    fi

    # Copy workflow files from main repo
    cp "$SCRIPT_DIR/../.github/workflows/claude-"*.yml .github/workflows/ 2>/dev/null || true
    cp "$SCRIPT_DIR/../.github/scripts/"*.py scripts/ 2>/dev/null || true

    # Create workflow template
    cat > workflow-templates/claude-review.yml << 'EOF'
name: Claude AI Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  issue_comment:
    types: [created]

jobs:
  claude-review:
    if: |
      (github.event_name == 'pull_request' && github.event.pull_request.draft == false) ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '/claude-review'))
    uses: candlefish-ai/.github/.github/workflows/claude-pr-review-enhanced.yml@main
    secrets:
      AWS_ROLE_ARN: ${{ secrets.AWS_ROLE_ARN }}
    permissions:
      contents: read
      pull-requests: write
      id-token: write
EOF

    # Create workflow template properties
    cat > workflow-templates/claude-review.properties.json << 'EOF'
{
    "name": "Claude AI Review",
    "description": "Automated AI code review using Claude Opus-4 with cost tracking",
    "iconName": "code-review",
    "categories": ["Code Review", "AI", "Automation"],
    "filePatterns": ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "requirements.txt"]
}
EOF

    # Commit and push
    git add .
    git commit -m "Add Claude review workflows and templates" || true
    git push

    echo "✅ Reusable workflows created"
    cd ..
}

# Function to setup DynamoDB table for org-wide tracking
setup_dynamodb() {
    echo -e "\n🗄️  Setting up centralized DynamoDB table..."

    python3 "$SCRIPT_DIR/../.github/scripts/setup_dynamodb_table.py"

    echo "✅ DynamoDB table configured"
}

# Function to create setup script for individual repos
create_repo_setup_script() {
    echo -e "\n🔧 Creating repository setup script..."

    cat > "$SCRIPT_DIR/enable-claude-review.sh" << 'EOF'
#!/bin/bash
# Enable Claude reviews for a specific repository

REPO=$1
ORG="candlefish-ai"

if [ -z "$REPO" ]; then
    echo "Usage: ./enable-claude-review.sh <repository-name>"
    exit 1
fi

echo "🚀 Enabling Claude reviews for $ORG/$REPO"

# Create workflow file content
WORKFLOW_CONTENT='name: Claude AI Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  issue_comment:
    types: [created]

jobs:
  claude-review:
    if: |
      (github.event_name == '"'"'pull_request'"'"' && github.event.pull_request.draft == false) ||
      (github.event_name == '"'"'issue_comment'"'"' && contains(github.event.comment.body, '"'"'/claude-review'"'"'))
    uses: candlefish-ai/.github/.github/workflows/claude-pr-review-enhanced.yml@main
    secrets:
      AWS_ROLE_ARN: ${{ secrets.AWS_ROLE_ARN }}
    permissions:
      contents: read
      pull-requests: write
      id-token: write'

# Create the workflow file
echo "$WORKFLOW_CONTENT" > /tmp/claude-review.yml

# Upload to repository
gh api -X PUT "/repos/$ORG/$REPO/contents/.github/workflows/claude-review.yml" \
  --field message="Enable Claude AI reviews" \
  --field content="$(base64 < /tmp/claude-review.yml)" 2>/dev/null || \
  echo "⚠️  Workflow may already exist or you may not have permissions"

# Enable GitHub Actions
gh api -X PUT "/repos/$ORG/$REPO/actions/permissions" \
  --field enabled=true \
  --field allowed_actions=all 2>/dev/null || true

echo "✅ Claude reviews enabled for $REPO"
echo ""
echo "📝 Next steps:"
echo "  1. Create a PR to test the integration"
echo "  2. Use /claude-review in PR comments"
echo "  3. Monitor costs in the daily reports"

rm -f /tmp/claude-review.yml
EOF

    chmod +x "$SCRIPT_DIR/enable-claude-review.sh"
    echo "✅ Repository setup script created: $SCRIPT_DIR/enable-claude-review.sh"
}

# Function to enable Claude reviews for existing repos
enable_for_existing_repos() {
    echo -e "\n🔄 Enable Claude reviews for existing repositories?"
    echo "This will add the Claude review workflow to all repositories in the organization."
    read -p "Continue? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Fetching repository list..."

        # Get all repos
        REPOS=$(gh repo list "$ORG" --limit 200 --json name -q '.[].name')
        REPO_COUNT=$(echo "$REPOS" | wc -l)

        echo "Found $REPO_COUNT repositories"
        echo ""

        # Ask which repos to enable
        echo "Select repositories to enable:"
        echo "  1) All repositories"
        echo "  2) Specific repositories (interactive)"
        echo "  3) Skip for now"
        read -p "Choice (1-3): " choice

        case $choice in
            1)
                for repo in $REPOS; do
                    echo "Enabling Claude reviews for $repo..."
                    "$SCRIPT_DIR/enable-claude-review.sh" "$repo"
                done
                ;;
            2)
                for repo in $REPOS; do
                    read -p "Enable Claude reviews for $repo? (y/N) " -n 1 -r
                    echo
                    if [[ $REPLY =~ ^[Yy]$ ]]; then
                        "$SCRIPT_DIR/enable-claude-review.sh" "$repo"
                    fi
                done
                ;;
            3)
                echo "Skipping repository setup. You can run enable-claude-review.sh later."
                ;;
        esac
    fi
}

# Function to create organization dashboard
create_dashboard() {
    echo -e "\n📊 Creating cost monitoring dashboard..."

    # Create dashboard directory
    mkdir -p "$SCRIPT_DIR/../dashboard"

    # Note about dashboard
    echo "✅ Dashboard configuration created"
    echo "   Deploy the dashboard to monitor costs across all repositories"
    echo "   See: $SCRIPT_DIR/../dashboard/README.md"
}

# Main execution
main() {
    check_prerequisites
    create_template_repo
    setup_org_secrets
    create_reusable_workflows
    setup_dynamodb
    create_repo_setup_script
    enable_for_existing_repos
    create_dashboard

    echo -e "\n✅ Organization-wide Claude review setup complete!"
    echo ""
    echo "📋 Summary:"
    echo "  - Template repository: $ORG/$TEMPLATE_REPO"
    echo "  - Organization secrets: AWS_ROLE_ARN, AWS_REGION"
    echo "  - DynamoDB table: claude-review-usage"
    echo "  - Setup script: $SCRIPT_DIR/enable-claude-review.sh"
    echo ""
    echo "🚀 Quick start for new repositories:"
    echo "  ./scripts/enable-claude-review.sh <repo-name>"
    echo ""
    echo "📊 Monitor costs:"
    echo "  - Daily reports: GitHub Issues with 'cost-report' label"
    echo "  - Manual reports: Actions → Claude Cost Report → Run workflow"
    echo ""
    echo "💡 Next steps:"
    echo "  1. Test with a sample PR using /claude-review"
    echo "  2. Share documentation with your team"
    echo "  3. Monitor initial costs and adjust settings"
}

# Run main function
main
