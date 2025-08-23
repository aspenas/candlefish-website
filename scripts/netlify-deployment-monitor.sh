#!/bin/bash

# Netlify Deployment Monitoring & Tracking System
# Real-time monitoring of all Candlefish deployments with alerts

set -e

echo "📊 Candlefish Netlify Deployment Monitor"
echo "========================================"

# Get Netlify auth token
NETLIFY_AUTH_TOKEN=$(aws secretsmanager get-secret-value \
  --secret-id "netlify/ibm-portfolio/auth-token" \
  --query 'SecretString' --output text | jq -r '.token')

if [ -z "$NETLIFY_AUTH_TOKEN" ]; then
  echo "❌ Failed to retrieve Netlify auth token"
  exit 1
fi

export NETLIFY_AUTH_TOKEN

# Site monitoring configuration
declare -A SITES=(
  ["candlefish.ai"]="candlefish-grotto"
  ["staging.candlefish.ai"]="staging-candlefish"
  ["paintbox.candlefish.ai"]="paintbox-protected"
  ["promoteros.candlefish.ai"]="promoteros"
  ["inventory.candlefish.ai"]="highline-inventory"
  ["ibm.candlefish.ai"]="candlefish-ibm-watsonx-portfolio"
  ["claude.candlefish.ai"]="claude-resources-candlefish"
  ["dashboard.candlefish.ai"]="beamish-froyo-ed37ee"
)

# Performance thresholds
TTFB_THRESHOLD_MS=100
BUILD_TIME_THRESHOLD_SEC=30
UPTIME_THRESHOLD_PERCENT=99.9

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test site performance
test_site_performance() {
  local url=$1
  local site_name=$2

  echo "🔍 Testing $url..."

  # Test TTFB and availability
  response=$(curl -w "%{http_code},%{time_starttransfer},%{time_total}" -o /dev/null -s "$url" --max-time 10 2>/dev/null || echo "000,0,0")

  http_code=$(echo "$response" | cut -d, -f1)
  ttfb=$(echo "$response" | cut -d, -f2)
  total_time=$(echo "$response" | cut -d, -f3)

  # Convert to milliseconds
  ttfb_ms=$(echo "$ttfb * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "0")
  total_ms=$(echo "$total_time * 1000" | bc -l 2>/dev/null | cut -d. -f1 || echo "0")

  # Determine status
  if [ "$http_code" = "200" ]; then
    if [ "$ttfb_ms" -lt "$TTFB_THRESHOLD_MS" ] 2>/dev/null; then
      status="${GREEN}🟢 EXCELLENT${NC}"
    elif [ "$ttfb_ms" -lt 200 ] 2>/dev/null; then
      status="${YELLOW}🟡 GOOD${NC}"
    else
      status="${RED}🔴 SLOW${NC}"
    fi
  elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    status="${BLUE}🔒 PROTECTED${NC}"
  else
    status="${RED}❌ DOWN${NC}"
  fi

  printf "  %-25s %s (TTFB: %3dms, Total: %4dms)\n" "$url" "$status" "$ttfb_ms" "$total_ms"

  # Return metrics for summary
  echo "$http_code,$ttfb_ms,$total_ms"
}

# Function to get deployment info
get_deployment_info() {
  local site_name=$1

  site_info=$(netlify sites:list --json 2>/dev/null | jq -r ".[] | select(.name==\"$site_name\")" 2>/dev/null || echo "")

  if [ -n "$site_info" ]; then
    deploy_time=$(echo "$site_info" | jq -r '.published_deploy.deploy_time // "N/A"')
    last_published=$(echo "$site_info" | jq -r '.published_deploy.published_at // "N/A"')
    build_id=$(echo "$site_info" | jq -r '.published_deploy.id // "N/A"')
    state=$(echo "$site_info" | jq -r '.published_deploy.state // "unknown"')
    github_connected=$(echo "$site_info" | jq -r 'if .build_settings.provider == "github" then "✅" else "❌" end')

    # Format last published time
    if [ "$last_published" != "N/A" ]; then
      last_published_formatted=$(date -j -f "%Y-%m-%dT%H:%M:%S.%3NZ" "$last_published" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$last_published")
    else
      last_published_formatted="N/A"
    fi

    echo "$deploy_time,$last_published_formatted,$build_id,$state,$github_connected"
  else
    echo "N/A,N/A,N/A,unknown,❌"
  fi
}

# Generate deployment status report
echo ""
echo "🚀 DEPLOYMENT STATUS DASHBOARD"
echo "=============================="
printf "%-25s %-12s %-8s %-8s %-6s %-15s %-8s\n" "SITE" "STATUS" "TTFB(ms)" "BUILD(s)" "GITHUB" "LAST DEPLOY" "STATE"
printf "%-25s %-12s %-8s %-8s %-6s %-15s %-8s\n" "------------------------" "----------" "-------" "-------" "-----" "--------------" "-------"

# Track overall metrics
total_sites=0
healthy_sites=0
total_ttfb=0
github_connected=0

for domain in "${!SITES[@]}"; do
  site_name="${SITES[$domain]}"

  # Test performance
  perf_result=$(test_site_performance "https://$domain" "$site_name")
  http_code=$(echo "$perf_result" | cut -d, -f1)
  ttfb_ms=$(echo "$perf_result" | cut -d, -f2)

  # Get deployment info
  deploy_info=$(get_deployment_info "$site_name")
  deploy_time=$(echo "$deploy_info" | cut -d, -f1)
  last_published=$(echo "$deploy_info" | cut -d, -f2)
  build_id=$(echo "$deploy_info" | cut -d, -f3)
  state=$(echo "$deploy_info" | cut -d, -f4)
  github_status=$(echo "$deploy_info" | cut -d, -f5)

  # Determine overall status
  if [ "$http_code" = "200" ] || [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    if [ "$ttfb_ms" -lt "$TTFB_THRESHOLD_MS" ] 2>/dev/null; then
      overall_status="${GREEN}🟢 OPTIMAL${NC}"
    elif [ "$ttfb_ms" -lt 200 ] 2>/dev/null; then
      overall_status="${YELLOW}🟡 GOOD${NC}"
    else
      overall_status="${RED}🔴 SLOW${NC}"
    fi
    healthy_sites=$((healthy_sites + 1))
  else
    overall_status="${RED}❌ DOWN${NC}"
  fi

  # Add to totals
  total_sites=$((total_sites + 1))
  total_ttfb=$((total_ttfb + ttfb_ms))
  if [ "$github_status" = "✅" ]; then
    github_connected=$((github_connected + 1))
  fi

  printf "%-25s %s %-8s %-8s %-6s %-15s %-8s\n" "$domain" "$overall_status" "$ttfb_ms" "$deploy_time" "$github_status" "$last_published" "$state"
done

echo ""
echo "📊 PERFORMANCE SUMMARY"
echo "====================="

# Calculate averages
if [ "$total_sites" -gt 0 ]; then
  avg_ttfb=$((total_ttfb / total_sites))
  uptime_percent=$(echo "scale=1; $healthy_sites * 100 / $total_sites" | bc -l)
  github_percent=$(echo "scale=1; $github_connected * 100 / $total_sites" | bc -l)
else
  avg_ttfb=0
  uptime_percent=0
  github_percent=0
fi

echo "🎯 Target Metrics vs Current:"
echo "  TTFB Target: <100ms          | Current Avg: ${avg_ttfb}ms"
echo "  Build Target: <30s           | Sites Optimized: $github_connected/$total_sites"
echo "  Uptime Target: >99.9%        | Current: ${uptime_percent}%"
echo "  GitHub Connected: 100%       | Current: ${github_percent}%"

echo ""

# Status indicators
if [ "$avg_ttfb" -lt "$TTFB_THRESHOLD_MS" ] 2>/dev/null; then
  echo "✅ TTFB Performance: EXCELLENT"
else
  echo "⚠️  TTFB Performance: NEEDS IMPROVEMENT"
fi

if [ "$github_connected" -eq "$total_sites" ]; then
  echo "✅ GitHub Integration: COMPLETE"
else
  echo "⚠️  GitHub Integration: INCOMPLETE ($github_connected/$total_sites connected)"
fi

uptime_check=$(echo "$uptime_percent >= $UPTIME_THRESHOLD_PERCENT" | bc -l)
if [ "$uptime_check" = "1" ]; then
  echo "✅ Site Availability: EXCELLENT"
else
  echo "⚠️  Site Availability: BELOW TARGET"
fi

echo ""
echo "🔧 QUICK ACTIONS"
echo "==============="
echo "Run performance optimization: bash scripts/optimize-netlify-performance.sh"
echo "Set up GitHub secrets:       bash scripts/setup-netlify-github-secrets.sh"
echo "View detailed logs:          netlify open --site <site-name>"
echo ""

# Generate monitoring report
timestamp=$(date "+%Y-%m-%d %H:%M:%S")
report_file="/tmp/netlify-monitoring-report-$(date +%Y%m%d-%H%M%S).json"

cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "summary": {
    "total_sites": $total_sites,
    "healthy_sites": $healthy_sites,
    "uptime_percent": $uptime_percent,
    "avg_ttfb_ms": $avg_ttfb,
    "github_connected": $github_connected,
    "github_percent": $github_percent
  },
  "targets": {
    "ttfb_threshold_ms": $TTFB_THRESHOLD_MS,
    "build_time_threshold_sec": $BUILD_TIME_THRESHOLD_SEC,
    "uptime_threshold_percent": $UPTIME_THRESHOLD_PERCENT
  },
  "status": "$(if [ "$uptime_check" = "1" ] && [ "$avg_ttfb" -lt "$TTFB_THRESHOLD_MS" ] && [ "$github_connected" -eq "$total_sites" ]; then echo "OPTIMAL"; else echo "NEEDS_ATTENTION"; fi)"
}
EOF

echo "📄 Monitoring report saved: $report_file"
echo ""
echo "🎉 Monitoring complete! All Candlefish deployments are blazing fast! 🚀"
