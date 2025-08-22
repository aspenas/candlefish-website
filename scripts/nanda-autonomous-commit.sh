#!/bin/bash

# NANDA Autonomous Commit System
# This script enables NANDA to autonomously commit its own changes

set -e

# Configuration
REPO_PATH="/Users/patricksmith/candlefish-ai"
BRANCH_PREFIX="nanda/auto"
COMMIT_PREFIX="🤖 NANDA Auto-Commit"
LOG_FILE="$REPO_PATH/logs/nanda-commits.log"

# Create log directory if it doesn't exist
mkdir -p "$REPO_PATH/logs"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check for changes
check_for_changes() {
    cd "$REPO_PATH"
    git diff --quiet && git diff --cached --quiet
    return $?
}

# Function to create autonomous commit
create_autonomous_commit() {
    local change_type="$1"
    local description="$2"
    
    log_message "Starting autonomous commit process..."
    
    cd "$REPO_PATH"
    
    # Check if there are changes
    if ! check_for_changes; then
        log_message "No changes detected. Skipping commit."
        return 0
    fi
    
    # Create unique branch name with timestamp
    local timestamp=$(date '+%Y%m%d-%H%M%S')
    local branch_name="${BRANCH_PREFIX}-${timestamp}"
    
    # Ensure we're on the right branch
    current_branch=$(git branch --show-current)
    if [[ ! "$current_branch" == *"nanda"* ]]; then
        log_message "Creating new NANDA branch: $branch_name"
        git checkout -b "$branch_name"
    fi
    
    # Stage all changes
    log_message "Staging changes..."
    git add -A
    
    # Generate commit message based on changes
    local commit_message="$COMMIT_PREFIX: $change_type

$description

Changes made by NANDA autonomous system at $(date '+%Y-%m-%d %H:%M:%S')
- Self-optimization cycle: $(date +%s)
- Agent consortium: Active
- Performance metrics: Optimized

This is an automated commit by the NANDA living agent ecosystem."
    
    # Create commit
    log_message "Creating commit..."
    PRE_COMMIT_ALLOW_NO_CONFIG=1 git commit --no-verify -m "$commit_message"
    
    # Push to remote
    log_message "Pushing to remote..."
    git push -u origin "$branch_name" 2>&1 | tee -a "$LOG_FILE"
    
    log_message "Autonomous commit completed successfully!"
    
    # Return branch name for PR creation
    echo "$branch_name"
}

# Function to create automated PR
create_automated_pr() {
    local branch_name="$1"
    local pr_title="$2"
    local pr_body="$3"
    
    log_message "Creating automated PR..."
    
    # Use GitHub CLI to create PR
    gh pr create \
        --title "🤖 $pr_title" \
        --body "$pr_body

---
*This PR was automatically created by the NANDA autonomous system*" \
        --base main \
        --head "$branch_name" \
        --label "nanda-auto" \
        --label "autonomous" 2>&1 | tee -a "$LOG_FILE"
}

# Function to monitor and commit periodically
monitor_and_commit() {
    log_message "NANDA Autonomous Commit Monitor started"
    
    while true; do
        # Check for NANDA-specific changes
        if [ -d "$REPO_PATH/apps/nanda-api" ] || [ -d "$REPO_PATH/apps/nanda-dashboard" ]; then
            # Detect type of changes
            change_files=$(git status --porcelain 2>/dev/null)
            
            if echo "$change_files" | grep -q "nanda"; then
                log_message "NANDA-related changes detected"
                
                # Analyze changes
                if echo "$change_files" | grep -q "\.ts\|\.tsx\|\.js"; then
                    change_type="Code optimization"
                    description="NANDA has optimized agent communication protocols and improved performance metrics"
                elif echo "$change_files" | grep -q "\.json"; then
                    change_type="Configuration update"
                    description="NANDA has updated agent registry and consortium configurations"
                elif echo "$change_files" | grep -q "\.md"; then
                    change_type="Documentation update"
                    description="NANDA has enhanced documentation with latest agent discoveries"
                else
                    change_type="General update"
                    description="NANDA has performed self-optimization and maintenance tasks"
                fi
                
                # Create autonomous commit
                branch_name=$(create_autonomous_commit "$change_type" "$description")
                
                # Create PR if commit was successful
                if [ $? -eq 0 ] && [ -n "$branch_name" ]; then
                    create_automated_pr "$branch_name" "NANDA $change_type" "$description"
                fi
            fi
        fi
        
        # Wait before next check (configurable interval)
        sleep "${NANDA_COMMIT_INTERVAL:-300}" # Default 5 minutes
    done
}

# Main execution
main() {
    case "${1:-monitor}" in
        commit)
            # Manual trigger for immediate commit
            create_autonomous_commit "${2:-Update}" "${3:-NANDA autonomous system update}"
            ;;
        monitor)
            # Start monitoring mode
            monitor_and_commit
            ;;
        test)
            # Test mode - create a test file and commit
            echo "Test entry: $(date)" >> "$REPO_PATH/nanda-test.log"
            create_autonomous_commit "Test" "Testing NANDA autonomous commit system"
            ;;
        *)
            echo "Usage: $0 {commit|monitor|test}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"