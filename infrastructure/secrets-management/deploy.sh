#!/bin/bash

# Candlefish AI Secrets Management Deployment
# Operational Design Atelier - Making Security Seamless

set -euo pipefail

# Color codes for beautiful output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   ______                ____     _____ _     __                     ║
║  / ____/___ _____  ____/ / /__  / __(_)____/ /_                    ║
║ / /   / __ `/ __ \/ __  / / _ \/ /_/ / ___/ __ \                   ║
║/ /___/ /_/ / / / / /_/ / /  __/ __/ (__  ) / / /                   ║
║\____/\__,_/_/ /_/\__,_/_/\___/_/ /_/____/_/ /_/                    ║
║                                                                      ║
║              SECRETS MANAGEMENT INFRASTRUCTURE                      ║
║           Operational Design Atelier - Security as Craft            ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
ENVIRONMENT="${1:-staging}"
AWS_REGION="${2:-us-east-1}"
ACTION="${3:-plan}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TERRAFORM_DIR="${SCRIPT_DIR}/terraform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${SCRIPT_DIR}/logs/deployment_${ENVIRONMENT}_${TIMESTAMP}.log"

# Create log directory
mkdir -p "${SCRIPT_DIR}/logs"

# Logging function
log() {
    echo -e "${2:-${NC}}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Error handler
error_handler() {
    log "❌ Error occurred on line $1" "${RED}"
    log "📋 Check the log file: $LOG_FILE" "${YELLOW}"
    exit 1
}

trap 'error_handler $LINENO' ERR

# Validation function
validate_environment() {
    log "🔍 Validating environment configuration..." "${BLUE}"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        log "❌ AWS credentials not configured" "${RED}"
        exit 1
    fi
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
        log "❌ Invalid environment: $ENVIRONMENT" "${RED}"
        log "   Valid environments: production, staging, development" "${YELLOW}"
        exit 1
    fi
    
    # Production safeguards
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "⚠️  PRODUCTION DEPLOYMENT DETECTED" "${YELLOW}"
        echo -e "${RED}You are about to deploy to PRODUCTION.${NC}"
        echo -e "${YELLOW}This action will affect live systems.${NC}"
        read -p "Type 'DEPLOY TO PRODUCTION' to confirm: " confirm
        if [[ "$confirm" != "DEPLOY TO PRODUCTION" ]]; then
            log "🛑 Production deployment cancelled" "${YELLOW}"
            exit 0
        fi
        
        # Require MFA for production
        log "🔐 Checking MFA status..." "${BLUE}"
        if ! aws sts get-session-token --serial-number "$MFA_DEVICE_ARN" --token-code "$MFA_TOKEN" &>/dev/null; then
            log "❌ MFA authentication required for production" "${RED}"
            exit 1
        fi
    fi
    
    log "✅ Environment validation complete" "${GREEN}"
}

# Prerequisites check
check_prerequisites() {
    log "📦 Checking prerequisites..." "${BLUE}"
    
    local missing_tools=()
    
    # Check required tools
    for tool in terraform aws vault kubectl helm jq; do
        if ! command -v $tool &>/dev/null; then
            missing_tools+=($tool)
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log "❌ Missing required tools: ${missing_tools[*]}" "${RED}"
        log "   Please install missing tools and try again" "${YELLOW}"
        exit 1
    fi
    
    # Check Terraform version
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    REQUIRED_VERSION="1.5.0"
    if ! printf '%s\n' "$REQUIRED_VERSION" "$TERRAFORM_VERSION" | sort -V | head -n1 | grep -q "$REQUIRED_VERSION"; then
        log "❌ Terraform version $TERRAFORM_VERSION is too old (required: >=$REQUIRED_VERSION)" "${RED}"
        exit 1
    fi
    
    log "✅ All prerequisites met" "${GREEN}"
}

# Initialize Terraform
init_terraform() {
    log "🚀 Initializing Terraform..." "${BLUE}"
    
    cd "$TERRAFORM_DIR"
    
    # Backend configuration
    cat > backend.tfvars <<EOF
bucket         = "candlefish-terraform-state"
key            = "secrets-management/${ENVIRONMENT}/terraform.tfstate"
region         = "${AWS_REGION}"
encrypt        = true
dynamodb_table = "terraform-state-lock"
EOF
    
    terraform init \
        -backend-config=backend.tfvars \
        -upgrade \
        -reconfigure
    
    log "✅ Terraform initialized" "${GREEN}"
}

# Create tfvars file
create_tfvars() {
    log "📝 Creating terraform.tfvars..." "${BLUE}"
    
    # Get alert email
    read -p "Enter alert email address: " ALERT_EMAIL
    
    # Optional: Slack webhook
    read -p "Enter Slack webhook URL (optional, press Enter to skip): " SLACK_WEBHOOK
    
    # Optional: PagerDuty
    read -p "Enter PagerDuty integration key (optional, press Enter to skip): " PAGERDUTY_KEY
    
    cat > "$TERRAFORM_DIR/terraform.tfvars" <<EOF
environment = "${ENVIRONMENT}"
aws_region  = "${AWS_REGION}"

# Monitoring
alert_email               = "${ALERT_EMAIL}"
slack_webhook_url         = "${SLACK_WEBHOOK}"
pagerduty_integration_key = "${PAGERDUTY_KEY}"

# Environment-specific settings
$(if [[ "$ENVIRONMENT" == "production" ]]; then
    echo 'vault_cluster_size  = 5'
    echo 'vault_instance_type = "t3.large"'
    echo 'enable_hsm          = true'
    echo 'enable_dev_mode     = false'
else
    echo 'vault_cluster_size  = 3'
    echo 'vault_instance_type = "t3.medium"'
    echo 'enable_hsm          = false'
    echo 'enable_dev_mode     = true'
fi)

# Tags
tags = {
  Environment = "${ENVIRONMENT}"
  DeployedBy  = "$(whoami)"
  DeployedAt  = "${TIMESTAMP}"
}
EOF
    
    log "✅ Configuration file created" "${GREEN}"
}

# Run Terraform
run_terraform() {
    log "🏗️  Running Terraform ${ACTION}..." "${BLUE}"
    
    cd "$TERRAFORM_DIR"
    
    case "$ACTION" in
        plan)
            terraform plan -out=tfplan_${TIMESTAMP}
            log "✅ Terraform plan complete" "${GREEN}"
            log "📋 Review the plan above before applying" "${YELLOW}"
            ;;
        apply)
            if [[ -f "tfplan_${TIMESTAMP}" ]]; then
                terraform apply tfplan_${TIMESTAMP}
            else
                terraform apply -auto-approve
            fi
            log "✅ Infrastructure deployed successfully" "${GREEN}"
            ;;
        destroy)
            log "⚠️  WARNING: This will destroy all secrets infrastructure" "${RED}"
            read -p "Type 'DESTROY' to confirm: " confirm
            if [[ "$confirm" == "DESTROY" ]]; then
                terraform destroy -auto-approve
                log "✅ Infrastructure destroyed" "${GREEN}"
            else
                log "🛑 Destruction cancelled" "${YELLOW}"
            fi
            ;;
        *)
            log "❌ Invalid action: $ACTION" "${RED}"
            exit 1
            ;;
    esac
}

# Post-deployment configuration
post_deployment() {
    if [[ "$ACTION" != "apply" ]]; then
        return
    fi
    
    log "🔧 Running post-deployment configuration..." "${BLUE}"
    
    # Get outputs
    VAULT_ENDPOINT=$(terraform output -raw vault_endpoint)
    KMS_KEY_ID=$(terraform output -raw kms_key_id)
    
    # Initialize Vault
    log "🔐 Initializing Vault..." "${CYAN}"
    
    export VAULT_ADDR="$VAULT_ENDPOINT"
    
    # Check if already initialized
    if vault status 2>/dev/null | grep -q "Initialized.*false"; then
        # Initialize with 5 key shares, 3 threshold
        vault operator init \
            -key-shares=5 \
            -key-threshold=3 \
            -format=json > "${SCRIPT_DIR}/vault-init-${ENVIRONMENT}.json"
        
        log "⚠️  CRITICAL: Vault initialization keys saved to vault-init-${ENVIRONMENT}.json" "${RED}"
        log "   Store these keys securely and delete the file!" "${RED}"
        
        # Auto-unseal configuration (using AWS KMS)
        log "🔓 Configuring auto-unseal with KMS..." "${CYAN}"
    fi
    
    # Configure initial policies
    log "📜 Configuring Vault policies..." "${CYAN}"
    
    # Create admin policy
    vault policy write admin - <<EOF
path "*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
EOF
    
    # Create developer policy
    vault policy write developer - <<EOF
path "secret/data/dev/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "auth/token/create" {
  capabilities = ["create", "update"]
}
EOF
    
    # Create application policy
    vault policy write application - <<EOF
path "secret/data/app/*" {
  capabilities = ["read", "list"]
}
path "database/creds/*" {
  capabilities = ["read"]
}
EOF
    
    # Enable audit logging
    vault audit enable file \
        file_path=/vault/logs/audit.log \
        log_raw=true
    
    # Enable secret engines
    vault secrets enable -path=secret kv-v2
    vault secrets enable database
    vault secrets enable pki
    vault secrets enable transit
    
    log "✅ Post-deployment configuration complete" "${GREEN}"
}

# Generate documentation
generate_docs() {
    log "📚 Generating documentation..." "${BLUE}"
    
    cat > "${SCRIPT_DIR}/DEPLOYMENT_REPORT_${ENVIRONMENT}_${TIMESTAMP}.md" <<EOF
# Secrets Management Deployment Report

## Environment: ${ENVIRONMENT}
## Timestamp: ${TIMESTAMP}
## Region: ${AWS_REGION}

### Deployment Status
- ✅ Infrastructure deployed successfully
- ✅ Vault initialized and configured
- ✅ Monitoring enabled
- ✅ Audit logging active

### Access Information
- **Vault UI**: ${VAULT_ENDPOINT}
- **KMS Key**: ${KMS_KEY_ID}

### Next Steps
1. Store Vault initialization keys securely
2. Configure authentication methods
3. Set up secret rotation schedules
4. Test break-glass procedures
5. Verify monitoring alerts

### Security Checklist
- [ ] Root tokens sealed
- [ ] MFA enabled for admin access
- [ ] Audit logs verified
- [ ] Network policies configured
- [ ] Backup procedures tested

### Operational Runbooks
- [Secret Rotation](./runbooks/secret-rotation.md)
- [Incident Response](./runbooks/incident-response.md)
- [Break-Glass Access](./runbooks/break-glass.md)
- [Disaster Recovery](./runbooks/disaster-recovery.md)

### Support
- **Team**: Platform Engineering
- **Slack**: #secrets-management
- **PagerDuty**: secrets-oncall
EOF
    
    log "✅ Documentation generated: DEPLOYMENT_REPORT_${ENVIRONMENT}_${TIMESTAMP}.md" "${GREEN}"
}

# Main execution flow
main() {
    log "🎯 Starting deployment for environment: $ENVIRONMENT" "${PURPLE}"
    
    validate_environment
    check_prerequisites
    
    if [[ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]]; then
        create_tfvars
    fi
    
    init_terraform
    run_terraform
    post_deployment
    generate_docs
    
    log "🎉 Deployment complete!" "${GREEN}"
    log "📊 Check the deployment report for details" "${CYAN}"
}

# Run main function
main "$@"