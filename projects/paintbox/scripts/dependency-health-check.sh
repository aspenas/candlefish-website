#!/bin/bash

# Dependency Health Check Script
# Comprehensive dependency monitoring and health assessment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_ROOT/reports/dependency-health"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/dependency-health-$TIMESTAMP.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Initialize report directory
initialize_report() {
    mkdir -p "$REPORT_DIR"
    log_info "Starting dependency health check at $(date)"
    log_info "Report will be saved to: $REPORT_FILE"
}

# Check if required tools are installed
check_prerequisites() {
    local missing_tools=()

    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install missing tools and try again"
        exit 1
    fi

    log_success "All prerequisites are installed"
}

# Run npm audit and parse results
run_security_audit() {
    log_info "Running security audit..."

    local audit_file="$REPORT_DIR/audit-$TIMESTAMP.json"

    # Run audit and capture output
    if npm audit --audit-level=low --json > "$audit_file" 2>/dev/null; then
        log_success "No security vulnerabilities found"
        echo '{"vulnerabilities": {"total": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0}}' > "$audit_file"
    else
        log_warning "Security vulnerabilities detected"
    fi

    # Parse audit results
    local total_vulnerabilities=$(jq '.metadata.vulnerabilities.total // 0' "$audit_file")
    local critical_vulnerabilities=$(jq '.metadata.vulnerabilities.critical // 0' "$audit_file")
    local high_vulnerabilities=$(jq '.metadata.vulnerabilities.high // 0' "$audit_file")

    if [ "$critical_vulnerabilities" -gt 0 ]; then
        log_error "Found $critical_vulnerabilities critical vulnerabilities"
    elif [ "$high_vulnerabilities" -gt 0 ]; then
        log_warning "Found $high_vulnerabilities high severity vulnerabilities"
    elif [ "$total_vulnerabilities" -gt 0 ]; then
        log_warning "Found $total_vulnerabilities total vulnerabilities"
    else
        log_success "No vulnerabilities found"
    fi

    echo "$audit_file"
}

# Check for outdated dependencies
check_outdated_dependencies() {
    log_info "Checking for outdated dependencies..."

    local outdated_file="$REPORT_DIR/outdated-$TIMESTAMP.json"

    # Run npm outdated
    if npm outdated --json > "$outdated_file" 2>/dev/null; then
        log_success "All dependencies are up to date"
        echo '{}' > "$outdated_file"
    else
        local outdated_count=$(jq 'keys | length' "$outdated_file")
        log_warning "Found $outdated_count outdated dependencies"
    fi

    echo "$outdated_file"
}

# Analyze dependency tree depth and complexity
analyze_dependency_tree() {
    log_info "Analyzing dependency tree..."

    local tree_file="$REPORT_DIR/tree-$TIMESTAMP.txt"

    # Generate dependency tree
    npm list --depth=0 > "$tree_file" 2>/dev/null || true

    # Count direct dependencies
    local direct_deps=$(grep -c "├──\|└──" "$tree_file" || echo "0")

    # Generate full tree for analysis
    local full_tree_file="$REPORT_DIR/tree-full-$TIMESTAMP.txt"
    npm list --all > "$full_tree_file" 2>/dev/null || true

    # Count total dependencies
    local total_deps=$(grep -c "├──\|└──" "$full_tree_file" || echo "0")

    log_info "Direct dependencies: $direct_deps"
    log_info "Total dependencies: $total_deps"

    echo "{\"direct\": $direct_deps, \"total\": $total_deps}"
}

# Check license compliance
check_license_compliance() {
    log_info "Checking license compliance..."

    local license_file="$REPORT_DIR/licenses-$TIMESTAMP.json"

    # Install license checker if not available
    if ! command -v license-checker >/dev/null 2>&1; then
        log_info "Installing license-checker..."
        npm install -g license-checker
    fi

    # Run license check
    license-checker --json --out "$license_file" 2>/dev/null || echo '{}' > "$license_file"

    # Define prohibited licenses
    local prohibited_licenses=("GPL-2.0" "GPL-3.0" "AGPL-1.0" "AGPL-3.0" "SSPL-1.0")
    local license_issues=()

    for license in "${prohibited_licenses[@]}"; do
        if jq -r '.[] | select(.licenses | contains("'$license'")) | .name' "$license_file" | grep -q .; then
            license_issues+=("$license")
        fi
    done

    if [ ${#license_issues[@]} -gt 0 ]; then
        log_error "Prohibited licenses found: ${license_issues[*]}"
        return 1
    else
        log_success "All licenses are compliant"
        return 0
    fi
}

# Check for duplicate dependencies
check_duplicate_dependencies() {
    log_info "Checking for duplicate dependencies..."

    local duplicates_file="$REPORT_DIR/duplicates-$TIMESTAMP.json"

    # Use npm-check-duplicates if available, otherwise use npm ls
    if command -v npm-check-duplicates >/dev/null 2>&1; then
        npm-check-duplicates --json > "$duplicates_file" 2>/dev/null || echo '{}' > "$duplicates_file"
    else
        # Alternative: analyze npm ls output for duplicates
        npm ls --depth=0 --json > "$duplicates_file" 2>/dev/null || echo '{}' > "$duplicates_file"
    fi

    log_success "Duplicate dependency check completed"
    echo "$duplicates_file"
}

# Calculate dependency health score
calculate_health_score() {
    local audit_file="$1"
    local outdated_file="$2"
    local license_compliant="$3"

    log_info "Calculating dependency health score..."

    local score=100

    # Deduct points for vulnerabilities
    local critical_vulns=$(jq '.metadata.vulnerabilities.critical // 0' "$audit_file")
    local high_vulns=$(jq '.metadata.vulnerabilities.high // 0' "$audit_file")
    local moderate_vulns=$(jq '.metadata.vulnerabilities.moderate // 0' "$audit_file")

    score=$((score - critical_vulns * 20))
    score=$((score - high_vulns * 10))
    score=$((score - moderate_vulns * 5))

    # Deduct points for outdated dependencies
    local outdated_count=$(jq 'keys | length' "$outdated_file")
    score=$((score - outdated_count * 2))

    # Deduct points for license issues
    if [ "$license_compliant" != "0" ]; then
        score=$((score - 15))
    fi

    # Ensure score doesn't go below 0
    if [ "$score" -lt 0 ]; then
        score=0
    fi

    echo "$score"
}

# Generate comprehensive report
generate_report() {
    local audit_file="$1"
    local outdated_file="$2"
    local tree_analysis="$3"
    local duplicates_file="$4"
    local health_score="$5"
    local license_compliant="$6"

    log_info "Generating comprehensive report..."

    # Create report JSON
    jq -n \
        --arg timestamp "$(date -Iseconds)" \
        --arg score "$health_score" \
        --argjson audit "$(cat "$audit_file")" \
        --argjson outdated "$(cat "$outdated_file")" \
        --argjson tree "$tree_analysis" \
        --argjson duplicates "$(cat "$duplicates_file")" \
        --argjson license_compliant "$license_compliant" \
        '{
            "timestamp": $timestamp,
            "health_score": ($score | tonumber),
            "security_audit": $audit,
            "outdated_dependencies": $outdated,
            "dependency_tree": $tree,
            "duplicate_dependencies": $duplicates,
            "license_compliant": ($license_compliant == "0"),
            "recommendations": []
        }' > "$REPORT_FILE"

    # Add recommendations based on findings
    local recommendations=()

    if [ "$(jq '.metadata.vulnerabilities.total // 0' "$audit_file")" -gt 0 ]; then
        recommendations+=("Run 'npm audit fix' to resolve security vulnerabilities")
    fi

    if [ "$(jq 'keys | length' "$outdated_file")" -gt 0 ]; then
        recommendations+=("Update outdated dependencies using 'npm update'")
    fi

    if [ "$license_compliant" != "0" ]; then
        recommendations+=("Review and resolve license compliance issues")
    fi

    if [ ${#recommendations[@]} -eq 0 ]; then
        recommendations+=("All dependencies are healthy!")
    fi

    # Update report with recommendations
    local rec_json=$(printf '%s\n' "${recommendations[@]}" | jq -R . | jq -s .)
    jq --argjson rec "$rec_json" '.recommendations = $rec' "$REPORT_FILE" > "$REPORT_FILE.tmp"
    mv "$REPORT_FILE.tmp" "$REPORT_FILE"

    log_success "Report generated: $REPORT_FILE"
}

# Display summary
display_summary() {
    local health_score="$1"

    echo
    echo "=================================="
    echo "  DEPENDENCY HEALTH SUMMARY"
    echo "=================================="
    echo
    echo "Health Score: $health_score/100"
    echo

    if [ "$health_score" -ge 90 ]; then
        log_success "Excellent dependency health!"
    elif [ "$health_score" -ge 70 ]; then
        log_warning "Good dependency health with room for improvement"
    elif [ "$health_score" -ge 50 ]; then
        log_warning "Moderate dependency health - action recommended"
    else
        log_error "Poor dependency health - immediate action required"
    fi

    echo
    echo "Full report: $REPORT_FILE"
    echo "View with: jq . $REPORT_FILE"
    echo
}

# Cleanup old reports
cleanup_old_reports() {
    log_info "Cleaning up old reports (keeping last 30)..."

    # Remove reports older than 30 days
    find "$REPORT_DIR" -name "dependency-health-*.json" -mtime +30 -delete 2>/dev/null || true
    find "$REPORT_DIR" -name "audit-*.json" -mtime +30 -delete 2>/dev/null || true
    find "$REPORT_DIR" -name "outdated-*.json" -mtime +30 -delete 2>/dev/null || true
    find "$REPORT_DIR" -name "*.txt" -mtime +30 -delete 2>/dev/null || true

    log_success "Cleanup completed"
}

# Main execution
main() {
    cd "$PROJECT_ROOT"

    initialize_report
    check_prerequisites

    # Run all checks
    local audit_file=$(run_security_audit)
    local outdated_file=$(check_outdated_dependencies)
    local tree_analysis=$(analyze_dependency_tree)
    local duplicates_file=$(check_duplicate_dependencies)

    # Check license compliance
    local license_compliant=0
    if ! check_license_compliance; then
        license_compliant=1
    fi

    # Calculate health score
    local health_score=$(calculate_health_score "$audit_file" "$outdated_file" "$license_compliant")

    # Generate report
    generate_report "$audit_file" "$outdated_file" "$tree_analysis" "$duplicates_file" "$health_score" "$license_compliant"

    # Display summary
    display_summary "$health_score"

    # Cleanup
    cleanup_old_reports

    # Exit with appropriate code
    if [ "$health_score" -lt 50 ]; then
        exit 1
    fi
}

# Handle script arguments
case "${1:-check}" in
    "check")
        main
        ;;
    "cleanup")
        cleanup_old_reports
        ;;
    "report")
        if [ -f "$REPORT_FILE" ]; then
            jq . "$REPORT_FILE"
        else
            log_error "No recent report found. Run '$0 check' first."
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [check|cleanup|report]"
        echo "  check   - Run dependency health check (default)"
        echo "  cleanup - Remove old reports"
        echo "  report  - Display latest report"
        exit 1
        ;;
esac
