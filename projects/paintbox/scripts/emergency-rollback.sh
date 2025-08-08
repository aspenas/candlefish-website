#!/bin/bash

# Emergency Rollback Script for Paintbox Blue-Green Deployment
# Provides immediate rollback capabilities with comprehensive logging and validation

set -euo pipefail

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="${PROJECT_ROOT}/logs/emergency-rollback-$(date +%Y%m%d-%H%M%S).log"

# Environment variables
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="paintbox-${ENVIRONMENT}"
SERVICE_BLUE="paintbox-blue-${ENVIRONMENT}"
SERVICE_GREEN="paintbox-green-${ENVIRONMENT}"
TARGET_GROUP_BLUE="paintbox-blue-${ENVIRONMENT}"
TARGET_GROUP_GREEN="paintbox-green-${ENVIRONMENT}"
ALB_NAME="paintbox-alb-${ENVIRONMENT}"

# Rollback options
ROLLBACK_TYPE="${ROLLBACK_TYPE:-auto}"  # auto, manual, immediate
FORCE_ROLLBACK="${FORCE_ROLLBACK:-false}"
SKIP_HEALTH_CHECKS="${SKIP_HEALTH_CHECKS:-false}"
NOTIFICATION_ENABLED="${NOTIFICATION_ENABLED:-true}"

# State tracking
CURRENT_ACTIVE=""
ROLLBACK_TARGET=""
ROLLBACK_REASON=""
START_TIME=""

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${GREEN}$*${NC}"
}

log_warn() {
    log "WARN" "${YELLOW}$*${NC}"
}

log_error() {
    log "ERROR" "${RED}$*${NC}"
}

log_debug() {
    log "DEBUG" "${BLUE}$*${NC}"
}

log_step() {
    log "STEP" "${CYAN}$*${NC}"
}

log_critical() {
    log "CRITICAL" "${RED}🚨 $*${NC}"
}

# Error handling
emergency_exit() {
    local exit_code=$?
    log_critical "Emergency rollback script failed with exit code $exit_code"
    log_critical "System may be in an inconsistent state - manual intervention required"

    send_emergency_notification "CRITICAL" "Emergency rollback failed - manual intervention required"

    # Create emergency status file
    cat > "${PROJECT_ROOT}/EMERGENCY_STATUS.md" << EOF
# EMERGENCY STATUS - MANUAL INTERVENTION REQUIRED

**Date:** $(date)
**Environment:** $ENVIRONMENT
**Script:** Emergency Rollback
**Status:** FAILED
**Exit Code:** $exit_code

## Current State
- Rollback attempt failed during execution
- System may be in inconsistent state
- Manual verification and intervention required

## Immediate Actions Required
1. Check ALB traffic routing
2. Verify ECS service health
3. Check application logs
4. Validate database connectivity
5. Contact DevOps team immediately

## Log File
$LOG_FILE

EOF

    exit $exit_code
}

trap emergency_exit ERR

# Utility functions
get_current_active_environment() {
    log_debug "Determining current active environment..."

    local alb_arn
    alb_arn=$(aws elbv2 describe-load-balancers \
        --names "$ALB_NAME" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)

    local listener_arn
    listener_arn=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$alb_arn" \
        --query 'Listeners[?Port==`443`].ListenerArn' \
        --output text)

    if [[ -z "$listener_arn" ]]; then
        # Fallback to HTTP listener
        listener_arn=$(aws elbv2 describe-listeners \
            --load-balancer-arn "$alb_arn" \
            --query 'Listeners[?Port==`80`].ListenerArn' \
            --output text)
    fi

    local current_target_group_arn
    current_target_group_arn=$(aws elbv2 describe-listeners \
        --listener-arns "$listener_arn" \
        --query 'Listeners[0].DefaultActions[0].TargetGroupArn' \
        --output text)

    # Determine which environment based on target group
    local blue_tg_arn green_tg_arn
    blue_tg_arn=$(aws elbv2 describe-target-groups \
        --names "$TARGET_GROUP_BLUE" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || echo "")
    green_tg_arn=$(aws elbv2 describe-target-groups \
        --names "$TARGET_GROUP_GREEN" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || echo "")

    if [[ "$current_target_group_arn" == "$blue_tg_arn" ]]; then
        echo "blue"
    elif [[ "$current_target_group_arn" == "$green_tg_arn" ]]; then
        echo "green"
    else
        log_error "Unable to determine current active environment"
        echo "unknown"
    fi
}

get_rollback_target() {
    local current_active="$1"

    if [[ "$current_active" == "blue" ]]; then
        echo "green"
    elif [[ "$current_active" == "green" ]]; then
        echo "blue"
    else
        log_error "Cannot determine rollback target for: $current_active"
        echo "unknown"
    fi
}

get_service_name() {
    local environment="$1"

    if [[ "$environment" == "blue" ]]; then
        echo "$SERVICE_BLUE"
    else
        echo "$SERVICE_GREEN"
    fi
}

get_target_group_name() {
    local environment="$1"

    if [[ "$environment" == "blue" ]]; then
        echo "$TARGET_GROUP_BLUE"
    else
        echo "$TARGET_GROUP_GREEN"
    fi
}

# Health check functions
quick_health_check() {
    local service="$1"

    log_debug "Performing quick health check for: $service"

    local running_tasks desired_tasks
    running_tasks=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$service" \
        --query 'services[0].runningCount' \
        --output text)

    desired_tasks=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$service" \
        --query 'services[0].desiredCount' \
        --output text)

    if [[ "$running_tasks" -gt 0 ]] && [[ "$running_tasks" -eq "$desired_tasks" ]]; then
        log_debug "Service $service has $running_tasks running tasks (desired: $desired_tasks)"
        return 0
    else
        log_warn "Service $service health check failed - running: $running_tasks, desired: $desired_tasks"
        return 1
    fi
}

comprehensive_health_check() {
    local environment="$1"
    local max_attempts=5
    local wait_time=10

    log_step "Performing comprehensive health check for $environment environment"

    local service_name target_group_name
    service_name=$(get_service_name "$environment")
    target_group_name=$(get_target_group_name "$environment")

    for ((i=1; i<=max_attempts; i++)); do
        log_debug "Health check attempt $i/$max_attempts"

        # Check ECS service
        if quick_health_check "$service_name"; then
            # Check target group health
            local target_group_arn
            target_group_arn=$(aws elbv2 describe-target-groups \
                --names "$target_group_name" \
                --query 'TargetGroups[0].TargetGroupArn' \
                --output text)

            local healthy_targets
            healthy_targets=$(aws elbv2 describe-target-health \
                --target-group-arn "$target_group_arn" \
                --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' \
                --output text 2>/dev/null || echo "0")

            if [[ "$healthy_targets" -gt 0 ]]; then
                log_info "✅ Health check passed for $environment - $healthy_targets healthy targets"
                return 0
            fi
        fi

        if [[ $i -lt $max_attempts ]]; then
            log_debug "Health check failed, waiting $wait_time seconds..."
            sleep $wait_time
        fi
    done

    log_error "❌ Health check failed for $environment after $max_attempts attempts"
    return 1
}

# Rollback execution functions
scale_up_rollback_target() {
    local target_env="$1"

    log_step "Scaling up rollback target: $target_env"

    local service_name
    service_name=$(get_service_name "$target_env")

    # Get current desired count
    local current_count
    current_count=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name" \
        --query 'services[0].desiredCount' \
        --output text)

    if [[ "$current_count" -eq 0 ]]; then
        log_info "Scaling up $target_env from 0 to 1 task"

        aws ecs update-service \
            --cluster "$CLUSTER_NAME" \
            --service "$service_name" \
            --desired-count 1 > /dev/null

        # Wait for service to stabilize
        log_info "Waiting for service to stabilize..."
        aws ecs wait services-stable \
            --cluster "$CLUSTER_NAME" \
            --services "$service_name"

        log_info "✅ Successfully scaled up $target_env environment"
    else
        log_info "✅ $target_env already running with $current_count tasks"
    fi

    # Perform health check unless skipped
    if [[ "$SKIP_HEALTH_CHECKS" != "true" ]]; then
        if ! comprehensive_health_check "$target_env"; then
            log_error "Health check failed for rollback target"
            return 1
        fi
    fi
}

switch_traffic_to_rollback_target() {
    local target_env="$1"

    log_step "Switching traffic to rollback target: $target_env"

    local target_group_name target_group_arn
    target_group_name=$(get_target_group_name "$target_env")
    target_group_arn=$(aws elbv2 describe-target-groups \
        --names "$target_group_name" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)

    # Get ALB listener
    local alb_arn listener_arn
    alb_arn=$(aws elbv2 describe-load-balancers \
        --names "$ALB_NAME" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)

    listener_arn=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$alb_arn" \
        --query 'Listeners[?Port==`443`].ListenerArn' \
        --output text)

    if [[ -z "$listener_arn" ]] || [[ "$listener_arn" == "None" ]]; then
        # Fallback to HTTP listener
        listener_arn=$(aws elbv2 describe-listeners \
            --load-balancer-arn "$alb_arn" \
            --query 'Listeners[?Port==`80`].ListenerArn' \
            --output text)
    fi

    # Switch traffic
    aws elbv2 modify-listener \
        --listener-arn "$listener_arn" \
        --default-actions Type=forward,TargetGroupArn="$target_group_arn" > /dev/null

    log_info "✅ Traffic switched to $target_env environment"

    # Wait for traffic to stabilize
    sleep 30

    # Verify traffic switch
    local new_active
    new_active=$(get_current_active_environment)

    if [[ "$new_active" == "$target_env" ]]; then
        log_info "✅ Traffic switch verified - $target_env is now active"
    else
        log_error "❌ Traffic switch verification failed - current active: $new_active"
        return 1
    fi
}

scale_down_failed_environment() {
    local failed_env="$1"

    log_step "Scaling down failed environment: $failed_env"

    local service_name
    service_name=$(get_service_name "$failed_env")

    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --desired-count 0 > /dev/null

    log_info "✅ Scaled down $failed_env environment"
}

# Notification functions
send_emergency_notification() {
    local level="$1"
    local message="$2"

    if [[ "$NOTIFICATION_ENABLED" != "true" ]]; then
        return 0
    fi

    log_info "Sending $level notification: $message"

    # Create notification payload
    local notification_payload
    notification_payload=$(cat << EOF
{
    "level": "$level",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "message": "$message",
    "rollback_reason": "$ROLLBACK_REASON",
    "current_active": "$CURRENT_ACTIVE",
    "rollback_target": "$ROLLBACK_TARGET",
    "log_file": "$LOG_FILE"
}
EOF
)

    # Here you would integrate with your notification system
    # Examples:

    # Slack notification
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "$notification_payload" \
    #     "$SLACK_WEBHOOK_URL" || true

    # Email notification via SNS
    # aws sns publish \
    #     --topic-arn "$SNS_TOPIC_ARN" \
    #     --message "$message" \
    #     --subject "Paintbox Emergency Rollback - $level" || true

    # PagerDuty integration
    # curl -X POST \
    #     -H "Content-Type: application/json" \
    #     -H "Authorization: Token token=$PAGERDUTY_API_KEY" \
    #     -d "$notification_payload" \
    #     "https://api.pagerduty.com/incidents" || true

    log_debug "Notification sent: $level"
}

# Pre-rollback validation
validate_rollback_prerequisites() {
    log_step "Validating rollback prerequisites"

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Validate AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured properly"
        exit 1
    fi

    # Check if ECS cluster exists
    if ! aws ecs describe-clusters --clusters "$CLUSTER_NAME" &> /dev/null; then
        log_error "ECS cluster $CLUSTER_NAME does not exist"
        exit 1
    fi

    # Check if ALB exists
    if ! aws elbv2 describe-load-balancers --names "$ALB_NAME" &> /dev/null; then
        log_error "Application Load Balancer $ALB_NAME does not exist"
        exit 1
    fi

    # Verify both services exist
    for service in "$SERVICE_BLUE" "$SERVICE_GREEN"; do
        if ! aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$service" &> /dev/null; then
            log_error "ECS service $service does not exist"
            exit 1
        fi
    done

    # Verify both target groups exist
    for tg in "$TARGET_GROUP_BLUE" "$TARGET_GROUP_GREEN"; do
        if ! aws elbv2 describe-target-groups --names "$tg" &> /dev/null; then
            log_error "Target group $tg does not exist"
            exit 1
        fi
    done

    log_info "✅ Prerequisites validation completed"
}

capture_pre_rollback_state() {
    log_step "Capturing pre-rollback state"

    local state_file="${PROJECT_ROOT}/logs/pre-rollback-state-$(date +%Y%m%d-%H%M%S).json"

    # Capture current state
    local state_json
    state_json=$(cat << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "current_active": "$CURRENT_ACTIVE",
    "rollback_target": "$ROLLBACK_TARGET",
    "rollback_reason": "$ROLLBACK_REASON",
    "services": {
        "blue": {
            "desired_count": $(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_BLUE" --query 'services[0].desiredCount' --output text),
            "running_count": $(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_BLUE" --query 'services[0].runningCount' --output text),
            "task_definition": "$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_BLUE" --query 'services[0].taskDefinition' --output text)"
        },
        "green": {
            "desired_count": $(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_GREEN" --query 'services[0].desiredCount' --output text),
            "running_count": $(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_GREEN" --query 'services[0].runningCount' --output text),
            "task_definition": "$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_GREEN" --query 'services[0].taskDefinition' --output text)"
        }
    },
    "load_balancer": {
        "current_target_group": "$(aws elbv2 describe-listeners --load-balancer-arn $(aws elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text) --query 'Listeners[0].DefaultActions[0].TargetGroupArn' --output text)"
    }
}
EOF
)

    echo "$state_json" > "$state_file"
    log_info "Pre-rollback state captured: $state_file"
}

# Main rollback execution
execute_emergency_rollback() {
    local reason="$1"

    log_critical "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
    log_critical "Reason: $reason"
    log_critical "Environment: $ENVIRONMENT"
    log_critical "Start Time: $(date)"

    START_TIME=$(date +%s)
    ROLLBACK_REASON="$reason"

    # Send immediate notification
    send_emergency_notification "CRITICAL" "Emergency rollback initiated: $reason"

    # Capture pre-rollback state
    capture_pre_rollback_state

    # Determine current state
    CURRENT_ACTIVE=$(get_current_active_environment)
    ROLLBACK_TARGET=$(get_rollback_target "$CURRENT_ACTIVE")

    log_critical "Current active environment: $CURRENT_ACTIVE"
    log_critical "Rolling back to: $ROLLBACK_TARGET"

    if [[ "$ROLLBACK_TARGET" == "unknown" ]]; then
        log_critical "Cannot determine rollback target - manual intervention required"
        exit 1
    fi

    # Execute rollback steps
    log_step "Executing emergency rollback steps"

    # Step 1: Scale up rollback target
    if scale_up_rollback_target "$ROLLBACK_TARGET"; then
        log_info "✅ Step 1 completed: Rollback target scaled up"
    else
        log_critical "❌ Step 1 failed: Could not scale up rollback target"
        send_emergency_notification "CRITICAL" "Rollback step 1 failed - rollback target scale up"
        exit 1
    fi

    # Step 2: Switch traffic
    if switch_traffic_to_rollback_target "$ROLLBACK_TARGET"; then
        log_info "✅ Step 2 completed: Traffic switched to rollback target"
    else
        log_critical "❌ Step 2 failed: Could not switch traffic"
        send_emergency_notification "CRITICAL" "Rollback step 2 failed - traffic switch"
        exit 1
    fi

    # Step 3: Scale down failed environment
    if scale_down_failed_environment "$CURRENT_ACTIVE"; then
        log_info "✅ Step 3 completed: Failed environment scaled down"
    else
        log_warn "⚠️  Step 3 warning: Could not scale down failed environment"
        # This is not critical for rollback success
    fi

    # Final verification
    local final_active
    final_active=$(get_current_active_environment)

    if [[ "$final_active" == "$ROLLBACK_TARGET" ]]; then
        local end_time duration
        end_time=$(date +%s)
        duration=$((end_time - START_TIME))

        log_info "🎉 EMERGENCY ROLLBACK COMPLETED SUCCESSFULLY 🎉"
        log_info "Active environment: $final_active"
        log_info "Rollback duration: ${duration} seconds"

        send_emergency_notification "SUCCESS" "Emergency rollback completed successfully in ${duration} seconds"

        # Create success status file
        cat > "${PROJECT_ROOT}/ROLLBACK_SUCCESS.md" << EOF
# EMERGENCY ROLLBACK SUCCESS

**Date:** $(date)
**Environment:** $ENVIRONMENT
**Duration:** ${duration} seconds
**Previous Active:** $CURRENT_ACTIVE
**Current Active:** $final_active
**Reason:** $ROLLBACK_REASON

## Rollback Steps Completed
- ✅ Scaled up rollback target ($ROLLBACK_TARGET)
- ✅ Switched traffic to rollback target
- ✅ Scaled down failed environment ($CURRENT_ACTIVE)
- ✅ Verified traffic routing

## Next Steps
1. Investigate root cause of original failure
2. Fix issues in failed environment
3. Plan next deployment carefully
4. Monitor system stability

## Log File
$LOG_FILE
EOF

    else
        log_critical "❌ ROLLBACK VERIFICATION FAILED"
        log_critical "Expected active: $ROLLBACK_TARGET, Actual: $final_active"
        send_emergency_notification "CRITICAL" "Rollback verification failed"
        exit 1
    fi
}

# Status reporting
show_current_deployment_status() {
    log_info "Current Deployment Status"
    log_info "========================"

    local current_active
    current_active=$(get_current_active_environment)
    log_info "Active Environment: $current_active"

    # Show service status
    for env in "blue" "green"; do
        local service_name
        service_name=$(get_service_name "$env")

        local desired_count running_count
        desired_count=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$service_name" --query 'services[0].desiredCount' --output text)
        running_count=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$service_name" --query 'services[0].runningCount' --output text)

        local status_indicator
        if [[ "$env" == "$current_active" ]]; then
            status_indicator="🟢 ACTIVE"
        elif [[ "$desired_count" -gt 0 ]]; then
            status_indicator="🔵 STANDBY"
        else
            status_indicator="⚫ INACTIVE"
        fi

        log_info "$env Environment: $status_indicator (desired: $desired_count, running: $running_count)"
    done

    # Show target group health
    for env in "blue" "green"; do
        local tg_name tg_arn healthy_targets
        tg_name=$(get_target_group_name "$env")
        tg_arn=$(aws elbv2 describe-target-groups --names "$tg_name" --query 'TargetGroups[0].TargetGroupArn' --output text)
        healthy_targets=$(aws elbv2 describe-target-health --target-group-arn "$tg_arn" --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' --output text 2>/dev/null || echo "0")

        log_info "$env Target Group: $healthy_targets healthy targets"
    done
}

# Help function
show_help() {
    cat << EOF
Emergency Rollback Script for Paintbox Blue-Green Deployment

USAGE:
    $0 [OPTIONS] [REASON]

ARGUMENTS:
    REASON                  Reason for emergency rollback (optional)

OPTIONS:
    -e, --environment ENV   Environment (default: staging)
    -r, --region REGION     AWS region (default: us-east-1)
    -t, --type TYPE         Rollback type (auto|manual|immediate) (default: auto)
    -f, --force            Force rollback without confirmation
    --skip-health-checks   Skip health checks (dangerous)
    --no-notifications     Disable notifications
    --status               Show current deployment status
    -h, --help             Show this help message

EXAMPLES:
    $0 "High error rate detected"
    $0 --force --type immediate "Database connection failure"
    $0 --environment production "Application not responding"
    $0 --status

ENVIRONMENT VARIABLES:
    ENVIRONMENT            Deployment environment
    AWS_REGION            AWS region
    ROLLBACK_TYPE         Rollback type
    FORCE_ROLLBACK        Force rollback (true|false)
    SKIP_HEALTH_CHECKS    Skip health checks (true|false)
    NOTIFICATION_ENABLED  Enable notifications (true|false)

EOF
}

# Main function
main() {
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    log_info "Emergency Rollback Script Starting"
    log_info "Environment: $ENVIRONMENT"
    log_info "AWS Region: $AWS_REGION"
    log_info "Rollback Type: $ROLLBACK_TYPE"

    # Update service names based on environment
    CLUSTER_NAME="paintbox-${ENVIRONMENT}"
    SERVICE_BLUE="paintbox-blue-${ENVIRONMENT}"
    SERVICE_GREEN="paintbox-green-${ENVIRONMENT}"
    TARGET_GROUP_BLUE="paintbox-blue-${ENVIRONMENT}"
    TARGET_GROUP_GREEN="paintbox-green-${ENVIRONMENT}"
    ALB_NAME="paintbox-alb-${ENVIRONMENT}"

    validate_rollback_prerequisites

    local rollback_reason="$1"

    if [[ "$ROLLBACK_TYPE" == "immediate" ]] || [[ "$FORCE_ROLLBACK" == "true" ]]; then
        log_warn "Immediate rollback requested - skipping confirmation"
        execute_emergency_rollback "$rollback_reason"
    else
        log_warn "🚨 EMERGENCY ROLLBACK REQUESTED 🚨"
        log_warn "Reason: $rollback_reason"
        log_warn "Environment: $ENVIRONMENT"

        if [[ "$ROLLBACK_TYPE" == "manual" ]]; then
            echo -n "Are you sure you want to proceed with emergency rollback? (yes/no): "
            read -r confirmation

            if [[ "$confirmation" != "yes" ]]; then
                log_info "Rollback cancelled by user"
                exit 0
            fi
        fi

        execute_emergency_rollback "$rollback_reason"
    fi
}

# Parse command line arguments
SHOW_STATUS=false
ROLLBACK_REASON=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -t|--type)
            ROLLBACK_TYPE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_ROLLBACK="true"
            shift
            ;;
        --skip-health-checks)
            SKIP_HEALTH_CHECKS="true"
            shift
            ;;
        --no-notifications)
            NOTIFICATION_ENABLED="false"
            shift
            ;;
        --status)
            SHOW_STATUS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            if [[ -z "$ROLLBACK_REASON" ]]; then
                ROLLBACK_REASON="$1"
            else
                log_error "Multiple reasons provided"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Execute based on options
if [[ "$SHOW_STATUS" == "true" ]]; then
    validate_rollback_prerequisites
    show_current_deployment_status
    exit 0
fi

if [[ -z "$ROLLBACK_REASON" ]]; then
    ROLLBACK_REASON="Manual emergency rollback requested"
fi

# Execute main function
main "$ROLLBACK_REASON"
