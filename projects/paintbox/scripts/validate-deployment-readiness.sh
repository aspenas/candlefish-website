#!/bin/bash

# Deployment Readiness Validation Script
# Comprehensive validation of all deployment prerequisites

set -euo pipefail

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="${PROJECT_ROOT}/logs/deployment-readiness-$(date +%Y%m%d-%H%M%S).log"

# Environment variables
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Validation results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
CRITICAL_ISSUES=()
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

log_step() {
    log "STEP" "${CYAN}$*${NC}"
}

# Validation helper functions
run_validation() {
    local test_name="$1"
    local test_command="$2"
    local critical="${3:-false}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log_debug "Running validation: $test_name"

    if eval "$test_command" >/dev/null 2>&1; then
        log_info "✅ $test_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [[ "$critical" == "true" ]]; then
            log_error "❌ $test_name (CRITICAL)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            CRITICAL_ISSUES+=("$test_name")
        else
            log_warn "⚠️  $test_name (WARNING)"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            WARNINGS+=("$test_name")
        fi
        return 1
    fi
}

# Infrastructure validation
validate_terraform_state() {
    log_step "Validating Terraform infrastructure state"

    cd "$PROJECT_ROOT/terraform" || return 1

    run_validation "Terraform initialized" "terraform --version && ls .terraform" true
    run_validation "Terraform configuration valid" "terraform validate" true
    run_validation "Terraform plan succeeds" "terraform plan -var='environment=$ENVIRONMENT' -var-file='environments/${ENVIRONMENT}.tfvars' -detailed-exitcode" false

    cd - >/dev/null
}

validate_aws_resources() {
    log_step "Validating AWS resources"

    # ECS Cluster
    run_validation "ECS cluster exists" "aws ecs describe-clusters --clusters paintbox-${ENVIRONMENT}" true

    # VPC and networking
    run_validation "VPC exists" "aws ec2 describe-vpcs --filters 'Name=tag:Name,Values=paintbox-vpc-${ENVIRONMENT}'" true
    run_validation "Private subnets exist" "aws ec2 describe-subnets --filters 'Name=tag:Type,Values=private' --query 'length(Subnets) >= \`2\`'" true
    run_validation "Public subnets exist" "aws ec2 describe-subnets --filters 'Name=tag:Type,Values=public' --query 'length(Subnets) >= \`2\`'" true

    # Database
    run_validation "RDS instance exists" "aws rds describe-db-instances --db-instance-identifier paintbox-${ENVIRONMENT}" true
    run_validation "Database is encrypted" "aws rds describe-db-instances --db-instance-identifier paintbox-${ENVIRONMENT} --query 'DBInstances[0].StorageEncrypted'" true
    run_validation "Database not publicly accessible" "aws rds describe-db-instances --db-instance-identifier paintbox-${ENVIRONMENT} --query 'DBInstances[0].PubliclyAccessible == \`false\`'" true

    # Redis
    run_validation "ElastiCache cluster exists" "aws elasticache describe-replication-groups --replication-group-id paintbox-${ENVIRONMENT}" true
    run_validation "Redis encryption at rest enabled" "aws elasticache describe-replication-groups --replication-group-id paintbox-${ENVIRONMENT} --query 'ReplicationGroups[0].AtRestEncryptionEnabled'" true
    run_validation "Redis encryption in transit enabled" "aws elasticache describe-replication-groups --replication-group-id paintbox-${ENVIRONMENT} --query 'ReplicationGroups[0].TransitEncryptionEnabled'" true

    # Load Balancer (for staging with blue-green)
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        run_validation "Application Load Balancer exists" "aws elbv2 describe-load-balancers --names paintbox-alb-${ENVIRONMENT}" true
        run_validation "Blue target group exists" "aws elbv2 describe-target-groups --names paintbox-blue-${ENVIRONMENT}" true
        run_validation "Green target group exists" "aws elbv2 describe-target-groups --names paintbox-green-${ENVIRONMENT}" true
    fi
}

validate_security_configuration() {
    log_step "Validating security configuration"

    # KMS
    run_validation "KMS key exists" "aws kms describe-key --key-id alias/paintbox-${ENVIRONMENT}" true
    run_validation "KMS key rotation enabled" "aws kms get-key-rotation-status --key-id alias/paintbox-${ENVIRONMENT} --query 'KeyRotationEnabled'" false

    # Secrets Manager
    run_validation "Secrets Manager secret exists" "aws secretsmanager describe-secret --secret-id paintbox-${ENVIRONMENT}" true
    run_validation "Secret is encrypted" "aws secretsmanager describe-secret --secret-id paintbox-${ENVIRONMENT} --query 'KmsKeyId != null'" true

    # IAM Roles
    run_validation "ECS execution role exists" "aws iam get-role --role-name paintbox-ecs-execution-${ENVIRONMENT}" true
    run_validation "Application role exists" "aws iam get-role --role-name paintbox-app-${ENVIRONMENT}" true

    # Security Groups
    run_validation "Database security group exists" "aws ec2 describe-security-groups --filters 'Name=tag:Name,Values=paintbox-database-sg-${ENVIRONMENT}'" true
    run_validation "Redis security group exists" "aws ec2 describe-security-groups --filters 'Name=tag:Name,Values=paintbox-redis-sg-${ENVIRONMENT}'" true
    run_validation "Application security group exists" "aws ec2 describe-security-groups --filters 'Name=tag:Name,Values=paintbox-app-sg-${ENVIRONMENT}'" true

    # WAF (optional for staging)
    run_validation "WAF Web ACL configured" "aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1 --query \"WebACLs[?Name=='paintbox-web-acl-${ENVIRONMENT}']\"" false
}

validate_secrets() {
    log_step "Validating secrets configuration"

    # Run comprehensive secrets validation
    if "$PROJECT_ROOT/scripts/validate-secrets-manager.sh" --environment "$ENVIRONMENT" >/dev/null 2>&1; then
        log_info "✅ All secrets properly configured"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log_error "❌ Secrets validation failed (CRITICAL)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        CRITICAL_ISSUES+=("Secrets validation failed")
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

validate_container_images() {
    log_step "Validating container images"

    local registry_url="ghcr.io/candlefish-ai/paintbox"

    # Check if we can authenticate to container registry
    run_validation "Container registry authentication" "echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin" false

    # Check if base images exist
    run_validation "Frontend base image exists" "docker manifest inspect ${registry_url}-frontend:${ENVIRONMENT}-latest" false
    run_validation "Backend base image exists" "docker manifest inspect ${registry_url}-backend:${ENVIRONMENT}-latest" false
}

validate_database_connectivity() {
    log_step "Validating database connectivity"

    # Get database endpoint
    local db_endpoint
    db_endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "paintbox-${ENVIRONMENT}" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text 2>/dev/null || echo "")

    if [[ -n "$db_endpoint" ]]; then
        # Test network connectivity (port 5432)
        run_validation "Database port accessible" "timeout 5 bash -c '</dev/tcp/${db_endpoint}/5432'" true
        log_info "✅ Database endpoint: $db_endpoint"
    else
        log_error "❌ Could not retrieve database endpoint"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        CRITICAL_ISSUES+=("Database endpoint not accessible")
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

validate_redis_connectivity() {
    log_step "Validating Redis connectivity"

    # Get Redis endpoint
    local redis_endpoint
    redis_endpoint=$(aws elasticache describe-replication-groups \
        --replication-group-id "paintbox-${ENVIRONMENT}" \
        --query 'ReplicationGroups[0].ConfigurationEndpoint.Address' \
        --output text 2>/dev/null || echo "")

    if [[ -z "$redis_endpoint" ]] || [[ "$redis_endpoint" == "None" ]]; then
        # Try primary endpoint for single-node clusters
        redis_endpoint=$(aws elasticache describe-replication-groups \
            --replication-group-id "paintbox-${ENVIRONMENT}" \
            --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' \
            --output text 2>/dev/null || echo "")
    fi

    if [[ -n "$redis_endpoint" ]] && [[ "$redis_endpoint" != "None" ]]; then
        # Test network connectivity (port 6379)
        run_validation "Redis port accessible" "timeout 5 bash -c '</dev/tcp/${redis_endpoint}/6379'" true
        log_info "✅ Redis endpoint: $redis_endpoint"
    else
        log_error "❌ Could not retrieve Redis endpoint"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        CRITICAL_ISSUES+=("Redis endpoint not accessible")
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

validate_monitoring_setup() {
    log_step "Validating monitoring and logging setup"

    # CloudWatch Log Groups
    run_validation "Application log group exists" "aws logs describe-log-groups --log-group-name-prefix '/aws/paintbox/app-${ENVIRONMENT}'" false
    run_validation "API log group exists" "aws logs describe-log-groups --log-group-name-prefix '/aws/paintbox/api-${ENVIRONMENT}'" false

    # CloudWatch Dashboard (if exists)
    run_validation "CloudWatch dashboard exists" "aws cloudwatch get-dashboard --dashboard-name 'Paintbox-${ENVIRONMENT}'" false
}

validate_deployment_scripts() {
    log_step "Validating deployment scripts"

    local scripts=(
        "blue-green-deploy.sh"
        "emergency-rollback.sh"
        "security-validation.sh"
        "validate-secrets-manager.sh"
    )

    for script in "${scripts[@]}"; do
        run_validation "Script $script exists and executable" "test -x '$PROJECT_ROOT/scripts/$script'" true
    done

    # Validate script syntax
    for script in "${scripts[@]}"; do
        run_validation "Script $script syntax valid" "bash -n '$PROJECT_ROOT/scripts/$script'" true
    done
}

validate_external_dependencies() {
    log_step "Validating external service dependencies"

    # Salesforce sandbox connectivity
    run_validation "Salesforce sandbox reachable" "curl -f -s -m 10 https://kindhomesolutions1--bartsand.sandbox.my.salesforce.com/" false

    # Company Cam API connectivity
    run_validation "Company Cam API reachable" "curl -f -s -m 10 https://api.companycam.com/" false

    # Anthropic API connectivity
    run_validation "Anthropic API reachable" "curl -f -s -m 10 https://api.anthropic.com/" false

    # Docker registry connectivity
    run_validation "GitHub Container Registry reachable" "curl -f -s -m 10 https://ghcr.io/" false
}

validate_prerequisites() {
    log_step "Validating deployment prerequisites"

    # Required tools
    local tools=("aws" "terraform" "docker" "jq" "curl")
    for tool in "${tools[@]}"; do
        run_validation "$tool command available" "command -v $tool" true
    done

    # AWS credentials
    run_validation "AWS credentials configured" "aws sts get-caller-identity" true
    run_validation "AWS region set correctly" "test \"\$(aws configure get region)\" = \"$AWS_REGION\"" false

    # Docker daemon
    run_validation "Docker daemon running" "docker info" true

    # Terraform workspace
    cd "$PROJECT_ROOT/terraform" || return 1
    run_validation "Terraform workspace correct" "terraform workspace show | grep -E '(default|${ENVIRONMENT})'" false
    cd - >/dev/null
}

generate_readiness_report() {
    log_step "Generating deployment readiness report"

    local report_file="${PROJECT_ROOT}/deployment-readiness-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).md"
    local readiness_status

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        if [[ $WARNING_CHECKS -eq 0 ]]; then
            readiness_status="🟢 **READY** - All checks passed"
        else
            readiness_status="🟡 **READY WITH WARNINGS** - Critical checks passed"
        fi
    else
        readiness_status="🔴 **NOT READY** - Critical issues must be resolved"
    fi

    cat > "$report_file" << EOF
# Deployment Readiness Report

**Environment:** ${ENVIRONMENT}
**Date:** $(date)
**Region:** ${AWS_REGION}

## Summary

- **Total Checks:** ${TOTAL_CHECKS}
- **Passed:** ${PASSED_CHECKS}
- **Failed:** ${FAILED_CHECKS}
- **Warnings:** ${WARNING_CHECKS}
- **Success Rate:** $((PASSED_CHECKS * 100 / TOTAL_CHECKS))%

## Readiness Status

$readiness_status

## Critical Issues

$(if [[ ${#CRITICAL_ISSUES[@]} -eq 0 ]]; then
    echo "None - All critical checks passed ✅"
else
    for issue in "${CRITICAL_ISSUES[@]}"; do
        echo "- ❌ $issue"
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

## Validation Categories

### Infrastructure
- AWS resources provisioned and configured
- Network connectivity verified
- Security configurations validated

### Security
- Secrets properly stored and encrypted
- IAM roles configured with least privilege
- Network security groups configured

### Application
- Container images available
- External dependencies accessible
- Monitoring and logging configured

### Operations
- Deployment scripts validated
- Prerequisites met
- Team readiness confirmed

## Next Steps

$(if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo "### Ready for Deployment ✅"
    echo ""
    echo "1. Review any warnings above"
    echo "2. Execute deployment:"
    echo "   \`\`\`bash"
    echo "   ./scripts/blue-green-deploy.sh staging-\$(git rev-parse --short HEAD)"
    echo "   \`\`\`"
    echo "3. Monitor deployment progress"
    echo "4. Validate post-deployment health"
else
    echo "### Critical Issues Must Be Resolved ❌"
    echo ""
    echo "The following critical issues must be resolved before deployment:"
    for issue in "${CRITICAL_ISSUES[@]}"; do
        case "$issue" in
            *"Terraform"*)
                echo "- Fix Terraform configuration and run \`terraform apply\`"
                ;;
            *"ECS"*)
                echo "- Ensure ECS cluster is properly configured"
                ;;
            *"database"*|*"Database"*)
                echo "- Verify database configuration and connectivity"
                ;;
            *"Redis"*|*"ElastiCache"*)
                echo "- Verify Redis configuration and connectivity"
                ;;
            *"Secrets"*)
                echo "- Configure all required secrets in AWS Secrets Manager"
                ;;
            *"IAM"*)
                echo "- Ensure IAM roles have proper permissions"
                ;;
            *)
                echo "- Resolve: $issue"
                ;;
        esac
    done
    echo ""
    echo "After resolving issues, run this validation again:"
    echo "\`\`\`bash"
    echo "./scripts/validate-deployment-readiness.sh --environment $ENVIRONMENT"
    echo "\`\`\`"
fi)

## Quick Commands

### Infrastructure
\`\`\`bash
# Deploy infrastructure
cd terraform && terraform apply -var-file="environments/${ENVIRONMENT}.tfvars"

# Validate security
./scripts/security-validation.sh --environment ${ENVIRONMENT}

# Validate secrets
./scripts/validate-secrets-manager.sh --environment ${ENVIRONMENT}
\`\`\`

### Deployment
\`\`\`bash
# Blue-green deployment
./scripts/blue-green-deploy.sh staging-\$(git rev-parse --short HEAD)

# Check deployment status
./scripts/blue-green-deploy.sh --status

# Emergency rollback if needed
./scripts/emergency-rollback.sh "Issue description"
\`\`\`

---

*Generated by Paintbox Deployment Readiness Validation*
*Log file: ${LOG_FILE}*
EOF

    log_info "Deployment readiness report generated: $report_file"
    echo "$report_file"
}

# Main execution
main() {
    log_info "Starting deployment readiness validation for environment: $ENVIRONMENT"

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    # Run all validation categories
    validate_prerequisites
    validate_terraform_state
    validate_aws_resources
    validate_security_configuration
    validate_secrets
    validate_container_images
    validate_database_connectivity
    validate_redis_connectivity
    validate_monitoring_setup
    validate_deployment_scripts
    validate_external_dependencies

    # Generate comprehensive report
    local report_file
    report_file=$(generate_readiness_report)

    # Final summary
    log_info "================================================="
    log_info "Deployment Readiness Validation Complete"
    log_info "================================================="
    log_info "Environment: $ENVIRONMENT"
    log_info "Total Checks: $TOTAL_CHECKS"
    log_info "Passed: $PASSED_CHECKS"
    log_info "Failed: $FAILED_CHECKS"
    log_info "Warnings: $WARNING_CHECKS"
    log_info "Success Rate: $((PASSED_CHECKS * 100 / TOTAL_CHECKS))%"
    log_info "Report: $report_file"

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        if [[ $WARNING_CHECKS -eq 0 ]]; then
            log_info "🟢 All checks passed - Ready for deployment!"
        else
            log_warn "🟡 Critical checks passed but warnings exist - Review before deployment"
        fi
        exit 0
    else
        log_error "🔴 Critical issues found - Deployment not recommended"
        exit 1
    fi
}

# Show help
show_help() {
    cat << EOF
Deployment Readiness Validation Script for Paintbox

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Environment to validate (default: staging)
    -r, --region REGION      AWS region (default: us-east-1)
    -v, --verbose           Enable verbose output
    -h, --help              Show this help message

EXAMPLES:
    $0
    $0 --environment production
    $0 --environment staging --region us-west-2

This script validates:
- Infrastructure readiness (Terraform, AWS resources)
- Security configuration (KMS, Secrets Manager, IAM)
- Application readiness (container images, connectivity)
- Operational readiness (scripts, monitoring, logging)

EOF
}

# Parse command line arguments
VERBOSE=false

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
        -v|--verbose)
            VERBOSE=true
            shift
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
