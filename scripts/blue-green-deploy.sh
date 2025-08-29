#!/bin/bash
# Blue-Green Deployment Script for Candlefish Operational Maturity Map
# Production-ready deployment with automatic rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
NAMESPACE="${NAMESPACE:-production}"
SERVICE_NAME="${SERVICE_NAME:-candlefish-website}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ECR_REGISTRY="${ECR_REGISTRY:-$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com}"
TIMEOUT="${TIMEOUT:-600}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
DRY_RUN="${DRY_RUN:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Slack notification function
send_slack_notification() {
    local message="$1"
    local color="${2:-good}"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || log_warning "Failed to send Slack notification"
    fi
}

# Cleanup function for trap
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
        send_slack_notification "❌ Blue-Green deployment failed for $SERVICE_NAME" "danger"
        
        # Attempt to rollback if we're in the middle of a deployment
        if [[ "${ROLLBACK_ON_FAILURE:-true}" == "true" && -n "${NEW_VERSION:-}" ]]; then
            log_warning "Attempting automatic rollback..."
            rollback_deployment
        fi
    fi
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "aws" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl cannot connect to cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    # Check if image exists in ECR
    if ! aws ecr describe-images --repository-name "$SERVICE_NAME" --image-ids imageTag="$IMAGE_TAG" &> /dev/null; then
        log_error "Image $SERVICE_NAME:$IMAGE_TAG not found in ECR"
        exit 1
    fi
    
    log_success "Prerequisites validation completed"
}

# Get current active deployment (blue or green)
get_current_version() {
    local current_selector
    current_selector=$(kubectl get service "${SERVICE_NAME}-service" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ -z "$current_selector" ]]; then
        # No version selector found, check for existing deployments
        if kubectl get deployment "${SERVICE_NAME}-blue" -n "$NAMESPACE" &> /dev/null; then
            echo "blue"
        elif kubectl get deployment "${SERVICE_NAME}-green" -n "$NAMESPACE" &> /dev/null; then
            echo "green"
        else
            echo "blue"  # Default to blue for initial deployment
        fi
    else
        echo "$current_selector"
    fi
}

# Get the inactive version (opposite of current)
get_new_version() {
    local current_version="$1"
    if [[ "$current_version" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Deploy new version to inactive environment
deploy_new_version() {
    local new_version="$1"
    local deployment_name="${SERVICE_NAME}-${new_version}"
    
    log_info "Deploying $SERVICE_NAME:$IMAGE_TAG to $new_version environment..."
    
    # Create deployment manifest from template
    local deployment_manifest
    deployment_manifest=$(mktemp)
    
    # Generate deployment YAML
    cat > "$deployment_manifest" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $deployment_name
  namespace: $NAMESPACE
  labels:
    app: $SERVICE_NAME
    version: $new_version
    app.kubernetes.io/name: $SERVICE_NAME
    app.kubernetes.io/version: $IMAGE_TAG
    app.kubernetes.io/component: web-server
    app.kubernetes.io/part-of: candlefish-platform
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: $SERVICE_NAME
      version: $new_version
  template:
    metadata:
      labels:
        app: $SERVICE_NAME
        version: $new_version
        app.kubernetes.io/name: $SERVICE_NAME
        app.kubernetes.io/version: $IMAGE_TAG
        app.kubernetes.io/component: web-server
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/metrics"
        deployment.timestamp: "$(date '+%Y-%m-%d_%H-%M-%S')"
    spec:
      serviceAccountName: ${SERVICE_NAME}-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: $SERVICE_NAME
        image: $ECR_REGISTRY/$SERVICE_NAME:$IMAGE_TAG
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: HOSTNAME
          value: "0.0.0.0"
        - name: DEPLOYMENT_VERSION
          value: "$new_version"
        - name: IMAGE_TAG
          value: "$IMAGE_TAG"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 15
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 30
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /.next/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - $SERVICE_NAME
              topologyKey: kubernetes.io/hostname
EOF

    # Apply deployment
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would apply deployment:"
        cat "$deployment_manifest"
    else
        kubectl apply -f "$deployment_manifest"
        
        # Wait for deployment to be ready
        log_info "Waiting for deployment $deployment_name to be ready..."
        kubectl rollout status deployment "$deployment_name" -n "$NAMESPACE" --timeout="${TIMEOUT}s"
        
        # Verify pods are running
        kubectl wait --for=condition=ready pod -l app="$SERVICE_NAME",version="$new_version" -n "$NAMESPACE" --timeout=300s
    fi
    
    rm -f "$deployment_manifest"
    log_success "Deployment $deployment_name is ready"
}

# Perform health checks on new version
health_check_new_version() {
    local new_version="$1"
    local deployment_name="${SERVICE_NAME}-${new_version}"
    
    log_info "Performing health checks on $new_version version..."
    
    # Get a pod from the new deployment
    local pod_name
    pod_name=$(kubectl get pods -l app="$SERVICE_NAME",version="$new_version" -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$pod_name" ]]; then
        log_error "No pods found for $new_version version"
        return 1
    fi
    
    # Port forward to test the new version
    local port_forward_pid
    kubectl port-forward "$pod_name" 8080:3000 -n "$NAMESPACE" &
    port_forward_pid=$!
    
    # Cleanup function for port forward
    cleanup_port_forward() {
        if [[ -n "${port_forward_pid:-}" ]]; then
            kill "$port_forward_pid" 2>/dev/null || true
            wait "$port_forward_pid" 2>/dev/null || true
        fi
    }
    trap cleanup_port_forward RETURN
    
    # Wait for port forward to be ready
    sleep 5
    
    # Perform health checks
    local success_count=0
    for ((i=1; i<=HEALTH_CHECK_RETRIES; i++)); do
        log_info "Health check attempt $i/$HEALTH_CHECK_RETRIES..."
        
        if curl -f -s "http://localhost:8080/api/health" > /dev/null; then
            ((success_count++))
            log_success "Health check $i passed"
        else
            log_warning "Health check $i failed"
        fi
        
        # Wait between checks (except for the last one)
        if [[ $i -lt $HEALTH_CHECK_RETRIES ]]; then
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
    done
    
    # Evaluate health check results
    local success_rate=$((success_count * 100 / HEALTH_CHECK_RETRIES))
    if [[ $success_rate -ge 80 ]]; then
        log_success "Health checks passed ($success_count/$HEALTH_CHECK_RETRIES successful)"
        return 0
    else
        log_error "Health checks failed ($success_count/$HEALTH_CHECK_RETRIES successful)"
        return 1
    fi
}

# Switch traffic to new version
switch_traffic() {
    local new_version="$1"
    
    log_info "Switching traffic to $new_version version..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would switch service selector to version: $new_version"
    else
        kubectl patch service "${SERVICE_NAME}-service" -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"version\":\"$new_version\"}}}"
        
        # Wait for traffic switch to take effect
        sleep 30
        
        # Verify the switch
        local current_selector
        current_selector=$(kubectl get service "${SERVICE_NAME}-service" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}')
        
        if [[ "$current_selector" == "$new_version" ]]; then
            log_success "Traffic successfully switched to $new_version version"
        else
            log_error "Traffic switch verification failed. Current selector: $current_selector"
            return 1
        fi
    fi
}

# Verify production traffic on new version
verify_production_traffic() {
    local new_version="$1"
    
    log_info "Verifying production traffic on $new_version version..."
    
    # Get production URL
    local prod_url="https://candlefish.ai"
    
    # Perform production health checks
    local success_count=0
    for ((i=1; i<=5; i++)); do
        log_info "Production verification attempt $i/5..."
        
        local health_status
        health_status=$(curl -s -o /dev/null -w "%{http_code}" "$prod_url/api/health" || echo "000")
        
        if [[ "$health_status" == "200" ]]; then
            ((success_count++))
            log_success "Production verification $i passed (HTTP $health_status)"
        else
            log_warning "Production verification $i failed (HTTP $health_status)"
        fi
        
        sleep 10
    done
    
    if [[ $success_count -ge 4 ]]; then
        log_success "Production traffic verification passed ($success_count/5 successful)"
        return 0
    else
        log_error "Production traffic verification failed ($success_count/5 successful)"
        return 1
    fi
}

# Clean up old version
cleanup_old_version() {
    local old_version="$1"
    local deployment_name="${SERVICE_NAME}-${old_version}"
    
    log_info "Cleaning up old $old_version version..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would delete deployment: $deployment_name"
    else
        kubectl delete deployment "$deployment_name" -n "$NAMESPACE" --ignore-not-found=true
        log_success "Old $old_version deployment cleaned up"
    fi
}

# Rollback to previous version
rollback_deployment() {
    local current_version
    current_version=$(get_current_version)
    local previous_version
    previous_version=$(get_new_version "$current_version")
    
    log_warning "Initiating rollback to $previous_version version..."
    
    # Check if previous version deployment exists
    if ! kubectl get deployment "${SERVICE_NAME}-${previous_version}" -n "$NAMESPACE" &> /dev/null; then
        log_error "Previous version deployment ${SERVICE_NAME}-${previous_version} not found. Cannot rollback."
        return 1
    fi
    
    # Switch traffic back
    if switch_traffic "$previous_version"; then
        log_success "Rollback completed. Traffic switched back to $previous_version version."
        send_slack_notification "🔄 Rollback completed for $SERVICE_NAME to $previous_version version" "warning"
        return 0
    else
        log_error "Rollback failed"
        send_slack_notification "❌ Rollback failed for $SERVICE_NAME" "danger"
        return 1
    fi
}

# Main deployment function
main() {
    local start_time
    start_time=$(date +%s)
    
    log_info "Starting blue-green deployment for $SERVICE_NAME:$IMAGE_TAG"
    send_slack_notification "🚀 Starting blue-green deployment for $SERVICE_NAME:$IMAGE_TAG"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Determine current and new versions
    local current_version
    current_version=$(get_current_version)
    NEW_VERSION=$(get_new_version "$current_version")
    
    log_info "Current active version: $current_version"
    log_info "Deploying to version: $NEW_VERSION"
    
    # Deploy new version
    deploy_new_version "$NEW_VERSION"
    
    # Perform health checks
    if ! health_check_new_version "$NEW_VERSION"; then
        log_error "Health checks failed. Aborting deployment."
        cleanup_old_version "$NEW_VERSION"  # Clean up failed deployment
        exit 1
    fi
    
    # Switch traffic
    if ! switch_traffic "$NEW_VERSION"; then
        log_error "Traffic switch failed. Aborting deployment."
        exit 1
    fi
    
    # Verify production traffic
    if ! verify_production_traffic "$NEW_VERSION"; then
        log_error "Production traffic verification failed. Rolling back."
        rollback_deployment
        exit 1
    fi
    
    # Clean up old version
    cleanup_old_version "$current_version"
    
    # Calculate deployment time
    local end_time
    end_time=$(date +%s)
    local deployment_time=$((end_time - start_time))
    
    log_success "Blue-green deployment completed successfully!"
    log_info "Deployment time: ${deployment_time}s"
    log_info "New active version: $NEW_VERSION"
    
    send_slack_notification "✅ Blue-green deployment completed successfully for $SERVICE_NAME:$IMAGE_TAG (${deployment_time}s)" "good"
}

# Help function
show_help() {
    cat << EOF
Blue-Green Deployment Script for Candlefish Operational Maturity Map

Usage: $0 [OPTIONS]

Options:
    -s, --service SERVICE_NAME      Service name to deploy (default: candlefish-website)
    -n, --namespace NAMESPACE       Kubernetes namespace (default: production)
    -t, --image-tag IMAGE_TAG       Docker image tag to deploy (default: latest)
    -r, --registry ECR_REGISTRY     ECR registry URL (default: auto-detected)
    --timeout TIMEOUT              Deployment timeout in seconds (default: 600)
    --health-retries RETRIES       Number of health check retries (default: 10)
    --health-interval INTERVAL     Interval between health checks (default: 30)
    --dry-run                      Perform a dry run without making changes
    --no-rollback                  Disable automatic rollback on failure
    --rollback                     Rollback to previous version
    -h, --help                     Show this help message

Environment Variables:
    NAMESPACE                      Kubernetes namespace
    SERVICE_NAME                   Service name to deploy
    IMAGE_TAG                      Docker image tag
    ECR_REGISTRY                   ECR registry URL
    SLACK_WEBHOOK_URL             Slack webhook URL for notifications
    DRY_RUN                       Set to 'true' for dry run
    ROLLBACK_ON_FAILURE           Set to 'false' to disable auto-rollback

Examples:
    # Deploy latest image
    $0 --service candlefish-website --image-tag v1.2.3

    # Dry run deployment
    $0 --dry-run --service candlefish-website --image-tag v1.2.3

    # Rollback to previous version
    $0 --rollback --service candlefish-website

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--registry)
            ECR_REGISTRY="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --health-retries)
            HEALTH_CHECK_RETRIES="$2"
            shift 2
            ;;
        --health-interval)
            HEALTH_CHECK_INTERVAL="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE="false"
            shift
            ;;
        --rollback)
            rollback_deployment
            exit 0
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"