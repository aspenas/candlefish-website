#!/bin/bash

# Emergency and Rollback Procedures Test Suite
# Tests disaster recovery, emergency access, and rollback procedures

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
FAILED_TESTS=0
PASSED_TESTS=0
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$BASE_DIR/../.." && pwd)"

test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [[ "$status" == "PASS" ]]; then
        echo -e "${GREEN}✓ $test_name: $message${NC}"
        ((PASSED_TESTS++))
    elif [[ "$status" == "FAIL" ]]; then
        echo -e "${RED}✗ $test_name: $message${NC}"
        ((FAILED_TESTS++))
    elif [[ "$status" == "WARN" ]]; then
        echo -e "${YELLOW}⚠ $test_name: $message${NC}"
    else
        echo -e "${BLUE}ℹ $test_name: $message${NC}"
    fi
}

print_header() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}        Emergency and Rollback Procedures Test Suite${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}Region: $REGION${NC}"
    echo ""
}

# Test 1: Emergency Scripts Availability
test_emergency_scripts() {
    echo -e "${PURPLE}══════ Emergency Scripts Availability ══════${NC}"
    
    # Define expected emergency scripts
    local emergency_scripts=(
        "emergency-rotation-local.sh"
        "rotate-secrets.sh" 
        "update-local-credentials.sh"
        "scripts/security/rotate-secrets.sh"
        "scripts/security/rotate-secrets.py"
    )
    
    for script_path in "${emergency_scripts[@]}"; do
        local full_path="$ROOT_DIR/$script_path"
        local script_name=$(basename "$script_path")
        
        if [[ -f "$full_path" ]]; then
            test_result "EMERGENCY_SCRIPT_$script_name" "PASS" "Emergency script exists"
            
            # Check if script is executable
            if [[ -x "$full_path" ]]; then
                test_result "EMERGENCY_EXEC_$script_name" "PASS" "Script is executable"
            else
                test_result "EMERGENCY_EXEC_$script_name" "WARN" "Script is not executable"
            fi
            
            # Check script syntax (basic validation)
            if [[ "$script_name" == *.sh ]]; then
                if bash -n "$full_path" 2>/dev/null; then
                    test_result "EMERGENCY_SYNTAX_$script_name" "PASS" "Script has valid syntax"
                else
                    test_result "EMERGENCY_SYNTAX_$script_name" "FAIL" "Script has syntax errors"
                fi
            elif [[ "$script_name" == *.py ]]; then
                if python3 -m py_compile "$full_path" 2>/dev/null; then
                    test_result "EMERGENCY_SYNTAX_$script_name" "PASS" "Python script compiles"
                else
                    test_result "EMERGENCY_SYNTAX_$script_name" "WARN" "Python script has compilation issues"
                fi
            fi
            
            # Check for help/usage information
            if grep -q -E "(usage|help|--help|-h)" "$full_path" 2>/dev/null; then
                test_result "EMERGENCY_HELP_$script_name" "PASS" "Script includes help/usage information"
            else
                test_result "EMERGENCY_HELP_$script_name" "WARN" "Script lacks help/usage information"
            fi
        else
            test_result "EMERGENCY_SCRIPT_$script_name" "FAIL" "Emergency script not found at $script_path"
        fi
    done
    
    echo ""
}

# Test 2: Documentation Availability
test_emergency_documentation() {
    echo -e "${PURPLE}══════ Emergency Documentation ══════${NC}"
    
    # Check for key documentation files
    local doc_files=(
        "RECOVERY_PLAYBOOK.md"
        "docs/MANUAL_SECRET_ROTATION.md"
        "infrastructure/secrets-management/README.md"
        "infrastructure/secrets-management/PRODUCTION_DEPLOYMENT_GUIDE.md"
    )
    
    for doc_path in "${doc_files[@]}"; do
        local full_path="$ROOT_DIR/$doc_path"
        local doc_name=$(basename "$doc_path")
        
        if [[ -f "$full_path" ]]; then
            test_result "EMERGENCY_DOC_$doc_name" "PASS" "Documentation file exists"
            
            # Check for key emergency procedures
            local emergency_keywords=("emergency" "disaster" "recovery" "rollback" "backup" "restore")
            local found_keywords=0
            
            for keyword in "${emergency_keywords[@]}"; do
                if grep -qi "$keyword" "$full_path" 2>/dev/null; then
                    ((found_keywords++))
                fi
            done
            
            if [[ $found_keywords -ge 3 ]]; then
                test_result "EMERGENCY_CONTENT_$doc_name" "PASS" "Contains emergency procedures ($found_keywords keywords)"
            elif [[ $found_keywords -gt 0 ]]; then
                test_result "EMERGENCY_CONTENT_$doc_name" "WARN" "Limited emergency content ($found_keywords keywords)"
            else
                test_result "EMERGENCY_CONTENT_$doc_name" "FAIL" "No emergency procedures found"
            fi
            
            # Check for contact information
            if grep -qiE "(contact|phone|email|support)" "$full_path" 2>/dev/null; then
                test_result "EMERGENCY_CONTACTS_$doc_name" "PASS" "Contains contact information"
            else
                test_result "EMERGENCY_CONTACTS_$doc_name" "WARN" "No contact information found"
            fi
        else
            test_result "EMERGENCY_DOC_$doc_name" "FAIL" "Documentation not found at $doc_path"
        fi
    done
    
    echo ""
}

# Test 3: Backup and Recovery Systems
test_backup_systems() {
    echo -e "${PURPLE}══════ Backup and Recovery Systems ══════${NC}"
    
    # Test AWS S3 backup bucket accessibility
    local backup_bucket="candlefish-secrets-backup-$ENVIRONMENT"
    if aws s3 ls "s3://$backup_bucket" --region "$REGION" &>/dev/null; then
        test_result "BACKUP_S3_ACCESS" "PASS" "Backup S3 bucket is accessible"
        
        # Check for recent backups
        local recent_backups=$(aws s3 ls "s3://$backup_bucket/" --region "$REGION" --recursive | tail -10)
        if [[ -n "$recent_backups" ]]; then
            local backup_count=$(echo "$recent_backups" | wc -l)
            test_result "BACKUP_S3_RECENT" "PASS" "Found $backup_count recent backup files"
            
            # Check if backups are recent (within last 7 days)
            local recent_backup=$(aws s3 ls "s3://$backup_bucket/" --region "$REGION" --recursive | \
                awk '$1 >= "'$(date -d '7 days ago' +%Y-%m-%d)'"' | head -1)
            if [[ -n "$recent_backup" ]]; then
                test_result "BACKUP_S3_FRESH" "PASS" "Backups are recent (within 7 days)"
            else
                test_result "BACKUP_S3_FRESH" "WARN" "No recent backups found (older than 7 days)"
            fi
        else
            test_result "BACKUP_S3_RECENT" "FAIL" "No backup files found in S3 bucket"
        fi
        
        # Test backup bucket encryption
        local encryption_status=$(aws s3api get-bucket-encryption --bucket "$backup_bucket" --region "$REGION" 2>/dev/null || echo "")
        if [[ -n "$encryption_status" ]]; then
            test_result "BACKUP_S3_ENCRYPTION" "PASS" "Backup bucket has encryption enabled"
        else
            test_result "BACKUP_S3_ENCRYPTION" "WARN" "Backup bucket encryption status unknown"
        fi
    else
        test_result "BACKUP_S3_ACCESS" "FAIL" "Cannot access backup S3 bucket"
    fi
    
    # Test local backup capabilities
    if [[ -f "$ROOT_DIR/scripts/security/rotate-secrets.sh" ]]; then
        # Check if backup functionality is present in rotation script
        if grep -q "backup\|snapshot\|export" "$ROOT_DIR/scripts/security/rotate-secrets.sh" 2>/dev/null; then
            test_result "BACKUP_LOCAL_CAPABILITY" "PASS" "Local backup capability detected"
        else
            test_result "BACKUP_LOCAL_CAPABILITY" "WARN" "No local backup capability found"
        fi
    fi
    
    # Test database backup for secrets metadata
    if command -v pg_dump &>/dev/null || command -v mysqldump &>/dev/null; then
        test_result "DATABASE_BACKUP_TOOLS" "PASS" "Database backup tools available"
    else
        test_result "DATABASE_BACKUP_TOOLS" "WARN" "No database backup tools found"
    fi
    
    echo ""
}

# Test 4: Secret Rotation Procedures
test_rotation_procedures() {
    echo -e "${PURPLE}══════ Secret Rotation Procedures ══════${NC}"
    
    # Test rotation script functionality
    local rotation_script="$ROOT_DIR/scripts/security/rotate-secrets.sh"
    if [[ -f "$rotation_script" ]]; then
        test_result "ROTATION_SCRIPT_EXISTS" "PASS" "Rotation script exists"
        
        # Test dry-run capability
        if grep -q -E "(dry-run|--dry|simulate|test)" "$rotation_script" 2>/dev/null; then
            test_result "ROTATION_DRY_RUN" "PASS" "Dry-run capability available"
        else
            test_result "ROTATION_DRY_RUN" "WARN" "No dry-run capability detected"
        fi
        
        # Check for rollback capability
        if grep -q -E "(rollback|revert|undo)" "$rotation_script" 2>/dev/null; then
            test_result "ROTATION_ROLLBACK" "PASS" "Rollback capability available"
        else
            test_result "ROTATION_ROLLBACK" "WARN" "No rollback capability detected"
        fi
        
        # Check for logging
        if grep -q -E "(log|audit|record)" "$rotation_script" 2>/dev/null; then
            test_result "ROTATION_LOGGING" "PASS" "Logging capability present"
        else
            test_result "ROTATION_LOGGING" "WARN" "No logging capability detected"
        fi
    else
        test_result "ROTATION_SCRIPT_EXISTS" "FAIL" "Rotation script not found"
    fi
    
    # Test emergency rotation capability
    local emergency_rotation="$ROOT_DIR/emergency-rotation-local.sh"
    if [[ -f "$emergency_rotation" ]]; then
        test_result "EMERGENCY_ROTATION_EXISTS" "PASS" "Emergency rotation script exists"
        
        # Test if it can run without parameters (show help)
        if bash "$emergency_rotation" --help &>/dev/null || bash "$emergency_rotation" -h &>/dev/null; then
            test_result "EMERGENCY_ROTATION_HELP" "PASS" "Emergency script provides help"
        else
            test_result "EMERGENCY_ROTATION_HELP" "WARN" "Emergency script help not accessible"
        fi
    else
        test_result "EMERGENCY_ROTATION_EXISTS" "FAIL" "Emergency rotation script not found"
    fi
    
    # Check for cron/scheduled rotation
    local cron_file="$ROOT_DIR/scripts/security/cron-rotation.txt"
    if [[ -f "$cron_file" ]]; then
        test_result "SCHEDULED_ROTATION_CONFIG" "PASS" "Scheduled rotation configuration exists"
    else
        test_result "SCHEDULED_ROTATION_CONFIG" "WARN" "No scheduled rotation configuration found"
    fi
    
    echo ""
}

# Test 5: Monitoring and Alerting
test_monitoring_alerting() {
    echo -e "${PURPLE}══════ Monitoring and Alerting ══════${NC}"
    
    # Test CloudWatch alarms
    local alarm_names=(
        "candlefish-secret-rotation-failed"
        "candlefish-secret-access-failed"
        "candlefish-kms-key-usage-spike"
    )
    
    for alarm_name in "${alarm_names[@]}"; do
        if aws cloudwatch describe-alarms --alarm-names "$alarm_name" --region "$REGION" &>/dev/null; then
            test_result "CLOUDWATCH_ALARM_$alarm_name" "PASS" "CloudWatch alarm configured"
            
            # Check alarm state
            local alarm_state=$(aws cloudwatch describe-alarms \
                --alarm-names "$alarm_name" \
                --region "$REGION" \
                --query 'MetricAlarms[0].StateValue' \
                --output text 2>/dev/null || echo "UNKNOWN")
            
            if [[ "$alarm_state" == "OK" ]]; then
                test_result "ALARM_STATE_$alarm_name" "PASS" "Alarm state is OK"
            elif [[ "$alarm_state" == "ALARM" ]]; then
                test_result "ALARM_STATE_$alarm_name" "FAIL" "Alarm is currently triggered"
            else
                test_result "ALARM_STATE_$alarm_name" "INFO" "Alarm state: $alarm_state"
            fi
        else
            test_result "CLOUDWATCH_ALARM_$alarm_name" "WARN" "CloudWatch alarm not found"
        fi
    done
    
    # Test SNS topics for notifications
    local sns_topics=$(aws sns list-topics --region "$REGION" --query 'Topics[?contains(TopicArn, `candlefish`) || contains(TopicArn, `secrets`)].TopicArn' --output text 2>/dev/null || echo "")
    
    if [[ -n "$sns_topics" ]]; then
        local topic_count=$(echo "$sns_topics" | wc -w)
        test_result "SNS_TOPICS" "PASS" "Found $topic_count SNS topics for notifications"
    else
        test_result "SNS_TOPICS" "WARN" "No SNS topics found for alerts"
    fi
    
    # Check for log files and monitoring
    local log_dir="$BASE_DIR/logs"
    if [[ -d "$log_dir" ]]; then
        test_result "LOG_DIRECTORY" "PASS" "Log directory exists"
        
        local log_files=$(find "$log_dir" -name "*.log" -mtime -7 2>/dev/null | wc -l)
        if [[ $log_files -gt 0 ]]; then
            test_result "RECENT_LOGS" "PASS" "Found $log_files recent log files"
        else
            test_result "RECENT_LOGS" "WARN" "No recent log files found"
        fi
    else
        test_result "LOG_DIRECTORY" "WARN" "No log directory found"
    fi
    
    echo ""
}

# Test 6: Break-Glass Procedures
test_breakglass_procedures() {
    echo -e "${PURPLE}══════ Break-Glass Procedures ══════${NC}"
    
    # Check for break-glass user/role
    local breakglass_user="candlefish-breakglass"
    if aws iam get-user --user-name "$breakglass_user" &>/dev/null; then
        test_result "BREAKGLASS_USER" "PASS" "Break-glass IAM user exists"
        
        # Check if user has appropriate policies
        local policies=$(aws iam list-attached-user-policies \
            --user-name "$breakglass_user" \
            --query 'AttachedPolicies[].PolicyName' \
            --output text 2>/dev/null || echo "")
        
        if [[ -n "$policies" ]]; then
            test_result "BREAKGLASS_POLICIES" "PASS" "Break-glass user has policies attached"
        else
            test_result "BREAKGLASS_POLICIES" "WARN" "Break-glass user has no policies"
        fi
    else
        test_result "BREAKGLASS_USER" "INFO" "No break-glass user found (may use roles)"
    fi
    
    # Check for break-glass documentation
    if grep -r -i "break.glass\|emergency.access" "$ROOT_DIR/docs" "$BASE_DIR/docs" 2>/dev/null | head -1 >/dev/null; then
        test_result "BREAKGLASS_DOCS" "PASS" "Break-glass procedures documented"
    else
        test_result "BREAKGLASS_DOCS" "WARN" "Break-glass procedures not documented"
    fi
    
    # Test emergency access keys (should be disabled normally)
    local emergency_keys=$(aws iam list-access-keys --user-name "$breakglass_user" 2>/dev/null | \
        jq -r '.AccessKeyMetadata[].Status' 2>/dev/null || echo "")
    
    if [[ "$emergency_keys" == "Inactive" ]]; then
        test_result "EMERGENCY_KEYS_STATUS" "PASS" "Emergency access keys are inactive (secure)"
    elif [[ "$emergency_keys" == "Active" ]]; then
        test_result "EMERGENCY_KEYS_STATUS" "WARN" "Emergency access keys are active"
    else
        test_result "EMERGENCY_KEYS_STATUS" "INFO" "Emergency access keys status unknown"
    fi
    
    echo ""
}

# Test 7: Recovery Time Objectives
test_recovery_objectives() {
    echo -e "${PURPLE}══════ Recovery Time Objectives ══════${NC}"
    
    # Test secret retrieval performance (simulates RTO)
    local test_secret="candlefish/$ENVIRONMENT/security/jwt"
    local start_time=$(date +%s%3N)
    
    if aws secretsmanager get-secret-value \
        --secret-id "$test_secret" \
        --region "$REGION" \
        --query 'SecretString' \
        --output text &>/dev/null; then
        local end_time=$(date +%s%3N)
        local retrieval_time=$((end_time - start_time))
        
        test_result "SECRET_RETRIEVAL_SPEED" "PASS" "Secret retrieval time: ${retrieval_time}ms"
        
        # Check if it meets RTO requirements (< 5 seconds for emergency access)
        if [[ $retrieval_time -lt 5000 ]]; then
            test_result "RTO_SECRET_ACCESS" "PASS" "Meets RTO for secret access (< 5s)"
        else
            test_result "RTO_SECRET_ACCESS" "WARN" "May not meet RTO for secret access (>= 5s)"
        fi
    else
        test_result "SECRET_RETRIEVAL_SPEED" "FAIL" "Cannot test secret retrieval speed"
    fi
    
    # Test backup restoration capability (theoretical)
    if [[ -f "$ROOT_DIR/scripts/security/restore-from-backup.sh" ]]; then
        test_result "BACKUP_RESTORE_SCRIPT" "PASS" "Backup restoration script available"
    else
        test_result "BACKUP_RESTORE_SCRIPT" "WARN" "No backup restoration script found"
    fi
    
    # Estimate recovery time based on backup size
    if aws s3 ls "s3://candlefish-secrets-backup-$ENVIRONMENT" --region "$REGION" &>/dev/null; then
        local backup_size=$(aws s3 ls "s3://candlefish-secrets-backup-$ENVIRONMENT" --region "$REGION" --recursive --human-readable --summarize | grep "Total Size" | awk '{print $3, $4}' || echo "unknown")
        test_result "BACKUP_SIZE_ESTIMATE" "INFO" "Backup size: $backup_size"
    fi
    
    echo ""
}

# Generate emergency procedures report
generate_emergency_report() {
    local total_tests=$((PASSED_TESTS + FAILED_TESTS))
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}            Emergency Procedures Test Report${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Test Summary:${NC}"
    echo -e "  Environment: $ENVIRONMENT"
    echo -e "  Region: $REGION"
    echo -e "  Tests Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "  Tests Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "  Total Tests: $total_tests"
    echo ""
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}✓ EMERGENCY PROCEDURES READY${NC}"
        echo ""
        echo -e "${BLUE}Emergency Readiness Status:${NC}"
        echo "1. Emergency scripts are available and functional"
        echo "2. Documentation is comprehensive"
        echo "3. Backup and recovery systems are operational"
        echo "4. Monitoring and alerting are configured"
        echo "5. Break-glass procedures are documented"
        return 0
    elif [[ $FAILED_TESTS -le 3 ]]; then
        echo -e "${YELLOW}⚠ EMERGENCY PROCEDURES NEED IMPROVEMENT${NC}"
        echo ""
        echo -e "${BLUE}Action Items:${NC}"
        echo "1. Address failed tests to improve emergency readiness"
        echo "2. Review and update emergency documentation"
        echo "3. Test emergency procedures with team"
        echo "4. Schedule regular emergency drills"
        return 1
    else
        echo -e "${RED}✗ EMERGENCY PROCEDURES NOT READY${NC}"
        echo ""
        echo -e "${BLUE}Critical Actions Required:${NC}"
        echo "1. Implement missing emergency procedures immediately"
        echo "2. Create comprehensive disaster recovery plan"
        echo "3. Set up proper backup and monitoring systems"
        echo "4. Train team on emergency procedures"
        echo "5. Schedule immediate emergency preparedness review"
        return 2
    fi
}

# Main execution
main() {
    print_header
    
    test_emergency_scripts
    test_emergency_documentation
    test_backup_systems
    test_rotation_procedures
    test_monitoring_alerting
    test_breakglass_procedures
    test_recovery_objectives
    
    generate_emergency_report
}

# Run the emergency procedures tests
main "$@"