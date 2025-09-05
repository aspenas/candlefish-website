#!/bin/bash

# Integration Test Suite for Secrets Management
# Tests end-to-end workflows and service integrations

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
TEST_START_TIME=$(date +%s)
TEST_SECRET_PREFIX="integration-test-$(date +%s)"
CLEANUP_RESOURCES=()

# Configuration
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$BASE_DIR/logs/integration-test-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log_with_timestamp() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    local log_message="$test_name: $status - $message"
    log_with_timestamp "$log_message"
    
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

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up test resources...${NC}"
    
    # Clean up test secrets
    for resource in "${CLEANUP_RESOURCES[@]}"; do
        echo "Cleaning up: $resource"
        case $resource in
            secret:*)
                SECRET_NAME=${resource#secret:}
                aws secretsmanager delete-secret \
                    --secret-id "$SECRET_NAME" \
                    --force-delete-without-recovery \
                    --region "$REGION" &> /dev/null || true
                ;;
            kms:*)
                KEY_ID=${resource#kms:}
                aws kms schedule-key-deletion \
                    --key-id "$KEY_ID" \
                    --pending-window-in-days 7 \
                    --region "$REGION" &> /dev/null || true
                ;;
        esac
    done
    
    echo -e "${GREEN}Cleanup completed${NC}"
}

# Set trap for cleanup
trap cleanup EXIT

print_header() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}        Secrets Management - Integration Test Suite${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}Region: $REGION${NC}"
    echo -e "${BLUE}Test ID: $TEST_SECRET_PREFIX${NC}"
    echo -e "${BLUE}Log File: $LOG_FILE${NC}"
    echo ""
}

# Test 1: AWS Services Integration
test_aws_integration() {
    echo -e "${PURPLE}══════ AWS Services Integration Tests ══════${NC}"
    
    # Test AWS credentials and permissions
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        test_result "AWS_CREDENTIALS" "PASS" "Connected to AWS account $ACCOUNT_ID"
    else
        test_result "AWS_CREDENTIALS" "FAIL" "AWS credentials not working"
        return 1
    fi
    
    # Test Secrets Manager permissions
    if aws secretsmanager list-secrets --region "$REGION" --max-items 1 &> /dev/null; then
        test_result "SECRETS_MANAGER_ACCESS" "PASS" "Secrets Manager access confirmed"
    else
        test_result "SECRETS_MANAGER_ACCESS" "FAIL" "Cannot access Secrets Manager"
        return 1
    fi
    
    # Test KMS permissions
    if aws kms list-keys --region "$REGION" --limit 1 &> /dev/null; then
        test_result "KMS_ACCESS" "PASS" "KMS access confirmed"
    else
        test_result "KMS_ACCESS" "FAIL" "Cannot access KMS"
    fi
    
    echo ""
}

# Test 2: Secret Lifecycle Management
test_secret_lifecycle() {
    echo -e "${PURPLE}══════ Secret Lifecycle Management Tests ══════${NC}"
    
    local test_secret_name="candlefish/test/$TEST_SECRET_PREFIX/lifecycle-test"
    local test_secret_value='{"username":"test","password":"secure123","created":"'$(date -Iseconds)'"}'
    
    # Create secret
    if aws secretsmanager create-secret \
        --name "$test_secret_name" \
        --description "Integration test secret for lifecycle testing" \
        --secret-string "$test_secret_value" \
        --region "$REGION" &> /dev/null; then
        test_result "SECRET_CREATE" "PASS" "Test secret created successfully"
        CLEANUP_RESOURCES+=("secret:$test_secret_name")
    else
        test_result "SECRET_CREATE" "FAIL" "Failed to create test secret"
        return 1
    fi
    
    # Read secret
    sleep 2  # Allow for eventual consistency
    local retrieved_value
    if retrieved_value=$(aws secretsmanager get-secret-value \
        --secret-id "$test_secret_name" \
        --region "$REGION" \
        --query 'SecretString' \
        --output text 2>/dev/null); then
        test_result "SECRET_READ" "PASS" "Test secret retrieved successfully"
        
        # Verify content
        if echo "$retrieved_value" | jq -e '.username == "test"' &> /dev/null; then
            test_result "SECRET_CONTENT_VALID" "PASS" "Secret content is valid JSON with expected data"
        else
            test_result "SECRET_CONTENT_VALID" "FAIL" "Secret content validation failed"
        fi
    else
        test_result "SECRET_READ" "FAIL" "Failed to retrieve test secret"
    fi
    
    # Update secret
    local updated_value='{"username":"test","password":"updated456","updated":"'$(date -Iseconds)'"}'
    if aws secretsmanager update-secret \
        --secret-id "$test_secret_name" \
        --secret-string "$updated_value" \
        --region "$REGION" &> /dev/null; then
        test_result "SECRET_UPDATE" "PASS" "Test secret updated successfully"
        
        # Verify update
        sleep 2
        local updated_retrieved
        if updated_retrieved=$(aws secretsmanager get-secret-value \
            --secret-id "$test_secret_name" \
            --region "$REGION" \
            --query 'SecretString' \
            --output text 2>/dev/null); then
            if echo "$updated_retrieved" | jq -e '.password == "updated456"' &> /dev/null; then
                test_result "SECRET_UPDATE_VERIFY" "PASS" "Secret update verified"
            else
                test_result "SECRET_UPDATE_VERIFY" "FAIL" "Secret update not reflected"
            fi
        fi
    else
        test_result "SECRET_UPDATE" "FAIL" "Failed to update test secret"
    fi
    
    # Test versioning
    local version_info
    if version_info=$(aws secretsmanager describe-secret \
        --secret-id "$test_secret_name" \
        --region "$REGION" \
        --query 'VersionIdsToStages' 2>/dev/null); then
        local version_count=$(echo "$version_info" | jq 'keys | length')
        if [[ $version_count -ge 2 ]]; then
            test_result "SECRET_VERSIONING" "PASS" "Secret versioning working ($version_count versions)"
        else
            test_result "SECRET_VERSIONING" "WARN" "Limited version history ($version_count versions)"
        fi
    else
        test_result "SECRET_VERSIONING" "FAIL" "Cannot access secret version info"
    fi
    
    echo ""
}

# Test 3: Encryption and KMS Integration
test_encryption_integration() {
    echo -e "${PURPLE}══════ Encryption and KMS Integration Tests ══════${NC}"
    
    local kms_alias="alias/candlefish-secrets-$ENVIRONMENT"
    
    # Test KMS key access
    if aws kms describe-key --key-id "$kms_alias" --region "$REGION" &> /dev/null; then
        test_result "KMS_KEY_ACCESS" "PASS" "KMS key accessible via alias"
        
        # Get key info
        local key_info
        if key_info=$(aws kms describe-key --key-id "$kms_alias" --region "$REGION" 2>/dev/null); then
            local key_id=$(echo "$key_info" | jq -r '.KeyMetadata.KeyId')
            local key_state=$(echo "$key_info" | jq -r '.KeyMetadata.KeyState')
            
            if [[ "$key_state" == "Enabled" ]]; then
                test_result "KMS_KEY_STATE" "PASS" "KMS key is enabled (ID: ${key_id:0:8}...)"
            else
                test_result "KMS_KEY_STATE" "FAIL" "KMS key state: $key_state"
            fi
        fi
    else
        test_result "KMS_KEY_ACCESS" "FAIL" "Cannot access KMS key"
        return 1
    fi
    
    # Test encryption/decryption
    local test_plaintext="Integration test data $(date)"
    local ciphertext_blob
    if ciphertext_blob=$(aws kms encrypt \
        --key-id "$kms_alias" \
        --plaintext "$test_plaintext" \
        --region "$REGION" \
        --query 'CiphertextBlob' \
        --output text 2>/dev/null); then
        test_result "KMS_ENCRYPT" "PASS" "KMS encryption successful"
        
        # Test decryption
        local decrypted_text
        if decrypted_text=$(aws kms decrypt \
            --ciphertext-blob "fileb://<(echo "$ciphertext_blob" | base64 -d)" \
            --region "$REGION" \
            --query 'Plaintext' \
            --output text 2>/dev/null | base64 -d); then
            if [[ "$decrypted_text" == "$test_plaintext" ]]; then
                test_result "KMS_DECRYPT" "PASS" "KMS decryption successful and verified"
            else
                test_result "KMS_DECRYPT" "FAIL" "Decrypted text doesn't match original"
            fi
        else
            test_result "KMS_DECRYPT" "FAIL" "KMS decryption failed"
        fi
    else
        test_result "KMS_ENCRYPT" "FAIL" "KMS encryption failed"
    fi
    
    # Test secret with custom KMS key
    local kms_secret_name="candlefish/test/$TEST_SECRET_PREFIX/kms-encrypted"
    local kms_secret_value='{"kms_test":"encrypted_data","timestamp":"'$(date -Iseconds)'"}'
    
    if aws secretsmanager create-secret \
        --name "$kms_secret_name" \
        --description "KMS encryption test secret" \
        --secret-string "$kms_secret_value" \
        --kms-key-id "$kms_alias" \
        --region "$REGION" &> /dev/null; then
        test_result "SECRET_KMS_CREATE" "PASS" "Secret with custom KMS key created"
        CLEANUP_RESOURCES+=("secret:$kms_secret_name")
        
        # Verify retrieval
        sleep 2
        if aws secretsmanager get-secret-value \
            --secret-id "$kms_secret_name" \
            --region "$REGION" \
            --query 'SecretString' \
            --output text &> /dev/null; then
            test_result "SECRET_KMS_RETRIEVE" "PASS" "KMS-encrypted secret retrieved successfully"
        else
            test_result "SECRET_KMS_RETRIEVE" "FAIL" "Failed to retrieve KMS-encrypted secret"
        fi
    else
        test_result "SECRET_KMS_CREATE" "FAIL" "Failed to create KMS-encrypted secret"
    fi
    
    echo ""
}

# Test 4: SDK Integration
test_sdk_integration() {
    echo -e "${PURPLE}══════ SDK Integration Tests ══════${NC}"
    
    local sdk_dir="$BASE_DIR/sdk/typescript"
    
    if [[ -d "$sdk_dir" ]]; then
        test_result "SDK_DIRECTORY" "PASS" "SDK directory found"
        
        # Test SDK compilation/syntax
        if [[ -f "$sdk_dir/package.json" ]]; then
            cd "$sdk_dir"
            
            # Check if dependencies are installed
            if [[ -d "node_modules" ]] || npm list &> /dev/null; then
                test_result "SDK_DEPENDENCIES" "PASS" "SDK dependencies available"
                
                # Try to import/require the SDK
                if command -v node &> /dev/null; then
                    # Create a simple test script
                    cat > test_sdk.js << 'EOF'
try {
    const sdk = require('./index.ts');
    console.log('SDK_IMPORT_SUCCESS');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('.ts')) {
        // Try compiled JS or transpile on the fly
        console.log('SDK_TYPESCRIPT_DETECTED');
    } else {
        console.log('SDK_IMPORT_ERROR:', error.message);
    }
}
EOF
                    
                    local sdk_test_result
                    sdk_test_result=$(node test_sdk.js 2>&1 || echo "SDK_TEST_FAILED")
                    
                    if echo "$sdk_test_result" | grep -q "SDK_IMPORT_SUCCESS"; then
                        test_result "SDK_IMPORT" "PASS" "SDK can be imported successfully"
                    elif echo "$sdk_test_result" | grep -q "SDK_TYPESCRIPT_DETECTED"; then
                        test_result "SDK_IMPORT" "INFO" "SDK requires TypeScript compilation"
                    else
                        test_result "SDK_IMPORT" "FAIL" "SDK import failed: $sdk_test_result"
                    fi
                    
                    rm -f test_sdk.js
                else
                    test_result "NODE_AVAILABLE" "WARN" "Node.js not available for SDK testing"
                fi
            else
                test_result "SDK_DEPENDENCIES" "WARN" "SDK dependencies not installed"
            fi
            
            cd - > /dev/null
        else
            test_result "SDK_PACKAGE_JSON" "FAIL" "SDK package.json not found"
        fi
    else
        test_result "SDK_DIRECTORY" "FAIL" "SDK directory not found"
    fi
    
    # Test SDK server if available
    local server_file="$sdk_dir/src/server.ts"
    if [[ -f "$server_file" ]]; then
        test_result "SDK_SERVER_FILE" "PASS" "SDK server file exists"
        
        # Check for proper server structure
        if grep -q "express\|fastify\|koa" "$server_file" 2>/dev/null; then
            test_result "SDK_SERVER_FRAMEWORK" "PASS" "Server framework detected in SDK"
        else
            test_result "SDK_SERVER_FRAMEWORK" "INFO" "No common server framework detected"
        fi
        
        if grep -q "/api\|app\.\|router\." "$server_file" 2>/dev/null; then
            test_result "SDK_SERVER_ROUTES" "PASS" "API routes detected in server"
        else
            test_result "SDK_SERVER_ROUTES" "WARN" "No clear API routes detected"
        fi
    else
        test_result "SDK_SERVER_FILE" "INFO" "SDK server file not found (may not be required)"
    fi
    
    echo ""
}

# Test 5: End-to-End Secret Operations
test_e2e_operations() {
    echo -e "${PURPLE}══════ End-to-End Operations Tests ══════${NC}"
    
    local e2e_secret_name="candlefish/test/$TEST_SECRET_PREFIX/e2e-test"
    local original_secret='{"service":"integration-test","api_key":"test-key-123","database_url":"postgres://localhost/test"}'
    
    # Complete workflow test
    echo "Testing complete secret management workflow..."
    
    # Step 1: Create secret with metadata
    if aws secretsmanager create-secret \
        --name "$e2e_secret_name" \
        --description "End-to-end integration test secret" \
        --secret-string "$original_secret" \
        --region "$REGION" \
        --tags '[{"Key":"Environment","Value":"test"},{"Key":"Service","Value":"integration"},{"Key":"TestID","Value":"'$TEST_SECRET_PREFIX'"}]' \
        &> /dev/null; then
        test_result "E2E_CREATE_WITH_TAGS" "PASS" "Secret created with tags"
        CLEANUP_RESOURCES+=("secret:$e2e_secret_name")
    else
        test_result "E2E_CREATE_WITH_TAGS" "FAIL" "Failed to create secret with tags"
        return 1
    fi
    
    # Step 2: Retrieve and validate
    sleep 3
    local retrieved_secret
    if retrieved_secret=$(aws secretsmanager get-secret-value \
        --secret-id "$e2e_secret_name" \
        --region "$REGION" \
        --query 'SecretString' \
        --output text 2>/dev/null); then
        test_result "E2E_RETRIEVE" "PASS" "Secret retrieved successfully"
        
        # Validate JSON structure
        if echo "$retrieved_secret" | jq -e '.service == "integration-test"' &> /dev/null; then
            test_result "E2E_JSON_VALIDATE" "PASS" "Retrieved secret has valid JSON structure"
        else
            test_result "E2E_JSON_VALIDATE" "FAIL" "Retrieved secret JSON validation failed"
        fi
    else
        test_result "E2E_RETRIEVE" "FAIL" "Failed to retrieve secret"
        return 1
    fi
    
    # Step 3: Update with version tracking
    local updated_secret='{"service":"integration-test","api_key":"updated-key-456","database_url":"postgres://localhost/test","last_updated":"'$(date -Iseconds)'"}'
    if aws secretsmanager update-secret \
        --secret-id "$e2e_secret_name" \
        --secret-string "$updated_secret" \
        --description "Updated during integration test" \
        --region "$REGION" &> /dev/null; then
        test_result "E2E_UPDATE" "PASS" "Secret updated successfully"
        
        # Verify update
        sleep 2
        local updated_retrieved
        if updated_retrieved=$(aws secretsmanager get-secret-value \
            --secret-id "$e2e_secret_name" \
            --region "$REGION" \
            --query 'SecretString' \
            --output text 2>/dev/null); then
            if echo "$updated_retrieved" | jq -e '.api_key == "updated-key-456"' &> /dev/null; then
                test_result "E2E_UPDATE_VERIFY" "PASS" "Secret update verified"
            else
                test_result "E2E_UPDATE_VERIFY" "FAIL" "Secret update verification failed"
            fi
        fi
    else
        test_result "E2E_UPDATE" "FAIL" "Failed to update secret"
    fi
    
    # Step 4: Test tag operations
    if aws secretsmanager describe-secret \
        --secret-id "$e2e_secret_name" \
        --region "$REGION" \
        --query 'Tags[?Key==`TestID`].Value' \
        --output text | grep -q "$TEST_SECRET_PREFIX"; then
        test_result "E2E_TAGS_VERIFY" "PASS" "Secret tags verified"
    else
        test_result "E2E_TAGS_VERIFY" "FAIL" "Secret tags verification failed"
    fi
    
    # Step 5: Test metadata and history
    local secret_metadata
    if secret_metadata=$(aws secretsmanager describe-secret \
        --secret-id "$e2e_secret_name" \
        --region "$REGION" 2>/dev/null); then
        local created_date=$(echo "$secret_metadata" | jq -r '.CreatedDate')
        local modified_date=$(echo "$secret_metadata" | jq -r '.LastChangedDate')
        
        if [[ "$created_date" != "null" ]] && [[ "$modified_date" != "null" ]]; then
            test_result "E2E_METADATA" "PASS" "Secret metadata tracking working"
        else
            test_result "E2E_METADATA" "FAIL" "Secret metadata incomplete"
        fi
        
        local version_count=$(echo "$secret_metadata" | jq '.VersionIdsToStages | keys | length')
        if [[ $version_count -ge 2 ]]; then
            test_result "E2E_VERSION_HISTORY" "PASS" "Version history maintained ($version_count versions)"
        else
            test_result "E2E_VERSION_HISTORY" "WARN" "Limited version history ($version_count versions)"
        fi
    else
        test_result "E2E_METADATA" "FAIL" "Cannot retrieve secret metadata"
    fi
    
    echo ""
}

# Test 6: Performance and Scale
test_performance() {
    echo -e "${PURPLE}══════ Performance and Scale Tests ══════${NC}"
    
    local perf_start_time=$(date +%s%3N)
    
    # Test multiple concurrent secret operations
    local temp_dir="/tmp/secrets-perf-test-$$"
    mkdir -p "$temp_dir"
    
    echo "Creating multiple test secrets concurrently..."
    local pids=()
    for i in {1..5}; do
        (
            local secret_name="candlefish/test/$TEST_SECRET_PREFIX/perf-test-$i"
            local secret_value='{"test_id":"'$i'","data":"performance test data","created":"'$(date -Iseconds)'"}'
            
            if aws secretsmanager create-secret \
                --name "$secret_name" \
                --secret-string "$secret_value" \
                --region "$REGION" &> /dev/null; then
                echo "Created secret $i"
                echo "$secret_name" > "$temp_dir/secret-$i.txt"
            fi
        ) &
        pids+=($!)
    done
    
    # Wait for all operations to complete
    local completed=0
    for pid in "${pids[@]}"; do
        if wait "$pid"; then
            ((completed++))
        fi
    done
    
    if [[ $completed -eq 5 ]]; then
        test_result "PERF_CONCURRENT_CREATE" "PASS" "5 concurrent secret creations completed"
        
        # Add to cleanup
        for i in {1..5}; do
            if [[ -f "$temp_dir/secret-$i.txt" ]]; then
                CLEANUP_RESOURCES+=("secret:$(cat "$temp_dir/secret-$i.txt")")
            fi
        done
    else
        test_result "PERF_CONCURRENT_CREATE" "FAIL" "Only $completed/5 concurrent creations succeeded"
    fi
    
    # Test retrieval performance
    if [[ $completed -gt 0 ]]; then
        local retrieval_start=$(date +%s%3N)
        local retrievals=0
        
        for i in {1..5}; do
            if [[ -f "$temp_dir/secret-$i.txt" ]]; then
                local secret_name=$(cat "$temp_dir/secret-$i.txt")
                if aws secretsmanager get-secret-value \
                    --secret-id "$secret_name" \
                    --region "$REGION" \
                    --query 'SecretString' \
                    --output text &> /dev/null; then
                    ((retrievals++))
                fi
            fi
        done
        
        local retrieval_end=$(date +%s%3N)
        local retrieval_time=$((retrieval_end - retrieval_start))
        
        if [[ $retrievals -eq $completed ]]; then
            test_result "PERF_RETRIEVAL_SUCCESS" "PASS" "$retrievals retrievals completed in ${retrieval_time}ms"
            
            local avg_time=$((retrieval_time / retrievals))
            if [[ $avg_time -lt 1000 ]]; then
                test_result "PERF_RETRIEVAL_SPEED" "PASS" "Average retrieval time: ${avg_time}ms (good)"
            elif [[ $avg_time -lt 3000 ]]; then
                test_result "PERF_RETRIEVAL_SPEED" "PASS" "Average retrieval time: ${avg_time}ms (acceptable)"
            else
                test_result "PERF_RETRIEVAL_SPEED" "WARN" "Average retrieval time: ${avg_time}ms (slow)"
            fi
        else
            test_result "PERF_RETRIEVAL_SUCCESS" "FAIL" "Only $retrievals/$completed retrievals succeeded"
        fi
    fi
    
    rm -rf "$temp_dir"
    
    local perf_end_time=$(date +%s%3N)
    local total_perf_time=$((perf_end_time - perf_start_time))
    test_result "PERF_TOTAL_TIME" "INFO" "Performance tests completed in ${total_perf_time}ms"
    
    echo ""
}

# Generate final report
generate_integration_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - TEST_START_TIME))
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}            Integration Test Final Report${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Test Summary:${NC}"
    echo -e "  Environment: $ENVIRONMENT"
    echo -e "  Region: $REGION"
    echo -e "  Duration: ${duration}s"
    echo -e "  Tests Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "  Tests Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "  Log File: $LOG_FILE"
    echo ""
    
    local status="UNKNOWN"
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}✓ ALL INTEGRATION TESTS PASSED - SYSTEM IS PRODUCTION READY${NC}"
        status="PRODUCTION_READY"
    elif [[ $FAILED_TESTS -le 2 ]]; then
        echo -e "${YELLOW}⚠ MINOR INTEGRATION ISSUES - REVIEW REQUIRED${NC}"
        status="REVIEW_REQUIRED"
    else
        echo -e "${RED}✗ CRITICAL INTEGRATION FAILURES - NOT PRODUCTION READY${NC}"
        status="NOT_READY"
    fi
    
    # Save detailed report
    {
        echo "Candlefish AI Secrets Management - Integration Test Report"
        echo "Generated: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Region: $REGION"
        echo "Status: $status"
        echo "Duration: ${duration}s"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo ""
        echo "Test Log:"
        cat "$LOG_FILE"
    } > "${LOG_FILE%.log}-report.txt"
    
    echo -e "${BLUE}Detailed report saved to: ${LOG_FILE%.log}-report.txt${NC}"
    
    # Return appropriate exit code
    if [[ $FAILED_TESTS -eq 0 ]]; then
        return 0
    elif [[ $FAILED_TESTS -le 2 ]]; then
        return 1
    else
        return 2
    fi
}

# Main execution
main() {
    print_header
    
    test_aws_integration || true
    test_secret_lifecycle || true  
    test_encryption_integration || true
    test_sdk_integration || true
    test_e2e_operations || true
    test_performance || true
    
    generate_integration_report
}

# Run the integration tests
main "$@"