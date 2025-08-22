#!/usr/bin/env bash
set -euo pipefail

# Helper script to post deployment URLs as PR comments
# Usage: ./pr-comment-deploy.sh <app-name> <deploy-url> [environment]

APP_NAME="${1:-}"
DEPLOY_URL="${2:-}"
ENVIRONMENT="${3:-preview}"
PR_NUMBER="${GITHUB_EVENT_NUMBER:-${PR_NUMBER:-}}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$APP_NAME" ] || [ -z "$DEPLOY_URL" ]; then
    echo "Usage: $0 <app-name> <deploy-url> [environment]"
    exit 1
fi

if [ -z "$PR_NUMBER" ]; then
    echo "PR_NUMBER not set. Are you running in GitHub Actions?"
    exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "GITHUB_TOKEN not set"
    exit 1
fi

# Determine emoji based on app
case "$APP_NAME" in
    paintbox) EMOJI="🎨" ;;
    promoteros) EMOJI="🎯" ;;
    crown-trophy) EMOJI="🏆" ;;
    nanda-index) EMOJI="🤖" ;;
    crestron-ha) EMOJI="🏠" ;;
    *) EMOJI="🚀" ;;
esac

# Create comment body
COMMENT_BODY="$EMOJI **$APP_NAME Deployment**\n\n"
COMMENT_BODY+="🌐 **$ENVIRONMENT URL**: $DEPLOY_URL\n\n"
COMMENT_BODY+="_Deployed from commit ${GITHUB_SHA:0:7}_\n"

if [ "$ENVIRONMENT" == "production" ]; then
    COMMENT_BODY+="\n⚠️ **Production deployment** - Please verify everything is working correctly."
fi

# Post comment using GitHub API
gh pr comment "$PR_NUMBER" --body "$COMMENT_BODY"

echo "✅ Posted deployment comment for $APP_NAME to PR #$PR_NUMBER"
