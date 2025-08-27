#!/bin/bash

# Workflow Testing Script
# Tests GitHub Actions workflows locally using act or triggers them remotely

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if act is installed
check_act() {
    if ! command -v act &> /dev/null; then
        print_status "$YELLOW" "⚠️  'act' is not installed"
        echo "Install act to run workflows locally:"
        echo "  macOS: brew install act"
        echo "  Linux: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
        echo ""
        return 1
    fi
    print_status "$GREEN" "✅ act is installed"
    return 0
}

# Check if gh CLI is installed
check_gh() {
    if ! command -v gh &> /dev/null; then
        print_status "$RED" "❌ GitHub CLI is not installed"
        exit 1
    fi
    print_status "$GREEN" "✅ GitHub CLI is installed"
}

# Test workflow locally with act
test_local() {
    local workflow=$1
    
    if ! check_act; then
        print_status "$YELLOW" "Skipping local test"
        return
    fi
    
    print_status "$BLUE" "🧪 Testing workflow locally: $workflow"
    
    # Create .actrc if it doesn't exist
    if [ ! -f .actrc ]; then
        cat > .actrc << 'EOF'
-P ubuntu-latest=catthehacker/ubuntu:act-latest
-P ubuntu-22.04=catthehacker/ubuntu:act-22.04
-P ubuntu-20.04=catthehacker/ubuntu:act-20.04
-P ubuntu-18.04=catthehacker/ubuntu:act-18.04
--container-architecture linux/amd64
EOF
    fi
    
    # Create secrets file for act
    if [ ! -f .secrets ]; then
        print_status "$YELLOW" "Creating .secrets file for act (add your secrets here)"
        cat > .secrets << 'EOF'
# Add your secrets here for local testing
# Format: SECRET_NAME=secret_value
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
GITHUB_TOKEN=$GITHUB_TOKEN
EOF
    fi
    
    # Run workflow with act
    act -W ".github/workflows/$workflow" \
        --secret-file .secrets \
        --verbose \
        push
}

# Test CI/CD workflow
test_cicd() {
    print_status "$BLUE" "🚀 Testing CI/CD Pipeline"
    
    WORKFLOW="security-dashboard-ci-cd.yml"
    
    # Local test
    if [[ "${1:-}" == "local" ]]; then
        test_local "$WORKFLOW"
    else
        # Remote test
        print_status "$BLUE" "Triggering workflow on GitHub..."
        gh workflow run "$WORKFLOW" \
            --ref "$(git branch --show-current)" \
            -f environment=development
        
        print_status "$GREEN" "✅ Workflow triggered. View runs:"
        echo "gh run list --workflow=$WORKFLOW"
    fi
}

# Test security scan workflow
test_security() {
    print_status "$BLUE" "🔒 Testing Security Scanning"
    
    WORKFLOW="security-compliance-scan.yml"
    
    # Local test
    if [[ "${1:-}" == "local" ]]; then
        test_local "$WORKFLOW"
    else
        # Remote test
        print_status "$BLUE" "Triggering security scan on GitHub..."
        gh workflow run "$WORKFLOW" \
            --ref "$(git branch --show-current)" \
            -f scan_type=full
        
        print_status "$GREEN" "✅ Security scan triggered. View runs:"
        echo "gh run list --workflow=$WORKFLOW"
    fi
}

# Test monitoring workflow
test_monitoring() {
    print_status "$BLUE" "📊 Testing Monitoring Workflow"
    
    WORKFLOW="monitoring-alerting.yml"
    
    # Local test
    if [[ "${1:-}" == "local" ]]; then
        test_local "$WORKFLOW"
    else
        # Remote test
        print_status "$BLUE" "Triggering monitoring workflow on GitHub..."
        gh workflow run "$WORKFLOW" \
            --ref "$(git branch --show-current)"
        
        print_status "$GREEN" "✅ Monitoring workflow triggered. View runs:"
        echo "gh run list --workflow=$WORKFLOW"
    fi
}

# Test release workflow
test_release() {
    print_status "$BLUE" "📦 Testing Release Automation"
    
    WORKFLOW="release-automation.yml"
    
    # Local test
    if [[ "${1:-}" == "local" ]]; then
        print_status "$YELLOW" "⚠️  Release workflow should be tested with dry-run on remote"
        return
    fi
    
    # Remote test (dry run)
    print_status "$BLUE" "Triggering release workflow (patch release)..."
    gh workflow run "$WORKFLOW" \
        --ref "$(git branch --show-current)" \
        -f release_type=patch
    
    print_status "$GREEN" "✅ Release workflow triggered. View runs:"
    echo "gh run list --workflow=$WORKFLOW"
}

# Validate all workflows
validate_all() {
    print_status "$BLUE" "✔️  Validating all workflow files..."
    
    # Check YAML syntax
    for workflow in .github/workflows/*.yml; do
        if [ -f "$workflow" ]; then
            filename=$(basename "$workflow")
            
            # Check YAML syntax
            if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
                print_status "$GREEN" "  ✅ $filename - Valid YAML"
            else
                print_status "$RED" "  ❌ $filename - Invalid YAML"
            fi
            
            # Check with actionlint if available
            if command -v actionlint &> /dev/null; then
                if actionlint "$workflow" 2>/dev/null; then
                    print_status "$GREEN" "  ✅ $filename - Passed actionlint"
                else
                    print_status "$YELLOW" "  ⚠️  $filename - actionlint warnings"
                fi
            fi
        fi
    done
}

# Watch workflow runs
watch_runs() {
    print_status "$BLUE" "👁️  Watching workflow runs..."
    
    # List recent runs
    gh run list --limit 5
    
    # Watch the latest run
    LATEST_RUN=$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')
    if [ -n "$LATEST_RUN" ]; then
        print_status "$BLUE" "Watching run #$LATEST_RUN..."
        gh run watch "$LATEST_RUN"
    fi
}

# Check workflow status
check_status() {
    print_status "$BLUE" "📊 Workflow Status"
    
    # Get workflow runs from last 24 hours
    print_status "$YELLOW" "Recent workflow runs (last 24h):"
    gh run list --limit 20 --json name,status,conclusion,createdAt \
        --jq '.[] | "\(.name): \(.status) - \(.conclusion // "in progress")"'
    
    # Check for failures
    FAILURES=$(gh run list --limit 20 --json conclusion -q '.[] | select(.conclusion == "failure")' | wc -l)
    if [ "$FAILURES" -gt 0 ]; then
        print_status "$RED" "⚠️  Found $FAILURES failed runs in recent history"
    else
        print_status "$GREEN" "✅ No failures in recent runs"
    fi
}

# Main menu
show_menu() {
    echo ""
    print_status "$BLUE" "🔧 Workflow Testing Tool"
    echo ""
    echo "Select a workflow to test:"
    echo "  1) CI/CD Pipeline"
    echo "  2) Security Scanning"
    echo "  3) Monitoring & Alerting"
    echo "  4) Release Automation"
    echo "  5) Validate All Workflows"
    echo "  6) Watch Running Workflows"
    echo "  7) Check Workflow Status"
    echo "  8) Run All Tests"
    echo "  q) Quit"
    echo ""
    read -p "Enter choice [1-8]: " choice
    
    case $choice in
        1)
            read -p "Test locally or remote? (l/r): " location
            if [[ "$location" == "l" ]]; then
                test_cicd "local"
            else
                test_cicd "remote"
            fi
            ;;
        2)
            read -p "Test locally or remote? (l/r): " location
            if [[ "$location" == "l" ]]; then
                test_security "local"
            else
                test_security "remote"
            fi
            ;;
        3)
            read -p "Test locally or remote? (l/r): " location
            if [[ "$location" == "l" ]]; then
                test_monitoring "local"
            else
                test_monitoring "remote"
            fi
            ;;
        4)
            test_release "remote"
            ;;
        5)
            validate_all
            ;;
        6)
            watch_runs
            ;;
        7)
            check_status
            ;;
        8)
            validate_all
            test_cicd "remote"
            test_security "remote"
            test_monitoring "remote"
            ;;
        q)
            exit 0
            ;;
        *)
            print_status "$RED" "Invalid choice"
            ;;
    esac
}

# Parse command line arguments
case "${1:-menu}" in
    cicd)
        test_cicd "${2:-remote}"
        ;;
    security)
        test_security "${2:-remote}"
        ;;
    monitoring)
        test_monitoring "${2:-remote}"
        ;;
    release)
        test_release "remote"
        ;;
    validate)
        validate_all
        ;;
    watch)
        watch_runs
        ;;
    status)
        check_status
        ;;
    menu)
        check_gh
        while true; do
            show_menu
        done
        ;;
    --help|-h)
        echo "Workflow Testing Script"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  cicd [local|remote]      Test CI/CD pipeline"
        echo "  security [local|remote]  Test security scanning"
        echo "  monitoring [local|remote] Test monitoring workflow"
        echo "  release                  Test release automation"
        echo "  validate                 Validate all workflows"
        echo "  watch                    Watch running workflows"
        echo "  status                   Check workflow status"
        echo "  menu                     Show interactive menu (default)"
        echo ""
        echo "Examples:"
        echo "  $0 cicd local           # Test CI/CD locally with act"
        echo "  $0 security remote      # Trigger security scan on GitHub"
        echo "  $0 validate             # Validate all workflow files"
        ;;
    *)
        print_status "$RED" "Unknown command: $1"
        echo "Run '$0 --help' for usage"
        exit 1
        ;;
esac