#!/usr/bin/env bash

# Mobile Security Verification Script
# Ensures no hardcoded API keys remain in mobile applications
# Last updated: September 2025

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APPS_DIR="$PROJECT_ROOT/apps"

# Mobile apps to verify
MOBILE_APPS=(
    "mobile-security-dashboard"
    "mobile-collaboration" 
    "mobile-inventory"
    "mobile-dashboard"
    "mobile-maturity-map"
    "mobile-prompt-engineering"
)

# Patterns to search for (potential secrets)
SECRET_PATTERNS=(
    # Firebase
    "AIzaSy[A-Za-z0-9_-]{33}"
    "AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}"
    "1:[0-9]{10}:[a-zA-Z0-9_-]{40}"
    
    # Generic API Keys
    "sk-[a-zA-Z0-9]{20,50}"
    "pk_live_[0-9a-zA-Z]{24}"
    "pk_test_[0-9a-zA-Z]{24}"
    
    # AWS
    "AKIA[0-9A-Z]{16}"
    "ASIA[0-9A-Z]{16}"
    
    # Sentry DSN
    "https://[a-f0-9]{32}@sentry\.io/[0-9]+"
    
    # Mixpanel
    "[0-9a-f]{32}"
    
    # Generic tokens
    "['\"][0-9a-zA-Z_-]{20,}['\"]"
)

# Environment variable patterns (these should NOT contain actual values)
ENV_PATTERNS=(
    "FIREBASE_API_KEY=.*[A-Za-z0-9]{20,}"
    "FCM_SERVER_KEY=.*[A-Za-z0-9]{20,}"
    "MIXPANEL_TOKEN=.*[A-Za-z0-9]{20,}"
    "SENTRY_DSN=.*https://.*@.*/"
    "API_KEY=.*[A-Za-z0-9]{20,}"
    "SECRET_KEY=.*[A-Za-z0-9]{20,}"
    "ACCESS_TOKEN=.*[A-Za-z0-9]{20,}"
    "PRIVATE_KEY=.*[A-Za-z0-9]{20,}"
)

# File extensions to scan
SCAN_EXTENSIONS=(
    "*.ts"
    "*.tsx"  
    "*.js"
    "*.jsx"
    "*.json"
    "*.env*"
    "*.config.*"
    "*.plist"
    "*.xml"
    "*.gradle"
    "*.properties"
)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_finding() {
    echo -e "${PURPLE}[FINDING]${NC} $1"
}

# Initialize results tracking
declare -A SCAN_RESULTS
declare -A VIOLATION_COUNTS
TOTAL_FILES_SCANNED=0
TOTAL_VIOLATIONS=0

# Scan a single file for secrets
scan_file() {
    local file_path="$1"
    local app_name="$2"
    local violations=0
    
    ((TOTAL_FILES_SCANNED++))
    
    # Skip binary files and common excludes
    if file "$file_path" | grep -q "binary\|executable"; then
        return 0
    fi
    
    # Skip node_modules and other common exclude directories
    if [[ "$file_path" == *"/node_modules/"* ]] || \
       [[ "$file_path" == *"/.git/"* ]] || \
       [[ "$file_path" == *"/build/"* ]] || \
       [[ "$file_path" == *"/dist/"* ]] || \
       [[ "$file_path" == *"/coverage/"* ]] || \
       [[ "$file_path" == *"/.expo/"* ]]; then
        return 0
    fi
    
    # Check for secret patterns
    local line_num=1
    while IFS= read -r line; do
        for pattern in "${SECRET_PATTERNS[@]}"; do
            if echo "$line" | grep -qE "$pattern"; then
                log_finding "Potential secret in $file_path:$line_num"
                log_finding "  Pattern: $pattern"
                log_finding "  Content: $(echo "$line" | sed 's/^[[:space:]]*//')"
                echo ""
                ((violations++))
            fi
        done
        
        # Check for environment variable patterns
        for env_pattern in "${ENV_PATTERNS[@]}"; do
            if echo "$line" | grep -qE "$env_pattern"; then
                # Skip if it's in a secure template or guide
                if [[ "$file_path" == *".secure"* ]] || \
                   [[ "$file_path" == *"MIGRATION_GUIDE"* ]] || \
                   [[ "$file_path" == *"README"* ]]; then
                    continue
                fi
                
                log_finding "Hardcoded secret in $file_path:$line_num"
                log_finding "  Pattern: $env_pattern"
                log_finding "  Content: $(echo "$line" | sed 's/^[[:space:]]*//')"
                echo ""
                ((violations++))
            fi
        done
        
        ((line_num++))
    done < "$file_path"
    
    if [[ $violations -gt 0 ]]; then
        VIOLATION_COUNTS["$app_name"]=$((${VIOLATION_COUNTS["$app_name"]:-0} + violations))
        TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + violations))
    fi
    
    return $violations
}

# Scan all files in an app directory
scan_app() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Scanning $app_name for hardcoded secrets..."
    
    if [[ ! -d "$app_path" ]]; then
        log_warning "App directory not found: $app_path"
        return 0
    fi
    
    local files_found=0
    local app_violations=0
    
    # Scan each file type
    for extension in "${SCAN_EXTENSIONS[@]}"; do
        while IFS= read -r -d '' file; do
            ((files_found++))
            if scan_file "$file" "$app_name"; then
                ((app_violations++))
            fi
        done < <(find "$app_path" -name "$extension" -type f -print0 2>/dev/null || true)
    done
    
    if [[ ${VIOLATION_COUNTS["$app_name"]:-0} -eq 0 ]]; then
        log_success "$app_name: No hardcoded secrets found ($files_found files scanned)"
        SCAN_RESULTS["$app_name"]="PASS"
    else
        log_error "$app_name: ${VIOLATION_COUNTS["$app_name"]} violations found ($files_found files scanned)"
        SCAN_RESULTS["$app_name"]="FAIL"
    fi
}

# Check if secure environment templates exist
check_secure_templates() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Checking secure templates for $app_name..."
    
    local missing_templates=0
    
    # Check for secure environment file
    if [[ ! -f "$app_path/.env.production.secure" ]]; then
        log_warning "$app_name: Missing .env.production.secure template"
        ((missing_templates++))
    fi
    
    # Check for mobile secrets manager
    if [[ ! -f "$app_path/src/services/mobile-secrets-manager.ts" ]]; then
        log_warning "$app_name: Missing mobile secrets manager"
        ((missing_templates++))
    fi
    
    # Check for enhanced secure storage
    if [[ ! -f "$app_path/src/utils/secure-storage-enhanced.ts" ]]; then
        log_warning "$app_name: Missing enhanced secure storage"
        ((missing_templates++))
    fi
    
    # Check for migration guide
    if [[ ! -f "$app_path/SECURITY_MIGRATION_GUIDE.md" ]]; then
        log_warning "$app_name: Missing security migration guide"
        ((missing_templates++))
    fi
    
    if [[ $missing_templates -eq 0 ]]; then
        log_success "$app_name: All security templates present"
        return 0
    else
        log_error "$app_name: $missing_templates security templates missing"
        return 1
    fi
}

# Verify package.json has required security dependencies
check_dependencies() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Checking security dependencies for $app_name..."
    
    if [[ ! -f "$app_path/package.json" ]]; then
        log_warning "$app_name: No package.json found"
        return 1
    fi
    
    local missing_deps=0
    
    # Check for required crypto dependencies
    if ! grep -q "expo-crypto" "$app_path/package.json"; then
        log_warning "$app_name: Missing expo-crypto dependency"
        ((missing_deps++))
    fi
    
    if ! grep -q "expo-secure-store" "$app_path/package.json"; then
        log_warning "$app_name: Missing expo-secure-store dependency"
        ((missing_deps++))
    fi
    
    if [[ $missing_deps -eq 0 ]]; then
        log_success "$app_name: All security dependencies present"
        return 0
    else
        log_error "$app_name: $missing_deps security dependencies missing"
        return 1
    fi
}

# Check for old insecure files that should be removed/renamed
check_legacy_files() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Checking for legacy insecure files in $app_name..."
    
    local legacy_files=0
    
    # Check for old secure storage (should be replaced)
    if [[ -f "$app_path/src/utils/secure-storage.ts" ]] && \
       [[ ! -f "$app_path/src/utils/secure-storage.ts.legacy" ]]; then
        log_warning "$app_name: Old secure-storage.ts should be renamed to .legacy"
        ((legacy_files++))
    fi
    
    # Check for production env files with actual secrets
    if [[ -f "$app_path/.env.production" ]]; then
        # Check if it contains actual secrets
        local has_secrets=0
        for pattern in "${ENV_PATTERNS[@]}"; do
            if grep -qE "$pattern" "$app_path/.env.production"; then
                ((has_secrets++))
                break
            fi
        done
        
        if [[ $has_secrets -gt 0 ]]; then
            log_warning "$app_name: .env.production contains hardcoded secrets - should be replaced with .env.production.secure"
            ((legacy_files++))
        fi
    fi
    
    if [[ $legacy_files -eq 0 ]]; then
        log_success "$app_name: No legacy insecure files found"
        return 0
    else
        log_error "$app_name: $legacy_files legacy files need attention"
        return 1
    fi
}

# Generate security report
generate_report() {
    local report_file="$PROJECT_ROOT/MOBILE_SECURITY_VERIFICATION_REPORT.md"
    
    log_info "Generating security verification report..."
    
    cat > "$report_file" << EOF
# Mobile Security Verification Report

**Generated:** $(date)
**Scan Coverage:** ${#MOBILE_APPS[@]} mobile applications
**Files Scanned:** $TOTAL_FILES_SCANNED
**Total Violations:** $TOTAL_VIOLATIONS

## Summary

EOF

    # Add summary table
    local passed=0
    local failed=0
    
    for app_name in "${MOBILE_APPS[@]}"; do
        if [[ "${SCAN_RESULTS[$app_name]:-SKIP}" == "PASS" ]]; then
            ((passed++))
            echo "✅ **$app_name**: PASS (${VIOLATION_COUNTS["$app_name"]:-0} violations)" >> "$report_file"
        elif [[ "${SCAN_RESULTS[$app_name]:-SKIP}" == "FAIL" ]]; then
            ((failed++))
            echo "❌ **$app_name**: FAIL (${VIOLATION_COUNTS["$app_name"]:-0} violations)" >> "$report_file"
        else
            echo "⚠️ **$app_name**: SKIPPED (directory not found)" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

## Results
- **Passed:** $passed applications
- **Failed:** $failed applications
- **Skipped:** $(( ${#MOBILE_APPS[@]} - passed - failed )) applications

## Security Patterns Checked

### Hardcoded Secrets
EOF

    for pattern in "${SECRET_PATTERNS[@]}"; do
        echo "- \`$pattern\`" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

### Environment Variable Violations  
EOF

    for pattern in "${ENV_PATTERNS[@]}"; do
        echo "- \`$pattern\`" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

## Recommendations

EOF

    if [[ $TOTAL_VIOLATIONS -gt 0 ]]; then
        cat >> "$report_file" << EOF
### 🚨 Immediate Actions Required

1. **Address all $TOTAL_VIOLATIONS security violations** identified in this scan
2. **Replace hardcoded secrets** with AWS Secrets Manager integration
3. **Update environment files** to use secure templates
4. **Re-run verification** after fixes are applied

### Migration Steps

For each failing application:

1. **Run migration script:**
   \`\`\`bash
   ./scripts/mobile-security-migration.sh [app-name]
   \`\`\`

2. **Configure AWS Secrets Manager** with required secrets

3. **Test application** with new secure configuration

4. **Re-run verification:**
   \`\`\`bash
   ./scripts/verify-no-hardcoded-keys.sh [app-name]
   \`\`\`

EOF
    else
        cat >> "$report_file" << EOF
### ✅ Security Status: GOOD

All scanned applications passed security verification. No hardcoded secrets were found.

### Maintenance Recommendations

1. **Regular scans:** Run this verification script before each deployment
2. **Secret rotation:** Regularly rotate secrets in AWS Secrets Manager  
3. **Dependency updates:** Keep security-related dependencies up to date
4. **Team training:** Ensure all developers understand secure secrets management

EOF
    fi
    
    cat >> "$report_file" << EOF
## File Extensions Scanned

EOF

    for ext in "${SCAN_EXTENSIONS[@]}"; do
        echo "- $ext" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

---
*This report was generated by the Mobile Security Verification Script*
*For questions or issues, refer to the security migration documentation*
EOF

    log_success "Security report generated: $report_file"
}

# Main verification function
main() {
    log_info "Starting Mobile Security Verification..."
    log_info "Project root: $PROJECT_ROOT"
    log_info "Apps directory: $APPS_DIR"
    echo ""
    
    # Check prerequisites
    if [[ ! -d "$APPS_DIR" ]]; then
        log_error "Apps directory not found: $APPS_DIR"
        exit 1
    fi
    
    local apps_processed=0
    local apps_passed=0
    local apps_failed=0
    
    # Verify each app
    for app_name in "${MOBILE_APPS[@]}"; do
        echo ""
        log_info "═══ Processing app: $app_name ($(( ++apps_processed ))/${#MOBILE_APPS[@]}) ═══"
        
        if [[ ! -d "$APPS_DIR/$app_name" ]]; then
            log_warning "Skipping $app_name - directory not found"
            continue
        fi
        
        # Initialize violation count for this app
        VIOLATION_COUNTS["$app_name"]=0
        
        # Scan for secrets
        scan_app "$app_name"
        
        # Check templates and dependencies
        check_secure_templates "$app_name"
        check_dependencies "$app_name" 
        check_legacy_files "$app_name"
        
        # Count results
        if [[ "${SCAN_RESULTS[$app_name]}" == "PASS" ]]; then
            ((apps_passed++))
        else
            ((apps_failed++))
        fi
        
        echo ""
    done
    
    # Generate comprehensive report
    generate_report
    
    # Summary
    echo ""
    log_info "═══ VERIFICATION COMPLETE ═══"
    log_info "Apps processed: $apps_processed"
    log_info "Files scanned: $TOTAL_FILES_SCANNED"
    
    if [[ $TOTAL_VIOLATIONS -eq 0 ]]; then
        log_success "✅ SECURITY CHECK PASSED"
        log_success "No hardcoded secrets found in any mobile application"
        log_info "Apps passed: $apps_passed"
        echo ""
        log_info "Next steps:"
        log_info "1. Review the generated security report"
        log_info "2. Proceed with mobile app deployments"
        log_info "3. Set up regular security scans in CI/CD pipeline"
        exit 0
    else
        log_error "❌ SECURITY CHECK FAILED"
        log_error "Found $TOTAL_VIOLATIONS security violations across $apps_failed apps"
        log_info "Apps passed: $apps_passed"
        log_info "Apps failed: $apps_failed"
        echo ""
        log_error "🚨 DEPLOYMENT BLOCKED 🚨"
        log_info "Required actions:"
        log_info "1. Review detailed findings above"
        log_info "2. Run migration script for failing apps"
        log_info "3. Fix all identified security violations"
        log_info "4. Re-run this verification script"
        log_info "5. Only proceed with deployment after all checks pass"
        echo ""
        log_info "Migration command: ./scripts/mobile-security-migration.sh [app-name]"
        exit 1
    fi
}

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [app_name|all]"
    echo ""
    echo "Available apps:"
    printf "  %s\n" "${MOBILE_APPS[@]}"
    echo ""
    echo "Examples:"
    echo "  $0 all                          # Verify all apps"
    echo "  $0 mobile-security-dashboard    # Verify specific app"
    exit 0
fi

# Handle command line arguments
if [[ "$1" == "all" ]]; then
    main
else
    # Verify specific app
    MOBILE_APPS=("$1")
    main
fi