#!/bin/bash

# AWS Secrets Manager Validation Script for Paintbox
# Validates all secrets are properly configured and accessible

set -euo pipefail

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="${PROJECT_ROOT}/logs/secrets-validation-$(date +%Y%m%d-%H%M%S).log"

# Environment variables
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SECRET_NAME="paintbox-${ENVIRONMENT}"

# Validation results
TOTAL_SECRETS=0
VALID_SECRETS=0
INVALID_SECRETS=0
MISSING_SECRETS=()
PLACEHOLDER_SECRETS=()
SECURITY_ISSUES=()

# Required secrets for Paintbox application
declare -A REQUIRED_SECRETS=(
    ["SALESFORCE_CLIENT_ID"]="Salesforce OAuth Client ID"
    ["SALESFORCE_CLIENT_SECRET"]="Salesforce OAuth Client Secret"
    ["SALESFORCE_USERNAME"]="Salesforce Username"
    ["SALESFORCE_PASSWORD"]="Salesforce Password"
    ["SALESFORCE_SECURITY_TOKEN"]="Salesforce Security Token"
    ["SALESFORCE_INSTANCE_URL"]="Salesforce Instance URL"
    ["COMPANYCAM_API_TOKEN"]="Company Cam API Token"
    ["COMPANYCAM_WEBHOOK_SECRET"]="Company Cam Webhook Secret"
    ["ANTHROPIC_API_KEY"]="Anthropic API Key"
    ["DATABASE_URL"]="PostgreSQL Database Connection URL"
    ["REDIS_URL"]="Redis Connection URL"
    ["ENCRYPTION_KEY"]="Application Encryption Key"
    ["JWT_SECRET"]="JWT Signing Secret"
    ["NEXTAUTH_SECRET"]="NextAuth.js Secret"
)

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${GREEN}$*${NC}"
}

log_warn() {
    log "WARN" "${YELLOW}$*${NC}"
}

log_error() {
    log "ERROR" "${RED}$*${NC}"
}

log_debug() {
    log "DEBUG" "${BLUE}$*${NC}"
}

# Validation functions
validate_prerequisites() {
    log_info "Validating prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        exit 1
    fi

    # Validate AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured properly"
        exit 1
    fi

    # Check if we have permissions to access Secrets Manager
    if ! aws secretsmanager list-secrets --region "$AWS_REGION" &> /dev/null; then
        log_error "No permissions to access AWS Secrets Manager"
        exit 1
    fi

    log_info "Prerequisites validation completed"
}

check_secret_exists() {
    log_info "Checking if secret exists: $SECRET_NAME"

    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" &>/dev/null; then
        log_info "✅ Secret exists: $SECRET_NAME"
        return 0
    else
        log_error "❌ Secret does not exist: $SECRET_NAME"
        return 1
    fi
}

validate_secret_encryption() {
    log_info "Validating secret encryption configuration..."

    local kms_key_id
    kms_key_id=$(aws secretsmanager describe-secret \
        --secret-id "$SECRET_NAME" \
        --region "$AWS_REGION" \
        --query 'KmsKeyId' \
        --output text)

    if [[ "$kms_key_id" == "None" ]] || [[ "$kms_key_id" == "null" ]]; then
        log_warn "⚠️  Secret is using default AWS managed encryption"
        SECURITY_ISSUES+=("Secret using default encryption instead of customer-managed KMS key")
        return 1
    else
        log_info "✅ Secret is encrypted with KMS key: $kms_key_id"

        # Validate key rotation if it's a customer-managed key
        if [[ "$kms_key_id" =~ ^arn:aws:kms: ]]; then
            local key_rotation
            key_rotation=$(aws kms get-key-rotation-status \
                --key-id "$kms_key_id" \
                --region "$AWS_REGION" \
                --query 'KeyRotationEnabled' \
                --output text 2>/dev/null || echo "false")

            if [[ "$key_rotation" == "true" ]]; then
                log_info "✅ KMS key rotation is enabled"
            else
                log_warn "⚠️  KMS key rotation is not enabled"
                SECURITY_ISSUES+=("KMS key rotation disabled")
            fi
        fi

        return 0
    fi
}

validate_secret_replication() {
    log_info "Checking secret replication configuration..."

    local replication_regions
    replication_regions=$(aws secretsmanager describe-secret \
        --secret-id "$SECRET_NAME" \
        --region "$AWS_REGION" \
        --query 'ReplicationStatus' \
        --output json)

    if [[ "$replication_regions" == "null" ]] || [[ "$replication_regions" == "[]" ]]; then
        log_warn "⚠️  Secret is not replicated to other regions"
        SECURITY_ISSUES+=("Secret not replicated for disaster recovery")
    else
        local replica_count
        replica_count=$(echo "$replication_regions" | jq length)
        log_info "✅ Secret is replicated to $replica_count region(s)"
    fi
}

get_secret_value() {
    local secret_string
    secret_string=$(aws secretsmanager get-secret-value \
        --secret-id "$SECRET_NAME" \
        --region "$AWS_REGION" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo "")

    if [[ -z "$secret_string" ]]; then
        log_error "❌ Unable to retrieve secret value"
        return 1
    fi

    echo "$secret_string"
}

validate_individual_secret() {
    local key="$1"
    local description="$2"
    local secret_value="$3"

    TOTAL_SECRETS=$((TOTAL_SECRETS + 1))

    log_debug "Validating secret: $key"

    # Check if secret exists in the JSON
    local value
    value=$(echo "$secret_value" | jq -r ".$key" 2>/dev/null || echo "null")

    if [[ "$value" == "null" ]]; then
        log_error "❌ Missing secret: $key ($description)"
        MISSING_SECRETS+=("$key")
        INVALID_SECRETS=$((INVALID_SECRETS + 1))
        return 1
    fi

    # Check for placeholder values
    if [[ "$value" == "REPLACE_WITH_ACTUAL_VALUE" ]] || [[ "$value" == "" ]]; then
        log_warn "⚠️  Placeholder value for: $key ($description)"
        PLACEHOLDER_SECRETS+=("$key")
        INVALID_SECRETS=$((INVALID_SECRETS + 1))
        return 1
    fi

    # Validate specific secret formats
    case "$key" in
        "SALESFORCE_CLIENT_ID")
            if [[ ! "$value" =~ ^3MVG[A-Za-z0-9._]{40,}$ ]]; then
                log_warn "⚠️  Salesforce Client ID format looks suspicious: $key"
                SECURITY_ISSUES+=("Suspicious Salesforce Client ID format")
            fi
            ;;
        "SALESFORCE_INSTANCE_URL")
            if [[ ! "$value" =~ ^https://.*\.salesforce\.com/?$ ]]; then
                log_warn "⚠️  Salesforce Instance URL format looks suspicious: $key"
                SECURITY_ISSUES+=("Suspicious Salesforce Instance URL format")
            fi
            ;;
        "DATABASE_URL")
            if [[ ! "$value" =~ ^postgresql:// ]]; then
                log_warn "⚠️  Database URL doesn't start with postgresql://: $key"
                SECURITY_ISSUES+=("Invalid database URL format")
            fi
            ;;
        "REDIS_URL")
            if [[ ! "$value" =~ ^redis:// ]]; then
                log_warn "⚠️  Redis URL doesn't start with redis://: $key"
                SECURITY_ISSUES+=("Invalid Redis URL format")
            fi
            ;;
        "ANTHROPIC_API_KEY")
            if [[ ! "$value" =~ ^sk-ant- ]]; then
                log_warn "⚠️  Anthropic API key format looks suspicious: $key"
                SECURITY_ISSUES+=("Suspicious Anthropic API key format")
            fi
            ;;
        "ENCRYPTION_KEY"|"JWT_SECRET"|"NEXTAUTH_SECRET")
            if [[ ${#value} -lt 32 ]]; then
                log_warn "⚠️  Secret $key appears to be too short (${#value} characters)"
                SECURITY_ISSUES+=("Short secret: $key")
            fi
            ;;
    esac

    # Check for common security issues
    if [[ "$value" =~ (password|secret|key|token) ]]; then
        log_warn "⚠️  Secret value for $key contains common words - might be a test value"
        SECURITY_ISSUES+=("Suspicious secret value: $key")
    fi

    # Check minimum length for secrets
    if [[ ${#value} -lt 8 ]]; then
        log_warn "⚠️  Secret $key is very short (${#value} characters)"
        SECURITY_ISSUES+=("Very short secret: $key")
    fi

    log_info "✅ Valid secret: $key ($description)"
    VALID_SECRETS=$((VALID_SECRETS + 1))
    return 0
}

validate_all_secrets() {
    log_info "Validating all required secrets..."

    local secret_value
    if ! secret_value=$(get_secret_value); then
        log_error "❌ Failed to retrieve secret value"
        return 1
    fi

    # Validate each required secret
    for key in "${!REQUIRED_SECRETS[@]}"; do
        validate_individual_secret "$key" "${REQUIRED_SECRETS[$key]}" "$secret_value"
    done

    # Check for unexpected secrets
    local all_keys
    all_keys=$(echo "$secret_value" | jq -r 'keys[]' 2>/dev/null || echo "")

    for key in $all_keys; do
        if [[ -z "${REQUIRED_SECRETS[$key]:-}" ]]; then
            log_warn "⚠️  Unexpected secret found: $key"
            SECURITY_ISSUES+=("Unexpected secret: $key")
        fi
    done
}

test_secret_access() {
    log_info "Testing secret access from application perspective..."

    # Test if ECS execution role can access the secret
    local execution_role="paintbox-ecs-execution-${ENVIRONMENT}"

    if aws iam get-role --role-name "$execution_role" &>/dev/null; then
        log_info "✅ ECS execution role exists: $execution_role"

        # Check if role has permission to access secrets
        local policies
        policies=$(aws iam list-attached-role-policies --role-name "$execution_role" --query 'AttachedPolicies[].PolicyArn' --output text)

        local has_secrets_access=false
        for policy_arn in $policies; do
            if [[ "$policy_arn" == *"SecretsManager"* ]] || [[ "$policy_arn" == *"secrets"* ]]; then
                has_secrets_access=true
                break
            fi
        done

        # Check inline policies
        local inline_policies
        inline_policies=$(aws iam list-role-policies --role-name "$execution_role" --query 'PolicyNames[]' --output text)

        for policy_name in $inline_policies; do
            local policy_doc
            policy_doc=$(aws iam get-role-policy --role-name "$execution_role" --policy-name "$policy_name" --query 'PolicyDocument' --output json)

            if echo "$policy_doc" | jq -r '.Statement[].Action[]?' | grep -q "secretsmanager:GetSecretValue"; then
                has_secrets_access=true
                break
            fi
        done

        if [[ "$has_secrets_access" == "true" ]]; then
            log_info "✅ ECS execution role has secrets access"
        else
            log_error "❌ ECS execution role lacks secrets access"
            SECURITY_ISSUES+=("ECS execution role missing secrets permissions")
        fi
    else
        log_error "❌ ECS execution role not found: $execution_role"
        SECURITY_ISSUES+=("ECS execution role missing")
    fi

    # Test application role access
    local app_role="paintbox-app-${ENVIRONMENT}"

    if aws iam get-role --role-name "$app_role" &>/dev/null; then
        log_info "✅ Application role exists: $app_role"

        # Similar check for app role...
        local app_policies
        app_policies=$(aws iam list-attached-role-policies --role-name "$app_role" --query 'AttachedPolicies[].PolicyArn' --output text)

        local has_app_secrets_access=false
        for policy_arn in $app_policies; do
            if [[ "$policy_arn" == *"SecretsManager"* ]] || [[ "$policy_arn" == *"secrets"* ]]; then
                has_app_secrets_access=true
                break
            fi
        done

        # Check inline policies for app role
        local app_inline_policies
        app_inline_policies=$(aws iam list-role-policies --role-name "$app_role" --query 'PolicyNames[]' --output text)

        for policy_name in $app_inline_policies; do
            local policy_doc
            policy_doc=$(aws iam get-role-policy --role-name "$app_role" --policy-name "$policy_name" --query 'PolicyDocument' --output json)

            if echo "$policy_doc" | jq -r '.Statement[].Action[]?' | grep -q "secretsmanager:GetSecretValue"; then
                has_app_secrets_access=true
                break
            fi
        done

        if [[ "$has_app_secrets_access" == "true" ]]; then
            log_info "✅ Application role has secrets access"
        else
            log_warn "⚠️  Application role may lack secrets access"
            SECURITY_ISSUES+=("Application role may lack secrets permissions")
        fi
    else
        log_error "❌ Application role not found: $app_role"
        SECURITY_ISSUES+=("Application role missing")
    fi
}

validate_secret_rotation() {
    log_info "Checking secret rotation configuration..."

    local rotation_config
    rotation_config=$(aws secretsmanager describe-secret \
        --secret-id "$SECRET_NAME" \
        --region "$AWS_REGION" \
        --query 'RotationEnabled' \
        --output text)

    if [[ "$rotation_config" == "true" ]]; then
        log_info "✅ Secret rotation is enabled"

        # Get rotation details
        local rotation_lambda
        rotation_lambda=$(aws secretsmanager describe-secret \
            --secret-id "$SECRET_NAME" \
            --region "$AWS_REGION" \
            --query 'RotationLambdaARN' \
            --output text)

        if [[ "$rotation_lambda" != "None" ]] && [[ "$rotation_lambda" != "null" ]]; then
            log_info "✅ Rotation Lambda configured: $rotation_lambda"
        else
            log_warn "⚠️  Rotation enabled but no Lambda function configured"
            SECURITY_ISSUES+=("Rotation enabled without Lambda")
        fi

        # Check last rotation
        local last_rotated
        last_rotated=$(aws secretsmanager describe-secret \
            --secret-id "$SECRET_NAME" \
            --region "$AWS_REGION" \
            --query 'LastRotatedDate' \
            --output text)

        if [[ "$last_rotated" != "None" ]] && [[ "$last_rotated" != "null" ]]; then
            log_info "✅ Secret was last rotated: $last_rotated"
        else
            log_warn "⚠️  Secret has never been rotated"
            SECURITY_ISSUES+=("Secret never rotated")
        fi
    else
        log_warn "⚠️  Secret rotation is not enabled"
        SECURITY_ISSUES+=("Secret rotation disabled")
    fi
}

check_secret_versions() {
    log_info "Checking secret versions..."

    local versions
    versions=$(aws secretsmanager list-secret-version-ids \
        --secret-id "$SECRET_NAME" \
        --region "$AWS_REGION" \
        --query 'Versions' \
        --output json)

    local version_count
    version_count=$(echo "$versions" | jq length)

    log_info "✅ Secret has $version_count version(s)"

    # Check for AWSCURRENT and AWSPENDING
    local current_version
    current_version=$(echo "$versions" | jq -r '.[] | select(.VersionStage[]? == "AWSCURRENT") | .VersionId')

    local pending_version
    pending_version=$(echo "$versions" | jq -r '.[] | select(.VersionStage[]? == "AWSPENDING") | .VersionId' 2>/dev/null || echo "")

    if [[ -n "$current_version" ]]; then
        log_info "✅ Current version: $current_version"
    else
        log_error "❌ No current version found"
        SECURITY_ISSUES+=("No current secret version")
    fi

    if [[ -n "$pending_version" ]]; then
        log_info "✅ Pending version: $pending_version"
    else
        log_debug "No pending version (normal during non-rotation periods)"
    fi
}

generate_secrets_report() {
    log_info "Generating secrets validation report..."

    local report_file="${PROJECT_ROOT}/secrets-validation-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).md"

    cat > "$report_file" << EOF
# AWS Secrets Manager Validation Report

**Environment:** ${ENVIRONMENT}
**Date:** $(date)
**Region:** ${AWS_REGION}
**Secret Name:** ${SECRET_NAME}

## Summary

- **Total Required Secrets:** ${TOTAL_SECRETS}
- **Valid Secrets:** ${VALID_SECRETS}
- **Invalid/Missing Secrets:** ${INVALID_SECRETS}
- **Security Issues:** ${#SECURITY_ISSUES[@]}
- **Completion Rate:** $((VALID_SECRETS * 100 / TOTAL_SECRETS))%

## Validation Status

$(if [[ $INVALID_SECRETS -eq 0 && ${#SECURITY_ISSUES[@]} -eq 0 ]]; then
    echo "🟢 **PASS** - All secrets are properly configured"
elif [[ $INVALID_SECRETS -eq 0 ]]; then
    echo "🟡 **PASS WITH WARNINGS** - All secrets exist but security improvements needed"
else
    echo "🔴 **FAIL** - Critical secrets missing or invalid"
fi)

## Missing Secrets

$(if [[ ${#MISSING_SECRETS[@]} -eq 0 ]]; then
    echo "None - All required secrets are present ✅"
else
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "- ❌ $secret: ${REQUIRED_SECRETS[$secret]}"
    done
fi)

## Placeholder Secrets

$(if [[ ${#PLACEHOLDER_SECRETS[@]} -eq 0 ]]; then
    echo "None - All secrets have real values ✅"
else
    for secret in "${PLACEHOLDER_SECRETS[@]}"; do
        echo "- ⚠️  $secret: ${REQUIRED_SECRETS[$secret]} (still has placeholder value)"
    done
fi)

## Security Issues

$(if [[ ${#SECURITY_ISSUES[@]} -eq 0 ]]; then
    echo "None - No security issues detected ✅"
else
    for issue in "${SECURITY_ISSUES[@]}"; do
        echo "- ⚠️  $issue"
    done
fi)

## Required Secrets Configuration

$(for key in "${!REQUIRED_SECRETS[@]}"; do
    echo "- **$key**: ${REQUIRED_SECRETS[$key]}"
done)

## Recommendations

$(if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo "### Critical Actions Required"
    echo "The following secrets must be configured before deployment:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "- Add $secret to AWS Secrets Manager"
    done
    echo ""
fi)

$(if [[ ${#PLACEHOLDER_SECRETS[@]} -gt 0 ]]; then
    echo "### Update Placeholder Values"
    echo "The following secrets have placeholder values that must be updated:"
    for secret in "${PLACEHOLDER_SECRETS[@]}"; do
        echo "- Update $secret with real production value"
    done
    echo ""
fi)

$(if [[ ${#SECURITY_ISSUES[@]} -gt 0 ]]; then
    echo "### Security Improvements"
    echo "The following security improvements are recommended:"
    for issue in "${SECURITY_ISSUES[@]}"; do
        case "$issue" in
            *"rotation"*)
                echo "- Enable automatic secret rotation with appropriate Lambda function"
                ;;
            *"encryption"*)
                echo "- Configure customer-managed KMS key for secret encryption"
                ;;
            *"replication"*)
                echo "- Enable secret replication to additional regions for disaster recovery"
                ;;
            *)
                echo "- Address: $issue"
                ;;
        esac
    done
fi)

## AWS CLI Commands for Updates

### Update a secret value:
\`\`\`bash
aws secretsmanager update-secret \\
    --secret-id $SECRET_NAME \\
    --region $AWS_REGION \\
    --secret-string '{"KEY_NAME": "new_value"}'
\`\`\`

### Enable secret rotation:
\`\`\`bash
aws secretsmanager rotate-secret \\
    --secret-id $SECRET_NAME \\
    --region $AWS_REGION \\
    --rotation-lambda-arn arn:aws:lambda:$AWS_REGION:ACCOUNT:function:paintbox-secret-rotation-$ENVIRONMENT
\`\`\`

### View secret (for debugging):
\`\`\`bash
aws secretsmanager get-secret-value \\
    --secret-id $SECRET_NAME \\
    --region $AWS_REGION \\
    --query SecretString \\
    --output text | jq .
\`\`\`

---

*Generated by Paintbox Secrets Manager Validation Script*
*Log file: ${LOG_FILE}*
EOF

    log_info "Secrets validation report generated: $report_file"
    echo "$report_file"
}

# Main execution
main() {
    log_info "Starting AWS Secrets Manager validation for environment: $ENVIRONMENT"

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    # Run validation steps
    validate_prerequisites

    if check_secret_exists; then
        validate_secret_encryption
        validate_secret_replication
        validate_all_secrets
        test_secret_access
        validate_secret_rotation
        check_secret_versions
    else
        log_error "Cannot proceed with validation - secret does not exist"
        INVALID_SECRETS=$((TOTAL_SECRETS))
        for key in "${!REQUIRED_SECRETS[@]}"; do
            MISSING_SECRETS+=("$key")
        done
    fi

    # Generate report
    local report_file
    report_file=$(generate_secrets_report)

    # Summary
    log_info "================================================="
    log_info "Secrets Manager Validation Complete"
    log_info "================================================="
    log_info "Total Required: $TOTAL_SECRETS"
    log_info "Valid: $VALID_SECRETS"
    log_info "Invalid/Missing: $INVALID_SECRETS"
    log_info "Security Issues: ${#SECURITY_ISSUES[@]}"

    if [[ $INVALID_SECRETS -eq 0 ]]; then
        log_info "Completion Rate: 100%"
    else
        log_info "Completion Rate: $((VALID_SECRETS * 100 / TOTAL_SECRETS))%"
    fi

    log_info "Report: $report_file"

    if [[ $INVALID_SECRETS -eq 0 && ${#SECURITY_ISSUES[@]} -eq 0 ]]; then
        log_info "🟢 All secrets are properly configured - Ready for deployment!"
        exit 0
    elif [[ $INVALID_SECRETS -eq 0 ]]; then
        log_warn "🟡 All secrets exist but security improvements recommended"
        exit 0
    else
        log_error "🔴 Critical secrets missing or invalid - Deployment not recommended"
        exit 1
    fi
}

# Show help
show_help() {
    cat << EOF
AWS Secrets Manager Validation Script for Paintbox

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Environment to validate (default: staging)
    -r, --region REGION      AWS region (default: us-east-1)
    -s, --secret-name NAME   Secret name override
    -h, --help              Show this help message

EXAMPLES:
    $0
    $0 --environment production
    $0 --environment staging --region us-west-2
    $0 --secret-name custom-secret-name

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            SECRET_NAME="paintbox-${ENVIRONMENT}"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -s|--secret-name)
            SECRET_NAME="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute main function
main "$@"
