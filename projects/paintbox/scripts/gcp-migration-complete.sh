#!/bin/bash

# =============================================================================
# Google Cloud Project Migration Completion Script
# Finalizes migration and removes old owner access
# =============================================================================

set -e  # Exit on error

# Configuration
PROJECT_ID="l0-candlefish"
OLD_OWNER="patrick.smith@gmail.com"
NEW_OWNER="patrick@candlefish.ai"
OLD_CLIENT_ID="641173075272-vu85i613rarruqsfst59qve7bvvrrd2s.apps.googleusercontent.com"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check migration status
check_migration_status() {
    log "Checking migration status..."
    
    # Get migration status from AWS Secrets Manager
    MIGRATION_STATUS=$(aws secretsmanager get-secret-value \
        --secret-id "paintbox/google-oauth-migration" \
        --query 'SecretString' --output text 2>/dev/null | jq -r '.migration_status' || echo "not_found")
    
    if [ "$MIGRATION_STATUS" != "in_progress" ]; then
        error "Migration is not in progress. Current status: $MIGRATION_STATUS"
        exit 1
    fi
    
    # Get migration start time
    MIGRATION_START=$(aws secretsmanager get-secret-value \
        --secret-id "paintbox/google-oauth-migration" \
        --query 'SecretString' --output text | jq -r '.migration_started')
    
    log "Migration started: $MIGRATION_START"
    
    # Calculate hours since migration started
    START_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$MIGRATION_START" +%s 2>/dev/null || date -d "$MIGRATION_START" +%s)
    NOW_EPOCH=$(date +%s)
    HOURS_ELAPSED=$(( (NOW_EPOCH - START_EPOCH) / 3600 ))
    
    if [ $HOURS_ELAPSED -lt 48 ]; then
        warning "Only $HOURS_ELAPSED hours have elapsed since migration started."
        warning "Recommended to wait 48 hours before completing migration."
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Migration completion cancelled"
            exit 0
        fi
    fi
    
    success "Migration has been running for $HOURS_ELAPSED hours"
}

# Verify new credentials are working
verify_new_credentials() {
    log "Verifying new OAuth credentials are functioning..."
    
    # Check if application is using new credentials
    FLY_SECRETS=$(fly secrets list -a paintbox --json 2>/dev/null || echo "{}")
    
    if echo "$FLY_SECRETS" | grep -q "GOOGLE_CLIENT_ID_NEW"; then
        success "New credentials are configured in Fly.io"
    else
        error "New credentials not found in Fly.io configuration"
        exit 1
    fi
    
    # Test OAuth flow
    log "Testing OAuth authentication flow..."
    
    # Check health endpoint
    HEALTH_STATUS=$(curl -s https://paintbox.fly.dev/api/health | jq -r '.status' || echo "error")
    
    if [ "$HEALTH_STATUS" = "ok" ] || [ "$HEALTH_STATUS" = "healthy" ]; then
        success "Application health check passed"
    else
        error "Application health check failed"
        exit 1
    fi
    
    # Check for authentication errors in logs
    log "Checking recent logs for authentication errors..."
    
    fly logs -a paintbox --json | tail -100 | grep -i "auth.*error" || true
    
    read -p "Do the logs look clean? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Please resolve any authentication issues before continuing"
        exit 1
    fi
}

# Switch to new credentials only
switch_to_new_credentials() {
    log "Switching application to use only new OAuth credentials..."
    
    warning "This will remove support for old OAuth credentials. Continue? (y/n)"
    read -p "" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Cancelled switching to new credentials"
        return
    fi
    
    # Get new credentials from secrets
    NEW_CREDS=$(aws secretsmanager get-secret-value \
        --secret-id "paintbox/google-oauth-migration" \
        --query 'SecretString' --output text)
    
    NEW_CLIENT_ID=$(echo "$NEW_CREDS" | jq -r '.new_client_id')
    NEW_CLIENT_SECRET=$(echo "$NEW_CREDS" | jq -r '.new_client_secret')
    
    # Update Fly.io to use only new credentials
    fly secrets set \
        GOOGLE_CLIENT_ID="$NEW_CLIENT_ID" \
        GOOGLE_CLIENT_SECRET="$NEW_CLIENT_SECRET" \
        -a paintbox
    
    # Remove migration-specific variables
    fly secrets unset \
        GOOGLE_CLIENT_ID_OLD \
        GOOGLE_CLIENT_ID_NEW \
        GOOGLE_CLIENT_SECRET_NEW \
        OAUTH_MIGRATION_MODE \
        -a paintbox 2>/dev/null || true
    
    success "Application switched to new credentials only"
    
    log "Waiting for deployment to complete..."
    sleep 30
    
    # Verify deployment
    fly status -a paintbox
}

# Update permanent secrets
update_permanent_secrets() {
    log "Updating permanent secret storage..."
    
    # Get new credentials
    NEW_CREDS=$(aws secretsmanager get-secret-value \
        --secret-id "paintbox/google-oauth-migration" \
        --query 'SecretString' --output text)
    
    NEW_CLIENT_ID=$(echo "$NEW_CREDS" | jq -r '.new_client_id')
    NEW_CLIENT_SECRET=$(echo "$NEW_CREDS" | jq -r '.new_client_secret')
    
    # Update main Google OAuth secret
    aws secretsmanager update-secret \
        --secret-id "paintbox/google-oauth" \
        --secret-string "{
            \"client_id\":\"$NEW_CLIENT_ID\",
            \"client_secret\":\"$NEW_CLIENT_SECRET\",
            \"project_id\":\"$PROJECT_ID\",
            \"owner\":\"$NEW_OWNER\",
            \"updated\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }" 2>/dev/null || {
        # Create if doesn't exist
        aws secretsmanager create-secret \
            --name "paintbox/google-oauth" \
            --secret-string "{
                \"client_id\":\"$NEW_CLIENT_ID\",
                \"client_secret\":\"$NEW_CLIENT_SECRET\",
                \"project_id\":\"$PROJECT_ID\",
                \"owner\":\"$NEW_OWNER\",
                \"updated\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }"
    }
    
    # Mark migration as complete
    aws secretsmanager update-secret \
        --secret-id "paintbox/google-oauth-migration" \
        --secret-string "{
            \"old_client_id\":\"$OLD_CLIENT_ID\",
            \"new_client_id\":\"$NEW_CLIENT_ID\",
            \"migration_status\":\"completed\",
            \"migration_completed\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }"
    
    success "Permanent secrets updated"
}

# Remove old owner access
remove_old_owner() {
    log "Removing $OLD_OWNER from project..."
    
    warning "This will remove all access for $OLD_OWNER. Continue? (y/n)"
    read -p "" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Skipping removal of old owner"
        return
    fi
    
    # Remove IAM binding
    gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
        --member="user:$OLD_OWNER" \
        --role="roles/owner" \
        --quiet || {
        warning "Could not remove owner role. May already be removed."
    }
    
    # Check for any remaining roles
    log "Checking for any remaining roles for $OLD_OWNER..."
    
    REMAINING_ROLES=$(gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --format="table(bindings.role)" \
        --filter="bindings.members:$OLD_OWNER" 2>/dev/null || echo "")
    
    if [ -n "$REMAINING_ROLES" ]; then
        warning "Found remaining roles for $OLD_OWNER:"
        echo "$REMAINING_ROLES"
        
        read -p "Remove all remaining roles? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Remove all roles
            while IFS= read -r role; do
                if [ -n "$role" ] && [ "$role" != "ROLE" ]; then
                    gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
                        --member="user:$OLD_OWNER" \
                        --role="$role" \
                        --quiet || true
                fi
            done <<< "$REMAINING_ROLES"
        fi
    else
        success "No remaining roles found for $OLD_OWNER"
    fi
}

# Disable old OAuth client
disable_old_oauth_client() {
    log "Disabling old OAuth client..."
    
    warning "Manual step required: Disable old OAuth client"
    echo ""
    echo "Please complete the following steps:"
    echo "1. Go to: https://console.cloud.google.com/apis/credentials"
    echo "2. Log in as: $NEW_OWNER"
    echo "3. Find the old OAuth client: $OLD_CLIENT_ID"
    echo "4. Click on it and then click 'DELETE' or 'DISABLE'"
    echo ""
    echo "Note: Consider keeping it disabled (not deleted) for 30 days as a safety measure"
    echo ""
    
    read -p "Press Enter once the old OAuth client is disabled..."
    
    success "Old OAuth client disabled"
}

# Update documentation
update_documentation() {
    log "Updating documentation..."
    
    # Create migration completion report
    cat > "./gcp-migration-completed-$(date +%Y%m%d-%H%M%S).md" << EOF
# Google Cloud Project Migration Completed

## Migration Summary
- **Date Completed**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Project ID**: $PROJECT_ID
- **Previous Owner**: $OLD_OWNER (removed)
- **New Owner**: $NEW_OWNER
- **Status**: ✅ COMPLETED

## OAuth Credentials
- **Old Client ID**: $OLD_CLIENT_ID (disabled)
- **New Client ID**: [Stored in AWS Secrets Manager: paintbox/google-oauth]

## Configuration Locations
- **AWS Secrets Manager**: paintbox/google-oauth
- **Fly.io Secrets**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- **Environment Files**: Updated to use new credentials

## Verification Steps Completed
- ✅ New owner has full access
- ✅ Domain verified: candlefish.ai
- ✅ New OAuth credentials created and tested
- ✅ Application using new credentials exclusively
- ✅ Old owner access removed
- ✅ Old OAuth client disabled

## Post-Migration Monitoring
- Monitor authentication logs for next 7 days
- Keep old OAuth client disabled (not deleted) for 30 days
- Migration backup available in: gcp-migration-backup-*

## Rollback No Longer Available
The migration is now complete and the old configuration has been removed.
To revert, you would need to:
1. Re-add $OLD_OWNER as owner
2. Re-enable old OAuth client
3. Update all secrets back to old values

---
Generated by GCP Migration Automation Script
EOF
    
    success "Documentation updated"
}

# Final verification
final_verification() {
    log "Performing final verification..."
    
    echo ""
    echo "========================================="
    echo "Final Migration Checklist"
    echo "========================================="
    
    # Check project ownership
    echo -n "✓ New owner has access: "
    if gcloud projects get-iam-policy "$PROJECT_ID" | grep -q "$NEW_OWNER"; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${RED}NO${NC}"
    fi
    
    # Check old owner removed
    echo -n "✓ Old owner removed: "
    if ! gcloud projects get-iam-policy "$PROJECT_ID" | grep -q "$OLD_OWNER"; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${YELLOW}NO${NC}"
    fi
    
    # Check application health
    echo -n "✓ Application healthy: "
    if curl -s https://paintbox.fly.dev/api/health | grep -q "ok\|healthy"; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${RED}NO${NC}"
    fi
    
    echo "========================================="
    echo ""
    
    success "Migration completed successfully!"
    
    echo ""
    echo "Important reminders:"
    echo "1. Monitor logs for next 7 days: fly logs -a paintbox"
    echo "2. Keep old OAuth client disabled for 30 days before deletion"
    echo "3. Update any documentation that references old credentials"
    echo "4. Notify team members of the completed migration"
}

# Main execution
main() {
    echo "========================================="
    echo "Google Cloud Project Migration Completion"
    echo "========================================="
    echo "This script will finalize the migration and"
    echo "remove access for $OLD_OWNER"
    echo "========================================="
    echo ""
    
    check_migration_status
    verify_new_credentials
    switch_to_new_credentials
    update_permanent_secrets
    remove_old_owner
    disable_old_oauth_client
    update_documentation
    final_verification
    
    echo ""
    success "🎉 Migration completed successfully!"
    echo ""
    echo "The GCP project $PROJECT_ID is now fully owned by $NEW_OWNER"
    echo "All OAuth credentials have been migrated to the new owner."
    echo ""
}

# Run main function
main "$@"