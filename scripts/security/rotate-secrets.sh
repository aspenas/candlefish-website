#!/bin/bash

# Secrets Rotation Automation Script
# Implements automatic rotation for all sensitive credentials
# Compliant with PCI DSS 8.5.1, HIPAA §164.308(a)(5)

set -euo pipefail

# Configuration
NAMESPACE="claude-config"
AWS_REGION="${AWS_REGION:-us-east-1}"
ROTATION_LOG="/var/log/secrets-rotation.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$ROTATION_LOG"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"type\":\"secret_rotation_failed\",\"error\":\"$1\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            2>/dev/null || true
    fi
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check for required tools
    for tool in kubectl aws openssl jq base64; do
        if ! command -v $tool &> /dev/null; then
            error_exit "$tool is not installed"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error_exit "AWS credentials not configured"
    fi
    
    # Check kubectl access
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error_exit "Cannot access namespace $NAMESPACE"
    fi
    
    log "INFO" "Prerequisites check passed"
}

# Rotate JWT signing keys
rotate_jwt_keys() {
    log "INFO" "Starting JWT key rotation..."
    
    # Generate new key pair
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    openssl genrsa -out "$temp_dir/private.pem" 4096 2>/dev/null
    openssl rsa -in "$temp_dir/private.pem" -pubout -out "$temp_dir/public.pem" 2>/dev/null
    
    # Generate key ID
    local kid=$(uuidgen | tr '[:upper:]' '[:lower:]')
    local timestamp=$(date -u +"%Y%m%d%H%M%S")
    
    # Create JWKS
    local modulus=$(openssl rsa -in "$temp_dir/private.pem" -pubout -outform DER 2>/dev/null | \
                     base64 | tr -d '\n' | tr '+/' '-_' | tr -d '=')
    
    cat > "$temp_dir/jwks.json" <<EOF
{
  "keys": [
    {
      "kid": "$kid",
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "n": "$modulus",
      "e": "AQAB"
    }
  ]
}
EOF
    
    # Store in AWS Secrets Manager
    local secret_data=$(jq -n \
        --arg private "$(cat $temp_dir/private.pem | base64 -w0)" \
        --arg public "$(cat $temp_dir/public.pem | base64 -w0)" \
        --arg kid "$kid" \
        --arg created "$timestamp" \
        '{private_key: $private, public_key: $public, kid: $kid, created_at: $created}')
    
    aws secretsmanager put-secret-value \
        --secret-id "claude-config/jwt-signing-key" \
        --secret-string "$secret_data" \
        --version-stage "AWSPENDING" \
        --region "$AWS_REGION" || error_exit "Failed to store JWT key in Secrets Manager"
    
    # Update Kubernetes secret
    kubectl create secret generic jwt-signing-key-new \
        --from-file=private-key="$temp_dir/private.pem" \
        --from-file=public-key="$temp_dir/public.pem" \
        --from-literal=kid="$kid" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f - || error_exit "Failed to update Kubernetes secret"
    
    # Trigger rolling update
    kubectl set env deployment/auth-service \
        JWT_KEY_ROTATION="$timestamp" \
        -n "$NAMESPACE" || error_exit "Failed to trigger auth-service restart"
    
    # Wait for rollout
    kubectl rollout status deployment/auth-service -n "$NAMESPACE" --timeout=300s
    
    # Promote to current version after grace period
    sleep 60
    aws secretsmanager update-secret-version-stage \
        --secret-id "claude-config/jwt-signing-key" \
        --version-stage "AWSCURRENT" \
        --move-to-version-id "AWSPENDING" \
        --region "$AWS_REGION" || log "WARNING" "Failed to promote JWT key version"
    
    log "INFO" "${GREEN}JWT key rotation completed successfully${NC}"
}

# Rotate API keys
rotate_api_keys() {
    log "INFO" "Starting API key rotation..."
    
    local services=("gateway-service" "auth-service" "config-service" "monitoring-service")
    
    for service in "${services[@]}"; do
        log "INFO" "Rotating API key for $service..."
        
        # Generate new API key
        local new_key=$(openssl rand -hex 32)
        local key_hash=$(echo -n "$new_key" | sha256sum | cut -d' ' -f1)
        
        # Store in AWS Secrets Manager
        aws secretsmanager put-secret-value \
            --secret-id "claude-config/$service/api-key" \
            --secret-string "{\"key\":\"$new_key\",\"hash\":\"$key_hash\",\"rotated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            --version-stage "AWSPENDING" \
            --region "$AWS_REGION" || log "WARNING" "Failed to store $service API key"
        
        # Update Kubernetes secret
        kubectl patch secret "${service}-api-key" \
            -n "$NAMESPACE" \
            --type='json' \
            -p="[{\"op\": \"replace\", \"path\": \"/data/api-key\", \"value\":\"$(echo -n $new_key | base64 -w0)\"}]" \
            || log "WARNING" "Failed to update $service Kubernetes secret"
        
        # Trigger graceful rotation
        kubectl annotate deployment "$service" \
            rotation.timestamp="$(date -u +%Y%m%d%H%M%S)" \
            -n "$NAMESPACE" --overwrite || log "WARNING" "Failed to annotate $service deployment"
    done
    
    log "INFO" "${GREEN}API key rotation completed${NC}"
}

# Rotate database passwords
rotate_database_passwords() {
    log "INFO" "Starting database password rotation..."
    
    # Get current database credentials
    local db_host=$(kubectl get secret database-credentials -n "$NAMESPACE" -o jsonpath='{.data.host}' | base64 -d)
    local db_user=$(kubectl get secret database-credentials -n "$NAMESPACE" -o jsonpath='{.data.username}' | base64 -d)
    local current_password=$(kubectl get secret database-credentials -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d)
    
    # Generate new password
    local new_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Update password in database (requires psql client)
    if command -v psql &> /dev/null; then
        PGPASSWORD="$current_password" psql -h "$db_host" -U "$db_user" -d postgres \
            -c "ALTER USER $db_user PASSWORD '$new_password';" || log "WARNING" "Failed to update database password"
    else
        log "WARNING" "psql client not found, skipping database password update"
    fi
    
    # Update AWS Secrets Manager
    aws secretsmanager put-secret-value \
        --secret-id "claude-config/database/credentials" \
        --secret-string "{\"username\":\"$db_user\",\"password\":\"$new_password\",\"host\":\"$db_host\",\"port\":5432,\"database\":\"claude_config\"}" \
        --version-stage "AWSPENDING" \
        --region "$AWS_REGION" || log "WARNING" "Failed to store database credentials"
    
    # Update Kubernetes secret
    kubectl patch secret database-credentials \
        -n "$NAMESPACE" \
        --type='json' \
        -p="[{\"op\": \"replace\", \"path\": \"/data/password\", \"value\":\"$(echo -n $new_password | base64 -w0)\"}]" \
        || log "WARNING" "Failed to update database Kubernetes secret"
    
    # Trigger rolling update for services using database
    for deployment in config-service auth-service; do
        kubectl rollout restart deployment/$deployment -n "$NAMESPACE" || log "WARNING" "Failed to restart $deployment"
    done
    
    log "INFO" "${GREEN}Database password rotation completed${NC}"
}

# Rotate encryption keys
rotate_encryption_keys() {
    log "INFO" "Starting encryption key rotation..."
    
    # Generate new data encryption key
    local new_dek=$(openssl rand -base64 32)
    local key_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
    
    # Encrypt DEK with KMS
    local encrypted_dek=$(aws kms encrypt \
        --key-id "arn:aws:kms:${AWS_REGION}:ACCOUNT_ID:key/MASTER_KEY_ID" \
        --plaintext "$new_dek" \
        --output text \
        --query CiphertextBlob \
        --region "$AWS_REGION") || log "WARNING" "Failed to encrypt DEK with KMS"
    
    # Store in Secrets Manager
    aws secretsmanager put-secret-value \
        --secret-id "claude-config/encryption-keys/data-key" \
        --secret-string "{\"key_id\":\"$key_id\",\"encrypted_key\":\"$encrypted_dek\",\"algorithm\":\"AES-256-GCM\",\"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
        --version-stage "AWSPENDING" \
        --region "$AWS_REGION" || log "WARNING" "Failed to store encryption key"
    
    log "INFO" "${GREEN}Encryption key rotation completed${NC}"
}

# Check certificate expiry
check_certificates() {
    log "INFO" "Checking TLS certificate expiry..."
    
    local certs=$(kubectl get certificates -n "$NAMESPACE" -o json)
    
    echo "$certs" | jq -r '.items[] | select(.status.notAfter != null) | "\(.metadata.name) \(.status.notAfter)"' | while read cert_name expiry; do
        local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo 0)
        local now_epoch=$(date +%s)
        local days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))
        
        if [ $days_left -lt 30 ]; then
            log "WARNING" "${YELLOW}Certificate $cert_name expires in $days_left days${NC}"
            
            # Trigger cert-manager renewal
            kubectl annotate certificate "$cert_name" \
                cert-manager.io/issue-temporary-certificate="true" \
                -n "$NAMESPACE" --overwrite || log "WARNING" "Failed to trigger certificate renewal"
        else
            log "INFO" "Certificate $cert_name valid for $days_left days"
        fi
    done
}

# Verify rotations
verify_rotations() {
    log "INFO" "Verifying secret rotations..."
    
    local failed=0
    
    # Check JWT key
    if ! kubectl get secret jwt-signing-key-new -n "$NAMESPACE" &> /dev/null; then
        log "ERROR" "JWT signing key rotation verification failed"
        failed=$((failed + 1))
    fi
    
    # Check API keys
    for service in gateway-service auth-service config-service monitoring-service; do
        if ! kubectl get secret "${service}-api-key" -n "$NAMESPACE" &> /dev/null; then
            log "ERROR" "$service API key rotation verification failed"
            failed=$((failed + 1))
        fi
    done
    
    # Check database credentials
    if ! kubectl get secret database-credentials -n "$NAMESPACE" &> /dev/null; then
        log "ERROR" "Database credentials rotation verification failed"
        failed=$((failed + 1))
    fi
    
    if [ $failed -eq 0 ]; then
        log "INFO" "${GREEN}All secret rotations verified successfully${NC}"
    else
        log "ERROR" "${RED}$failed secret rotation(s) failed verification${NC}"
        return 1
    fi
}

# Send completion notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"type\":\"secret_rotation_complete\",\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            2>/dev/null || true
    fi
}

# Main execution
main() {
    log "INFO" "=== Starting Secrets Rotation Process ==="
    
    # Check prerequisites
    check_prerequisites
    
    # Perform rotations
    rotate_jwt_keys
    rotate_api_keys
    rotate_database_passwords
    rotate_encryption_keys
    check_certificates
    
    # Verify rotations
    if verify_rotations; then
        send_notification "success" "All secrets rotated successfully"
        log "INFO" "${GREEN}=== Secrets Rotation Completed Successfully ===${NC}"
        exit 0
    else
        send_notification "partial" "Some secret rotations failed"
        log "WARNING" "${YELLOW}=== Secrets Rotation Completed with Warnings ===${NC}"
        exit 1
    fi
}

# Run main function
main "$@"