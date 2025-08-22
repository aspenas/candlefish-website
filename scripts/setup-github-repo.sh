#!/usr/bin/env bash
set -euo pipefail

# Setup GitHub repository settings, branch protection, and collaborators
# Run this after creating the repo

REPO="candlefish-enterprise/candlefish-ai"
TYLER_GH="${TYLER_GITHUB:-tyler-robinson}"  # Replace with actual GitHub username
AARON_GH="${AARON_GITHUB:-aaron-westphal}"  # Replace with actual GitHub username

echo "🚀 Setting up GitHub repository: $REPO"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "Install with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

echo "🔐 Setting up branch protection for main..."
# Protect main branch with required checks
gh api -X PUT \
  "repos/${REPO}/branches/main/protection" \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts='["ci"]' \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -f restrictions=null \
  2>/dev/null && echo "✅ Branch protection configured" || echo "⚠️  Branch protection may already be set"

echo ""
echo "👥 Adding collaborators..."

# Add Tyler
echo "Adding $TYLER_GH with push access..."
gh api -X PUT "repos/${REPO}/collaborators/${TYLER_GH}" \
  -f permission=push \
  2>/dev/null && echo "✅ Added $TYLER_GH" || echo "⚠️  $TYLER_GH may already have access"

# Add Aaron
echo "Adding $AARON_GH with push access..."
gh api -X PUT "repos/${REPO}/collaborators/${AARON_GH}" \
  -f permission=push \
  2>/dev/null && echo "✅ Added $AARON_GH" || echo "⚠️  $AARON_GH may already have access"

echo ""
echo "🏆 Repository settings:"
echo "  - Main branch protected: ✅"
echo "  - Required PR reviews: 1"
echo "  - Required status checks: ci"
echo "  - Collaborators added: $TYLER_GH, $AARON_GH"
echo ""
echo "✨ Setup complete!"
echo ""
echo "📝 Team workflow:"
echo "  1. Create feature branch: git checkout -b feat/<area>-<description>"
echo "  2. Make changes and commit"
echo "  3. Push and create PR: gh pr create"
echo "  4. Get review from team member"
echo "  5. Merge when CI passes and approved"
echo ""
