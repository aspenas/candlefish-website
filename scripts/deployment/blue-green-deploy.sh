#!/bin/bash

# Blue-Green Deployment Script for Security Dashboard
# This script performs zero-downtime deployments using blue-green strategy

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
CLUSTER=""
SERVICE=""
IMAGE=""
HEALTH_CHECK_URL=""
ROLLBACK_ON_FAILURE=false
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --cluster)
            CLUSTER="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --image)
            IMAGE="$2"
            shift 2
            ;;
        --health-check-url)
            HEALTH_CHECK_URL="$2"
            shift 2
            ;;
        --rollback-on-failure)
            ROLLBACK_ON_FAILURE=true
            shift
            ;;
        --help)
            echo "Usage: $0 --cluster CLUSTER --service SERVICE --image IMAGE --health-check-url URL [--rollback-on-failure]"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$CLUSTER" || -z "$SERVICE" || -z "$IMAGE" || -z "$HEALTH_CHECK_URL" ]]; then
    echo -e "${RED}Error: Missing required parameters${NC}"
    echo "Usage: $0 --cluster CLUSTER --service SERVICE --image IMAGE --health-check-url URL [--rollback-on-failure]"
    exit 1
fi

# Function to log messages
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${timestamp} - ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - ${message}"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${timestamp} - ${message}"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${timestamp} - ${message}"
            ;;
    esac
}

# Function to check service health
check_health() {
    local url=$1
    local retries=$2
    local interval=$3
    
    log INFO "Checking service health at ${url}"
    
    for i in $(seq 1 $retries); do
        if curl -sf "${url}" -o /dev/null; then
            log SUCCESS "Health check passed (attempt ${i}/${retries})"
            return 0
        else
            log WARNING "Health check failed (attempt ${i}/${retries})"
            if [[ $i -lt $retries ]]; then
                log INFO "Waiting ${interval} seconds before retry..."
                sleep $interval
            fi
        fi
    done
    
    log ERROR "Health check failed after ${retries} attempts"
    return 1
}

# Function to get current task definition
get_current_task_definition() {
    local service=$1
    local cluster=$2
    
    aws ecs describe-services \
        --cluster "$cluster" \
        --services "$service" \
        --query 'services[0].taskDefinition' \
        --output text
}

# Function to create new task definition
create_task_definition() {
    local current_task_def=$1
    local new_image=$2
    
    # Get current task definition
    local task_def_json=$(aws ecs describe-task-definition \
        --task-definition "$current_task_def" \
        --query 'taskDefinition')
    
    # Update image in container definition
    local new_task_def=$(echo "$task_def_json" | jq \
        --arg IMAGE "$new_image" \
        '.containerDefinitions[0].image = $IMAGE | 
         del(.taskDefinitionArn) | 
         del(.revision) | 
         del(.status) | 
         del(.requiresAttributes) | 
         del(.compatibilities) | 
         del(.registeredAt) | 
         del(.registeredBy)')
    
    # Register new task definition
    aws ecs register-task-definition --cli-input-json "$new_task_def" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text
}

# Function to update service with new task definition
update_service() {
    local cluster=$1
    local service=$2
    local task_def=$3
    
    aws ecs update-service \
        --cluster "$cluster" \
        --service "$service" \
        --task-definition "$task_def" \
        --force-new-deployment \
        --query 'service.serviceArn' \
        --output text
}

# Function to wait for service to be stable
wait_for_stable() {
    local cluster=$1
    local service=$2
    local timeout=600 # 10 minutes
    
    log INFO "Waiting for service to stabilize (timeout: ${timeout}s)"
    
    if timeout $timeout aws ecs wait services-stable \
        --cluster "$cluster" \
        --services "$service"; then
        log SUCCESS "Service is stable"
        return 0
    else
        log ERROR "Service failed to stabilize within ${timeout} seconds"
        return 1
    fi
}

# Function to rollback deployment
rollback() {
    local cluster=$1
    local service=$2
    local previous_task_def=$3
    
    log WARNING "Rolling back to previous task definition: ${previous_task_def}"
    
    update_service "$cluster" "$service" "$previous_task_def"
    
    if wait_for_stable "$cluster" "$service"; then
        log SUCCESS "Rollback completed successfully"
        return 0
    else
        log ERROR "Rollback failed"
        return 1
    fi
}

# Function to perform canary deployment check
canary_check() {
    local cluster=$1
    local service=$2
    local health_url=$3
    
    log INFO "Performing canary deployment check"
    
    # Get service metrics from CloudWatch
    local error_rate=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/ECS" \
        --metric-name "ServiceErrorRate" \
        --dimensions Name=ClusterName,Value="$cluster" Name=ServiceName,Value="$service" \
        --start-time "$(date -u -d '5 minutes ago' '+%Y-%m-%dT%H:%M:%S')" \
        --end-time "$(date -u '+%Y-%m-%dT%H:%M:%S')" \
        --period 300 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text)
    
    if [[ "$error_rate" != "None" ]] && (( $(echo "$error_rate > 5" | bc -l) )); then
        log ERROR "Error rate is above threshold: ${error_rate}%"
        return 1
    fi
    
    log SUCCESS "Canary check passed"
    return 0
}

# Main deployment logic
main() {
    log INFO "Starting blue-green deployment"
    log INFO "Cluster: ${CLUSTER}"
    log INFO "Service: ${SERVICE}"
    log INFO "New Image: ${IMAGE}"
    
    # Store current task definition for rollback
    PREVIOUS_TASK_DEF=$(get_current_task_definition "$SERVICE" "$CLUSTER")
    log INFO "Current task definition: ${PREVIOUS_TASK_DEF}"
    
    # Create new task definition with updated image
    log INFO "Creating new task definition with image: ${IMAGE}"
    NEW_TASK_DEF=$(create_task_definition "$PREVIOUS_TASK_DEF" "$IMAGE")
    log SUCCESS "Created new task definition: ${NEW_TASK_DEF}"
    
    # Update service with new task definition
    log INFO "Updating service with new task definition"
    update_service "$CLUSTER" "$SERVICE" "$NEW_TASK_DEF"
    
    # Wait for service to stabilize
    if ! wait_for_stable "$CLUSTER" "$SERVICE"; then
        if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
            rollback "$CLUSTER" "$SERVICE" "$PREVIOUS_TASK_DEF"
        fi
        exit 1
    fi
    
    # Perform health checks
    if ! check_health "$HEALTH_CHECK_URL" "$HEALTH_CHECK_RETRIES" "$HEALTH_CHECK_INTERVAL"; then
        log ERROR "Health check failed for new deployment"
        if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
            rollback "$CLUSTER" "$SERVICE" "$PREVIOUS_TASK_DEF"
        fi
        exit 1
    fi
    
    # Perform canary check
    if ! canary_check "$CLUSTER" "$SERVICE" "$HEALTH_CHECK_URL"; then
        log ERROR "Canary check failed"
        if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
            rollback "$CLUSTER" "$SERVICE" "$PREVIOUS_TASK_DEF"
        fi
        exit 1
    fi
    
    log SUCCESS "Blue-green deployment completed successfully!"
    log INFO "Previous version: ${PREVIOUS_TASK_DEF}"
    log INFO "Current version: ${NEW_TASK_DEF}"
    
    # Output deployment information for downstream processes
    echo "DEPLOYMENT_SUCCESS=true" >> "$GITHUB_ENV"
    echo "NEW_TASK_DEFINITION=${NEW_TASK_DEF}" >> "$GITHUB_ENV"
    echo "PREVIOUS_TASK_DEFINITION=${PREVIOUS_TASK_DEF}" >> "$GITHUB_ENV"
}

# Execute main function
main