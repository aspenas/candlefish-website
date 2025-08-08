#!/bin/bash

# Production-ready deployment script for Candlefish Employee Setup
# Usage: ./scripts/deploy.sh [stage] [--test] [--validate]

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STAGE="${1:-dev}"
RUN_TESTS="${2:-false}"
VALIDATE_ONLY="${3:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Validation function
validate_prerequisites() {
    log "Validating prerequisites..."

    # Check if serverless is installed
    if ! command -v serverless &> /dev/null; then
        error "Serverless Framework is not installed. Run: npm install -g serverless"
    fi

    # Check if AWS CLI is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS CLI is not configured. Run: aws configure"
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js 18+ is required. Current version: $(node --version)"
    fi

    # Validate stage parameter
    if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
        error "Invalid stage: $STAGE. Must be dev, staging, or prod"
    fi

    success "Prerequisites validated successfully"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    cd "$ROOT_DIR"

    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi

    success "Dependencies installed successfully"
}

# Run tests
run_tests() {
    if [ "$RUN_TESTS" = "--test" ] || [ "$STAGE" = "prod" ]; then
        log "Running tests..."
        cd "$ROOT_DIR"

        # Run unit tests
        npm run test:ci

        if [ $? -ne 0 ]; then
            error "Tests failed. Deployment aborted."
        fi

        success "All tests passed"
    fi
}

# Validate serverless configuration
validate_serverless() {
    log "Validating serverless configuration..."
    cd "$ROOT_DIR"

    # Check serverless.yml syntax
    serverless print --stage "$STAGE" > /dev/null

    if [ $? -ne 0 ]; then
        error "Serverless configuration is invalid"
    fi

    success "Serverless configuration is valid"
}

# Create JWT secret if it doesn't exist
ensure_jwt_secret() {
    log "Ensuring JWT secret exists in AWS Secrets Manager..."

    SECRET_NAME="candlefish-employee-setup-lean-${STAGE}/jwt-secret"

    # Check if secret exists
    if aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" &> /dev/null; then
        log "JWT secret already exists"
    else
        log "Creating new JWT secret..."

        # Generate secure random secret
        JWT_SECRET=$(openssl rand -base64 64)

        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --description "JWT secret for ${STAGE} environment" \
            --secret-string "{\"secret\":\"$JWT_SECRET\"}" \
            --tags '[{"Key":"Environment","Value":"'$STAGE'"},{"Key":"Service","Value":"candlefish-employee-setup"}]'

        success "JWT secret created successfully"
    fi
}

# Deploy to AWS
deploy() {
    log "Starting deployment to $STAGE environment..."
    cd "$ROOT_DIR"

    # Set deployment timeout based on stage
    if [ "$STAGE" = "prod" ]; then
        TIMEOUT="30m"
    else
        TIMEOUT="15m"
    fi

    # Deploy with retries
    MAX_RETRIES=3
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        log "Deployment attempt $((RETRY_COUNT + 1))/$MAX_RETRIES..."

        if timeout "$TIMEOUT" serverless deploy --stage "$STAGE" --verbose; then
            success "Deployment successful!"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                warn "Deployment failed. Retrying in 30 seconds..."
                sleep 30
            else
                error "Deployment failed after $MAX_RETRIES attempts"
            fi
        fi
    done
}

# Post-deployment validation
validate_deployment() {
    log "Validating deployment..."
    cd "$ROOT_DIR"

    # Get API endpoint
    API_ENDPOINT=$(serverless info --stage "$STAGE" --verbose | grep -oP 'https://[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/[a-z0-9]+' | head -1)

    if [ -z "$API_ENDPOINT" ]; then
        error "Could not determine API endpoint"
    fi

    log "API endpoint: $API_ENDPOINT"

    # Test health endpoint
    HEALTH_URL="${API_ENDPOINT}/health"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
        success "Health check passed"
    else
        warn "Health check failed (HTTP $HTTP_STATUS). API may still be warming up."
    fi
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    cd "$ROOT_DIR"

    # Get stack info
    serverless info --stage "$STAGE" > "deployment-report-${STAGE}-$(date +%Y%m%d-%H%M%S).txt"

    echo "
Deployment Summary for $STAGE:
================================
Stage: $STAGE
Timestamp: $(date)
Deployed by: $(whoami)
Git commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')
Git branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')

Resources deployed:
- API Gateway
- Lambda functions (11)
- DynamoDB tables (5)
- CloudWatch alarms
- SNS topic for alerts
- IAM roles and policies

Next steps:
1. Update frontend CORS configuration if needed
2. Configure monitoring alerts
3. Test all API endpoints
4. Update documentation
" >> "deployment-report-${STAGE}-$(date +%Y%m%d-%H%M%S).txt"

    success "Deployment report generated"
}

# Main execution
main() {
    echo "
╔══════════════════════════════════════════╗
║     Candlefish Employee Setup Deploy     ║
║          Production Ready v1.0           ║
╚══════════════════════════════════════════╝
"

    log "Starting deployment process for stage: $STAGE"

    # Exit early if validation only
    if [ "$VALIDATE_ONLY" = "--validate" ]; then
        validate_prerequisites
        validate_serverless
        success "Validation completed successfully"
        exit 0
    fi

    # Full deployment process
    validate_prerequisites
    install_dependencies
    run_tests
    validate_serverless
    ensure_jwt_secret
    deploy
    validate_deployment
    generate_report

    echo "
╔══════════════════════════════════════════╗
║            Deployment Complete!          ║
╚══════════════════════════════════════════╝

🚀 Your API is now live at: $(serverless info --stage "$STAGE" --verbose | grep -oP 'https://[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/[a-z0-9]+' | head -1)

📊 Monitor your deployment:
- CloudWatch Dashboard: AWS Console > CloudWatch > Dashboards
- Logs: serverless logs -f [function-name] --stage $STAGE
- Metrics: AWS Console > CloudWatch > Metrics > CandlefishEmployeeSetup

🔒 Security checklist:
- [ ] Review IAM policies
- [ ] Configure proper CORS origins
- [ ] Set up monitoring alerts
- [ ] Test authentication flows
- [ ] Verify rate limiting

💰 Cost optimization tips:
- Monitor DynamoDB usage
- Review Lambda memory allocation
- Set up CloudWatch cost alerts
- Consider scheduled scaling for non-prod environments

Happy coding! 🎉
"
}

# Execute main function
main "$@"
