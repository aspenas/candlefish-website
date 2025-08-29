#!/bin/bash

# Security Dashboard Frontend Deployment Script
# Deploys to AWS S3 and CloudFront for staging/production

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"

# Default values
ENVIRONMENT="staging"
BUCKET_NAME=""
DISTRIBUTION_ID=""
AWS_PROFILE="default"
DRY_RUN=false

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

# Help function
show_help() {
    cat << EOF
Security Dashboard Frontend Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Deployment environment (staging|production) [default: staging]
    -b, --bucket BUCKET      S3 bucket name
    -d, --distribution ID    CloudFront distribution ID
    -p, --profile PROFILE    AWS profile [default: default]
    --dry-run               Show what would be deployed without actually deploying
    -h, --help              Show this help message

Examples:
    $0 --environment staging --bucket security-dashboard-staging
    $0 -e production -b security-dashboard-prod -d E1234567890
    $0 --dry-run

Environment Variables:
    AWS_PROFILE             AWS profile to use
    S3_BUCKET_STAGING       S3 bucket for staging
    S3_BUCKET_PRODUCTION    S3 bucket for production
    CLOUDFRONT_STAGING      CloudFront distribution ID for staging
    CLOUDFRONT_PRODUCTION   CloudFront distribution ID for production

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -d|--distribution)
            DISTRIBUTION_ID="$2"
            shift 2
            ;;
        -p|--profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
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

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Environment must be 'staging' or 'production'"
    exit 1
fi

# Set bucket and distribution based on environment if not provided
if [[ -z "$BUCKET_NAME" ]]; then
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        BUCKET_NAME="${S3_BUCKET_STAGING:-security-dashboard-staging}"
    else
        BUCKET_NAME="${S3_BUCKET_PRODUCTION:-security-dashboard-production}"
    fi
fi

if [[ -z "$DISTRIBUTION_ID" ]]; then
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        DISTRIBUTION_ID="${CLOUDFRONT_STAGING}"
    else
        DISTRIBUTION_ID="${CLOUDFRONT_PRODUCTION}"
    fi
fi

# Validate build directory exists
if [[ ! -d "$DIST_DIR" ]]; then
    log_error "Build directory not found: $DIST_DIR"
    log_info "Please run 'npm run build' first"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install AWS CLI."
    exit 1
fi

# Validate AWS credentials
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
    log_error "AWS credentials not configured or invalid for profile: $AWS_PROFILE"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT environment"
log_info "Bucket: $BUCKET_NAME"
log_info "Distribution: ${DISTRIBUTION_ID:-'Not specified'}"
log_info "AWS Profile: $AWS_PROFILE"
log_info "Build Directory: $DIST_DIR"

if [[ "$DRY_RUN" == true ]]; then
    log_warning "DRY RUN MODE - No changes will be made"
fi

# Check if bucket exists
log_info "Checking S3 bucket: $BUCKET_NAME"
if [[ "$DRY_RUN" == false ]]; then
    if ! aws s3 ls "s3://$BUCKET_NAME" --profile "$AWS_PROFILE" &> /dev/null; then
        log_error "S3 bucket does not exist or is not accessible: $BUCKET_NAME"
        exit 1
    fi
    log_success "S3 bucket is accessible"
else
    log_info "Would check S3 bucket: $BUCKET_NAME"
fi

# Calculate file counts and sizes
TOTAL_FILES=$(find "$DIST_DIR" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$DIST_DIR" | cut -f1)

log_info "Preparing to deploy $TOTAL_FILES files ($TOTAL_SIZE)"

# Create cache control mapping
get_cache_control() {
    local file="$1"
    case "$file" in
        *.html)
            echo "max-age=300, must-revalidate"
            ;;
        *.js|*.css|*.woff2|*.woff|*.ttf)
            echo "max-age=31536000, immutable"
            ;;
        *.png|*.jpg|*.jpeg|*.gif|*.svg|*.webp|*.ico)
            echo "max-age=2592000"
            ;;
        *.json|*.xml)
            echo "max-age=86400"
            ;;
        *)
            echo "max-age=86400"
            ;;
    esac
}

# Deploy function
deploy_file() {
    local file="$1"
    local s3_path="$2"
    local cache_control
    cache_control=$(get_cache_control "$file")
    
    local content_type
    case "$file" in
        *.html) content_type="text/html" ;;
        *.css) content_type="text/css" ;;
        *.js) content_type="application/javascript" ;;
        *.json) content_type="application/json" ;;
        *.svg) content_type="image/svg+xml" ;;
        *.png) content_type="image/png" ;;
        *.jpg|*.jpeg) content_type="image/jpeg" ;;
        *.gif) content_type="image/gif" ;;
        *.webp) content_type="image/webp" ;;
        *.ico) content_type="image/x-icon" ;;
        *.woff) content_type="font/woff" ;;
        *.woff2) content_type="font/woff2" ;;
        *.ttf) content_type="font/ttf" ;;
        *) content_type="binary/octet-stream" ;;
    esac

    if [[ "$DRY_RUN" == true ]]; then
        echo "Would upload: $file -> s3://$BUCKET_NAME/$s3_path"
        echo "  Cache-Control: $cache_control"
        echo "  Content-Type: $content_type"
    else
        aws s3 cp "$file" "s3://$BUCKET_NAME/$s3_path" \
            --profile "$AWS_PROFILE" \
            --cache-control "$cache_control" \
            --content-type "$content_type" \
            --metadata-directive REPLACE
    fi
}

# Upload files to S3
log_info "Uploading files to S3..."

cd "$DIST_DIR"
file_count=0

# Upload all files with appropriate cache headers
while IFS= read -r -d '' file; do
    relative_path="${file#./}"
    deploy_file "$file" "$relative_path"
    ((file_count++))
    
    if (( file_count % 10 == 0 )); then
        log_info "Uploaded $file_count/$TOTAL_FILES files..."
    fi
done < <(find . -type f -print0)

if [[ "$DRY_RUN" == false ]]; then
    log_success "Uploaded $file_count files to S3"
else
    log_info "Would upload $file_count files to S3"
fi

# Create CloudFront invalidation
if [[ -n "$DISTRIBUTION_ID" ]]; then
    log_info "Creating CloudFront invalidation..."
    
    if [[ "$DRY_RUN" == false ]]; then
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id "$DISTRIBUTION_ID" \
            --paths "/*" \
            --profile "$AWS_PROFILE" \
            --query 'Invalidation.Id' \
            --output text)
        
        log_success "CloudFront invalidation created: $INVALIDATION_ID"
        log_info "Invalidation typically takes 5-15 minutes to complete"
        
        # Wait for invalidation to complete (optional)
        if [[ "$ENVIRONMENT" == "production" ]]; then
            log_info "Waiting for invalidation to complete..."
            aws cloudfront wait invalidation-completed \
                --distribution-id "$DISTRIBUTION_ID" \
                --id "$INVALIDATION_ID" \
                --profile "$AWS_PROFILE"
            log_success "CloudFront invalidation completed"
        fi
    else
        log_info "Would create CloudFront invalidation for: $DISTRIBUTION_ID"
    fi
else
    log_warning "No CloudFront distribution ID provided, skipping cache invalidation"
fi

# Generate deployment report
DEPLOYMENT_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
REPORT_FILE="$PROJECT_DIR/deploy/deployment-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"

if [[ "$DRY_RUN" == false ]]; then
    cat > "$REPORT_FILE" << EOF
{
  "deployment": {
    "timestamp": "$DEPLOYMENT_TIME",
    "environment": "$ENVIRONMENT",
    "bucket": "$BUCKET_NAME",
    "distributionId": "$DISTRIBUTION_ID",
    "filesDeployed": $file_count,
    "totalSize": "$TOTAL_SIZE",
    "awsProfile": "$AWS_PROFILE",
    "invalidationId": "${INVALIDATION_ID:-null}"
  },
  "buildInfo": {
    "buildTime": "$(stat -c %y "$DIST_DIR/index.html" 2>/dev/null || stat -f %Sm "$DIST_DIR/index.html")",
    "bundleFiles": [
$(find "$DIST_DIR/assets" -name "*.js" -o -name "*.css" | sed 's/.*/"&"/' | paste -sd ',' -)
    ]
  }
}
EOF
    log_success "Deployment report saved: $REPORT_FILE"
fi

# Summary
log_success "🚀 Frontend deployment completed!"
echo
log_info "Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  Files deployed: $file_count"
echo "  Total size: $TOTAL_SIZE"
echo "  S3 Bucket: s3://$BUCKET_NAME"
if [[ -n "$DISTRIBUTION_ID" ]]; then
    echo "  CloudFront: $DISTRIBUTION_ID"
fi
echo "  Deployment time: $DEPLOYMENT_TIME"

if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo
    log_info "🌐 Access your staging deployment:"
    echo "  https://staging.security-dashboard.io"
elif [[ "$ENVIRONMENT" == "production" ]]; then
    echo
    log_info "🌐 Access your production deployment:"
    echo "  https://security-dashboard.io"
fi

echo
log_info "Next steps:"
echo "  1. Test the deployed application"
echo "  2. Verify all routes and features work"
echo "  3. Check performance metrics"
echo "  4. Monitor CloudWatch logs for any issues"

if [[ "$DRY_RUN" == true ]]; then
    echo
    log_warning "This was a dry run. No actual deployment occurred."
    log_info "Remove --dry-run flag to perform actual deployment."
fi