#!/bin/bash

# Blue-Green Deployment Script for Paintbox Staging Environment
# Implements zero-downtime deployment with automated rollback

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
readonly LOG_FILE="${PROJECT_ROOT}/logs/blue-green-deploy-$(date +%Y%m%d-%H%M%S).log"

# Environment variables
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="paintbox-${ENVIRONMENT}"
SERVICE_BLUE="paintbox-blue-${ENVIRONMENT}"
SERVICE_GREEN="paintbox-green-${ENVIRONMENT}"
TARGET_GROUP_BLUE="paintbox-blue-${ENVIRONMENT}"
TARGET_GROUP_GREEN="paintbox-green-${ENVIRONMENT}"
ALB_NAME="paintbox-alb-${ENVIRONMENT}"
ROLLBACK_WINDOW_MINUTES="${ROLLBACK_WINDOW_MINUTES:-10}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-20}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"

# State tracking
CURRENT_ACTIVE=""
DEPLOYMENT_TARGET=""
ROLLBACK_TRIGGERED=false

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

# Error handling and cleanup
cleanup() {
    local exit_code=$?

    if [[ $exit_code -ne 0 ]] && [[ "$ROLLBACK_TRIGGERED" == "false" ]]; then
        log_error "Deployment failed with exit code $exit_code"
        trigger_rollback
    fi

    if [[ $exit_code -eq 0 ]]; then
        log_info "Blue-green deployment completed successfully!"
    fi

    log_info "Full deployment log: $LOG_FILE"
    exit $exit_code
}

trap cleanup EXIT

# Utility functions
get_current_active_environment() {
    log_debug "Determining current active environment..."

    local blue_desired_count green_desired_count

    blue_desired_count=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_BLUE" \
        --query 'services[0].desiredCount' \
        --output text 2>/dev/null || echo "0")

    green_desired_count=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_GREEN" \
        --query 'services[0].desiredCount' \
        --output text 2>/dev/null || echo "0")

    if [[ "$blue_desired_count" -gt 0 ]]; then
        echo "blue"
    elif [[ "$green_desired_count" -gt 0 ]]; then
        echo "green"
    else
        echo "blue"  # Default to blue if nothing is running
    fi
}

get_target_environment() {
    local current_active="$1"

    if [[ "$current_active" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
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
check_service_health() {
    local service="$1"
    local max_retries="$2"
    local check_interval="$3"

    log_info "Checking health of service: $service"

    for ((i=1; i<=max_retries; i++)); do
        log_debug "Health check attempt $i/$max_retries for $service"

        # Check ECS service health
        local running_tasks
        running_tasks=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$service" \
            --query 'services[0].runningCount' \
            --output text)

        local desired_tasks
        desired_tasks=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$service" \
            --query 'services[0].desiredCount' \
            --output text)

        if [[ "$running_tasks" -eq "$desired_tasks" ]] && [[ "$running_tasks" -gt 0 ]]; then
            # Check target group health
            local target_group
            if [[ "$service" == "$SERVICE_BLUE" ]]; then
                target_group="$TARGET_GROUP_BLUE"
            else
                target_group="$TARGET_GROUP_GREEN"
            fi

            local healthy_targets
            healthy_targets=$(aws elbv2 describe-target-health \
                --target-group-arn "$(get_target_group_arn "$target_group")" \
                --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' \
                --output text 2>/dev/null || echo "0")

            if [[ "$healthy_targets" -gt 0 ]]; then
                log_info "Service $service is healthy (running: $running_tasks, healthy targets: $healthy_targets)"
                return 0
            fi
        fi

        if [[ $i -lt "$max_retries" ]]; then
            log_debug "Service not ready, waiting $check_interval seconds..."
            sleep "$check_interval"
        fi
    done

    log_error "Service $service failed health checks after $max_retries attempts"
    return 1
}

get_target_group_arn() {
    local target_group_name="$1"

    aws elbv2 describe-target-groups \
        --names "$target_group_name" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text
}

get_load_balancer_arn() {
    aws elbv2 describe-load-balancers \
        --names "$ALB_NAME" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text
}

# Deployment functions
update_task_definition() {
    local environment="$1"
    local image_tag="$2"

    log_step "Updating task definition for $environment environment with image tag: $image_tag"

    local task_definition_family
    if [[ "$environment" == "blue" ]]; then
        task_definition_family="paintbox-blue-${ENVIRONMENT}"
    else
        task_definition_family="paintbox-green-${ENVIRONMENT}"
    fi

    # Get current task definition
    local current_task_def
    current_task_def=$(aws ecs describe-task-definition \
        --task-definition "$task_definition_family" \
        --query 'taskDefinition')

    # Update container image
    local updated_task_def
    updated_task_def=$(echo "$current_task_def" | jq --arg image "ghcr.io/candlefish-ai/paintbox-frontend:$image_tag" \
        '.containerDefinitions[0].image = $image |
         del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')

    # Register new task definition
    local new_task_def_arn
    new_task_def_arn=$(echo "$updated_task_def" | aws ecs register-task-definition \
        --cli-input-json file:///dev/stdin \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)

    log_info "New task definition registered: $new_task_def_arn"
    echo "$new_task_def_arn"
}

deploy_to_target_environment() {
    local target_env="$1"
    local image_tag="$2"
    local desired_count="$3"

    log_step "Deploying to $target_env environment"

    # Update task definition
    local new_task_def_arn
    new_task_def_arn=$(update_task_definition "$target_env" "$image_tag")

    # Update service
    local service_name
    service_name=$(get_service_name "$target_env")

    log_info "Updating service $service_name with desired count: $desired_count"

    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --task-definition "$new_task_def_arn" \
        --desired-count "$desired_count" > /dev/null

    # Wait for deployment to stabilize
    log_info "Waiting for service deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name"

    # Perform health checks
    if ! check_service_health "$service_name" "$HEALTH_CHECK_RETRIES" "$HEALTH_CHECK_INTERVAL"; then
        log_error "Health checks failed for $target_env environment"
        return 1
    fi

    log_info "Successfully deployed to $target_env environment"
}

switch_traffic() {
    local target_env="$1"

    log_step "Switching traffic to $target_env environment"

    local target_group_name
    target_group_name=$(get_target_group_name "$target_env")

    local target_group_arn
    target_group_arn=$(get_target_group_arn "$target_group_name")

    local load_balancer_arn
    load_balancer_arn=$(get_load_balancer_arn)

    # Get HTTPS listener
    local listener_arn
    listener_arn=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$load_balancer_arn" \
        --query 'Listeners[?Port==`443`].ListenerArn' \
        --output text)

    if [[ -z "$listener_arn" ]]; then
        # Fallback to HTTP listener
        listener_arn=$(aws elbv2 describe-listeners \
            --load-balancer-arn "$load_balancer_arn" \
            --query 'Listeners[?Port==`80`].ListenerArn' \
            --output text)
    fi

    # Update listener to point to new target group
    aws elbv2 modify-listener \
        --listener-arn "$listener_arn" \
        --default-actions Type=forward,TargetGroupArn="$target_group_arn" > /dev/null

    log_info "Traffic switched to $target_env environment"

    # Wait for traffic switch to take effect
    sleep 30

    # Verify traffic is flowing to new environment
    local healthy_targets
    healthy_targets=$(aws elbv2 describe-target-health \
        --target-group-arn "$target_group_arn" \
        --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' \
        --output text)

    if [[ "$healthy_targets" -eq 0 ]]; then
        log_error "No healthy targets in $target_env after traffic switch"
        return 1
    fi

    log_info "Traffic switch verified - $healthy_targets healthy targets in $target_env"
}

scale_down_old_environment() {
    local old_env="$1"

    log_step "Scaling down $old_env environment"

    local service_name
    service_name=$(get_service_name "$old_env")

    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$service_name" \
        --desired-count 0 > /dev/null

    log_info "Scaled down $old_env environment"
}

# Rollback functions
trigger_rollback() {
    if [[ "$ROLLBACK_TRIGGERED" == "true" ]]; then
        log_warn "Rollback already triggered, skipping..."
        return
    fi

    ROLLBACK_TRIGGERED=true
    log_error "Triggering rollback to $CURRENT_ACTIVE environment"

    # Switch traffic back to original environment
    if [[ -n "$CURRENT_ACTIVE" ]] && [[ -n "$DEPLOYMENT_TARGET" ]]; then
        log_step "Rolling back traffic to $CURRENT_ACTIVE environment"

        # Ensure original environment is running
        local current_service
        current_service=$(get_service_name "$CURRENT_ACTIVE")

        local current_desired_count
        current_desired_count=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$current_service" \
            --query 'services[0].desiredCount' \
            --output text)

        if [[ "$current_desired_count" -eq 0 ]]; then
            log_info "Scaling up $CURRENT_ACTIVE environment for rollback"
            aws ecs update-service \
                --cluster "$CLUSTER_NAME" \
                --service "$current_service" \
                --desired-count 1 > /dev/null

            # Wait for service to be stable
            aws ecs wait services-stable \
                --cluster "$CLUSTER_NAME" \
                --services "$current_service"
        fi

        # Switch traffic back
        switch_traffic "$CURRENT_ACTIVE" || log_error "Failed to switch traffic during rollback"

        # Scale down failed deployment
        scale_down_old_environment "$DEPLOYMENT_TARGET" || log_error "Failed to scale down failed deployment"
    fi

    log_error "Rollback completed"
}

setup_automatic_rollback() {
    log_info "Setting up automatic rollback in $ROLLBACK_WINDOW_MINUTES minutes"

    # Create background process for automatic rollback
    (
        sleep $((ROLLBACK_WINDOW_MINUTES * 60))
        if [[ -f "${LOG_FILE}.success" ]]; then
            log_info "Deployment marked as successful, canceling automatic rollback"
            exit 0
        fi

        log_warn "Automatic rollback window expired, triggering rollback"
        trigger_rollback
    ) &

    local rollback_pid=$!
    echo "$rollback_pid" > "${LOG_FILE}.rollback_pid"

    log_info "Automatic rollback process started (PID: $rollback_pid)"
}

cancel_automatic_rollback() {
    if [[ -f "${LOG_FILE}.rollback_pid" ]]; then
        local rollback_pid
        rollback_pid=$(cat "${LOG_FILE}.rollback_pid")

        if kill -0 "$rollback_pid" 2>/dev/null; then
            kill "$rollback_pid" 2>/dev/null || true
            log_info "Automatic rollback canceled"
        fi

        rm -f "${LOG_FILE}.rollback_pid"
    fi

    # Mark deployment as successful
    touch "${LOG_FILE}.success"
}

# Pre-deployment checks
validate_prerequisites() {
    log_step "Validating prerequisites"

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
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

    # Check if services exist
    for service in "$SERVICE_BLUE" "$SERVICE_GREEN"; do
        if ! aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$service" &> /dev/null; then
            log_error "ECS service $service does not exist"
            exit 1
        fi
    done

    log_info "Prerequisites validation completed"
}

# Main deployment function
perform_blue_green_deployment() {
    local image_tag="$1"

    log_step "Starting blue-green deployment with image tag: $image_tag"

    # Determine current active environment
    CURRENT_ACTIVE=$(get_current_active_environment)
    DEPLOYMENT_TARGET=$(get_target_environment "$CURRENT_ACTIVE")

    log_info "Current active environment: $CURRENT_ACTIVE"
    log_info "Deployment target environment: $DEPLOYMENT_TARGET"

    # Set up automatic rollback
    setup_automatic_rollback

    # Deploy to target environment
    if deploy_to_target_environment "$DEPLOYMENT_TARGET" "$image_tag" 1; then
        log_info "Deployment to $DEPLOYMENT_TARGET successful, proceeding with traffic switch"

        # Switch traffic to new environment
        if switch_traffic "$DEPLOYMENT_TARGET"; then
            log_info "Traffic switch successful, performing final health checks"

            # Final health check with shorter interval
            if check_service_health "$(get_service_name "$DEPLOYMENT_TARGET")" 5 10; then
                log_info "Final health checks passed, scaling down old environment"

                # Scale down old environment
                scale_down_old_environment "$CURRENT_ACTIVE"

                # Cancel automatic rollback
                cancel_automatic_rollback

                log_info "Blue-green deployment completed successfully!"
                log_info "Active environment is now: $DEPLOYMENT_TARGET"

                return 0
            else
                log_error "Final health checks failed"
                return 1
            fi
        else
            log_error "Traffic switch failed"
            return 1
        fi
    else
        log_error "Deployment to $DEPLOYMENT_TARGET failed"
        return 1
    fi
}

# Security validation
validate_deployment_security() {
    log_step "Validating deployment security"

    # Check that secrets are not exposed
    local active_service
    active_service=$(get_service_name "$DEPLOYMENT_TARGET")

    # Get task definition ARN
    local task_def_arn
    task_def_arn=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$active_service" \
        --query 'services[0].taskDefinition' \
        --output text)

    # Check task definition for hardcoded secrets
    local task_def_json
    task_def_json=$(aws ecs describe-task-definition \
        --task-definition "$task_def_arn" \
        --query 'taskDefinition')

    local environment_vars
    environment_vars=$(echo "$task_def_json" | jq '.containerDefinitions[0].environment[]?.value' 2>/dev/null || echo "")

    if echo "$environment_vars" | grep -qE "(password|secret|key|token)" 2>/dev/null; then
        log_warn "Potential secrets found in environment variables"
    fi

    # Verify secrets are retrieved from Secrets Manager
    local secrets_count
    secrets_count=$(echo "$task_def_json" | jq '.containerDefinitions[0].secrets | length' 2>/dev/null || echo "0")

    if [[ "$secrets_count" -gt 0 ]]; then
        log_info "Task definition uses Secrets Manager for $secrets_count secrets"
    else
        log_warn "No secrets configured from Secrets Manager"
    fi

    log_info "Security validation completed"
}

# Monitoring and alerting
send_deployment_notification() {
    local status="$1"
    local message="$2"

    # Here you would integrate with your notification system
    # For now, just log the notification
    log_info "NOTIFICATION [$status]: $message"

    # Example: Send to Slack, email, or other notification service
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"'"$message"'"}' \
    #     "$SLACK_WEBHOOK_URL" || true
}

# Help function
show_help() {
    cat << EOF
Blue-Green Deployment Script for Paintbox

USAGE:
    $0 [OPTIONS] <IMAGE_TAG>

ARGUMENTS:
    IMAGE_TAG               Docker image tag to deploy

OPTIONS:
    -e, --environment ENV   Environment (default: staging)
    -r, --region REGION     AWS region (default: us-east-1)
    -t, --rollback-window   Rollback window in minutes (default: 10)
    --health-check-retries  Number of health check retries (default: 20)
    --health-check-interval Health check interval in seconds (default: 30)
    --rollback             Trigger immediate rollback
    --status               Show current deployment status
    -h, --help             Show this help message

EXAMPLES:
    $0 staging-v1.2.3
    $0 --environment production production-v1.2.3
    $0 --rollback-window 15 staging-v1.2.4
    $0 --rollback
    $0 --status

ENVIRONMENT VARIABLES:
    ENVIRONMENT            Deployment environment
    AWS_REGION            AWS region
    ROLLBACK_WINDOW_MINUTES Rollback window in minutes
    HEALTH_CHECK_RETRIES   Number of health check retries
    HEALTH_CHECK_INTERVAL  Health check interval in seconds

EOF
}

# Command line argument parsing
IMAGE_TAG=""
SHOW_STATUS=false
TRIGGER_ROLLBACK=false

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
        -t|--rollback-window)
            ROLLBACK_WINDOW_MINUTES="$2"
            shift 2
            ;;
        --health-check-retries)
            HEALTH_CHECK_RETRIES="$2"
            shift 2
            ;;
        --health-check-interval)
            HEALTH_CHECK_INTERVAL="$2"
            shift 2
            ;;
        --rollback)
            TRIGGER_ROLLBACK=true
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
            if [[ -z "$IMAGE_TAG" ]]; then
                IMAGE_TAG="$1"
            else
                log_error "Multiple image tags provided"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Main execution
main() {
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    log_info "Blue-Green Deployment Script Starting"
    log_info "Environment: $ENVIRONMENT"
    log_info "AWS Region: $AWS_REGION"
    log_info "Rollback Window: $ROLLBACK_WINDOW_MINUTES minutes"

    # Update cluster and service names based on environment
    CLUSTER_NAME="paintbox-${ENVIRONMENT}"
    SERVICE_BLUE="paintbox-blue-${ENVIRONMENT}"
    SERVICE_GREEN="paintbox-green-${ENVIRONMENT}"
    TARGET_GROUP_BLUE="paintbox-blue-${ENVIRONMENT}"
    TARGET_GROUP_GREEN="paintbox-green-${ENVIRONMENT}"
    ALB_NAME="paintbox-alb-${ENVIRONMENT}"

    validate_prerequisites

    if [[ "$SHOW_STATUS" == "true" ]]; then
        CURRENT_ACTIVE=$(get_current_active_environment)
        log_info "Current active environment: $CURRENT_ACTIVE"
        exit 0
    fi

    if [[ "$TRIGGER_ROLLBACK" == "true" ]]; then
        CURRENT_ACTIVE=$(get_current_active_environment)
        DEPLOYMENT_TARGET=$(get_target_environment "$CURRENT_ACTIVE")
        trigger_rollback
        exit 0
    fi

    if [[ -z "$IMAGE_TAG" ]]; then
        log_error "Image tag is required"
        show_help
        exit 1
    fi

    # Send deployment start notification
    send_deployment_notification "INFO" "Starting blue-green deployment of $IMAGE_TAG to $ENVIRONMENT"

    # Perform deployment
    if perform_blue_green_deployment "$IMAGE_TAG"; then
        validate_deployment_security
        send_deployment_notification "SUCCESS" "Blue-green deployment of $IMAGE_TAG to $ENVIRONMENT completed successfully"
        log_info "Deployment completed successfully!"
    else
        send_deployment_notification "ERROR" "Blue-green deployment of $IMAGE_TAG to $ENVIRONMENT failed"
        exit 1
    fi
}

# Execute main function
main "$@"
