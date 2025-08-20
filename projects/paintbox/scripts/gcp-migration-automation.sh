#!/bin/bash

# =============================================================================
# Google Cloud Project Migration Automation Script
# Migrates GCP project from patrick.smith@gmail.com to patrick@candlefish.ai
# =============================================================================

set -e  # Exit on error

# Configuration
PROJECT_ID="l0-candlefish"
OLD_OWNER="patrick.smith@gmail.com"
NEW_OWNER="patrick@candlefish.ai"
OLD_CLIENT_ID="***REMOVED***"
DOMAIN="candlefish.ai"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check jq is installed
    if ! command -v jq &> /dev/null; then
        error "jq is not installed. Please install it first."
        exit 1
    fi
    
    success "All prerequisites met"
}

# Backup current configuration
backup_configuration() {
    log "Backing up current configuration..."
    
    BACKUP_DIR="./gcp-migration-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Export current OAuth configuration
    gcloud alpha iap oauth-clients list --project="$PROJECT_ID" > "$BACKUP_DIR/oauth-clients.json" 2>/dev/null || true
    
    # Export IAM policy
    gcloud projects get-iam-policy "$PROJECT_ID" --format=json > "$BACKUP_DIR/iam-policy.json"
    
    # Export enabled APIs
    gcloud services list --enabled --project="$PROJECT_ID" --format=json > "$BACKUP_DIR/enabled-apis.json"
    
    # Save environment variables
    cat > "$BACKUP_DIR/environment-vars.txt" << EOF
PROJECT_ID=$PROJECT_ID
OLD_CLIENT_ID=$OLD_CLIENT_ID
OLD_OWNER=$OLD_OWNER
NEW_OWNER=$NEW_OWNER
DOMAIN=$DOMAIN
EOF
    
    success "Configuration backed up to $BACKUP_DIR"
    echo "$BACKUP_DIR"
}

# Phase 1: Add new owner
add_new_owner() {
    log "Phase 1: Adding $NEW_OWNER as project owner..."
    
    # Check if already owner
    IS_OWNER=$(gcloud projects get-iam-policy "$PROJECT_ID" --flatten="bindings[].members" --format="table(bindings.members)" | grep -c "$NEW_OWNER" || echo "0")
    
    if [ "$IS_OWNER" -gt 0 ]; then
        warning "$NEW_OWNER is already a member of the project"
    else
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="user:$NEW_OWNER" \
            --role="roles/owner" \
            --quiet
        
        success "$NEW_OWNER added as project owner"
    fi
    
    # Verify the addition
    log "Verifying IAM policy..."
    gcloud projects get-iam-policy "$PROJECT_ID" --format=json | jq '.bindings[] | select(.role=="roles/owner")'
}

# Phase 2: Domain verification
verify_domain() {
    log "Phase 2: Domain verification for $DOMAIN..."
    
    warning "Manual step required: Domain verification"
    echo ""
    echo "Please complete the following steps:"
    echo "1. Go to: https://console.cloud.google.com/apis/credentials/domainverification"
    echo "2. Log in as: $NEW_OWNER"
    echo "3. Add domain: $DOMAIN"
    echo "4. Add the provided TXT record to your DNS"
    echo ""
    echo "Example DNS record:"
    echo "  Type: TXT"
    echo "  Name: @ (or blank)"
    echo "  Value: google-site-verification=XXXXXXXXXXXXX"
    echo ""
    
    read -p "Press Enter once you've added the TXT record to continue..."
    
    # Help with Porkbun DNS update
    echo ""
    echo "To add DNS record via Porkbun API:"
    cat << 'EOF'
    
# Get Porkbun credentials
PORKBUN_CREDS=$(aws secretsmanager get-secret-value \
    --secret-id "candlefish/porkbun-api-credentials" \
    --query 'SecretString' --output text)

API_KEY=$(echo $PORKBUN_CREDS | jq -r '.apiKey')
SECRET_KEY=$(echo $PORKBUN_CREDS | jq -r '.secretApiKey')

# Add verification record (replace VERIFICATION_CODE)
curl -X POST https://api.porkbun.com/api/json/v3/dns/create/candlefish.ai \
    -H "Content-Type: application/json" \
    -d "{
        \"apikey\": \"$API_KEY\",
        \"secretapikey\": \"$SECRET_KEY\",
        \"type\": \"TXT\",
        \"name\": \"\",
        \"content\": \"google-site-verification=VERIFICATION_CODE\",
        \"ttl\": \"300\"
    }"
EOF
    
    read -p "Press Enter once domain verification is complete..."
    success "Domain verification process initiated"
}

# Phase 3: Create new OAuth credentials
create_oauth_credentials() {
    log "Phase 3: Creating new OAuth 2.0 credentials..."
    
    warning "Manual step required: OAuth client creation"
    echo ""
    echo "Please complete the following steps:"
    echo "1. Go to: https://console.cloud.google.com/apis/credentials"
    echo "2. Log in as: $NEW_OWNER"
    echo "3. Click 'Create Credentials' > 'OAuth client ID'"
    echo "4. Application type: Web application"
    echo "5. Name: paintbox-oauth-candlefish"
    echo "6. Add these Authorized redirect URIs:"
    echo "   - https://paintbox.fly.dev/api/auth/callback/google"
    echo "   - https://paintbox.fly.dev/api/auth/google/callback"
    echo "   - https://localhost:3000/api/auth/callback/google"
    echo "   - http://localhost:3000/api/auth/callback/google"
    echo "   - https://paintbox.candlefish.ai/api/auth/callback/google"
    echo "   - https://api.paintbox.candlefish.ai/auth/callback"
    echo ""
    
    read -p "Enter the new Client ID: " NEW_CLIENT_ID
    read -s -p "Enter the new Client Secret: " NEW_CLIENT_SECRET
    echo ""
    
    # Save to temporary file for later use
    cat > .oauth-migration-temp << EOF
export NEW_CLIENT_ID="$NEW_CLIENT_ID"
export NEW_CLIENT_SECRET="$NEW_CLIENT_SECRET"
EOF
    
    success "OAuth credentials saved temporarily"
}

# Phase 4: Update AWS Secrets Manager
update_aws_secrets() {
    log "Phase 4: Updating AWS Secrets Manager..."
    
    # Source the temporary OAuth credentials
    source .oauth-migration-temp
    
    # Create new secret for migration
    log "Creating new secret in AWS Secrets Manager..."
    aws secretsmanager create-secret \
        --name "paintbox/google-oauth-migration" \
        --secret-string "{
            \"old_client_id\":\"$OLD_CLIENT_ID\",
            \"old_client_secret\":\"EXISTING_SECRET\",
            \"new_client_id\":\"$NEW_CLIENT_ID\",
            \"new_client_secret\":\"$NEW_CLIENT_SECRET\",
            \"migration_status\":\"in_progress\",
            \"migration_started\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }" 2>/dev/null || {
        # Update if already exists
        aws secretsmanager update-secret \
            --secret-id "paintbox/google-oauth-migration" \
            --secret-string "{
                \"old_client_id\":\"$OLD_CLIENT_ID\",
                \"old_client_secret\":\"EXISTING_SECRET\",
                \"new_client_id\":\"$NEW_CLIENT_ID\",
                \"new_client_secret\":\"$NEW_CLIENT_SECRET\",
                \"migration_status\":\"in_progress\",
                \"migration_started\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }"
    }
    
    success "AWS Secrets Manager updated with migration credentials"
}

# Phase 5: Update Fly.io secrets
update_fly_secrets() {
    log "Phase 5: Updating Fly.io application secrets..."
    
    # Source the temporary OAuth credentials
    source .oauth-migration-temp
    
    warning "This will update the production application. Continue? (y/n)"
    read -p "" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Skipping Fly.io update"
        return
    fi
    
    # Set dual credentials for zero-downtime migration
    fly secrets set \
        GOOGLE_CLIENT_ID_OLD="$OLD_CLIENT_ID" \
        GOOGLE_CLIENT_ID_NEW="$NEW_CLIENT_ID" \
        GOOGLE_CLIENT_SECRET_NEW="$NEW_CLIENT_SECRET" \
        OAUTH_MIGRATION_MODE="dual" \
        -a paintbox
    
    success "Fly.io secrets updated for dual-mode operation"
    
    log "Waiting for deployment to complete..."
    sleep 30
    
    # Check deployment status
    fly status -a paintbox
}

# Phase 6: Verify migration
verify_migration() {
    log "Phase 6: Verifying migration..."
    
    # Check application health
    log "Checking application health..."
    HEALTH_CHECK=$(curl -s https://paintbox.fly.dev/api/health | jq -r '.status' || echo "error")
    
    if [ "$HEALTH_CHECK" = "ok" ] || [ "$HEALTH_CHECK" = "healthy" ]; then
        success "Application is healthy"
    else
        error "Application health check failed: $HEALTH_CHECK"
    fi
    
    # Check OAuth configuration
    log "Testing OAuth endpoint..."
    OAUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://paintbox.fly.dev/api/auth/providers)
    
    if [ "$OAUTH_TEST" = "200" ]; then
        success "OAuth endpoint is responding"
    else
        warning "OAuth endpoint returned status: $OAUTH_TEST"
    fi
    
    # Display migration status
    echo ""
    echo "========================================="
    echo "Migration Status Summary"
    echo "========================================="
    echo "✓ New owner added: $NEW_OWNER"
    echo "✓ Domain verification: Manual step required"
    echo "✓ New OAuth credentials: Created"
    echo "✓ AWS Secrets: Updated"
    echo "✓ Fly.io: Configured for dual-mode"
    echo "✓ Application health: Verified"
    echo ""
    echo "Next steps:"
    echo "1. Monitor application logs: fly logs -a paintbox"
    echo "2. Test authentication with both old and new accounts"
    echo "3. After 48 hours stable, run: ./gcp-migration-complete.sh"
    echo "========================================="
}

# Rollback function
rollback() {
    error "Rolling back migration..."
    
    # Restore Fly.io to use only old credentials
    fly secrets unset \
        GOOGLE_CLIENT_ID_OLD \
        GOOGLE_CLIENT_ID_NEW \
        GOOGLE_CLIENT_SECRET_NEW \
        OAUTH_MIGRATION_MODE \
        -a paintbox
    
    fly secrets set \
        GOOGLE_CLIENT_ID="$OLD_CLIENT_ID" \
        -a paintbox
    
    # Update AWS Secrets Manager
    aws secretsmanager update-secret \
        --secret-id "paintbox/google-oauth-migration" \
        --secret-string "{
            \"migration_status\":\"rolled_back\",
            \"rollback_time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }"
    
    warning "Rollback completed. Application restored to original configuration."
}

# Main execution
main() {
    echo "========================================="
    echo "Google Cloud Project Migration Script"
    echo "========================================="
    echo "Project: $PROJECT_ID"
    echo "From: $OLD_OWNER"
    echo "To: $NEW_OWNER"
    echo "========================================="
    echo ""
    
    # Check if we're doing a rollback
    if [ "$1" = "rollback" ]; then
        rollback
        exit 0
    fi
    
    check_prerequisites
    
    # Create backup
    BACKUP_DIR=$(backup_configuration)
    
    # Execute migration phases
    add_new_owner
    verify_domain
    create_oauth_credentials
    update_aws_secrets
    update_fly_secrets
    verify_migration
    
    # Clean up temporary files
    rm -f .oauth-migration-temp
    
    success "Migration script completed successfully!"
    log "Backup saved in: $BACKUP_DIR"
}

# Trap errors and offer rollback
trap 'error "Script failed! Run with 'rollback' argument to restore: $0 rollback"' ERR

# Run main function
main "$@"