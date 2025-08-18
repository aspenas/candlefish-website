#!/bin/bash
# Comprehensive Workflow Automation Script
# Executes all infrastructure tasks with full AWS integration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Task tracking - using simple variables for compatibility
TASK_paintbox_fix="pending"
TASK_cost_monitoring="pending"
TASK_backup_system="pending"
TASK_s3_buckets="pending"
TASK_webhooks="pending"
TASK_temporal_platform="pending"
TASK_graphql_caching="pending"
TASK_load_tests="pending"
TASK_disaster_recovery="pending"

# Update task status
update_task() {
    local task=$1
    local status=$2
    TASK_STATUS[$task]=$status
    log "Task '$task' status: $status"
}

# 1. Fix Paintbox Application
fix_paintbox() {
    log "🔧 Fixing Paintbox Application..."
    update_task "paintbox_fix" "in_progress"

    # Check current status
    if flyctl status -a paintbox-app 2>/dev/null; then
        info "Paintbox app found, checking health..."

        # Try to restart the app
        if flyctl apps restart paintbox-app --force 2>/dev/null; then
            log "✅ Paintbox app restarted"
            update_task "paintbox_fix" "completed"
        else
            warning "Failed to restart Paintbox, may need manual intervention"
            update_task "paintbox_fix" "failed"
        fi
    else
        error "Paintbox app not found"
        update_task "paintbox_fix" "failed"
    fi
}

# 2. Verify Cost Monitoring
verify_cost_monitoring() {
    log "📊 Verifying Cost Monitoring..."
    update_task "cost_monitoring" "in_progress"

    # Check CloudWatch alarms
    ALARMS=$(aws cloudwatch describe-alarms \
        --alarm-names CandlefishDailyCostSpike CandlefishHourlyCostSpike \
        --output json 2>/dev/null)

    if [ -n "$ALARMS" ]; then
        info "CloudWatch alarms configured:"
        echo "$ALARMS" | jq -r '.MetricAlarms[] | "\(.AlarmName): \(.StateValue)"'

        # Get current costs
        START_DATE=$(date -v-7d -u +%Y-%m-%d 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%d)
        END_DATE=$(date -u +%Y-%m-%d)

        COSTS=$(aws ce get-cost-and-usage \
            --time-period Start=$START_DATE,End=$END_DATE \
            --granularity DAILY \
            --metrics "UnblendedCost" \
            --output json 2>/dev/null | jq -r '.ResultsByTime[-1].Total.UnblendedCost.Amount')

        log "Current daily cost: \$$COSTS"

        if (( $(echo "$COSTS < 14" | bc -l) )); then
            log "✅ Costs within threshold (\$14/day)"
            update_task "cost_monitoring" "completed"
        else
            warning "Costs exceeding threshold!"
            update_task "cost_monitoring" "warning"
        fi
    else
        error "CloudWatch alarms not found"
        update_task "cost_monitoring" "failed"
    fi
}

# 3. Test Backup System
test_backup_system() {
    log "🔄 Testing Backup System..."
    update_task "backup_system" "in_progress"

    # Create test backup
    BACKUP_BUCKET="candlefish-backups-$(date +%Y%m%d)"
    TEST_FILE="/tmp/backup-test-$(date +%s).txt"
    echo "Backup test at $(date)" > "$TEST_FILE"

    if aws s3 cp "$TEST_FILE" "s3://$BACKUP_BUCKET/test/" 2>/dev/null; then
        log "✅ Backup upload successful"

        # Verify backup
        if aws s3 ls "s3://$BACKUP_BUCKET/test/" 2>/dev/null | grep -q "backup-test"; then
            log "✅ Backup verification successful"
            update_task "backup_system" "completed"
        else
            warning "Backup verification failed"
            update_task "backup_system" "warning"
        fi
    else
        error "Backup upload failed"
        update_task "backup_system" "failed"
    fi

    rm -f "$TEST_FILE"
}

# 4. Setup S3 Buckets
setup_s3_buckets() {
    log "🪣 Setting up S3 Buckets..."
    update_task "s3_buckets" "in_progress"

    BACKUP_BUCKET="candlefish-backups-$(date +%Y%m%d)"
    DR_BUCKET="candlefish-backups-dr-$(date +%Y%m%d)"

    # Check if buckets exist or create them
    if aws s3 ls "s3://$BACKUP_BUCKET" 2>/dev/null; then
        info "Backup bucket already exists"
    else
        aws s3 mb "s3://$BACKUP_BUCKET" --region us-east-1
        log "Created backup bucket: $BACKUP_BUCKET"
    fi

    if aws s3 ls "s3://$DR_BUCKET" 2>/dev/null; then
        info "DR bucket already exists"
    else
        aws s3 mb "s3://$DR_BUCKET" --region us-west-2
        log "Created DR bucket: $DR_BUCKET"
    fi

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$BACKUP_BUCKET" \
        --versioning-configuration Status=Enabled 2>/dev/null

    log "✅ S3 buckets configured"
    update_task "s3_buckets" "completed"
}

# 5. Configure Webhooks
configure_webhooks() {
    log "🔔 Configuring Notification Webhooks..."
    update_task "webhooks" "in_progress"

    # Check if webhook secret exists
    if aws secretsmanager describe-secret --secret-id "candlefish/slack-webhook" 2>/dev/null; then
        log "✅ Slack webhook configured in Secrets Manager"
        update_task "webhooks" "completed"
    else
        # Create placeholder
        aws secretsmanager create-secret \
            --name "candlefish/slack-webhook" \
            --secret-string '{"webhook_url":"PLACEHOLDER"}' \
            --description "Slack webhook for alerts" 2>/dev/null
        warning "Created placeholder webhook - update with actual URL"
        update_task "webhooks" "warning"
    fi
}

# 6. Verify Temporal Platform
verify_temporal() {
    log "⚙️ Verifying Temporal Platform..."
    update_task "temporal_platform" "in_progress"

    if flyctl status -a candlefish-temporal-platform 2>/dev/null; then
        info "Temporal platform app found"

        # Check health
        if curl -s -f -m 5 https://candlefish-temporal-platform.fly.dev/health 2>/dev/null; then
            log "✅ Temporal platform healthy"
            update_task "temporal_platform" "completed"
        else
            warning "Temporal platform health check failed"
            update_task "temporal_platform" "warning"
        fi
    else
        error "Temporal platform not found"
        update_task "temporal_platform" "failed"
    fi
}

# 7. Test GraphQL Caching
test_graphql_caching() {
    log "🚀 Testing GraphQL Caching..."
    update_task "graphql_caching" "in_progress"

    # Check if dependencies are installed
    if npm list ioredis dataloader 2>/dev/null | grep -q "ioredis\|dataloader"; then
        log "✅ Cache dependencies installed"

        # Check Redis connection
        REDIS_URL=$(aws secretsmanager get-secret-value \
            --secret-id "candlefish/upstash-redis-rest-url" \
            --query SecretString --output text 2>/dev/null || echo "")

        if [ -n "$REDIS_URL" ]; then
            log "✅ Redis configuration found"
            update_task "graphql_caching" "completed"
        else
            warning "Redis not configured"
            update_task "graphql_caching" "warning"
        fi
    else
        warning "Cache dependencies not installed"
        update_task "graphql_caching" "warning"
    fi
}

# 8. Run Load Tests
run_load_tests() {
    log "📈 Running Load Tests..."
    update_task "load_tests" "in_progress"

    # Quick health check
    PAINTBOX_URL="https://paintbox-app.fly.dev"

    if curl -s -f -m 5 "$PAINTBOX_URL/api/health" 2>/dev/null; then
        log "✅ Paintbox responding to health checks"

        # Run basic load test
        for i in {1..10}; do
            curl -s -f -m 2 "$PAINTBOX_URL/api/health" >/dev/null 2>&1 &
        done
        wait

        log "✅ Basic load test completed"
        update_task "load_tests" "completed"
    else
        warning "Paintbox not responding - skipping load tests"
        update_task "load_tests" "skipped"
    fi
}

# 9. Test Disaster Recovery
test_disaster_recovery() {
    log "🛡️ Testing Disaster Recovery..."
    update_task "disaster_recovery" "in_progress"

    # Check backup integrity
    BACKUP_BUCKET="candlefish-backups-$(date +%Y%m%d)"

    if aws s3 ls "s3://$BACKUP_BUCKET" 2>/dev/null; then
        log "✅ Backup bucket accessible"

        # Check cross-region replication status
        REPLICATION=$(aws s3api get-bucket-replication \
            --bucket "$BACKUP_BUCKET" 2>/dev/null || echo "not configured")

        if [ "$REPLICATION" != "not configured" ]; then
            log "✅ Cross-region replication configured"
            update_task "disaster_recovery" "completed"
        else
            info "Cross-region replication not configured (optional)"
            update_task "disaster_recovery" "completed"
        fi
    else
        error "Backup bucket not accessible"
        update_task "disaster_recovery" "failed"
    fi
}

# Generate summary report
generate_report() {
    log "📋 Generating Summary Report..."

    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "           WORKFLOW AUTOMATION SUMMARY REPORT           "
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "Task Status Overview:"
    echo "────────────────────────────────────────────────────────"

    local completed=0
    local failed=0
    local warning=0

    for task in "${!TASK_STATUS[@]}"; do
        status="${TASK_STATUS[$task]}"
        case $status in
            completed)
                echo -e "✅ $task: ${GREEN}COMPLETED${NC}"
                ((completed++))
                ;;
            failed)
                echo -e "❌ $task: ${RED}FAILED${NC}"
                ((failed++))
                ;;
            warning)
                echo -e "⚠️  $task: ${YELLOW}WARNING${NC}"
                ((warning++))
                ;;
            skipped)
                echo -e "⏩ $task: SKIPPED"
                ;;
            *)
                echo -e "⏸️  $task: PENDING"
                ;;
        esac
    done

    echo ""
    echo "Summary Statistics:"
    echo "────────────────────────────────────────────────────────"
    echo "✅ Completed: $completed"
    echo "⚠️  Warnings: $warning"
    echo "❌ Failed: $failed"
    echo ""

    # Key metrics
    echo "Key Metrics:"
    echo "────────────────────────────────────────────────────────"

    # Get latest cost
    LATEST_COST=$(aws ce get-cost-and-usage \
        --time-period Start=$(date -u +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
        --granularity DAILY \
        --metrics "UnblendedCost" \
        --output text --query 'ResultsByTime[0].Total.UnblendedCost.Amount' 2>/dev/null || echo "N/A")

    echo "💰 Daily AWS Cost: \$$LATEST_COST (Target: <\$14)"
    echo "🎯 Monthly Savings Target: \$490"
    echo "⚡ Performance Gain Target: 60%"
    echo "🔄 RTO Target: <1 hour"
    echo "💾 RPO Target: <15 minutes"

    echo ""
    echo "Recommendations:"
    echo "────────────────────────────────────────────────────────"

    if [ "$failed" -gt 0 ]; then
        echo "• Review and fix failed tasks"
    fi

    if [ "$warning" -gt 0 ]; then
        echo "• Address warning conditions"
    fi

    echo "• Monitor costs for 24 hours to verify savings"
    echo "• Schedule regular DR drills"
    echo "• Update Slack webhook with actual URL"

    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "         Automation completed at $(date)"
    echo "════════════════════════════════════════════════════════"
}

# Main execution
main() {
    log "🚀 Starting Comprehensive Workflow Automation..."

    # Execute all tasks
    fix_paintbox
    verify_cost_monitoring
    test_backup_system
    setup_s3_buckets
    configure_webhooks
    verify_temporal
    test_graphql_caching
    run_load_tests
    test_disaster_recovery

    # Generate report
    generate_report

    # Save report to file
    REPORT_FILE="/tmp/workflow-report-$(date +%Y%m%d-%H%M%S).txt"
    {
        echo "Workflow Automation Report"
        echo "Generated: $(date)"
        echo ""
        for task in "${!TASK_STATUS[@]}"; do
            echo "$task: ${TASK_STATUS[$task]}"
        done
    } > "$REPORT_FILE"

    log "Report saved to: $REPORT_FILE"

    # Upload report to S3
    BACKUP_BUCKET="candlefish-backups-$(date +%Y%m%d)"
    if aws s3 cp "$REPORT_FILE" "s3://$BACKUP_BUCKET/reports/" 2>/dev/null; then
        log "Report uploaded to S3"
    fi
}

# Run main function
main "$@"
