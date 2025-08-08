#!/bin/bash

# Security Validation Script for Paintbox Staging Deployment
# Comprehensive security checks and compliance validation

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
readonly LOG_FILE="${PROJECT_ROOT}/logs/security-validation-$(date +%Y%m%d-%H%M%S).log"

# Environment variables
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Security check results
SECURITY_SCORE=0
TOTAL_CHECKS=0
FAILED_CHECKS=()
WARNINGS=()

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

# Security check functions
check_secrets_manager_integration() {
    log_info "Checking AWS Secrets Manager integration..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local secret_name="paintbox-${ENVIRONMENT}"

    if aws secretsmanager describe-secret --secret-id "$secret_name" &>/dev/null; then
        log_info "✅ Secrets Manager secret exists: $secret_name"

        # Check encryption
        local kms_key_id
        kms_key_id=$(aws secretsmanager describe-secret \
            --secret-id "$secret_name" \
            --query 'KmsKeyId' \
            --output text)

        if [[ "$kms_key_id" != "None" ]] && [[ "$kms_key_id" != "null" ]]; then
            log_info "✅ Secret is encrypted with KMS key: $kms_key_id"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        else
            log_warn "⚠️  Secret is not encrypted with customer-managed KMS key"
            WARNINGS+=("Secret not encrypted with customer-managed KMS")
        fi

        # Check for exposed secrets in environment variables
        local secret_value
        secret_value=$(aws secretsmanager get-secret-value \
            --secret-id "$secret_name" \
            --query 'SecretString' \
            --output text)

        local exposed_count=0
        if echo "$secret_value" | grep -q "REPLACE_WITH_ACTUAL_VALUE"; then
            exposed_count=$(echo "$secret_value" | grep -o "REPLACE_WITH_ACTUAL_VALUE" | wc -l)
            log_warn "⚠️  $exposed_count secrets still have placeholder values"
            WARNINGS+=("$exposed_count secrets have placeholder values")
        else
            log_info "✅ All secrets appear to have real values"
        fi

    else
        log_error "❌ Secrets Manager secret not found: $secret_name"
        FAILED_CHECKS+=("Secrets Manager secret missing")
        return 1
    fi
}

check_kms_encryption() {
    log_info "Checking KMS encryption configuration..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local kms_alias="alias/paintbox-${ENVIRONMENT}"

    if aws kms describe-key --key-id "$kms_alias" &>/dev/null; then
        log_info "✅ KMS key exists: $kms_alias"

        # Check key rotation
        local key_arn
        key_arn=$(aws kms describe-key --key-id "$kms_alias" --query 'KeyMetadata.Arn' --output text)

        if aws kms get-key-rotation-status --key-id "$key_arn" --query 'KeyRotationEnabled' --output text | grep -q "True"; then
            log_info "✅ KMS key rotation is enabled"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        else
            log_warn "⚠️  KMS key rotation is not enabled"
            WARNINGS+=("KMS key rotation disabled")
        fi

        # Check key usage
        local key_usage
        key_usage=$(aws kms describe-key --key-id "$kms_alias" --query 'KeyMetadata.KeyUsage' --output text)

        if [[ "$key_usage" == "ENCRYPT_DECRYPT" ]]; then
            log_info "✅ KMS key configured for encryption/decryption"
        else
            log_warn "⚠️  KMS key has unexpected usage: $key_usage"
            WARNINGS+=("Unexpected KMS key usage: $key_usage")
        fi

    else
        log_error "❌ KMS key not found: $kms_alias"
        FAILED_CHECKS+=("KMS key missing")
        return 1
    fi
}

check_vpc_security() {
    log_info "Checking VPC security configuration..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local vpc_name="paintbox-vpc-${ENVIRONMENT}"

    # Get VPC ID
    local vpc_id
    vpc_id=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Name,Values=$vpc_name" \
        --query 'Vpcs[0].VpcId' \
        --output text 2>/dev/null || echo "None")

    if [[ "$vpc_id" == "None" ]] || [[ -z "$vpc_id" ]]; then
        log_error "❌ VPC not found: $vpc_name"
        FAILED_CHECKS+=("VPC not found")
        return 1
    fi

    log_info "✅ VPC found: $vpc_id"

    # Check private subnets
    local private_subnets
    private_subnets=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$vpc_id" "Name=tag:Type,Values=private" \
        --query 'length(Subnets)' \
        --output text)

    if [[ "$private_subnets" -ge 2 ]]; then
        log_info "✅ VPC has $private_subnets private subnets"
        SECURITY_SCORE=$((SECURITY_SCORE + 1))
    else
        log_error "❌ VPC has insufficient private subnets: $private_subnets"
        FAILED_CHECKS+=("Insufficient private subnets")
    fi

    # Check NAT Gateway
    local nat_gateways
    nat_gateways=$(aws ec2 describe-nat-gateways \
        --filter "Name=vpc-id,Values=$vpc_id" "Name=state,Values=available" \
        --query 'length(NatGateways)' \
        --output text)

    if [[ "$nat_gateways" -gt 0 ]]; then
        log_info "✅ VPC has $nat_gateways NAT Gateway(s)"
    else
        log_warn "⚠️  No NAT Gateways found in VPC"
        WARNINGS+=("No NAT Gateways found")
    fi
}

check_security_groups() {
    log_info "Checking security group configurations..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local insecure_rules=0

    # Check for overly permissive rules
    local security_groups
    security_groups=$(aws ec2 describe-security-groups \
        --filters "Name=tag:Project,Values=Paintbox" \
        --query 'SecurityGroups[].GroupId' \
        --output text)

    for sg_id in $security_groups; do
        log_debug "Checking security group: $sg_id"

        # Check for 0.0.0.0/0 ingress rules (except for ALB)
        local wide_open_ingress
        wide_open_ingress=$(aws ec2 describe-security-groups \
            --group-ids "$sg_id" \
            --query 'SecurityGroups[0].IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]' \
            --output json)

        if [[ "$wide_open_ingress" != "[]" ]]; then
            local sg_name
            sg_name=$(aws ec2 describe-security-groups \
                --group-ids "$sg_id" \
                --query 'SecurityGroups[0].GroupName' \
                --output text)

            # Allow wide-open rules for ALB only
            if [[ "$sg_name" != *"alb"* ]]; then
                log_warn "⚠️  Security group $sg_name has wide-open ingress rules"
                insecure_rules=$((insecure_rules + 1))
                WARNINGS+=("Security group $sg_name has wide-open ingress")
            fi
        fi
    done

    if [[ "$insecure_rules" -eq 0 ]]; then
        log_info "✅ Security groups follow least privilege principle"
        SECURITY_SCORE=$((SECURITY_SCORE + 1))
    else
        log_warn "⚠️  Found $insecure_rules potentially insecure security group rules"
    fi
}

check_database_security() {
    log_info "Checking database security configuration..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local db_identifier="paintbox-${ENVIRONMENT}"

    if aws rds describe-db-instances --db-instance-identifier "$db_identifier" &>/dev/null; then
        log_info "✅ Database instance found: $db_identifier"

        # Check encryption at rest
        local storage_encrypted
        storage_encrypted=$(aws rds describe-db-instances \
            --db-instance-identifier "$db_identifier" \
            --query 'DBInstances[0].StorageEncrypted' \
            --output text)

        if [[ "$storage_encrypted" == "True" ]]; then
            log_info "✅ Database storage is encrypted"
        else
            log_error "❌ Database storage is not encrypted"
            FAILED_CHECKS+=("Database storage not encrypted")
        fi

        # Check public accessibility
        local publicly_accessible
        publicly_accessible=$(aws rds describe-db-instances \
            --db-instance-identifier "$db_identifier" \
            --query 'DBInstances[0].PubliclyAccessible' \
            --output text)

        if [[ "$publicly_accessible" == "False" ]]; then
            log_info "✅ Database is not publicly accessible"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        else
            log_error "❌ Database is publicly accessible"
            FAILED_CHECKS+=("Database publicly accessible")
        fi

        # Check backup retention
        local backup_retention
        backup_retention=$(aws rds describe-db-instances \
            --db-instance-identifier "$db_identifier" \
            --query 'DBInstances[0].BackupRetentionPeriod' \
            --output text)

        if [[ "$backup_retention" -ge 7 ]]; then
            log_info "✅ Database backup retention is $backup_retention days"
        else
            log_warn "⚠️  Database backup retention is only $backup_retention days"
            WARNINGS+=("Low database backup retention: $backup_retention days")
        fi

    else
        log_error "❌ Database instance not found: $db_identifier"
        FAILED_CHECKS+=("Database instance missing")
        return 1
    fi
}

check_redis_security() {
    log_info "Checking Redis security configuration..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local replication_group_id="paintbox-${ENVIRONMENT}"

    if aws elasticache describe-replication-groups --replication-group-id "$replication_group_id" &>/dev/null; then
        log_info "✅ Redis replication group found: $replication_group_id"

        # Check encryption at rest
        local at_rest_encryption
        at_rest_encryption=$(aws elasticache describe-replication-groups \
            --replication-group-id "$replication_group_id" \
            --query 'ReplicationGroups[0].AtRestEncryptionEnabled' \
            --output text)

        if [[ "$at_rest_encryption" == "True" ]]; then
            log_info "✅ Redis encryption at rest is enabled"
        else
            log_error "❌ Redis encryption at rest is not enabled"
            FAILED_CHECKS+=("Redis encryption at rest disabled")
        fi

        # Check encryption in transit
        local transit_encryption
        transit_encryption=$(aws elasticache describe-replication-groups \
            --replication-group-id "$replication_group_id" \
            --query 'ReplicationGroups[0].TransitEncryptionEnabled' \
            --output text)

        if [[ "$transit_encryption" == "True" ]]; then
            log_info "✅ Redis encryption in transit is enabled"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        else
            log_error "❌ Redis encryption in transit is not enabled"
            FAILED_CHECKS+=("Redis encryption in transit disabled")
        fi

        # Check auth token
        local auth_token_enabled
        auth_token_enabled=$(aws elasticache describe-replication-groups \
            --replication-group-id "$replication_group_id" \
            --query 'ReplicationGroups[0].AuthTokenEnabled' \
            --output text)

        if [[ "$auth_token_enabled" == "True" ]]; then
            log_info "✅ Redis auth token is enabled"
        else
            log_warn "⚠️  Redis auth token is not enabled"
            WARNINGS+=("Redis auth token disabled")
        fi

    else
        log_error "❌ Redis replication group not found: $replication_group_id"
        FAILED_CHECKS+=("Redis replication group missing")
        return 1
    fi
}

check_waf_configuration() {
    log_info "Checking WAF configuration..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local web_acl_name="paintbox-web-acl-${ENVIRONMENT}"

    # WAF is created for CloudFront (global scope)
    local web_acl_arn
    web_acl_arn=$(aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1 \
        --query "WebACLs[?Name=='$web_acl_name'].ARN" \
        --output text 2>/dev/null || echo "")

    if [[ -n "$web_acl_arn" ]]; then
        log_info "✅ WAF Web ACL found: $web_acl_name"

        # Check rate limiting rule
        local rules
        rules=$(aws wafv2 get-web-acl --id "$web_acl_arn" --scope CLOUDFRONT --region us-east-1 \
            --query 'WebACL.Rules[?Name==`RateLimitRule`]' \
            --output json)

        if [[ "$rules" != "[]" ]]; then
            log_info "✅ WAF rate limiting rule is configured"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        else
            log_warn "⚠️  WAF rate limiting rule not found"
            WARNINGS+=("WAF rate limiting rule missing")
        fi

        # Check managed rule sets
        local managed_rules
        managed_rules=$(aws wafv2 get-web-acl --id "$web_acl_arn" --scope CLOUDFRONT --region us-east-1 \
            --query 'length(WebACL.Rules[?Statement.ManagedRuleGroupStatement])' \
            --output text)

        if [[ "$managed_rules" -gt 0 ]]; then
            log_info "✅ WAF has $managed_rules managed rule set(s)"
        else
            log_warn "⚠️  No WAF managed rule sets found"
            WARNINGS+=("No WAF managed rule sets")
        fi

    else
        log_warn "⚠️  WAF Web ACL not found: $web_acl_name"
        WARNINGS+=("WAF Web ACL missing")
    fi
}

check_ecs_security() {
    log_info "Checking ECS security configuration..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local cluster_name="paintbox-${ENVIRONMENT}"

    if aws ecs describe-clusters --clusters "$cluster_name" &>/dev/null; then
        log_info "✅ ECS cluster found: $cluster_name"

        # Check container insights
        local container_insights
        container_insights=$(aws ecs describe-clusters --clusters "$cluster_name" \
            --query 'clusters[0].settings[?name==`containerInsights`].value' \
            --output text)

        if [[ "$container_insights" == "enabled" ]]; then
            log_info "✅ ECS Container Insights is enabled"
        else
            log_warn "⚠️  ECS Container Insights is not enabled"
            WARNINGS+=("ECS Container Insights disabled")
        fi

        # Check execute command configuration
        local exec_config
        exec_config=$(aws ecs describe-clusters --clusters "$cluster_name" \
            --query 'clusters[0].configuration.executeCommandConfiguration' \
            --output json)

        if [[ "$exec_config" != "null" ]]; then
            log_info "✅ ECS execute command is configured"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        else
            log_warn "⚠️  ECS execute command is not configured"
            WARNINGS+=("ECS execute command not configured")
        fi

        # Check service task definitions for security
        local services
        services=$(aws ecs list-services --cluster "$cluster_name" --query 'serviceArns' --output text)

        for service_arn in $services; do
            local service_name
            service_name=$(basename "$service_arn")

            local task_def_arn
            task_def_arn=$(aws ecs describe-services \
                --cluster "$cluster_name" \
                --services "$service_name" \
                --query 'services[0].taskDefinition' \
                --output text)

            # Check if secrets are used instead of environment variables
            local secrets_count
            secrets_count=$(aws ecs describe-task-definition \
                --task-definition "$task_def_arn" \
                --query 'length(taskDefinition.containerDefinitions[0].secrets)' \
                --output text 2>/dev/null || echo "0")

            local env_count
            env_count=$(aws ecs describe-task-definition \
                --task-definition "$task_def_arn" \
                --query 'length(taskDefinition.containerDefinitions[0].environment)' \
                --output text 2>/dev/null || echo "0")

            if [[ "$secrets_count" -gt 0 ]]; then
                log_info "✅ Service $service_name uses $secrets_count secrets from Secrets Manager"
            else
                log_warn "⚠️  Service $service_name doesn't use Secrets Manager"
                WARNINGS+=("Service $service_name not using Secrets Manager")
            fi

            # Check for non-root user
            local user_config
            user_config=$(aws ecs describe-task-definition \
                --task-definition "$task_def_arn" \
                --query 'taskDefinition.containerDefinitions[0].user' \
                --output text 2>/dev/null || echo "null")

            if [[ "$user_config" != "null" ]] && [[ "$user_config" != "0" ]] && [[ "$user_config" != "root" ]]; then
                log_info "✅ Service $service_name runs as non-root user: $user_config"
            else
                log_warn "⚠️  Service $service_name may be running as root"
                WARNINGS+=("Service $service_name running as root")
            fi
        done

    else
        log_error "❌ ECS cluster not found: $cluster_name"
        FAILED_CHECKS+=("ECS cluster missing")
        return 1
    fi
}

check_cloudwatch_logs() {
    log_info "Checking CloudWatch Logs security..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local log_groups
    log_groups=$(aws logs describe-log-groups \
        --log-group-name-prefix "/aws/paintbox" \
        --query 'logGroups[].logGroupName' \
        --output text)

    local encrypted_groups=0
    local total_groups=0

    for log_group in $log_groups; do
        total_groups=$((total_groups + 1))

        local kms_key_id
        kms_key_id=$(aws logs describe-log-groups \
            --log-group-name-prefix "$log_group" \
            --query 'logGroups[0].kmsKeyId' \
            --output text)

        if [[ "$kms_key_id" != "None" ]] && [[ "$kms_key_id" != "null" ]]; then
            encrypted_groups=$((encrypted_groups + 1))
        fi
    done

    if [[ "$total_groups" -gt 0 ]]; then
        log_info "✅ Found $total_groups CloudWatch log groups"

        if [[ "$encrypted_groups" -eq "$total_groups" ]]; then
            log_info "✅ All log groups are encrypted with KMS"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        else
            log_warn "⚠️  Only $encrypted_groups of $total_groups log groups are encrypted"
            WARNINGS+=("$((total_groups - encrypted_groups)) log groups not encrypted")
        fi
    else
        log_warn "⚠️  No CloudWatch log groups found"
        WARNINGS+=("No CloudWatch log groups found")
    fi
}

check_iam_roles() {
    log_info "Checking IAM role security..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local app_role="paintbox-app-${ENVIRONMENT}"

    if aws iam get-role --role-name "$app_role" &>/dev/null; then
        log_info "✅ Application IAM role found: $app_role"

        # Check assume role policy
        local assume_role_policy
        assume_role_policy=$(aws iam get-role --role-name "$app_role" \
            --query 'Role.AssumeRolePolicyDocument' \
            --output json)

        # Check for wildcard principals
        if echo "$assume_role_policy" | jq -r '.Statement[].Principal.AWS[]?' 2>/dev/null | grep -q '\*'; then
            log_error "❌ IAM role has wildcard principal in assume role policy"
            FAILED_CHECKS+=("IAM role wildcard principal")
        else
            log_info "✅ IAM role assume role policy follows least privilege"
            SECURITY_SCORE=$((SECURITY_SCORE + 1))
        fi

        # Check attached policies
        local attached_policies
        attached_policies=$(aws iam list-attached-role-policies --role-name "$app_role" \
            --query 'AttachedPolicies[].PolicyName' \
            --output text)

        if echo "$attached_policies" | grep -q "AdministratorAccess\|PowerUserAccess"; then
            log_error "❌ IAM role has overly broad permissions"
            FAILED_CHECKS+=("IAM role overly broad permissions")
        else
            log_info "✅ IAM role follows least privilege principle"
        fi

    else
        log_error "❌ Application IAM role not found: $app_role"
        FAILED_CHECKS+=("Application IAM role missing")
        return 1
    fi
}

check_container_image_security() {
    log_info "Checking container image security..."
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    # This would typically integrate with ECR image scanning
    # For now, we'll check if ECR repositories exist and have scan on push enabled

    local repositories=("paintbox-frontend" "paintbox-backend")
    local secure_repos=0

    for repo in "${repositories[@]}"; do
        if aws ecr describe-repositories --repository-names "$repo" &>/dev/null; then
            log_info "✅ ECR repository found: $repo"

            # Check scan on push
            local scan_config
            scan_config=$(aws ecr describe-repositories --repository-names "$repo" \
                --query 'repositories[0].imageScanningConfiguration.scanOnPush' \
                --output text)

            if [[ "$scan_config" == "True" ]]; then
                log_info "✅ ECR repository $repo has scan on push enabled"
                secure_repos=$((secure_repos + 1))
            else
                log_warn "⚠️  ECR repository $repo doesn't have scan on push enabled"
                WARNINGS+=("ECR repository $repo scan on push disabled")
            fi
        else
            log_warn "⚠️  ECR repository not found: $repo"
            WARNINGS+=("ECR repository $repo missing")
        fi
    done

    if [[ "$secure_repos" -gt 0 ]]; then
        SECURITY_SCORE=$((SECURITY_SCORE + 1))
    fi
}

# Generate security report
generate_security_report() {
    log_info "Generating security validation report..."

    local report_file="${PROJECT_ROOT}/security-validation-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).md"

    cat > "$report_file" << EOF
# Security Validation Report

**Environment:** ${ENVIRONMENT}
**Date:** $(date)
**Region:** ${AWS_REGION}

## Summary

- **Total Security Checks:** ${TOTAL_CHECKS}
- **Passed Checks:** ${SECURITY_SCORE}
- **Failed Checks:** ${#FAILED_CHECKS[@]}
- **Warnings:** ${#WARNINGS[@]}
- **Security Score:** ${SECURITY_SCORE}/${TOTAL_CHECKS} ($(( SECURITY_SCORE * 100 / TOTAL_CHECKS ))%)

## Security Status

$(if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then
    echo "🟢 **PASS** - All critical security checks passed"
else
    echo "🔴 **FAIL** - Critical security issues found"
fi)

## Failed Checks

$(if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then
    echo "None - All critical checks passed ✅"
else
    for check in "${FAILED_CHECKS[@]}"; do
        echo "- ❌ $check"
    done
fi)

## Warnings

$(if [[ ${#WARNINGS[@]} -eq 0 ]]; then
    echo "None - No warnings ✅"
else
    for warning in "${WARNINGS[@]}"; do
        echo "- ⚠️  $warning"
    done
fi)

## Recommendations

$(if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
    echo "### Critical Issues"
    echo "The following critical security issues must be resolved before deployment:"
    for check in "${FAILED_CHECKS[@]}"; do
        case "$check" in
            *"Secrets Manager"*)
                echo "- Configure AWS Secrets Manager with proper encryption"
                ;;
            *"KMS"*)
                echo "- Set up customer-managed KMS keys with rotation enabled"
                ;;
            *"Database"*)
                echo "- Enable database encryption and ensure it's not publicly accessible"
                ;;
            *"Redis"*)
                echo "- Enable Redis encryption at rest and in transit"
                ;;
            *)
                echo "- Resolve: $check"
                ;;
        esac
    done
    echo ""
fi)

$(if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo "### Improvement Opportunities"
    echo "The following security improvements are recommended:"
    for warning in "${WARNINGS[@]}"; do
        echo "- $warning"
    done
fi)

## Security Checklist for Production

- [ ] All secrets stored in AWS Secrets Manager
- [ ] KMS encryption enabled for all data at rest
- [ ] Database not publicly accessible
- [ ] Redis encryption enabled (at rest and in transit)
- [ ] VPC with private subnets configured
- [ ] Security groups follow least privilege
- [ ] WAF rules configured and active
- [ ] CloudWatch logs encrypted
- [ ] IAM roles follow least privilege
- [ ] Container image scanning enabled
- [ ] No hardcoded secrets in code or environment variables
- [ ] Network traffic encrypted in transit

---

*Generated by Paintbox Security Validation Script*
*Log file: ${LOG_FILE}*
EOF

    log_info "Security report generated: $report_file"
    echo "$report_file"
}

# Main execution
main() {
    log_info "Starting security validation for environment: $ENVIRONMENT"

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    # Run all security checks
    check_secrets_manager_integration || true
    check_kms_encryption || true
    check_vpc_security || true
    check_security_groups || true
    check_database_security || true
    check_redis_security || true
    check_waf_configuration || true
    check_ecs_security || true
    check_cloudwatch_logs || true
    check_iam_roles || true
    check_container_image_security || true

    # Generate report
    local report_file
    report_file=$(generate_security_report)

    # Summary
    log_info "================================================="
    log_info "Security Validation Complete"
    log_info "================================================="
    log_info "Total Checks: $TOTAL_CHECKS"
    log_info "Passed: $SECURITY_SCORE"
    log_info "Failed: ${#FAILED_CHECKS[@]}"
    log_info "Warnings: ${#WARNINGS[@]}"
    log_info "Security Score: $SECURITY_SCORE/$TOTAL_CHECKS ($(( SECURITY_SCORE * 100 / TOTAL_CHECKS ))%)"
    log_info "Report: $report_file"

    if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then
        log_info "🟢 All critical security checks passed - Ready for deployment!"
        exit 0
    else
        log_error "🔴 Critical security issues found - Deployment not recommended"
        exit 1
    fi
}

# Show help
show_help() {
    cat << EOF
Security Validation Script for Paintbox

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Environment to validate (default: staging)
    -r, --region REGION      AWS region (default: us-east-1)
    -h, --help              Show this help message

EXAMPLES:
    $0
    $0 --environment production
    $0 --environment staging --region us-west-2

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
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
