#!/bin/bash

# GitHub Actions Performance Monitor
# Real-time monitoring and analysis of workflow performance

set -e

# Configuration
REPO="${GITHUB_REPOSITORY:-candlefish-ai/candlefish-ai}"
DAYS_BACK="${DAYS_BACK:-7}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-table}" # table, json, csv

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to fetch workflow runs
fetch_workflow_runs() {
    echo -e "${BLUE}Fetching workflow runs from last ${DAYS_BACK} days...${NC}"

    SINCE_DATE=$(date -d "${DAYS_BACK} days ago" --iso-8601)

    gh api \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "/repos/${REPO}/actions/runs?created=>=${SINCE_DATE}&per_page=100" \
        --jq '.workflow_runs' > workflow_runs.json

    echo "Found $(jq length workflow_runs.json) workflow runs"
}

# Function to analyze performance metrics
analyze_performance() {
    echo -e "\n${BLUE}Analyzing performance metrics...${NC}"

    # Calculate average execution time by workflow
    jq -r '
        group_by(.name) |
        map({
            workflow: .[0].name,
            runs: length,
            avg_duration_minutes: (
                map(
                    if .run_started_at and .updated_at then
                        (((.updated_at | fromdateiso8601) - (.run_started_at | fromdateiso8601)) / 60)
                    else 0 end
                ) | add / length | floor
            ),
            success_rate: (
                (map(select(.conclusion == "success")) | length) / length * 100 | floor
            ),
            failure_count: (map(select(.conclusion == "failure")) | length),
            cancelled_count: (map(select(.conclusion == "cancelled")) | length),
            total_minutes: (
                map(
                    if .run_started_at and .updated_at then
                        (((.updated_at | fromdateiso8601) - (.run_started_at | fromdateiso8601)) / 60)
                    else 0 end
                ) | add | floor
            )
        }) |
        sort_by(.total_minutes) | reverse
    ' workflow_runs.json > workflow_metrics.json

    # Calculate cache hit rates (if available in logs)
    echo -e "\n${YELLOW}Workflow Performance Summary:${NC}"
    echo "================================================"

    if [ "$OUTPUT_FORMAT" = "table" ]; then
        printf "%-40s %-6s %-8s %-12s %-8s\n" "Workflow" "Runs" "Avg Min" "Success %" "Total Min"
        echo "------------------------------------------------"

        jq -r '.[] |
            "\(.workflow[0:39]) \(.runs) \(.avg_duration_minutes) \(.success_rate)% \(.total_minutes)"
        ' workflow_metrics.json | while read -r line; do
            workflow=$(echo "$line" | awk '{print $1}')
            runs=$(echo "$line" | awk '{print $2}')
            avg_min=$(echo "$line" | awk '{print $3}')
            success=$(echo "$line" | awk '{print $4}')
            total=$(echo "$line" | awk '{print $5}')

            # Color code based on performance
            if [ "$avg_min" -gt 20 ]; then
                echo -e "${RED}$(printf "%-40s %-6s %-8s %-12s %-8s" "$workflow" "$runs" "$avg_min" "$success" "$total")${NC}"
            elif [ "$avg_min" -gt 10 ]; then
                echo -e "${YELLOW}$(printf "%-40s %-6s %-8s %-12s %-8s" "$workflow" "$runs" "$avg_min" "$success" "$total")${NC}"
            else
                echo -e "${GREEN}$(printf "%-40s %-6s %-8s %-12s %-8s" "$workflow" "$runs" "$avg_min" "$success" "$total")${NC}"
            fi
        done
    elif [ "$OUTPUT_FORMAT" = "json" ]; then
        cat workflow_metrics.json
    elif [ "$OUTPUT_FORMAT" = "csv" ]; then
        echo "Workflow,Runs,Avg Duration (min),Success Rate (%),Total Minutes"
        jq -r '.[] | "\(.workflow),\(.runs),\(.avg_duration_minutes),\(.success_rate),\(.total_minutes)"' workflow_metrics.json
    fi
}

# Function to identify bottlenecks
identify_bottlenecks() {
    echo -e "\n${BLUE}Identifying performance bottlenecks...${NC}"

    # Find slowest jobs across all workflows
    echo -e "\n${YELLOW}Top 10 Slowest Workflow Runs:${NC}"
    echo "================================================"

    jq -r '
        map(select(.run_started_at and .updated_at)) |
        map({
            workflow: .name,
            run_number: .run_number,
            duration_minutes: (((.updated_at | fromdateiso8601) - (.run_started_at | fromdateiso8601)) / 60 | floor),
            status: .conclusion,
            url: .html_url
        }) |
        sort_by(.duration_minutes) | reverse |
        .[0:10] |
        .[] |
        "\(.duration_minutes) min - \(.workflow) #\(.run_number) (\(.status))"
    ' workflow_runs.json

    # Calculate failure patterns
    echo -e "\n${YELLOW}Failure Analysis:${NC}"
    echo "================================================"

    TOTAL_FAILURES=$(jq '[.[] | select(.conclusion == "failure")] | length' workflow_runs.json)
    TOTAL_RUNS=$(jq 'length' workflow_runs.json)
    FAILURE_RATE=$(echo "scale=2; $TOTAL_FAILURES * 100 / $TOTAL_RUNS" | bc)

    echo "Total Failures: $TOTAL_FAILURES / $TOTAL_RUNS (${FAILURE_RATE}%)"

    echo -e "\n${YELLOW}Workflows with highest failure rates:${NC}"
    jq -r '
        group_by(.name) |
        map({
            workflow: .[0].name,
            failures: (map(select(.conclusion == "failure")) | length),
            total: length,
            rate: ((map(select(.conclusion == "failure")) | length) / length * 100 | floor)
        }) |
        map(select(.failures > 0)) |
        sort_by(.rate) | reverse |
        .[0:5] |
        .[] |
        "\(.workflow): \(.failures)/\(.total) failures (\(.rate)%)"
    ' workflow_runs.json
}

# Function to calculate cost implications
calculate_costs() {
    echo -e "\n${BLUE}Calculating cost implications...${NC}"
    echo "================================================"

    # GitHub Actions pricing (as of 2024)
    # Ubuntu: $0.008 per minute
    # Windows: $0.016 per minute
    # macOS: $0.08 per minute

    UBUNTU_MINUTES=$(jq '
        map(
            select(.run_started_at and .updated_at) |
            (((.updated_at | fromdateiso8601) - (.run_started_at | fromdateiso8601)) / 60)
        ) | add | floor
    ' workflow_runs.json)

    UBUNTU_COST=$(echo "scale=2; $UBUNTU_MINUTES * 0.008" | bc)
    MONTHLY_PROJECTION=$(echo "scale=2; $UBUNTU_COST * 30 / $DAYS_BACK" | bc)

    echo "Period analyzed: ${DAYS_BACK} days"
    echo "Total minutes used: ${UBUNTU_MINUTES}"
    echo "Cost for period: \$${UBUNTU_COST}"
    echo "Monthly projection: \$${MONTHLY_PROJECTION}"

    # Check against free tier
    FREE_TIER_MINUTES=2000
    if [ "$UBUNTU_MINUTES" -gt "$FREE_TIER_MINUTES" ]; then
        BILLABLE_MINUTES=$((UBUNTU_MINUTES - FREE_TIER_MINUTES))
        BILLABLE_COST=$(echo "scale=2; $BILLABLE_MINUTES * 0.008" | bc)
        echo -e "${YELLOW}Exceeded free tier by ${BILLABLE_MINUTES} minutes${NC}"
        echo -e "${YELLOW}Additional cost: \$${BILLABLE_COST}${NC}"
    else
        REMAINING=$((FREE_TIER_MINUTES - UBUNTU_MINUTES))
        echo -e "${GREEN}Within free tier (${REMAINING} minutes remaining)${NC}"
    fi
}

# Function to generate optimization recommendations
generate_recommendations() {
    echo -e "\n${BLUE}Optimization Recommendations:${NC}"
    echo "================================================"

    # Check for workflows without caching
    SLOW_WORKFLOWS=$(jq -r '
        map(select(.avg_duration_minutes > 15)) |
        .[].workflow
    ' workflow_metrics.json | head -5)

    if [ -n "$SLOW_WORKFLOWS" ]; then
        echo -e "\n${YELLOW}⚠️  Slow workflows detected (>15 min average):${NC}"
        echo "$SLOW_WORKFLOWS"
        echo -e "${GREEN}Recommendation: Implement caching and parallelization${NC}"
    fi

    # Check for high failure rates
    HIGH_FAILURE_WORKFLOWS=$(jq -r '
        map(select(.success_rate < 80)) |
        .[].workflow
    ' workflow_metrics.json | head -5)

    if [ -n "$HIGH_FAILURE_WORKFLOWS" ]; then
        echo -e "\n${YELLOW}⚠️  Workflows with low success rate (<80%):${NC}"
        echo "$HIGH_FAILURE_WORKFLOWS"
        echo -e "${GREEN}Recommendation: Review test stability and dependencies${NC}"
    fi

    # Check for cost optimization opportunities
    TOTAL_MINUTES=$(jq '[.[].total_minutes] | add' workflow_metrics.json)
    if [ "$TOTAL_MINUTES" -gt 10000 ]; then
        echo -e "\n${YELLOW}⚠️  High resource consumption detected${NC}"
        echo -e "${GREEN}Recommendations:${NC}"
        echo "  1. Enable concurrency controls to cancel duplicate runs"
        echo "  2. Implement path filters to skip unnecessary workflows"
        echo "  3. Use matrix strategies for parallel execution"
        echo "  4. Consider self-hosted runners for frequent workflows"
    fi

    # Generate specific cache recommendations
    echo -e "\n${GREEN}Cache Implementation Priority:${NC}"
    echo "  1. Node dependencies: Use setup-node with cache: 'pnpm'"
    echo "  2. Python dependencies: Use setup-python with cache: 'pip'"
    echo "  3. Build artifacts: Cache .next, dist, and build directories"
    echo "  4. Test results: Cache test reports and coverage data"
    echo "  5. Docker layers: Use docker/build-push-action with cache"
}

# Function to export detailed report
export_report() {
    REPORT_FILE="workflow-performance-report-$(date +%Y%m%d-%H%M%S).html"

    cat > "$REPORT_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>GitHub Actions Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .slow { background-color: #ffcccc; }
        .medium { background-color: #ffffcc; }
        .fast { background-color: #ccffcc; }
        .metric { font-size: 24px; font-weight: bold; color: #0366d6; }
        .recommendation { background-color: #f0f8ff; padding: 10px; margin: 10px 0; border-left: 4px solid #0366d6; }
    </style>
</head>
<body>
    <h1>GitHub Actions Performance Report</h1>
EOF

    # Add metrics to HTML
    echo "<h2>Summary Metrics</h2>" >> "$REPORT_FILE"
    echo "<div class='metric'>Total Workflows: $(jq length workflow_metrics.json)</div>" >> "$REPORT_FILE"
    echo "<div class='metric'>Total Runs: $(jq '[.[].runs] | add' workflow_metrics.json)</div>" >> "$REPORT_FILE"
    echo "<div class='metric'>Total Minutes: $(jq '[.[].total_minutes] | add' workflow_metrics.json)</div>" >> "$REPORT_FILE"

    # Add workflow table
    echo "<h2>Workflow Performance</h2>" >> "$REPORT_FILE"
    echo "<table>" >> "$REPORT_FILE"
    echo "<tr><th>Workflow</th><th>Runs</th><th>Avg Duration</th><th>Success Rate</th><th>Total Minutes</th></tr>" >> "$REPORT_FILE"

    jq -r '.[] |
        "<tr class=\"\(if .avg_duration_minutes > 20 then "slow" elif .avg_duration_minutes > 10 then "medium" else "fast" end)\">
            <td>\(.workflow)</td>
            <td>\(.runs)</td>
            <td>\(.avg_duration_minutes) min</td>
            <td>\(.success_rate)%</td>
            <td>\(.total_minutes)</td>
        </tr>"
    ' workflow_metrics.json >> "$REPORT_FILE"

    echo "</table>" >> "$REPORT_FILE"

    # Add recommendations
    echo "<h2>Optimization Recommendations</h2>" >> "$REPORT_FILE"
    echo "<div class='recommendation'>" >> "$REPORT_FILE"
    echo "<h3>Immediate Actions</h3>" >> "$REPORT_FILE"
    echo "<ul>" >> "$REPORT_FILE"
    echo "<li>Implement caching for all dependency installation steps</li>" >> "$REPORT_FILE"
    echo "<li>Add concurrency controls to prevent duplicate runs</li>" >> "$REPORT_FILE"
    echo "<li>Enable fail-fast for matrix strategies</li>" >> "$REPORT_FILE"
    echo "</ul>" >> "$REPORT_FILE"
    echo "</div>" >> "$REPORT_FILE"

    echo "</body></html>" >> "$REPORT_FILE"

    echo -e "\n${GREEN}Report exported to: ${REPORT_FILE}${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}GitHub Actions Performance Monitor${NC}"
    echo "================================================"

    # Check for required tools
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is not installed${NC}"
        exit 1
    fi

    # Authenticate with GitHub CLI if needed
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}Please authenticate with GitHub CLI:${NC}"
        gh auth login
    fi

    # Run analysis
    fetch_workflow_runs
    analyze_performance
    identify_bottlenecks
    calculate_costs
    generate_recommendations

    # Export report if requested
    if [ "$1" = "--export" ]; then
        export_report
    fi

    # Cleanup
    rm -f workflow_runs.json workflow_metrics.json

    echo -e "\n${GREEN}Analysis complete!${NC}"
}

# Run main function
main "$@"
