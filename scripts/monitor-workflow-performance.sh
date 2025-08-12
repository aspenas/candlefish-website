#!/bin/bash

# GitHub Actions Performance Monitoring Script
# Tracks workflow performance metrics and compares optimized vs non-optimized

set -e

echo "📊 GitHub Actions Performance Monitor"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
command -v gh >/dev/null 2>&1 || { echo "Error: gh CLI is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required"; exit 1; }

# Configuration
REPO="${GITHUB_REPOSITORY:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}"
DAYS_TO_ANALYZE="${1:-7}"

echo "Repository: $REPO"
echo "Analyzing last $DAYS_TO_ANALYZE days"
echo ""

# Function to format duration
format_duration() {
    local seconds=$1
    local minutes=$((seconds / 60))
    local remaining_seconds=$((seconds % 60))
    echo "${minutes}m ${remaining_seconds}s"
}

# Function to calculate percentage change
calc_percentage() {
    local old=$1
    local new=$2
    if [ "$old" -eq 0 ]; then
        echo "N/A"
    else
        local change=$(( (old - new) * 100 / old ))
        if [ $change -gt 0 ]; then
            echo -e "${GREEN}↓${change}%${NC}"
        else
            echo -e "${RED}↑${change#-}%${NC}"
        fi
    fi
}

# Analyze workflow performance
analyze_workflow() {
    local workflow_file=$1
    local workflow_name=$(basename "$workflow_file" .yml)

    echo -e "${BLUE}📈 Analyzing: $workflow_name${NC}"
    echo "----------------------------------------"

    # Get recent runs
    local runs=$(gh run list \
        --workflow="$workflow_file" \
        --limit=20 \
        --json databaseId,status,conclusion,createdAt,updatedAt,runStartedAt,event,headBranch \
        2>/dev/null || echo "[]")

    if [ "$runs" = "[]" ]; then
        echo "  No recent runs found"
        echo ""
        return
    fi

    # Calculate metrics
    local total_duration=0
    local successful_runs=0
    local failed_runs=0
    local cancelled_runs=0
    local min_duration=999999
    local max_duration=0

    while IFS= read -r run; do
        local conclusion=$(echo "$run" | jq -r '.conclusion')
        local started=$(echo "$run" | jq -r '.runStartedAt')
        local updated=$(echo "$run" | jq -r '.updatedAt')

        if [ "$started" != "null" ] && [ "$updated" != "null" ]; then
            # Calculate duration
            local start_epoch=$(date -d "$started" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$started" +%s 2>/dev/null || echo 0)
            local end_epoch=$(date -d "$updated" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$updated" +%s 2>/dev/null || echo 0)

            if [ "$start_epoch" -ne 0 ] && [ "$end_epoch" -ne 0 ]; then
                local duration=$((end_epoch - start_epoch))

                case "$conclusion" in
                    success)
                        total_duration=$((total_duration + duration))
                        successful_runs=$((successful_runs + 1))
                        [ $duration -lt $min_duration ] && min_duration=$duration
                        [ $duration -gt $max_duration ] && max_duration=$duration
                        ;;
                    failure)
                        failed_runs=$((failed_runs + 1))
                        ;;
                    cancelled)
                        cancelled_runs=$((cancelled_runs + 1))
                        ;;
                esac
            fi
        fi
    done < <(echo "$runs" | jq -c '.[]')

    # Calculate averages
    if [ $successful_runs -gt 0 ]; then
        local avg_duration=$((total_duration / successful_runs))
        echo -e "  ⏱️  Average Duration: ${GREEN}$(format_duration $avg_duration)${NC}"
        echo -e "  📊 Min/Max: $(format_duration $min_duration) / $(format_duration $max_duration)"
        echo -e "  ✅ Success Rate: ${GREEN}$successful_runs${NC}/$((successful_runs + failed_runs + cancelled_runs))"

        # Calculate cost
        local monthly_runs=$((successful_runs * 30 / DAYS_TO_ANALYZE))
        local monthly_minutes=$((avg_duration * monthly_runs / 60))
        local monthly_cost=$((monthly_minutes * 8 / 1000)) # $0.008 per minute
        echo -e "  💰 Est. Monthly Cost: \$$monthly_cost ($monthly_minutes minutes)"
    else
        echo -e "  ${YELLOW}⚠️  No successful runs to analyze${NC}"
    fi

    # Show recent trend
    echo -e "  📈 Recent Trend:"
    local recent_runs=$(echo "$runs" | jq -c '[.[:5]]')
    local trend=""
    while IFS= read -r run; do
        local conclusion=$(echo "$run" | jq -r '.conclusion')
        case "$conclusion" in
            success) trend="${trend}✅" ;;
            failure) trend="${trend}❌" ;;
            cancelled) trend="${trend}⏹️" ;;
            *) trend="${trend}❓" ;;
        esac
    done < <(echo "$recent_runs" | jq -c '.[]')
    echo "     $trend (newest → oldest)"

    echo ""
}

# Compare optimized vs non-optimized
echo -e "${BLUE}🔄 Workflow Comparison${NC}"
echo "====================="
echo ""

# Check if optimized workflow exists
if [ -f ".github/workflows/candlefish-orchestrator-optimized.yml" ]; then
    echo "Comparing original vs optimized orchestrator:"
    echo ""

    # Analyze original
    echo "Original Orchestrator:"
    analyze_workflow ".github/workflows/candlefish-orchestrator.yml"

    # Analyze optimized
    echo "Optimized Orchestrator:"
    analyze_workflow ".github/workflows/candlefish-orchestrator-optimized.yml"
else
    # Analyze all workflows
    for workflow in .github/workflows/*.yml; do
        if [ -f "$workflow" ]; then
            analyze_workflow "$workflow"
        fi
    done
fi

# Performance recommendations
echo -e "${BLUE}💡 Performance Insights${NC}"
echo "======================="
echo ""

# Check cache usage
echo "🗄️  Cache Analysis:"
cache_workflows=$(grep -l "actions/cache@\|cache:" .github/workflows/*.yml 2>/dev/null | wc -l)
total_workflows=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)
cache_percentage=$((cache_workflows * 100 / total_workflows))

if [ $cache_percentage -lt 50 ]; then
    echo -e "  ${RED}⚠️  Only $cache_percentage% of workflows use caching${NC}"
    echo "  Recommendation: Add caching to improve performance"
elif [ $cache_percentage -lt 80 ]; then
    echo -e "  ${YELLOW}📊 $cache_percentage% of workflows use caching${NC}"
    echo "  Recommendation: Increase cache usage"
else
    echo -e "  ${GREEN}✅ $cache_percentage% of workflows use caching${NC}"
fi
echo ""

# Check for parallel execution
echo "🔀 Parallelization:"
matrix_workflows=$(grep -l "matrix:" .github/workflows/*.yml 2>/dev/null | wc -l)
if [ $matrix_workflows -gt 0 ]; then
    echo -e "  ${GREEN}✅ $matrix_workflows workflows use matrix strategy${NC}"

    # Check for max-parallel limits
    unlimited=$(grep -L "max-parallel:" $(grep -l "matrix:" .github/workflows/*.yml) 2>/dev/null | wc -l)
    if [ $unlimited -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  $unlimited workflows have unlimited parallelization${NC}"
        echo "  Recommendation: Set max-parallel to prevent resource exhaustion"
    fi
else
    echo -e "  ${RED}⚠️  No workflows use matrix strategy${NC}"
    echo "  Recommendation: Use matrix for parallel execution"
fi
echo ""

# Check timeout configuration
echo "⏰ Timeout Configuration:"
timeout_workflows=$(grep -l "timeout-minutes:" .github/workflows/*.yml 2>/dev/null | wc -l)
if [ $timeout_workflows -lt $total_workflows ]; then
    missing=$((total_workflows - timeout_workflows))
    echo -e "  ${YELLOW}⚠️  $missing workflows missing timeout configuration${NC}"
    echo "  Recommendation: Add timeout-minutes to prevent runaway jobs"
else
    echo -e "  ${GREEN}✅ All workflows have timeout configuration${NC}"
fi
echo ""

# Docker optimization
echo "🐳 Docker Optimization:"
docker_workflows=$(grep -l "docker" .github/workflows/*.yml 2>/dev/null | wc -l)
if [ $docker_workflows -gt 0 ]; then
    buildx_workflows=$(grep -l "buildx\|cache-from\|cache-to" .github/workflows/*.yml 2>/dev/null | wc -l)
    if [ $buildx_workflows -lt $docker_workflows ]; then
        unoptimized=$((docker_workflows - buildx_workflows))
        echo -e "  ${YELLOW}⚠️  $unoptimized Docker workflows without layer caching${NC}"
        echo "  Recommendation: Use BuildKit with cache mounts"
    else
        echo -e "  ${GREEN}✅ All Docker workflows use layer caching${NC}"
    fi
else
    echo "  No Docker workflows detected"
fi
echo ""

# Overall health score
echo -e "${BLUE}🏆 Overall Health Score${NC}"
echo "========================"

score=100
[ $cache_percentage -lt 80 ] && score=$((score - 20))
[ $matrix_workflows -eq 0 ] && score=$((score - 15))
[ $timeout_workflows -lt $total_workflows ] && score=$((score - 10))
[ $unlimited -gt 0 ] && score=$((score - 10))

if [ $score -ge 90 ]; then
    echo -e "  ${GREEN}Score: $score/100 - Excellent!${NC}"
elif [ $score -ge 70 ]; then
    echo -e "  ${YELLOW}Score: $score/100 - Good, room for improvement${NC}"
else
    echo -e "  ${RED}Score: $score/100 - Needs optimization${NC}"
fi
echo ""

# Export metrics for CI
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "health_score=$score" >> $GITHUB_OUTPUT
    echo "cache_percentage=$cache_percentage" >> $GITHUB_OUTPUT
    echo "matrix_workflows=$matrix_workflows" >> $GITHUB_OUTPUT
fi

echo "✅ Analysis complete!"
