#!/bin/bash

# Critical Deployment Workflow Launcher
# =====================================
# Orchestrates deployment with specialized agents for
# security, performance, testing, and database optimization
#
# Usage: ./critical-deploy.sh [options]
#
# Options:
#   --env ENV           Environment (staging|production) [default: staging]
#   --agents AGENTS     Comma-separated list of agents
#   --priority CHAIN    Priority chain (e.g., "security>performance>testing")
#   --validation MODE   Validation mode (automated|manual|hybrid)
#   --rollback STATE    Rollback state (enabled|disabled)
#   --parallel          Execute agents in parallel
#   --dry-run          Perform dry run without deployment
#   --help             Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
AGENTS="security-auditor,performance-engineer,test-automator,database-optimizer"
PRIORITY="security>performance>testing>architecture"
VALIDATION="automated"
ROLLBACK="enabled"
PARALLEL=""
DRY_RUN=""

# Function to print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to show help
show_help() {
    head -n 25 "$0" | grep "^#" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --agents)
            AGENTS="$2"
            shift 2
            ;;
        --priority)
            PRIORITY="$2"
            shift 2
            ;;
        --validation)
            VALIDATION="$2"
            shift 2
            ;;
        --rollback)
            ROLLBACK="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL="--parallel"
            shift
            ;;
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            print_color $RED "Unknown option: $1"
            show_help
            ;;
    esac
done

# Convert comma-separated agents to space-separated
AGENTS_ARRAY=(${AGENTS//,/ })

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    print_color $RED "Error: Invalid environment '$ENVIRONMENT'. Must be 'staging' or 'production'."
    exit 1
fi

# Set environment variables
export ENVIRONMENT=$ENVIRONMENT
export PROJECT_ID="${PROJECT_ID:-fogg-calendar}"
export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-$PROJECT_ID}"

# Header
print_color $BLUE "╔══════════════════════════════════════════════════════════╗"
print_color $BLUE "║       CRITICAL DEPLOYMENT WORKFLOW ORCHESTRATOR         ║"
print_color $BLUE "╚══════════════════════════════════════════════════════════╝"
echo ""

# Display configuration
print_color $YELLOW "Configuration:"
echo "  Environment:  $ENVIRONMENT"
echo "  Project ID:   $PROJECT_ID"
echo "  Agents:       ${AGENTS_ARRAY[@]}"
echo "  Priority:     $PRIORITY"
echo "  Validation:   $VALIDATION"
echo "  Rollback:     $ROLLBACK"
[[ -n "$PARALLEL" ]] && echo "  Mode:         Parallel execution"
[[ -n "$DRY_RUN" ]] && echo "  Mode:         DRY RUN (no actual deployment)"
echo ""

# Check for required tools
print_color $YELLOW "Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    print_color $RED "Error: Python 3 is required but not installed."
    exit 1
fi

# Check for orchestrator script
ORCHESTRATOR_PATH="$(dirname "$0")/critical-workflow-orchestrator.py"
if [[ ! -f "$ORCHESTRATOR_PATH" ]]; then
    print_color $RED "Error: Orchestrator script not found at $ORCHESTRATOR_PATH"
    exit 1
fi

print_color $GREEN "✓ Prerequisites satisfied"
echo ""

# Confirmation for production
if [[ "$ENVIRONMENT" == "production" && -z "$DRY_RUN" ]]; then
    print_color $YELLOW "⚠️  WARNING: You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (yes/no): " confirmation
    if [[ "$confirmation" != "yes" ]]; then
        print_color $RED "Deployment cancelled."
        exit 0
    fi
fi

# Create reports directory
mkdir -p "$(dirname "$0")/reports"

# Execute deployment
print_color $BLUE "Starting deployment workflow..."
echo ""

# Build command
CMD="python3 $ORCHESTRATOR_PATH"
CMD="$CMD --agents ${AGENTS_ARRAY[@]}"
CMD="$CMD --priority '$PRIORITY'"
CMD="$CMD --validation $VALIDATION"
CMD="$CMD --rollback $ROLLBACK"
[[ -n "$PARALLEL" ]] && CMD="$CMD $PARALLEL"
[[ -n "$DRY_RUN" ]] && CMD="$CMD $DRY_RUN"

# Execute
if eval $CMD; then
    print_color $GREEN ""
    print_color $GREEN "╔══════════════════════════════════════════════════════════╗"
    print_color $GREEN "║              DEPLOYMENT COMPLETED SUCCESSFULLY           ║"
    print_color $GREEN "╚══════════════════════════════════════════════════════════╝"

    # Show report location
    echo ""
    print_color $BLUE "📊 Deployment report: $(dirname "$0")/reports/latest.json"

    # If not dry run, show next steps
    if [[ -z "$DRY_RUN" ]]; then
        echo ""
        print_color $YELLOW "Next steps:"
        echo "  1. Review the deployment report"
        echo "  2. Monitor application metrics"
        echo "  3. Run smoke tests if needed"
        echo "  4. Check logs: gcloud logging read"
    fi
else
    EXIT_CODE=$?
    print_color $RED ""
    print_color $RED "╔══════════════════════════════════════════════════════════╗"
    print_color $RED "║                  DEPLOYMENT FAILED                       ║"
    print_color $RED "╚══════════════════════════════════════════════════════════╝"

    echo ""
    print_color $YELLOW "Check the deployment report for details:"
    print_color $YELLOW "  $(dirname "$0")/reports/latest.json"

    if [[ "$ROLLBACK" == "enabled" ]]; then
        print_color $GREEN "✓ Rollback was performed automatically"
    else
        print_color $YELLOW "⚠️  Rollback was disabled - manual intervention may be required"
    fi

    exit $EXIT_CODE
fi
