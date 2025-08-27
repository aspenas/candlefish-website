#!/bin/bash

# Workflow Monitoring Dashboard
# Real-time monitoring of GitHub Actions workflows

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
REFRESH_INTERVAL=10
REPO=${GITHUB_REPOSITORY:-"candlefish-ai/candlefish-ai"}

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Clear screen and move cursor to top
clear_screen() {
    clear
    tput cup 0 0
}

# Get workflow status icon
get_status_icon() {
    local status=$1
    local conclusion=$2
    
    if [ "$status" == "completed" ]; then
        case "$conclusion" in
            success) echo "✅" ;;
            failure) echo "❌" ;;
            cancelled) echo "⚠️" ;;
            skipped) echo "⏭️" ;;
            *) echo "❓" ;;
        esac
    else
        case "$status" in
            queued) echo "⏸️" ;;
            in_progress) echo "🔄" ;;
            *) echo "❓" ;;
        esac
    fi
}

# Get color for status
get_status_color() {
    local status=$1
    local conclusion=$2
    
    if [ "$status" == "completed" ]; then
        case "$conclusion" in
            success) echo "$GREEN" ;;
            failure) echo "$RED" ;;
            cancelled) echo "$YELLOW" ;;
            *) echo "$NC" ;;
        esac
    else
        case "$status" in
            in_progress) echo "$CYAN" ;;
            queued) echo "$YELLOW" ;;
            *) echo "$NC" ;;
        esac
    fi
}

# Format duration
format_duration() {
    local seconds=$1
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))
    
    if [ $hours -gt 0 ]; then
        printf "%dh %dm %ds" $hours $minutes $secs
    elif [ $minutes -gt 0 ]; then
        printf "%dm %ds" $minutes $secs
    else
        printf "%ds" $secs
    fi
}

# Display header
display_header() {
    print_status "$BOLD" "╔════════════════════════════════════════════════════════════════════════╗"
    print_status "$BOLD" "║                    GitHub Actions Workflow Monitor                        ║"
    print_status "$BOLD" "╠════════════════════════════════════════════════════════════════════════╣"
    print_status "$CYAN" "  Repository: $REPO"
    print_status "$CYAN" "  Updated: $(date '+%Y-%m-%d %H:%M:%S')"
    print_status "$CYAN" "  Refresh: Every ${REFRESH_INTERVAL}s (Press 'q' to quit, 'r' to refresh)"
    print_status "$BOLD" "╚════════════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Display workflow runs
display_runs() {
    print_status "$BOLD" "📊 Recent Workflow Runs"
    print_status "$BOLD" "────────────────────────────────────────────────────────────────────────"
    
    # Get recent runs
    local runs=$(gh run list \
        --repo "$REPO" \
        --limit 10 \
        --json databaseId,name,displayTitle,status,conclusion,createdAt,updatedAt,event,headBranch,actor \
        2>/dev/null || echo "[]")
    
    if [ "$runs" == "[]" ]; then
        print_status "$YELLOW" "No workflow runs found"
        return
    fi
    
    # Parse and display runs
    echo "$runs" | jq -r '.[] | 
        "\(.databaseId)|\(.name)|\(.status)|\(.conclusion // "")|\(.createdAt)|\(.event)|\(.headBranch)|\(.actor.login)"' | \
    while IFS='|' read -r id name status conclusion created event branch actor; do
        local icon=$(get_status_icon "$status" "$conclusion")
        local color=$(get_status_color "$status" "$conclusion")
        
        # Truncate long names
        name=$(echo "$name" | cut -c1-30)
        branch=$(echo "$branch" | cut -c1-20)
        
        printf "${color}%s %-30s %-12s %-8s %-15s %s${NC}\n" \
            "$icon" "$name" "$status" "$event" "$branch" "$actor"
    done
    echo ""
}

# Display workflow statistics
display_stats() {
    print_status "$BOLD" "📈 Workflow Statistics (Last 24h)"
    print_status "$BOLD" "────────────────────────────────────────────────────────────────────────"
    
    # Get runs from last 24 hours
    local stats=$(gh api \
        "/repos/${REPO}/actions/runs?created=>$(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%SZ')" \
        --jq '.workflow_runs | 
            {
                total: length,
                success: [.[] | select(.conclusion == "success")] | length,
                failure: [.[] | select(.conclusion == "failure")] | length,
                cancelled: [.[] | select(.conclusion == "cancelled")] | length,
                in_progress: [.[] | select(.status == "in_progress")] | length
            }' 2>/dev/null || echo '{"total":0,"success":0,"failure":0,"cancelled":0,"in_progress":0}')
    
    local total=$(echo "$stats" | jq -r '.total')
    local success=$(echo "$stats" | jq -r '.success')
    local failure=$(echo "$stats" | jq -r '.failure')
    local cancelled=$(echo "$stats" | jq -r '.cancelled')
    local in_progress=$(echo "$stats" | jq -r '.in_progress')
    
    # Calculate success rate
    local success_rate=0
    if [ "$total" -gt 0 ]; then
        success_rate=$((success * 100 / total))
    fi
    
    # Display stats
    printf "  Total Runs:     ${BOLD}%3d${NC}\n" "$total"
    printf "  ${GREEN}✅ Successful:  %3d${NC} (%d%%)\n" "$success" "$success_rate"
    printf "  ${RED}❌ Failed:      %3d${NC}\n" "$failure"
    printf "  ${YELLOW}⚠️  Cancelled:   %3d${NC}\n" "$cancelled"
    printf "  ${CYAN}🔄 In Progress: %3d${NC}\n" "$in_progress"
    echo ""
}

# Display active workflows
display_active() {
    print_status "$BOLD" "🔄 Currently Running Workflows"
    print_status "$BOLD" "────────────────────────────────────────────────────────────────────────"
    
    local active=$(gh run list \
        --repo "$REPO" \
        --status in_progress \
        --limit 5 \
        --json databaseId,name,displayTitle,createdAt,actor,jobs \
        2>/dev/null || echo "[]")
    
    if [ "$active" == "[]" ] || [ "$(echo "$active" | jq -r 'length')" -eq 0 ]; then
        print_status "$CYAN" "No workflows currently running"
    else
        echo "$active" | jq -r '.[] | 
            "\(.databaseId)|\(.name)|\(.createdAt)|\(.actor.login)|" + 
            ((.jobs // []) | map(select(.status == "in_progress")) | length | tostring)' | \
        while IFS='|' read -r id name created actor jobs_running; do
            # Calculate runtime
            local created_ts=$(date -d "$created" +%s 2>/dev/null || date +%s)
            local now_ts=$(date +%s)
            local runtime=$((now_ts - created_ts))
            local runtime_str=$(format_duration $runtime)
            
            name=$(echo "$name" | cut -c1-35)
            
            printf "${CYAN}  🔄 %-35s Runtime: %-10s Jobs: %-2s Actor: %s${NC}\n" \
                "$name" "$runtime_str" "$jobs_running" "$actor"
        done
    fi
    echo ""
}

# Display recent failures
display_failures() {
    print_status "$BOLD" "❌ Recent Failures"
    print_status "$BOLD" "────────────────────────────────────────────────────────────────────────"
    
    local failures=$(gh run list \
        --repo "$REPO" \
        --status failure \
        --limit 3 \
        --json databaseId,name,displayTitle,createdAt,headBranch,actor,conclusion \
        2>/dev/null || echo "[]")
    
    if [ "$failures" == "[]" ] || [ "$(echo "$failures" | jq -r 'length')" -eq 0 ]; then
        print_status "$GREEN" "No recent failures! 🎉"
    else
        echo "$failures" | jq -r '.[] | 
            "\(.databaseId)|\(.name)|\(.createdAt)|\(.headBranch)|\(.actor.login)"' | \
        while IFS='|' read -r id name created branch actor; do
            name=$(echo "$name" | cut -c1-30)
            branch=$(echo "$branch" | cut -c1-20)
            
            printf "${RED}  ❌ %-30s %-20s %s${NC}\n" "$name" "$branch" "$actor"
            printf "     ${YELLOW}View: gh run view %s${NC}\n" "$id"
        done
    fi
    echo ""
}

# Display workflow performance
display_performance() {
    print_status "$BOLD" "⚡ Workflow Performance"
    print_status "$BOLD" "────────────────────────────────────────────────────────────────────────"
    
    # Get average duration for successful runs
    local perf=$(gh api \
        "/repos/${REPO}/actions/runs?status=completed&conclusion=success&per_page=20" \
        --jq '[.workflow_runs[] | 
            {
                name: .name,
                duration: ((.updated_at | fromdate) - (.created_at | fromdate))
            }] | 
            group_by(.name) | 
            map({
                name: .[0].name,
                avg_duration: (map(.duration) | add / length | round),
                count: length
            }) | 
            sort_by(.avg_duration) | 
            reverse | 
            .[:5]' 2>/dev/null || echo "[]")
    
    if [ "$perf" == "[]" ] || [ "$(echo "$perf" | jq -r 'length')" -eq 0 ]; then
        print_status "$YELLOW" "No performance data available"
    else
        echo "$perf" | jq -r '.[] | "\(.name)|\(.avg_duration)|\(.count)"' | \
        while IFS='|' read -r name duration count; do
            local duration_str=$(format_duration "$duration")
            name=$(echo "$name" | cut -c1-35)
            
            printf "  %-35s Avg: %-10s Runs: %d\n" "$name" "$duration_str" "$count"
        done
    fi
    echo ""
}

# Interactive mode
interactive_mode() {
    # Save terminal settings
    stty_save=$(stty -g)
    
    # Set up non-blocking input
    stty -echo -icanon time 0 min 0
    
    while true; do
        clear_screen
        display_header
        display_active
        display_runs
        display_stats
        display_failures
        display_performance
        
        # Check for user input
        read -n 1 key
        case "$key" in
            q|Q)
                stty "$stty_save"
                echo "Exiting..."
                exit 0
                ;;
            r|R)
                continue
                ;;
        esac
        
        # Wait for refresh interval
        sleep $REFRESH_INTERVAL
    done
}

# Single run mode
single_run() {
    display_header
    display_active
    display_runs
    display_stats
    display_failures
    display_performance
}

# Watch specific workflow
watch_workflow() {
    local workflow_id=$1
    
    print_status "$BLUE" "👁️  Watching workflow run #${workflow_id}"
    gh run watch "$workflow_id"
}

# Main execution
main() {
    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        print_status "$RED" "❌ GitHub CLI (gh) is not installed"
        echo "Please install it from: https://cli.github.com/"
        exit 1
    fi
    
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        print_status "$YELLOW" "⚠️  Not authenticated with GitHub"
        echo "Please run: gh auth login"
        exit 1
    fi
    
    # Parse arguments
    case "${1:-interactive}" in
        interactive|monitor)
            interactive_mode
            ;;
        single|once)
            single_run
            ;;
        watch)
            if [ -z "${2:-}" ]; then
                echo "Usage: $0 watch <workflow-id>"
                exit 1
            fi
            watch_workflow "$2"
            ;;
        --help|-h)
            echo "Workflow Monitoring Dashboard"
            echo ""
            echo "Usage: $0 [mode] [options]"
            echo ""
            echo "Modes:"
            echo "  interactive  Live dashboard with auto-refresh (default)"
            echo "  single       Display once and exit"
            echo "  watch <id>   Watch specific workflow run"
            echo ""
            echo "Examples:"
            echo "  $0                    # Interactive dashboard"
            echo "  $0 single             # Display once"
            echo "  $0 watch 123456789    # Watch specific run"
            ;;
        *)
            print_status "$RED" "Unknown mode: $1"
            echo "Run '$0 --help' for usage"
            exit 1
            ;;
    esac
}

# Handle cleanup on exit
trap 'stty "$stty_save" 2>/dev/null' EXIT INT TERM

main "$@"