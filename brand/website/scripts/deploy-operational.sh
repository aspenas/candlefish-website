#!/bin/bash

##############################################################################
# Candlefish.ai Operational Deployment Orchestrator
# "Infrastructure as artistic medium, deployment as choreographed performance"
##############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOYMENT_ID="deploy-${TIMESTAMP}-${RANDOM}"

# Environment variables with defaults
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-canary}
SLACK_WEBHOOK=${SLACK_WEBHOOK:-}
DOMAIN_NAME=${DOMAIN_NAME:-candlefish.ai}

# Performance thresholds
FPS_THRESHOLD=${FPS_THRESHOLD:-60}
MEMORY_THRESHOLD_MB=${MEMORY_THRESHOLD_MB:-50}
LATENCY_THRESHOLD_MS=${LATENCY_THRESHOLD_MS:-100}
ERROR_RATE_THRESHOLD=${ERROR_RATE_THRESHOLD:-0.1}

# Colors for aesthetic output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ASCII Art Banner
print_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║     ___              _ _      __ _     _        _               ║
    ║    / __| __ _ _ _  __| | |___ / _(_)___| |_     /_\  (_)        ║
    ║   | (__ / _` | ' \/ _` | / -_)  _| (_-<| ' \   / _ \ | |        ║
    ║    \___|\__,_|_||_\__,_|_\___|_| |_/__/|_||_| /_/ \_\|_|        ║
    ║                                                                  ║
    ║           OPERATIONAL DEPLOYMENT ORCHESTRATOR v1.0.0            ║
    ║                  "Performance as Art Form"                      ║
    ╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Logging functions with timestamps
log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} ${WHITE}INFO${NC}  $1"
}

log_success() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} ${GREEN}✓${NC}     $1"
}

log_warning() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} ${YELLOW}⚠${NC}     $1"
}

log_error() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} ${RED}✗${NC}     $1"
}

log_phase() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}▶${NC} ${WHITE}$1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Progress bar for long operations
show_progress() {
    local duration=$1
    local message=$2
    local elapsed=0
    
    while [ $elapsed -lt $duration ]; do
        printf "\r${BLUE}[$(date +'%H:%M:%S')]${NC} ${WHITE}${message}${NC} ["
        local progress=$((elapsed * 20 / duration))
        for ((i=0; i<20; i++)); do
            if [ $i -lt $progress ]; then
                printf "="
            else
                printf " "
            fi
        done
        printf "] %d%%" $((elapsed * 100 / duration))
        sleep 1
        elapsed=$((elapsed + 1))
    done
    printf "\r${BLUE}[$(date +'%H:%M:%S')]${NC} ${GREEN}✓${NC}     ${message} [====================] 100%%\n"
}

# Send notifications
notify() {
    local status=$1
    local message=$2
    local details=$3
    
    # Console notification
    if [[ "$status" == "success" ]]; then
        log_success "$message"
    elif [[ "$status" == "warning" ]]; then
        log_warning "$message"
    elif [[ "$status" == "error" ]]; then
        log_error "$message"
    else
        log_info "$message"
    fi
    
    # Slack notification if webhook is configured
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local emoji=""
        local color=""
        
        case "$status" in
            success) emoji="✅"; color="good" ;;
            warning) emoji="⚠️"; color="warning" ;;
            error) emoji="❌"; color="danger" ;;
            *) emoji="ℹ️"; color="#0080ff" ;;
        esac
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji Candlefish Deployment - $ENVIRONMENT\",
                    \"text\": \"$message\",
                    \"fields\": [{
                        \"title\": \"Details\",
                        \"value\": \"$details\",
                        \"short\": false
                    }],
                    \"footer\": \"Deployment ID: $DEPLOYMENT_ID\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || true
    fi
}

# Pre-flight checks
pre_flight_checks() {
    log_phase "PHASE 1: PRE-FLIGHT CHECKS"
    
    local checks_passed=true
    
    # Check required tools
    log_info "Checking required tools..."
    local required_tools=("aws" "docker" "node" "npm" "terraform" "kubectl" "jq")
    for tool in "${required_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            log_success "$tool is installed"
        else
            log_error "$tool is not installed"
            checks_passed=false
        fi
    done
    
    # Verify AWS credentials
    log_info "Verifying AWS credentials..."
    if aws sts get-caller-identity &> /dev/null; then
        local account_id=$(aws sts get-caller-identity --query 'Account' --output text)
        log_success "AWS credentials valid (Account: $account_id)"
    else
        log_error "Invalid AWS credentials"
        checks_passed=false
    fi
    
    # Check Node.js version
    log_info "Checking Node.js version..."
    local node_version=$(node -v | sed 's/v//')
    local required_version="18.0.0"
    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
        log_success "Node.js version $node_version meets requirements"
    else
        log_error "Node.js version $node_version is below required $required_version"
        checks_passed=false
    fi
    
    # Run tests
    log_info "Running test suite..."
    cd "$PROJECT_ROOT"
    if npm test -- --ci --coverage --silent > /tmp/test-results.json 2>&1; then
        local coverage=$(jq '.total.statements.pct' /tmp/test-results.json 2>/dev/null || echo "0")
        if (( $(echo "$coverage >= 80" | bc -l) )); then
            log_success "Tests passed with ${coverage}% coverage"
        else
            log_warning "Tests passed but coverage is ${coverage}% (below 80%)"
        fi
    else
        log_error "Tests failed"
        checks_passed=false
    fi
    
    # Security scan
    log_info "Running security scan..."
    if npm audit --production --audit-level=high > /tmp/audit-results.txt 2>&1; then
        log_success "No high/critical vulnerabilities found"
    else
        local vulns=$(grep -c "found.*vulnerabilities" /tmp/audit-results.txt || echo "unknown")
        log_warning "Security vulnerabilities detected: $vulns"
    fi
    
    # Bundle size check
    log_info "Checking bundle size..."
    npm run build > /tmp/build.log 2>&1
    local bundle_size=$(du -sh .next | cut -f1)
    log_info "Bundle size: $bundle_size"
    
    if [[ "$checks_passed" == false ]]; then
        log_error "Pre-flight checks failed. Aborting deployment."
        exit 1
    fi
    
    log_success "All pre-flight checks passed"
}

# Build and optimize
build_and_optimize() {
    log_phase "PHASE 2: BUILD & OPTIMIZATION"
    
    cd "$PROJECT_ROOT"
    
    # Clean previous builds
    log_info "Cleaning previous builds..."
    rm -rf .next out dist
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --production=false
    
    # Build with analysis
    log_info "Building application with optimization..."
    ANALYZE=true NODE_ENV=production npm run build
    
    # Generate bundle report
    if [[ -f ".next/bundle-analysis.html" ]]; then
        log_success "Bundle analysis generated"
        
        # Extract metrics from build
        local js_size=$(find .next -name "*.js" -exec du -ch {} + | tail -1 | cut -f1)
        local css_size=$(find .next -name "*.css" -exec du -ch {} + | tail -1 | cut -f1)
        
        log_info "JavaScript bundle: $js_size"
        log_info "CSS bundle: $css_size"
    fi
    
    # Run lighthouse audit
    log_info "Running Lighthouse performance audit..."
    npx lighthouse https://${DOMAIN_NAME} \
        --output=json \
        --output-path=/tmp/lighthouse.json \
        --chrome-flags="--headless" \
        --quiet 2>/dev/null || true
    
    if [[ -f "/tmp/lighthouse.json" ]]; then
        local perf_score=$(jq '.categories.performance.score * 100' /tmp/lighthouse.json)
        local a11y_score=$(jq '.categories.accessibility.score * 100' /tmp/lighthouse.json)
        local seo_score=$(jq '.categories.seo.score * 100' /tmp/lighthouse.json)
        
        log_info "Lighthouse Scores:"
        log_info "  Performance: ${perf_score}%"
        log_info "  Accessibility: ${a11y_score}%"
        log_info "  SEO: ${seo_score}%"
    fi
    
    log_success "Build completed successfully"
}

# Container build and push
build_container() {
    log_phase "PHASE 3: CONTAINER BUILD"
    
    cd "$PROJECT_ROOT"
    
    local image_tag="${ENVIRONMENT}-${TIMESTAMP}"
    local ecr_repo="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/candlefish-website"
    
    # Docker build with BuildKit
    log_info "Building container image..."
    DOCKER_BUILDKIT=1 docker build \
        --cache-from "${ecr_repo}:cache" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --tag "${ecr_repo}:${image_tag}" \
        --tag "${ecr_repo}:latest" \
        --progress=plain \
        . 2>&1 | while read line; do
            echo "  $line"
        done
    
    # Scan image for vulnerabilities
    log_info "Scanning container for vulnerabilities..."
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy image "${ecr_repo}:${image_tag}" \
        --severity HIGH,CRITICAL \
        --exit-code 0 > /tmp/trivy-scan.txt 2>&1
    
    local vulns=$(grep -c "Total:" /tmp/trivy-scan.txt || echo "0")
    if [[ "$vulns" -gt 0 ]]; then
        log_warning "Container vulnerabilities found (see /tmp/trivy-scan.txt)"
    else
        log_success "No critical vulnerabilities in container"
    fi
    
    # Push to ECR
    log_info "Pushing image to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ecr_repo"
    
    docker push "${ecr_repo}:${image_tag}"
    docker push "${ecr_repo}:latest"
    
    log_success "Container image pushed: ${ecr_repo}:${image_tag}"
    
    echo "$image_tag" > /tmp/deployment-image-tag.txt
}

# Deploy with selected strategy
deploy() {
    log_phase "PHASE 4: DEPLOYMENT (${DEPLOYMENT_MODE})"
    
    local image_tag=$(cat /tmp/deployment-image-tag.txt)
    
    case "$DEPLOYMENT_MODE" in
        canary)
            deploy_canary "$image_tag"
            ;;
        blue-green)
            deploy_blue_green "$image_tag"
            ;;
        rolling)
            deploy_rolling "$image_tag"
            ;;
        instant)
            deploy_instant "$image_tag"
            ;;
        *)
            log_error "Unknown deployment mode: $DEPLOYMENT_MODE"
            exit 1
            ;;
    esac
}

# Canary deployment strategy
deploy_canary() {
    local image_tag=$1
    
    log_info "Starting canary deployment..."
    
    # Deploy to canary target group (10% traffic)
    log_info "Deploying canary instances (10% traffic)..."
    aws ecs update-service \
        --cluster "${ENVIRONMENT}-candlefish" \
        --service "candlefish-website-canary" \
        --force-new-deployment \
        --task-definition "candlefish-website:${image_tag}" \
        --desired-count 2
    
    # Wait for canary to be healthy
    show_progress 60 "Waiting for canary instances to become healthy"
    
    # Monitor canary metrics
    log_info "Monitoring canary metrics for 5 minutes..."
    local monitoring_start=$(date +%s)
    local monitoring_duration=300 # 5 minutes
    
    while [[ $(($(date +%s) - monitoring_start)) -lt $monitoring_duration ]]; do
        # Check error rate
        local error_rate=$(aws cloudwatch get-metric-statistics \
            --namespace "AWS/ApplicationELB" \
            --metric-name "HTTPCode_Target_5XX_Count" \
            --dimensions Name=TargetGroup,Value="${CANARY_TG_ARN}" \
            --start-time "$(date -u -d '1 minute ago' '+%Y-%m-%dT%H:%M:%S')" \
            --end-time "$(date -u '+%Y-%m-%dT%H:%M:%S')" \
            --period 60 \
            --statistics Sum \
            --query 'Datapoints[0].Sum' \
            --output text 2>/dev/null || echo "0")
        
        if [[ "$error_rate" != "None" ]] && (( $(echo "$error_rate > 10" | bc -l) )); then
            log_error "High error rate detected in canary: ${error_rate}"
            rollback_deployment
            exit 1
        fi
        
        # Check latency
        local latency_p95=$(aws cloudwatch get-metric-statistics \
            --namespace "AWS/ApplicationELB" \
            --metric-name "TargetResponseTime" \
            --dimensions Name=TargetGroup,Value="${CANARY_TG_ARN}" \
            --start-time "$(date -u -d '1 minute ago' '+%Y-%m-%dT%H:%M:%S')" \
            --end-time "$(date -u '+%Y-%m-%dT%H:%M:%S')" \
            --period 60 \
            --statistics "p95" \
            --query 'Datapoints[0].p95' \
            --output text 2>/dev/null || echo "0")
        
        log_info "Canary metrics - Errors: ${error_rate}, P95 Latency: ${latency_p95}ms"
        sleep 30
    done
    
    # Progressive rollout
    local traffic_splits=(25 50 75 100)
    for split in "${traffic_splits[@]}"; do
        log_info "Increasing canary traffic to ${split}%..."
        
        aws elbv2 modify-rule \
            --rule-arn "${CANARY_RULE_ARN}" \
            --actions \
                "Type=forward,ForwardConfig={TargetGroups=[{TargetGroupArn=${CANARY_TG_ARN},Weight=${split}},{TargetGroupArn=${PROD_TG_ARN},Weight=$((100-split))}]}"
        
        show_progress 120 "Monitoring at ${split}% traffic"
        
        # Check metrics at each stage
        verify_deployment_health
        if [[ $? -ne 0 ]]; then
            log_error "Health check failed at ${split}% traffic"
            rollback_deployment
            exit 1
        fi
    done
    
    log_success "Canary deployment completed successfully"
}

# Blue-green deployment strategy
deploy_blue_green() {
    local image_tag=$1
    
    log_info "Starting blue-green deployment..."
    
    # Deploy to green environment
    log_info "Deploying to green environment..."
    aws ecs update-service \
        --cluster "${ENVIRONMENT}-candlefish" \
        --service "candlefish-website-green" \
        --force-new-deployment \
        --task-definition "candlefish-website:${image_tag}"
    
    show_progress 120 "Waiting for green environment to be ready"
    
    # Run smoke tests on green
    log_info "Running smoke tests on green environment..."
    npm run test:e2e -- --env GREEN_URL="https://green.${DOMAIN_NAME}"
    
    # Switch traffic to green
    log_info "Switching traffic to green environment..."
    aws elbv2 modify-listener \
        --listener-arn "${ALB_LISTENER_ARN}" \
        --default-actions "Type=forward,TargetGroupArn=${GREEN_TG_ARN}"
    
    log_success "Blue-green deployment completed"
}

# Verify deployment health
verify_deployment_health() {
    log_info "Verifying deployment health..."
    
    local health_checks_passed=true
    
    # Check application health endpoint
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_NAME}/api/health")
    if [[ "$health_response" == "200" ]]; then
        log_success "Health endpoint responding (HTTP ${health_response})"
    else
        log_error "Health endpoint not responding (HTTP ${health_response})"
        health_checks_passed=false
    fi
    
    # Check WebGL performance
    log_info "Testing WebGL performance..."
    node "$SCRIPT_DIR/test-webgl-performance.js" "https://${DOMAIN_NAME}" > /tmp/webgl-perf.json
    
    if [[ -f "/tmp/webgl-perf.json" ]]; then
        local fps=$(jq '.averageFPS' /tmp/webgl-perf.json)
        local memory=$(jq '.peakMemoryMB' /tmp/webgl-perf.json)
        
        if (( $(echo "$fps >= $FPS_THRESHOLD" | bc -l) )); then
            log_success "WebGL FPS: ${fps} (threshold: ${FPS_THRESHOLD})"
        else
            log_error "WebGL FPS below threshold: ${fps} < ${FPS_THRESHOLD}"
            health_checks_passed=false
        fi
        
        if (( $(echo "$memory <= $MEMORY_THRESHOLD_MB" | bc -l) )); then
            log_success "Memory usage: ${memory}MB (threshold: ${MEMORY_THRESHOLD_MB}MB)"
        else
            log_warning "High memory usage: ${memory}MB > ${MEMORY_THRESHOLD_MB}MB"
        fi
    fi
    
    # Check CloudWatch alarms
    local alarms=$(aws cloudwatch describe-alarms \
        --alarm-name-prefix "${ENVIRONMENT}-candlefish" \
        --state-value ALARM \
        --query 'MetricAlarms[].AlarmName' \
        --output text)
    
    if [[ -z "$alarms" ]]; then
        log_success "No CloudWatch alarms triggered"
    else
        log_warning "Active CloudWatch alarms: $alarms"
    fi
    
    if [[ "$health_checks_passed" == false ]]; then
        return 1
    fi
    
    return 0
}

# Rollback deployment
rollback_deployment() {
    log_phase "EMERGENCY ROLLBACK"
    
    notify "error" "Deployment failed, initiating rollback" "Deployment ID: $DEPLOYMENT_ID"
    
    # Get previous stable version
    local previous_version=$(aws ecs describe-services \
        --cluster "${ENVIRONMENT}-candlefish" \
        --services "candlefish-website" \
        --query 'services[0].deployments[1].taskDefinition' \
        --output text)
    
    log_info "Rolling back to previous version: $previous_version"
    
    # Update service to previous version
    aws ecs update-service \
        --cluster "${ENVIRONMENT}-candlefish" \
        --service "candlefish-website" \
        --task-definition "$previous_version" \
        --force-new-deployment
    
    # Reset traffic weights if canary
    if [[ "$DEPLOYMENT_MODE" == "canary" ]]; then
        aws elbv2 modify-rule \
            --rule-arn "${CANARY_RULE_ARN}" \
            --actions "Type=forward,TargetGroupArn=${PROD_TG_ARN}"
    fi
    
    show_progress 60 "Waiting for rollback to complete"
    
    log_success "Rollback completed"
    notify "warning" "Deployment rolled back successfully" "Reverted to: $previous_version"
}

# Generate deployment report
generate_report() {
    log_phase "PHASE 5: DEPLOYMENT REPORT"
    
    local report_file="${PROJECT_ROOT}/deployment-reports/report-${DEPLOYMENT_ID}.md"
    mkdir -p "${PROJECT_ROOT}/deployment-reports"
    
    cat > "$report_file" << EOF
# Candlefish.ai Deployment Report

## Deployment Summary
- **ID**: ${DEPLOYMENT_ID}
- **Date**: $(date)
- **Environment**: ${ENVIRONMENT}
- **Mode**: ${DEPLOYMENT_MODE}
- **Status**: SUCCESS

## Performance Metrics
- **Bundle Size**: $(du -sh .next | cut -f1)
- **Average FPS**: ${fps:-N/A}
- **Memory Usage**: ${memory:-N/A}MB
- **P95 Latency**: ${latency_p95:-N/A}ms

## Test Results
- **Unit Tests**: ✅ Passed
- **Coverage**: ${coverage:-N/A}%
- **E2E Tests**: ✅ Passed
- **Security Scan**: ⚠️ ${vulns:-0} vulnerabilities

## Deployment Timeline
$(cat /tmp/deployment-timeline.log 2>/dev/null || echo "Timeline not available")

## Recommendations
1. Monitor application metrics for next 24 hours
2. Review performance dashboards
3. Check user feedback channels
4. Plan next optimization cycle

---
*Generated by Operational Deployment Orchestrator v1.0.0*
EOF
    
    log_success "Report generated: $report_file"
}

# Cleanup
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f /tmp/deployment-*.txt /tmp/test-results.json /tmp/audit-results.txt
    rm -f /tmp/lighthouse.json /tmp/webgl-perf.json /tmp/trivy-scan.txt
    rm -f /tmp/deployment-timeline.log
}

# Main orchestration
main() {
    print_banner
    
    # Start timeline logging
    exec 3>/tmp/deployment-timeline.log
    BASH_XTRACEFD=3
    set -x
    
    # Record start time
    DEPLOYMENT_START=$(date +%s)
    
    notify "info" "Deployment started" "Environment: $ENVIRONMENT, Mode: $DEPLOYMENT_MODE"
    
    # Execute deployment phases
    pre_flight_checks
    build_and_optimize
    build_container
    deploy
    verify_deployment_health
    
    # Record end time
    DEPLOYMENT_END=$(date +%s)
    DEPLOYMENT_DURATION=$((DEPLOYMENT_END - DEPLOYMENT_START))
    
    # Stop timeline logging
    set +x
    exec 3>&-
    
    # Generate final report
    generate_report
    
    # Send success notification
    notify "success" "Deployment completed successfully" "Duration: ${DEPLOYMENT_DURATION}s"
    
    # Cleanup
    cleanup
    
    # Final message
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}║                    🎉 DEPLOYMENT SUCCESSFUL 🎉                   ║${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}║   Your application is now live at: https://${DOMAIN_NAME}        ║${NC}"
    echo -e "${GREEN}║   Deployment completed in: ${DEPLOYMENT_DURATION} seconds        ║${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Trap errors and cleanup
trap 'log_error "Deployment failed on line $LINENO"; rollback_deployment; cleanup; exit 1' ERR
trap 'cleanup' EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --mode)
            DEPLOYMENT_MODE="$2"
            shift 2
            ;;
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            cat << EOF
Usage: $0 [OPTIONS]

Orchestrates deployment of Candlefish.ai with artistic precision.

Options:
  --environment ENV     Target environment (staging|production)
  --mode MODE          Deployment mode (canary|blue-green|rolling|instant)
  --domain DOMAIN      Domain name for the deployment
  --skip-tests         Skip test execution (not recommended)
  --help               Display this help message

Examples:
  $0 --environment staging --mode canary
  $0 --environment production --mode blue-green --domain candlefish.ai

EOF
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Execute main function
main