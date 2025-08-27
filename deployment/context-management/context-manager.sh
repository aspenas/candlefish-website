#!/bin/bash

# Security Dashboard Context Management System
# Optimized for Claude Opus 4.1 (2M/400K tokens)
# Version: 1.0

set -e

# Configuration
CONTEXT_DIR="/Users/patricksmith/candlefish-ai/deployment/context-management"
PROJECT_ROOT="/Users/patricksmith/candlefish-ai"
MAX_INPUT_TOKENS=2000000
MAX_OUTPUT_TOKENS=400000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to estimate token count (rough approximation)
estimate_tokens() {
    local text="$1"
    # Rough estimate: 1 token ≈ 4 characters
    local chars=$(echo -n "$text" | wc -c)
    echo $((chars / 4))
}

# Function to generate core context
generate_core_context() {
    log_info "Generating core context..."
    
    cat > "$CONTEXT_DIR/core-context.json" << 'EOF'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project": {
    "name": "Security Dashboard",
    "location": "/Users/patricksmith/candlefish-ai",
    "branch": "$(git branch --show-current)",
    "commit": "$(git rev-parse --short HEAD)"
  },
  "infrastructure": {
    "aws_account": "681214184463",
    "region": "us-east-1",
    "namespace": "security-dashboard"
  },
  "services": {
    "redis": {"port": 6379, "status": "$(docker ps | grep security-redis > /dev/null && echo 'running' || echo 'stopped')"},
    "prometheus": {"port": 9091, "status": "$(docker ps | grep security-prometheus > /dev/null && echo 'running' || echo 'stopped')"},
    "grafana": {"port": 3003, "status": "$(docker ps | grep security-grafana > /dev/null && echo 'running' || echo 'stopped')"},
    "postgres": {"port": 5432, "status": "$(docker ps | grep postgres > /dev/null && echo 'running' || echo 'stopped')"}
  }
}
EOF
    
    local token_count=$(estimate_tokens "$(cat $CONTEXT_DIR/core-context.json)")
    log_success "Core context generated (~$token_count tokens)"
}

# Function to generate deployment context
generate_deployment_context() {
    local env=${1:-production}
    log_info "Generating deployment context for $env..."
    
    # Gather deployment information
    local k8s_status=""
    if kubectl cluster-info &>/dev/null; then
        k8s_status="connected"
    else
        k8s_status="disconnected"
    fi
    
    # Create deployment context
    cat > "$CONTEXT_DIR/deployment-context-$env.yaml" << EOF
environment: $env
timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
kubernetes:
  status: $k8s_status
  namespace: security-dashboard
  
docker_images:
  frontend: $(docker images | grep security-dashboard-frontend | head -1 | awk '{print $2}' || echo 'not-built')
  backend: $(docker images | grep security-dashboard-backend | head -1 | awk '{print $2}' || echo 'not-built')
  
health_checks:
$(for port in 8080 4000 3001; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health | grep -q "200"; then
        echo "  - port_$port: healthy"
    else
        echo "  - port_$port: unhealthy"
    fi
done)

recent_deployments:
$(git log --oneline -5 --grep="deploy" || echo "  - No recent deployments")
EOF
    
    local token_count=$(estimate_tokens "$(cat $CONTEXT_DIR/deployment-context-$env.yaml)")
    log_success "Deployment context generated (~$token_count tokens)"
}

# Function to create troubleshooting context
generate_troubleshooting_context() {
    log_info "Generating troubleshooting context..."
    
    # Collect error logs
    local error_logs=""
    if docker logs security-dashboard-backend 2>&1 | tail -50 | grep -i error; then
        error_logs=$(docker logs security-dashboard-backend 2>&1 | tail -50 | grep -i error)
    fi
    
    # Collect resource usage
    local resource_usage=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10)
    
    cat > "$CONTEXT_DIR/troubleshooting-context.md" << EOF
# Troubleshooting Context
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## System Status
- Docker containers: $(docker ps | wc -l) running
- Disk usage: $(df -h / | awk 'NR==2 {print $5}')
- Memory usage: $(free -h | awk 'NR==2 {print $3"/"$2}')

## Recent Errors
\`\`\`
$error_logs
\`\`\`

## Resource Usage
\`\`\`
$resource_usage
\`\`\`

## Failed Health Checks
$(for service in frontend backend graphql websocket; do
    echo "- $service: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo 'unreachable')"
done)
EOF
    
    local token_count=$(estimate_tokens "$(cat $CONTEXT_DIR/troubleshooting-context.md)")
    log_success "Troubleshooting context generated (~$token_count tokens)"
}

# Function to create optimized context package
create_context_package() {
    local package_type=$1
    local output_file="$CONTEXT_DIR/context-package-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    log_info "Creating $package_type context package..."
    
    case $package_type in
        quick)
            files=(
                "core-context.json"
                "deployment-context-snapshot.yaml"
            )
            ;;
        full)
            files=(
                "core-context.json"
                "deployment-context-*.yaml"
                "security-dashboard-context-system.md"
            )
            ;;
        troubleshooting)
            files=(
                "core-context.json"
                "troubleshooting-context.md"
                "../logs/*.log"
            )
            ;;
        *)
            log_error "Unknown package type: $package_type"
            exit 1
            ;;
    esac
    
    # Create package
    cd "$CONTEXT_DIR"
    tar -czf "$output_file" "${files[@]}" 2>/dev/null || true
    
    # Calculate size and estimate tokens
    local size=$(du -h "$output_file" | cut -f1)
    local content_size=$(tar -tzf "$output_file" | xargs -I {} sh -c "cat '{}' 2>/dev/null | wc -c" | awk '{sum+=$1} END {print sum}')
    local estimated_tokens=$((content_size / 4))
    
    log_success "Context package created: $output_file"
    log_info "Package size: $size, Estimated tokens: $estimated_tokens"
    
    # Check token budget
    if [ $estimated_tokens -gt $MAX_INPUT_TOKENS ]; then
        log_warning "Package exceeds token budget! Consider compression."
    fi
    
    echo "$output_file"
}

# Function to validate context
validate_context() {
    log_info "Validating context integrity..."
    
    local errors=0
    
    # Check required files
    for file in "core-context.json" "deployment-context-snapshot.yaml"; do
        if [ ! -f "$CONTEXT_DIR/$file" ]; then
            log_error "Missing required file: $file"
            ((errors++))
        fi
    done
    
    # Check AWS connectivity
    if ! aws sts get-caller-identity &>/dev/null; then
        log_warning "AWS credentials not configured"
        ((errors++))
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &>/dev/null; then
        log_warning "Kubernetes cluster not accessible"
        ((errors++))
    fi
    
    # Check Docker
    if ! docker ps &>/dev/null; then
        log_error "Docker is not running"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Context validation passed"
        return 0
    else
        log_error "Context validation failed with $errors errors"
        return 1
    fi
}

# Function to sync context to S3
sync_to_s3() {
    local bucket="s3://candlefish-context-management/security-dashboard"
    
    log_info "Syncing context to S3..."
    
    if aws s3 sync "$CONTEXT_DIR" "$bucket" --exclude "*.log" --exclude "*.tmp"; then
        log_success "Context synced to $bucket"
    else
        log_error "Failed to sync context to S3"
    fi
}

# Function to display context status
show_status() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "     Security Dashboard Context Management Status"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    # Check services
    echo "🔧 Local Services:"
    for service in security-redis security-prometheus security-grafana; do
        if docker ps | grep -q $service; then
            echo "  ✅ $service: Running"
        else
            echo "  ❌ $service: Stopped"
        fi
    done
    echo ""
    
    # Check context files
    echo "📁 Context Files:"
    for file in core-context.json deployment-context-snapshot.yaml; do
        if [ -f "$CONTEXT_DIR/$file" ]; then
            local age=$(( ($(date +%s) - $(stat -f %m "$CONTEXT_DIR/$file" 2>/dev/null || stat -c %Y "$CONTEXT_DIR/$file")) / 60 ))
            echo "  ✅ $file (updated $age minutes ago)"
        else
            echo "  ❌ $file: Missing"
        fi
    done
    echo ""
    
    # Token usage estimate
    echo "🎫 Token Usage Estimate:"
    local total_chars=0
    for file in "$CONTEXT_DIR"/*.{json,yaml,md}; do
        if [ -f "$file" ]; then
            chars=$(wc -c < "$file")
            total_chars=$((total_chars + chars))
        fi
    done
    local estimated_tokens=$((total_chars / 4))
    local percentage=$((estimated_tokens * 100 / MAX_INPUT_TOKENS))
    echo "  Input tokens used: ~$estimated_tokens / $MAX_INPUT_TOKENS ($percentage%)"
    echo ""
    
    # Show recent deployments
    echo "🚀 Recent Deployments:"
    git log --oneline -3 --grep="deploy" 2>/dev/null || echo "  No recent deployments"
    echo ""
    
    echo "═══════════════════════════════════════════════════════════"
}

# Function to clean old context files
cleanup_old_context() {
    log_info "Cleaning up old context files..."
    
    # Remove context files older than 7 days
    find "$CONTEXT_DIR" -name "*.tar.gz" -mtime +7 -delete
    find "$CONTEXT_DIR" -name "*.tmp" -delete
    
    log_success "Cleanup completed"
}

# Main function
main() {
    # Create context directory if it doesn't exist
    mkdir -p "$CONTEXT_DIR"
    
    case ${1:-help} in
        generate)
            generate_core_context
            generate_deployment_context ${2:-production}
            generate_troubleshooting_context
            ;;
        package)
            create_context_package ${2:-quick}
            ;;
        validate)
            validate_context
            ;;
        sync)
            sync_to_s3
            ;;
        status)
            show_status
            ;;
        cleanup)
            cleanup_old_context
            ;;
        all)
            generate_core_context
            generate_deployment_context production
            generate_troubleshooting_context
            validate_context
            create_context_package full
            show_status
            ;;
        help)
            echo "Usage: $0 {generate|package|validate|sync|status|cleanup|all|help}"
            echo ""
            echo "Commands:"
            echo "  generate [env]    - Generate all context files"
            echo "  package [type]    - Create context package (quick/full/troubleshooting)"
            echo "  validate          - Validate context integrity"
            echo "  sync              - Sync context to S3"
            echo "  status            - Show context status"
            echo "  cleanup           - Remove old context files"
            echo "  all               - Run all operations"
            echo "  help              - Show this help message"
            ;;
        *)
            log_error "Unknown command: $1"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"