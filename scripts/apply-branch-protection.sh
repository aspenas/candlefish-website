#!/usr/bin/env bash
# Apply branch protection rules to candlefish-ai repository
# Requires: gh CLI with appropriate permissions

set -euo pipefail

# Configuration
REPO="aspenas/candlefish-ai"
DRY_RUN=${DRY_RUN:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Check prerequisites
check_prerequisites() {
  if ! command -v gh &> /dev/null; then
    log_error "gh CLI is not installed. Install from: https://cli.github.com/"
    exit 1
  fi

  if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub. Run: gh auth login"
    exit 1
  fi

  # Check if user has admin access
  if ! gh api "repos/$REPO" --jq '.permissions.admin' | grep -q "true"; then
    log_warning "You may not have admin permissions for $REPO"
    log_info "Some operations may fail. Contact repository owner if needed."
  fi
}

# Apply branch protection for main branch
apply_main_protection() {
  log_info "Configuring protection for 'main' branch..."

  local protection_json
  protection_json=$(cat <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "CI / CI Status",
      "Security Scan / Secret Scanning",
      "Security Scan / Security Summary"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF
  )

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would apply the following protection to main:"
    echo "$protection_json" | jq .
  else
    if gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "/repos/$REPO/branches/main/protection" \
      --input - <<< "$protection_json" > /dev/null 2>&1; then
      log_success "Applied protection rules to 'main' branch"
    else
      log_error "Failed to apply protection to 'main' branch"
      log_info "This may require admin permissions"
    fi
  fi
}

# Apply branch protection for development branch
apply_development_protection() {
  log_info "Configuring protection for 'development' branch..."

  local protection_json
  protection_json=$(cat <<EOF
{
  "required_status_checks": {
    "strict": false,
    "contexts": [
      "CI / CI Status"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF
  )

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would apply the following protection to development:"
    echo "$protection_json" | jq .
  else
    if gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "/repos/$REPO/branches/development/protection" \
      --input - <<< "$protection_json" > /dev/null 2>&1; then
      log_success "Applied protection rules to 'development' branch"
    else
      log_warning "Could not apply protection to 'development' branch (may not exist)"
    fi
  fi
}

# Enable security features
enable_security_features() {
  log_info "Enabling security features..."

  # Enable vulnerability alerts
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would enable vulnerability alerts"
  else
    if gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      "/repos/$REPO/vulnerability-alerts" 2>/dev/null; then
      log_success "Enabled vulnerability alerts"
    else
      log_warning "Could not enable vulnerability alerts (may require admin)"
    fi
  fi

  # Enable automated security fixes
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would enable automated security fixes"
  else
    if gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      "/repos/$REPO/automated-security-fixes" 2>/dev/null; then
      log_success "Enabled automated security fixes"
    else
      log_warning "Could not enable automated security fixes (may require admin)"
    fi
  fi
}

# Configure merge settings
configure_merge_settings() {
  log_info "Configuring merge settings..."

  local settings_json
  settings_json=$(cat <<EOF
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": true,
  "delete_branch_on_merge": true,
  "allow_auto_merge": true,
  "use_squash_pr_title_as_default": true
}
EOF
  )

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would apply the following merge settings:"
    echo "$settings_json" | jq .
  else
    if gh api \
      --method PATCH \
      -H "Accept: application/vnd.github+json" \
      "/repos/$REPO" \
      --input - <<< "$settings_json" > /dev/null 2>&1; then
      log_success "Applied merge settings"
    else
      log_warning "Could not apply merge settings (may require admin)"
    fi
  fi
}

# Create required labels
create_labels() {
  log_info "Creating standard labels..."

  local labels=(
    "security:critical:FF0000"
    "security:high:FF6600"
    "security:medium:FFA500"
    "security:low:FFFF00"
    "needs-review:0052CC"
    "ready-to-merge:0E8A16"
    "work-in-progress:FBCA04"
    "hotfix:B60205"
    "breaking-change:D93F0B"
    "dependencies:0366D6"
  )

  for label_spec in "${labels[@]}"; do
    IFS=':' read -r name color <<< "$label_spec"
    
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "[DRY RUN] Would create label: $name (color: #$color)"
    else
      if gh label create "$name" --color "$color" --repo "$REPO" 2>/dev/null; then
        log_success "Created label: $name"
      else
        log_info "Label already exists or could not be created: $name"
      fi
    fi
  done
}

# Display current protection status
show_protection_status() {
  log_info "Current branch protection status:"
  echo ""
  
  # Check main branch
  if gh api "/repos/$REPO/branches/main/protection" 2>/dev/null | jq -e . >/dev/null; then
    echo "main branch:"
    gh api "/repos/$REPO/branches/main/protection" 2>/dev/null | jq '{
      required_reviews: .required_pull_request_reviews.required_approving_review_count,
      dismiss_stale_reviews: .required_pull_request_reviews.dismiss_stale_reviews,
      require_code_owner_reviews: .required_pull_request_reviews.require_code_owner_reviews,
      enforce_admins: .enforce_admins,
      required_status_checks: .required_status_checks.contexts
    }'
  else
    log_warning "main branch is not protected"
  fi
  
  echo ""
  
  # Check development branch
  if gh api "/repos/$REPO/branches/development/protection" 2>/dev/null | jq -e . >/dev/null; then
    echo "development branch:"
    gh api "/repos/$REPO/branches/development/protection" 2>/dev/null | jq '{
      required_reviews: .required_pull_request_reviews.required_approving_review_count,
      required_status_checks: .required_status_checks.contexts
    }'
  else
    log_info "development branch is not protected or does not exist"
  fi
}

# Main execution
main() {
  echo "═══════════════════════════════════════════════════════════════"
  echo "         GitHub Branch Protection Configuration"
  echo "         Repository: $REPO"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  check_prerequisites

  if [[ "$1" == "--status" ]] || [[ "$1" == "-s" ]]; then
    show_protection_status
    exit 0
  fi

  if [[ "$1" == "--dry-run" ]] || [[ "$1" == "-n" ]]; then
    DRY_RUN=true
    log_info "Running in DRY RUN mode - no changes will be made"
    echo ""
  fi

  apply_main_protection
  apply_development_protection
  enable_security_features
  configure_merge_settings
  create_labels

  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN complete. Run without --dry-run to apply changes."
  else
    log_success "Branch protection configuration complete!"
    echo ""
    log_info "To view current protection status, run: $0 --status"
  fi
  
  echo "═══════════════════════════════════════════════════════════════"
}

# Run main function
main "${1:-}"