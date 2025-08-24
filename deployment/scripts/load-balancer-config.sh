#!/bin/bash

# Load Balancer Configuration Script for Netlify Extension Management System
# Configures AWS Application Load Balancer and health checks

set -euo pipefail

# Configuration
ENVIRONMENT="production"
CLUSTER_NAME="netlify-extension-cluster"
SERVICE_NAME="netlify-extension"
HEALTH_CHECK_PATH="/health"
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=5
HEALTHY_THRESHOLD=2
UNHEALTHY_THRESHOLD=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Load Balancer Configuration Script for Netlify Extension Management System

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    create                 Create new load balancer configuration
    update                 Update existing load balancer
    delete                 Delete load balancer
    status                 Show load balancer status
    health-check          Check target health

Options:
    --environment ENV     Environment (staging|production)
    --cluster-name NAME   EKS cluster name
    --service-name NAME   Service name
    --vpc-id VPC_ID       VPC ID for load balancer
    --subnet-ids SUBNETS  Comma-separated subnet IDs
    --certificate-arn ARN SSL certificate ARN
    --dry-run            Show what would be done
    --help               Show this help message

Examples:
    $0 create --environment production --vpc-id vpc-12345 --subnet-ids subnet-123,subnet-456
    $0 update --environment staging
    $0 status --environment production

EOF
}

# Parse arguments
COMMAND=""
VPC_ID=""
SUBNET_IDS=""
CERTIFICATE_ARN=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        create|update|delete|status|health-check)
            COMMAND="$1"
            shift
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --cluster-name)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        --service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --vpc-id)
            VPC_ID="$2"
            shift 2
            ;;
        --subnet-ids)
            SUBNET_IDS="$2"
            shift 2
            ;;
        --certificate-arn)
            CERTIFICATE_ARN="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    error "Command is required"
    show_help
    exit 1
fi

# Check AWS CLI access
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed or not in PATH"
        exit 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        error "AWS CLI is not configured or lacks permissions"
        exit 1
    fi

    log "AWS CLI access confirmed"
}

# Get or create security group
get_security_group() {
    local sg_name="${SERVICE_NAME}-alb-sg"
    local description="Security group for ${SERVICE_NAME} Application Load Balancer"

    log "Checking for existing security group: $sg_name"

    local sg_id
    sg_id=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=$sg_name" \
        --query "SecurityGroups[0].GroupId" \
        --output text 2>/dev/null || echo "None")

    if [ "$sg_id" = "None" ]; then
        log "Creating new security group: $sg_name"

        if [ "$DRY_RUN" = true ]; then
            log "[DRY RUN] Would create security group: $sg_name"
            echo "sg-dryrun123"
            return
        fi

        sg_id=$(aws ec2 create-security-group \
            --group-name "$sg_name" \
            --description "$description" \
            --vpc-id "$VPC_ID" \
            --query "GroupId" \
            --output text)

        # Add ingress rules
        aws ec2 authorize-security-group-ingress \
            --group-id "$sg_id" \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0

        aws ec2 authorize-security-group-ingress \
            --group-id "$sg_id" \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0

        # Add tags
        aws ec2 create-tags \
            --resources "$sg_id" \
            --tags "Key=Name,Value=$sg_name" \
                   "Key=Environment,Value=$ENVIRONMENT" \
                   "Key=Service,Value=$SERVICE_NAME"

        success "Created security group: $sg_id"
    else
        log "Using existing security group: $sg_id"
    fi

    echo "$sg_id"
}

# Create Application Load Balancer
create_load_balancer() {
    local alb_name="${SERVICE_NAME}-alb"
    local sg_id
    sg_id=$(get_security_group)

    log "Creating Application Load Balancer: $alb_name"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would create ALB: $alb_name"
        log "[DRY RUN] VPC: $VPC_ID"
        log "[DRY RUN] Subnets: $SUBNET_IDS"
        log "[DRY RUN] Security Group: $sg_id"
        return
    fi

    # Convert comma-separated subnet IDs to array format
    local subnet_array
    IFS=',' read -ra SUBNET_ARRAY <<< "$SUBNET_IDS"
    subnet_array=$(printf '%s ' "${SUBNET_ARRAY[@]}")

    # Create the ALB
    local alb_arn
    alb_arn=$(aws elbv2 create-load-balancer \
        --name "$alb_name" \
        --subnets $subnet_array \
        --security-groups "$sg_id" \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --tags "Key=Name,Value=$alb_name" \
               "Key=Environment,Value=$ENVIRONMENT" \
               "Key=Service,Value=$SERVICE_NAME" \
        --query "LoadBalancers[0].LoadBalancerArn" \
        --output text)

    success "Created Application Load Balancer: $alb_arn"

    # Get ALB DNS name
    local alb_dns
    alb_dns=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns "$alb_arn" \
        --query "LoadBalancers[0].DNSName" \
        --output text)

    log "ALB DNS Name: $alb_dns"

    # Create target group
    create_target_group "$alb_arn"

    # Create listeners
    create_listeners "$alb_arn"
}

# Create target group
create_target_group() {
    local alb_arn=$1
    local tg_name="${SERVICE_NAME}-tg"

    log "Creating target group: $tg_name"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would create target group: $tg_name"
        return
    fi

    local tg_arn
    tg_arn=$(aws elbv2 create-target-group \
        --name "$tg_name" \
        --protocol HTTP \
        --port 80 \
        --vpc-id "$VPC_ID" \
        --target-type ip \
        --health-check-protocol HTTP \
        --health-check-path "$HEALTH_CHECK_PATH" \
        --health-check-interval-seconds $HEALTH_CHECK_INTERVAL \
        --health-check-timeout-seconds $HEALTH_CHECK_TIMEOUT \
        --healthy-threshold-count $HEALTHY_THRESHOLD \
        --unhealthy-threshold-count $UNHEALTHY_THRESHOLD \
        --tags "Key=Name,Value=$tg_name" \
               "Key=Environment,Value=$ENVIRONMENT" \
               "Key=Service,Value=$SERVICE_NAME" \
        --query "TargetGroups[0].TargetGroupArn" \
        --output text)

    success "Created target group: $tg_arn"

    # Configure health check
    aws elbv2 modify-target-group \
        --target-group-arn "$tg_arn" \
        --health-check-path "$HEALTH_CHECK_PATH" \
        --health-check-protocol HTTP \
        --health-check-port traffic-port \
        --health-check-interval-seconds $HEALTH_CHECK_INTERVAL \
        --health-check-timeout-seconds $HEALTH_CHECK_TIMEOUT \
        --healthy-threshold-count $HEALTHY_THRESHOLD \
        --unhealthy-threshold-count $UNHEALTHY_THRESHOLD \
        --matcher HttpCode=200,201,202

    echo "$tg_arn"
}

# Create listeners
create_listeners() {
    local alb_arn=$1
    local tg_arn
    tg_arn=$(create_target_group "$alb_arn")

    log "Creating listeners for ALB"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would create HTTP and HTTPS listeners"
        return
    fi

    # Create HTTP listener (redirect to HTTPS)
    aws elbv2 create-listener \
        --load-balancer-arn "$alb_arn" \
        --protocol HTTP \
        --port 80 \
        --default-actions Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301} \
        --tags "Key=Environment,Value=$ENVIRONMENT" \
               "Key=Service,Value=$SERVICE_NAME"

    # Create HTTPS listener
    if [ -n "$CERTIFICATE_ARN" ]; then
        aws elbv2 create-listener \
            --load-balancer-arn "$alb_arn" \
            --protocol HTTPS \
            --port 443 \
            --certificates CertificateArn="$CERTIFICATE_ARN" \
            --default-actions Type=forward,TargetGroupArn="$tg_arn" \
            --tags "Key=Environment,Value=$ENVIRONMENT" \
                   "Key=Service,Value=$SERVICE_NAME"

        success "Created HTTPS listener with SSL certificate"
    else
        warn "No SSL certificate provided, HTTPS listener not created"
    fi

    success "Created listeners successfully"
}

# Show load balancer status
show_status() {
    local alb_name="${SERVICE_NAME}-alb"

    log "Getting load balancer status for: $alb_name"

    # Get ALB information
    local alb_info
    alb_info=$(aws elbv2 describe-load-balancers \
        --names "$alb_name" \
        --query "LoadBalancers[0]" \
        --output json 2>/dev/null || echo "{}")

    if [ "$alb_info" = "{}" ]; then
        warn "Load balancer not found: $alb_name"
        return 1
    fi

    # Parse ALB information
    local alb_arn
    local alb_dns
    local alb_state

    alb_arn=$(echo "$alb_info" | jq -r '.LoadBalancerArn // "N/A"')
    alb_dns=$(echo "$alb_info" | jq -r '.DNSName // "N/A"')
    alb_state=$(echo "$alb_info" | jq -r '.State.Code // "N/A"')

    echo ""
    log "Load Balancer Status:"
    echo "  Name: $alb_name"
    echo "  DNS Name: $alb_dns"
    echo "  State: $alb_state"
    echo "  ARN: $alb_arn"
    echo ""

    # Get target group information
    local tg_name="${SERVICE_NAME}-tg"
    local tg_info
    tg_info=$(aws elbv2 describe-target-groups \
        --names "$tg_name" \
        --query "TargetGroups[0]" \
        --output json 2>/dev/null || echo "{}")

    if [ "$tg_info" != "{}" ]; then
        local tg_arn
        local healthy_count
        local unhealthy_count

        tg_arn=$(echo "$tg_info" | jq -r '.TargetGroupArn // "N/A"')

        # Get target health
        local target_health
        target_health=$(aws elbv2 describe-target-health \
            --target-group-arn "$tg_arn" \
            --query "TargetHealthDescriptions" \
            --output json 2>/dev/null || echo "[]")

        healthy_count=$(echo "$target_health" | jq '[.[] | select(.TargetHealth.State == "healthy")] | length')
        unhealthy_count=$(echo "$target_health" | jq '[.[] | select(.TargetHealth.State != "healthy")] | length')

        log "Target Group Status:"
        echo "  Name: $tg_name"
        echo "  Healthy Targets: $healthy_count"
        echo "  Unhealthy Targets: $unhealthy_count"
        echo ""
    fi

    return 0
}

# Check target health
check_target_health() {
    local tg_name="${SERVICE_NAME}-tg"

    log "Checking target health for: $tg_name"

    # Get target group ARN
    local tg_arn
    tg_arn=$(aws elbv2 describe-target-groups \
        --names "$tg_name" \
        --query "TargetGroups[0].TargetGroupArn" \
        --output text 2>/dev/null || echo "None")

    if [ "$tg_arn" = "None" ]; then
        error "Target group not found: $tg_name"
        return 1
    fi

    # Get target health details
    local target_health
    target_health=$(aws elbv2 describe-target-health \
        --target-group-arn "$tg_arn" \
        --output table)

    echo ""
    log "Target Health Details:"
    echo "$target_health"
    echo ""

    # Check if all targets are healthy
    local unhealthy_targets
    unhealthy_targets=$(aws elbv2 describe-target-health \
        --target-group-arn "$tg_arn" \
        --query "TargetHealthDescriptions[?TargetHealth.State != 'healthy']" \
        --output text)

    if [ -z "$unhealthy_targets" ]; then
        success "All targets are healthy"
        return 0
    else
        warn "Some targets are unhealthy"
        return 1
    fi
}

# Delete load balancer
delete_load_balancer() {
    local alb_name="${SERVICE_NAME}-alb"

    warn "This will delete the load balancer: $alb_name"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would delete load balancer: $alb_name"
        return
    fi

    # Get confirmation
    read -p "Are you sure? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Deletion cancelled"
        return
    fi

    # Get ALB ARN
    local alb_arn
    alb_arn=$(aws elbv2 describe-load-balancers \
        --names "$alb_name" \
        --query "LoadBalancers[0].LoadBalancerArn" \
        --output text 2>/dev/null || echo "None")

    if [ "$alb_arn" = "None" ]; then
        warn "Load balancer not found: $alb_name"
        return
    fi

    # Delete the load balancer
    aws elbv2 delete-load-balancer \
        --load-balancer-arn "$alb_arn"

    success "Load balancer deletion initiated: $alb_name"

    # Clean up target groups
    local tg_name="${SERVICE_NAME}-tg"
    local tg_arn
    tg_arn=$(aws elbv2 describe-target-groups \
        --names "$tg_name" \
        --query "TargetGroups[0].TargetGroupArn" \
        --output text 2>/dev/null || echo "None")

    if [ "$tg_arn" != "None" ]; then
        aws elbv2 delete-target-group \
            --target-group-arn "$tg_arn"
        success "Target group deleted: $tg_name"
    fi
}

# Main function
main() {
    log "Load Balancer Configuration for Netlify Extension Management System"
    log "Environment: $ENVIRONMENT"
    log "Service: $SERVICE_NAME"

    # Check prerequisites
    check_aws_cli

    # Execute command
    case $COMMAND in
        create)
            if [[ -z "$VPC_ID" || -z "$SUBNET_IDS" ]]; then
                error "VPC ID and Subnet IDs are required for create command"
                exit 1
            fi
            create_load_balancer
            ;;
        update)
            log "Update functionality not implemented yet"
            ;;
        delete)
            delete_load_balancer
            ;;
        status)
            show_status
            ;;
        health-check)
            check_target_health
            ;;
        *)
            error "Unknown command: $COMMAND"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
