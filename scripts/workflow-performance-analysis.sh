#!/bin/bash

# GitHub Actions Workflow Performance Analysis
# =============================================

echo "🔍 GitHub Actions Performance Analysis for Candlefish-AI"
echo "========================================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

# Function to analyze workflow runs
analyze_workflow_runs() {
    local workflow_file=$1
    local workflow_name=$(basename "$workflow_file" .yml)

    echo "📊 Analyzing: $workflow_name"
    echo "----------------------------------------"

    # Get the last 10 runs of the workflow
    runs=$(gh run list --workflow="$workflow_file" --limit=10 --json databaseId,status,conclusion,createdAt,updatedAt,runStartedAt 2>/dev/null)

    if [ -z "$runs" ] || [ "$runs" == "[]" ]; then
        echo "  ⚠️ No recent runs found for this workflow"
        echo ""
        return
    fi

    # Calculate average duration
    total_duration=0
    successful_runs=0

    while IFS= read -r run; do
        started=$(echo "$run" | jq -r '.runStartedAt')
        updated=$(echo "$run" | jq -r '.updatedAt')
        conclusion=$(echo "$run" | jq -r '.conclusion')

        if [ "$conclusion" == "success" ] && [ "$started" != "null" ] && [ "$updated" != "null" ]; then
            # Calculate duration in seconds
            start_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$started" +%s 2>/dev/null || date -d "$started" +%s 2>/dev/null)
            end_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$updated" +%s 2>/dev/null || date -d "$updated" +%s 2>/dev/null)

            if [ -n "$start_epoch" ] && [ -n "$end_epoch" ]; then
                duration=$((end_epoch - start_epoch))
                total_duration=$((total_duration + duration))
                successful_runs=$((successful_runs + 1))
            fi
        fi
    done < <(echo "$runs" | jq -c '.[]')

    if [ $successful_runs -gt 0 ]; then
        avg_duration=$((total_duration / successful_runs))
        avg_minutes=$((avg_duration / 60))
        avg_seconds=$((avg_duration % 60))
        echo "  ✅ Average successful run time: ${avg_minutes}m ${avg_seconds}s"
        echo "  📈 Based on $successful_runs successful runs"
    else
        echo "  ⚠️ No successful runs to analyze"
    fi

    echo ""
}

# Analyze main workflows
echo "🎯 Main Workflow Analysis"
echo "========================="
echo ""

for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        analyze_workflow_runs "$workflow"
    fi
done

# Performance bottleneck analysis
echo "🚨 Identified Performance Bottlenecks"
echo "====================================="
echo ""

# Check for missing caching
echo "1. 📦 Dependency Caching Analysis:"
echo "   ---------------------------------"
grep -l "actions/cache@" .github/workflows/*.yml 2>/dev/null | while read -r file; do
    echo "   ✅ $(basename "$file"): Uses caching"
done

grep -L "actions/cache@" .github/workflows/*.yml 2>/dev/null | while read -r file; do
    if ! grep -q "actions/setup-node@\|pnpm/action-setup@" "$file" 2>/dev/null || ! grep -q "cache:" "$file" 2>/dev/null; then
        echo "   ⚠️ $(basename "$file"): Missing cache configuration"
    fi
done
echo ""

# Check for parallel job configuration
echo "2. 🔄 Parallelization Analysis:"
echo "   ----------------------------"
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        if grep -q "matrix:" "$workflow"; then
            max_parallel=$(grep -A5 "strategy:" "$workflow" | grep "max-parallel:" | sed 's/.*max-parallel: *//')
            if [ -n "$max_parallel" ]; then
                echo "   📊 $(basename "$workflow"): Matrix with max-parallel=$max_parallel"
            else
                echo "   ⚠️ $(basename "$workflow"): Matrix without max-parallel limit (unlimited)"
            fi
        fi
    fi
done
echo ""

# Check for redundant steps
echo "3. 🔁 Redundant Operations:"
echo "   ------------------------"
echo "   Checking for multiple checkout operations..."
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        checkout_count=$(grep -c "actions/checkout@" "$workflow" 2>/dev/null)
        if [ "$checkout_count" -gt 1 ]; then
            echo "   ⚠️ $(basename "$workflow"): $checkout_count checkout operations (potential redundancy)"
        fi
    fi
done
echo ""

# Docker optimization check
echo "4. 🐳 Docker Layer Caching:"
echo "   ------------------------"
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        if grep -q "docker" "$workflow" 2>/dev/null; then
            if grep -q "buildx\|cache-from\|cache-to" "$workflow" 2>/dev/null; then
                echo "   ✅ $(basename "$workflow"): Uses Docker layer caching"
            else
                echo "   ⚠️ $(basename "$workflow"): Uses Docker without layer caching"
            fi
        fi
    fi
done
echo ""

# Resource usage analysis
echo "5. 💻 Runner Resource Usage:"
echo "   -------------------------"
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        runners=$(grep "runs-on:" "$workflow" | sed 's/.*runs-on: *//' | sort -u)
        if [ -n "$runners" ]; then
            echo "   $(basename "$workflow"):"
            echo "$runners" | while read -r runner; do
                # Clean up runner string
                runner=$(echo "$runner" | tr -d '${}' | sed 's/matrix\.runner/dynamic/')
                if [[ "$runner" == *"larger-runner"* ]] || [[ "$runner" == *"8-cores"* ]]; then
                    echo "     🚀 $runner (High-performance)"
                elif [[ "$runner" == *"macos"* ]]; then
                    echo "     💰 $runner (10x cost multiplier)"
                elif [[ "$runner" == *"windows"* ]]; then
                    echo "     💰 $runner (2x cost multiplier)"
                else
                    echo "     ✅ $runner (Standard)"
                fi
            done
        fi
    fi
done
echo ""

# Timeout analysis
echo "6. ⏱️ Timeout Configuration:"
echo "   -------------------------"
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        timeouts=$(grep "timeout-minutes:" "$workflow" | sed 's/.*timeout-minutes: *//' | sort -u)
        if [ -n "$timeouts" ]; then
            echo "   $(basename "$workflow"): $(echo $timeouts | tr '\n' ', ')"
        else
            echo "   ⚠️ $(basename "$workflow"): No timeout configured (default: 360 minutes)"
        fi
    fi
done
echo ""

echo "📋 Performance Optimization Recommendations"
echo "==========================================="
echo ""
echo "Based on the analysis, here are specific optimizations:"
echo ""
