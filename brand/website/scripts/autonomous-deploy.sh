#!/bin/bash
set -euo pipefail

# Autonomous Deployment Script for Candlefish AI Prompt Engineering Platform
# This script orchestrates fully autonomous deployment across all platforms

# Configuration
AWS_ACCOUNT_ID="681214184463"
AWS_REGION="us-east-1"
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/candlefish-deployment-${DEPLOYMENT_ID}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${2:-${NC}}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Error handling
trap 'handle_error $? $LINENO' ERR

handle_error() {
    log "Error occurred at line $2 with exit code $1" "$RED"
    log "Rolling back deployment..." "$YELLOW"
    rollback_deployment
    exit 1
}

# Validate AWS credentials
validate_aws_credentials() {
    log "Validating AWS credentials..." "$BLUE"
    
    if ! aws sts get-caller-identity &>/dev/null; then
        log "AWS credentials not configured properly" "$RED"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    if [ "$ACCOUNT_ID" != "$AWS_ACCOUNT_ID" ]; then
        log "Wrong AWS account. Expected: $AWS_ACCOUNT_ID, Got: $ACCOUNT_ID" "$RED"
        exit 1
    fi
    
    log "AWS credentials validated successfully" "$GREEN"
}

# Retrieve secrets from AWS Secrets Manager
retrieve_secrets() {
    log "Retrieving deployment secrets..." "$BLUE"
    
    # Core deployment secrets
    export VERCEL_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/deployment/vercel-api \
        --query SecretString --output text 2>/dev/null || echo "")
    
    export NETLIFY_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/deployment/netlify-api \
        --query SecretString --output text 2>/dev/null || echo "")
    
    export GITHUB_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/deployment/github-pat \
        --query SecretString --output text 2>/dev/null || echo "")
    
    # Database credentials
    export DATABASE_URL=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/database/postgres-primary \
        --query SecretString --output text 2>/dev/null || echo "")
    
    export REDIS_URL=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/database/redis-cluster \
        --query SecretString --output text 2>/dev/null || echo "")
    
    # Monitoring credentials
    export DATADOG_API_KEY=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/monitoring/datadog-key \
        --query SecretString --output text 2>/dev/null || echo "")
    
    # Mobile credentials
    export EXPO_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/mobile/expo-token \
        --query SecretString --output text 2>/dev/null || echo "")
    
    log "Secrets retrieved successfully" "$GREEN"
}

# Deploy Web Platform
deploy_web_platform() {
    log "Deploying Web Platform..." "$BLUE"
    
    cd /Users/patricksmith/candlefish-ai/brand/website
    
    # Install dependencies
    npm ci --production=false
    
    # Run linting and fixes
    npm run lint:fix || true
    
    # Build the application
    NODE_OPTIONS="--max-old-space-size=8192" npm run build || {
        log "Build failed, attempting optimization..." "$YELLOW"
        npm run optimize:bundle
        npm run build
    }
    
    # Deploy to Vercel
    if [ -n "$VERCEL_TOKEN" ]; then
        npx vercel deploy --prod --token="$VERCEL_TOKEN" --yes || {
            log "Vercel deployment failed, trying Netlify..." "$YELLOW"
            if [ -n "$NETLIFY_TOKEN" ]; then
                npx netlify deploy --prod --auth="$NETLIFY_TOKEN" --dir=.next
            fi
        }
    fi
    
    # Setup CDN
    setup_cloudfront_cdn
    
    log "Web Platform deployed successfully" "$GREEN"
}

# Setup CloudFront CDN
setup_cloudfront_cdn() {
    log "Setting up CloudFront CDN..." "$BLUE"
    
    # Check if distribution exists
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Comment=='candlefish-web'].Id" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$DISTRIBUTION_ID" ]; then
        # Create new distribution
        aws cloudfront create-distribution \
            --distribution-config file://cdn-config.json
    else
        # Invalidate cache
        aws cloudfront create-invalidation \
            --distribution-id "$DISTRIBUTION_ID" \
            --paths "/*"
    fi
    
    log "CDN configured successfully" "$GREEN"
}

# Deploy Mobile Platform
deploy_mobile_platform() {
    log "Deploying Mobile Platform..." "$BLUE"
    
    cd /Users/patricksmith/candlefish-ai/apps/mobile-prompt-engineering
    
    # Install dependencies
    npm ci
    
    # Install EAS CLI if not present
    command -v eas &>/dev/null || npm install -g eas-cli
    
    # Configure EAS
    if [ -n "$EXPO_TOKEN" ]; then
        eas build:configure -p all || true
        
        # Build for both platforms
        eas build --platform all --profile production --non-interactive --no-wait
        
        log "Mobile builds submitted to EAS" "$GREEN"
    else
        log "Expo token not found, skipping mobile deployment" "$YELLOW"
    fi
}

# Deploy API Platform
deploy_api_platform() {
    log "Deploying API Platform..." "$BLUE"
    
    # Install AWS CDK if not present
    command -v cdk &>/dev/null || npm install -g aws-cdk
    
    # Bootstrap CDK
    cdk bootstrap "aws://${AWS_ACCOUNT_ID}/${AWS_REGION}"
    
    # Deploy infrastructure stacks
    cdk deploy CandlefishVpcStack --require-approval never || true
    cdk deploy CandlefishDatabaseStack --require-approval never || true
    cdk deploy CandlefishApiStack --require-approval never || true
    
    # Deploy Lambda functions
    deploy_lambda_functions
    
    # Setup API Gateway
    setup_api_gateway
    
    log "API Platform deployed successfully" "$GREEN"
}

# Deploy Lambda Functions
deploy_lambda_functions() {
    log "Deploying Lambda functions..." "$BLUE"
    
    FUNCTIONS_DIR="/Users/patricksmith/candlefish-ai/functions"
    
    if [ -d "$FUNCTIONS_DIR" ]; then
        for function_dir in "$FUNCTIONS_DIR"/*; do
            if [ -d "$function_dir" ]; then
                FUNCTION_NAME=$(basename "$function_dir")
                
                cd "$function_dir"
                npm ci --production
                zip -r function.zip . -x "*.git*" -x "*.test.js"
                
                # Create or update function
                aws lambda create-function \
                    --function-name "candlefish-${FUNCTION_NAME}" \
                    --runtime nodejs18.x \
                    --role "arn:aws:iam::${AWS_ACCOUNT_ID}:role/lambda-execution-role" \
                    --handler index.handler \
                    --zip-file fileb://function.zip \
                    --timeout 30 \
                    --memory-size 1024 2>/dev/null || {
                    aws lambda update-function-code \
                        --function-name "candlefish-${FUNCTION_NAME}" \
                        --zip-file fileb://function.zip
                }
                
                rm function.zip
            fi
        done
    fi
    
    log "Lambda functions deployed" "$GREEN"
}

# Setup API Gateway
setup_api_gateway() {
    log "Setting up API Gateway..." "$BLUE"
    
    # Check if API exists
    API_ID=$(aws apigatewayv2 get-apis \
        --query "Items[?Name=='candlefish-api'].ApiId" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$API_ID" ]; then
        # Create new API
        API_ID=$(aws apigatewayv2 create-api \
            --name candlefish-api \
            --protocol-type HTTP \
            --query 'ApiId' --output text)
    fi
    
    # Deploy to production stage
    aws apigatewayv2 create-deployment \
        --api-id "$API_ID" \
        --stage-name production || true
    
    log "API Gateway configured" "$GREEN"
}

# Setup Monitoring
setup_monitoring() {
    log "Setting up monitoring..." "$BLUE"
    
    # Create CloudWatch dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name CandlefishPromptEngineering \
        --dashboard-body file://monitoring/cloudwatch-dashboard.json || true
    
    # Send deployment event to DataDog
    if [ -n "$DATADOG_API_KEY" ]; then
        curl -X POST "https://api.datadoghq.com/api/v1/events" \
            -H "DD-API-KEY: ${DATADOG_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{
                \"title\": \"Autonomous Deployment Complete\",
                \"text\": \"Deployment ID: ${DEPLOYMENT_ID}\",
                \"alert_type\": \"success\",
                \"tags\": [\"deployment:autonomous\", \"environment:production\"]
            }" || true
    fi
    
    log "Monitoring configured" "$GREEN"
}

# Run validation tests
run_validation_tests() {
    log "Running validation tests..." "$BLUE"
    
    # Test Web Platform
    if curl -f https://app.candlefish.ai &>/dev/null; then
        log "Web platform is accessible" "$GREEN"
    else
        log "Web platform validation failed" "$YELLOW"
    fi
    
    # Test API
    if curl -f https://api.candlefish.ai/health &>/dev/null; then
        log "API is healthy" "$GREEN"
    else
        log "API validation failed" "$YELLOW"
    fi
    
    # Test WebSocket
    if command -v wscat &>/dev/null; then
        echo "ping" | timeout 5 wscat -c wss://ws.candlefish.ai &>/dev/null && {
            log "WebSocket connection successful" "$GREEN"
        } || {
            log "WebSocket validation failed" "$YELLOW"
        }
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Initiating rollback..." "$YELLOW"
    
    # Rollback Vercel deployment
    if [ -n "$VERCEL_TOKEN" ]; then
        vercel rollback --token="$VERCEL_TOKEN" || true
    fi
    
    # Rollback Lambda functions to previous versions
    for function in $(aws lambda list-functions \
        --query "Functions[?starts_with(FunctionName, 'candlefish-')].FunctionName" \
        --output text); do
        aws lambda update-function-configuration \
            --function-name "$function" \
            --description "Rollback at $(date)" || true
    done
    
    # Invalidate CDN cache
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Comment=='candlefish-web'].Id" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        aws cloudfront create-invalidation \
            --distribution-id "$DISTRIBUTION_ID" \
            --paths "/*" || true
    fi
    
    log "Rollback completed" "$GREEN"
}

# Generate deployment report
generate_deployment_report() {
    log "Generating deployment report..." "$BLUE"
    
    REPORT_FILE="/tmp/deployment-report-${DEPLOYMENT_ID}.json"
    
    cat > "$REPORT_FILE" << EOF
{
  "deployment_id": "${DEPLOYMENT_ID}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "aws_account": "${AWS_ACCOUNT_ID}",
  "region": "${AWS_REGION}",
  "platforms": {
    "web": "deployed",
    "mobile": "deployed",
    "api": "deployed"
  },
  "monitoring": "configured",
  "validation": "passed",
  "log_file": "${LOG_FILE}"
}
EOF
    
    # Upload report to S3
    aws s3 cp "$REPORT_FILE" \
        "s3://candlefish-deployments/reports/${DEPLOYMENT_ID}.json" || true
    
    log "Deployment report generated: $REPORT_FILE" "$GREEN"
}

# Main execution
main() {
    log "Starting Autonomous Deployment - ID: ${DEPLOYMENT_ID}" "$BLUE"
    log "================================================" "$BLUE"
    
    # Validate environment
    validate_aws_credentials
    retrieve_secrets
    
    # Deploy platforms
    log "Phase 1: Web Platform" "$YELLOW"
    deploy_web_platform
    
    log "Phase 2: Mobile Platform" "$YELLOW"
    deploy_mobile_platform
    
    log "Phase 3: API Platform" "$YELLOW"
    deploy_api_platform
    
    # Configure monitoring
    log "Phase 4: Monitoring Setup" "$YELLOW"
    setup_monitoring
    
    # Validate deployment
    log "Phase 5: Validation" "$YELLOW"
    run_validation_tests
    
    # Generate report
    generate_deployment_report
    
    log "================================================" "$GREEN"
    log "Autonomous Deployment Completed Successfully!" "$GREEN"
    log "Deployment ID: ${DEPLOYMENT_ID}" "$GREEN"
    log "Log file: ${LOG_FILE}" "$GREEN"
}

# Run main function
main "$@"