#!/bin/bash
set -euo pipefail

# Autonomous Deployment Monitor for Candlefish AI
# This script monitors and manages the autonomous deployment workflow

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WORKFLOW_NAME="Autonomous Prompt Engineering Deployment"
WORKFLOW_ID="184638683"
REPO="candlefish-ai/candlefish-ai"
AWS_ACCOUNT="681214184463"
AWS_REGION="us-east-1"

# Function to print colored output
print_color() {
    echo -e "${2:-$NC}$1${NC}"
}

# Function to show banner
show_banner() {
    clear
    print_color "╔════════════════════════════════════════════════════════════╗" "$CYAN"
    print_color "║     CANDLEFISH AI - AUTONOMOUS DEPLOYMENT MONITOR         ║" "$CYAN"
    print_color "║     Claude Opus 4.1 - 2M Input / 400K Output Tokens      ║" "$CYAN"
    print_color "╚════════════════════════════════════════════════════════════╝" "$CYAN"
    echo
}

# Check GitHub CLI authentication
check_auth() {
    print_color "Checking GitHub authentication..." "$YELLOW"
    if gh auth status &>/dev/null; then
        print_color "✓ GitHub CLI authenticated" "$GREEN"
        return 0
    else
        print_color "✗ GitHub CLI not authenticated" "$RED"
        print_color "Run: gh auth login" "$YELLOW"
        return 1
    fi
}

# Check AWS credentials
check_aws() {
    print_color "Checking AWS credentials..." "$YELLOW"
    CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
    
    if [ "$CURRENT_ACCOUNT" == "$AWS_ACCOUNT" ]; then
        print_color "✓ AWS credentials configured (Account: $AWS_ACCOUNT)" "$GREEN"
        return 0
    else
        print_color "✗ AWS credentials not configured or wrong account" "$RED"
        print_color "Expected: $AWS_ACCOUNT, Got: $CURRENT_ACCOUNT" "$YELLOW"
        return 1
    fi
}

# Check required secrets
check_secrets() {
    print_color "\nChecking AWS Secrets Manager..." "$YELLOW"
    
    REQUIRED_SECRETS=(
        "candlefish/deployment/vercel-api"
        "candlefish/deployment/netlify-api"
        "candlefish/deployment/github-pat"
        "candlefish/database/postgres-primary"
        "candlefish/database/redis-cluster"
        "candlefish/monitoring/datadog-key"
        "candlefish/mobile/expo-token"
        "candlefish/mobile/apple-id"
        "candlefish/certificates/ios-p12-password"
    )
    
    MISSING_SECRETS=()
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if aws secretsmanager describe-secret --secret-id "$secret" &>/dev/null; then
            print_color "  ✓ $secret" "$GREEN"
        else
            print_color "  ✗ $secret" "$RED"
            MISSING_SECRETS+=("$secret")
        fi
    done
    
    if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
        print_color "\n⚠️  Missing ${#MISSING_SECRETS[@]} required secrets" "$YELLOW"
        print_color "Create them with: aws secretsmanager create-secret --name SECRET_NAME --secret-string VALUE" "$CYAN"
        return 1
    else
        print_color "\n✓ All required secrets present" "$GREEN"
        return 0
    fi
}

# Trigger deployment
trigger_deployment() {
    print_color "\nAttempting to trigger deployment..." "$YELLOW"
    
    if gh workflow run "$WORKFLOW_NAME" \
        -f platform=all \
        -f deployment-mode=autonomous \
        -f use-max-tokens=true 2>/dev/null; then
        print_color "✓ Deployment triggered successfully!" "$GREEN"
        return 0
    else
        print_color "✗ Cannot trigger via CLI (token lacks workflow permissions)" "$RED"
        print_color "\n📋 MANUAL TRIGGER REQUIRED:" "$MAGENTA"
        print_color "────────────────────────────────────────────" "$CYAN"
        print_color "1. Open: https://github.com/$REPO/actions/workflows/$WORKFLOW_ID" "$YELLOW"
        print_color "2. Click: 'Run workflow'" "$YELLOW"
        print_color "3. Select:" "$YELLOW"
        print_color "   - Platform: all" "$CYAN"
        print_color "   - Deployment mode: autonomous" "$CYAN"
        print_color "   - Use maximum tokens: true" "$CYAN"
        print_color "4. Click: 'Run workflow' button" "$YELLOW"
        print_color "────────────────────────────────────────────" "$CYAN"
        return 1
    fi
}

# Watch deployment status
watch_deployment() {
    print_color "\nMonitoring deployment status..." "$YELLOW"
    
    # Get latest run
    RUN_ID=$(gh run list --workflow="$WORKFLOW_NAME" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")
    
    if [ -z "$RUN_ID" ]; then
        print_color "No deployment runs found" "$YELLOW"
        print_color "Trigger a deployment first!" "$CYAN"
        return 1
    fi
    
    print_color "Watching run #$RUN_ID..." "$CYAN"
    gh run watch "$RUN_ID"
}

# Check deployment status
check_status() {
    print_color "\nChecking deployment status..." "$YELLOW"
    
    # Get latest 5 runs
    gh run list --workflow="$WORKFLOW_NAME" --limit 5 --json status,conclusion,createdAt,headBranch | \
        jq -r '.[] | "\(.createdAt | split("T")[0]) \(.status) \(.conclusion // "running") \(.headBranch)"' | \
        while read date status conclusion branch; do
            if [ "$conclusion" == "success" ]; then
                print_color "  ✓ $date - $branch - SUCCESS" "$GREEN"
            elif [ "$conclusion" == "failure" ]; then
                print_color "  ✗ $date - $branch - FAILED" "$RED"
            elif [ "$conclusion" == "running" ]; then
                print_color "  ⟳ $date - $branch - RUNNING" "$YELLOW"
            else
                print_color "  ○ $date - $branch - $status" "$CYAN"
            fi
        done
}

# View logs
view_logs() {
    print_color "\nFetching deployment logs..." "$YELLOW"
    
    RUN_ID=$(gh run list --workflow="$WORKFLOW_NAME" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")
    
    if [ -z "$RUN_ID" ]; then
        print_color "No deployment runs found" "$YELLOW"
        return 1
    fi
    
    gh run view "$RUN_ID" --log
}

# Validate endpoints
validate_endpoints() {
    print_color "\nValidating deployment endpoints..." "$YELLOW"
    
    ENDPOINTS=(
        "https://app.candlefish.ai|Web Platform"
        "https://api.candlefish.ai/health|API Health"
        "wss://ws.candlefish.ai|WebSocket"
    )
    
    for endpoint_info in "${ENDPOINTS[@]}"; do
        IFS='|' read -r endpoint name <<< "$endpoint_info"
        
        if [[ "$endpoint" == wss://* ]]; then
            # WebSocket check
            if command -v wscat &>/dev/null; then
                if timeout 5 wscat -c "$endpoint" 2>/dev/null | head -1 | grep -q "Connected"; then
                    print_color "  ✓ $name: $endpoint" "$GREEN"
                else
                    print_color "  ✗ $name: $endpoint" "$RED"
                fi
            else
                print_color "  ⚠ $name: wscat not installed (skipping)" "$YELLOW"
            fi
        else
            # HTTP/HTTPS check
            HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
            if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "301" ] || [ "$HTTP_CODE" == "302" ]; then
                print_color "  ✓ $name: $endpoint (HTTP $HTTP_CODE)" "$GREEN"
            else
                print_color "  ✗ $name: $endpoint (HTTP $HTTP_CODE)" "$RED"
            fi
        fi
    done
}

# Generate report
generate_report() {
    print_color "\nGenerating deployment report..." "$YELLOW"
    
    REPORT_FILE="/tmp/candlefish-deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    # Get latest run info
    RUN_INFO=$(gh run list --workflow="$WORKFLOW_NAME" --limit 1 --json status,conclusion,createdAt,headBranch,databaseId 2>/dev/null || echo "{}")
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "workflow": "$WORKFLOW_NAME",
  "workflow_id": "$WORKFLOW_ID",
  "aws_account": "$AWS_ACCOUNT",
  "latest_run": $RUN_INFO,
  "endpoints_validated": $(date +%s),
  "report_generated_by": "monitor-autonomous-deployment.sh"
}
EOF
    
    print_color "✓ Report generated: $REPORT_FILE" "$GREEN"
    
    # Upload to S3 if possible
    if aws s3 cp "$REPORT_FILE" "s3://candlefish-deployments/reports/" 2>/dev/null; then
        print_color "✓ Report uploaded to S3" "$GREEN"
    else
        print_color "⚠ Could not upload to S3 (bucket may not exist)" "$YELLOW"
    fi
}

# Main menu
show_menu() {
    echo
    print_color "╔════════════════════════════════════════════╗" "$CYAN"
    print_color "║          DEPLOYMENT ACTIONS                ║" "$CYAN"
    print_color "╚════════════════════════════════════════════╝" "$CYAN"
    print_color "  1. Check Prerequisites" "$YELLOW"
    print_color "  2. Trigger Deployment" "$YELLOW"
    print_color "  3. Watch Current Deployment" "$YELLOW"
    print_color "  4. Check Status History" "$YELLOW"
    print_color "  5. View Logs" "$YELLOW"
    print_color "  6. Validate Endpoints" "$YELLOW"
    print_color "  7. Generate Report" "$YELLOW"
    print_color "  8. Full Health Check" "$YELLOW"
    print_color "  9. Exit" "$YELLOW"
    echo
    read -p "Select action (1-9): " choice
    
    case $choice in
        1) check_auth && check_aws && check_secrets ;;
        2) trigger_deployment ;;
        3) watch_deployment ;;
        4) check_status ;;
        5) view_logs ;;
        6) validate_endpoints ;;
        7) generate_report ;;
        8) check_auth && check_aws && check_secrets && check_status && validate_endpoints ;;
        9) exit 0 ;;
        *) print_color "Invalid choice" "$RED" ;;
    esac
}

# Command-line argument handling
case "${1:-menu}" in
    check)
        show_banner
        check_auth && check_aws && check_secrets
        ;;
    trigger)
        show_banner
        trigger_deployment
        ;;
    watch)
        show_banner
        watch_deployment
        ;;
    status)
        show_banner
        check_status
        ;;
    logs)
        show_banner
        view_logs
        ;;
    endpoints)
        show_banner
        validate_endpoints
        ;;
    report)
        show_banner
        generate_report
        ;;
    health)
        show_banner
        check_auth && check_aws && check_secrets && check_status && validate_endpoints
        ;;
    menu|*)
        while true; do
            show_banner
            show_menu
            echo
            print_color "Press Enter to continue..." "$CYAN"
            read
        done
        ;;
esac