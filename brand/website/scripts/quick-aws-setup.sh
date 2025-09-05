#!/bin/bash

# Quick AWS Setup Script - Immediate Infrastructure Deployment
# Run this to immediately set up core AWS infrastructure

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE} Candlefish.ai - Quick AWS Setup${NC}"
echo -e "${BLUE} Immediate Infrastructure Deployment${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Configuration
REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
TIMESTAMP=$(date +%s)

echo -e "${GREEN}Setting up infrastructure in region: $REGION${NC}"
echo -e "${GREEN}AWS Account: $ACCOUNT_ID${NC}"
echo ""

# 1. Create S3 Buckets with Intelligent Tiering
echo -e "${YELLOW}1. Creating S3 buckets...${NC}"

create_optimized_bucket() {
    local BUCKET_NAME=$1
    local PURPOSE=$2
    
    echo -e "  Creating bucket: ${GREEN}$BUCKET_NAME${NC} for $PURPOSE"
    
    # Create bucket
    if [ "$REGION" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --acl private 2>/dev/null || echo "  Bucket exists"
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$REGION" \
            --create-bucket-configuration LocationConstraint="$REGION" \
            --acl private 2>/dev/null || echo "  Bucket exists"
    fi
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled 2>/dev/null || true
    
    # Enable intelligent tiering
    aws s3api put-bucket-intelligent-tiering-configuration \
        --bucket "$BUCKET_NAME" \
        --id "optimize-all" \
        --intelligent-tiering-configuration '{
            "Id": "optimize-all",
            "Status": "Enabled",
            "Tierings": [
                {"Days": 90, "AccessTier": "ARCHIVE_ACCESS"},
                {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
            ]
        }' 2>/dev/null || true
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
        }' 2>/dev/null || true
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" 2>/dev/null || true
}

# Create all buckets
create_optimized_bucket "candlefish-static-assets-$TIMESTAMP" "Static Assets"
create_optimized_bucket "candlefish-images-$TIMESTAMP" "Optimized Images"
create_optimized_bucket "candlefish-webgl-$TIMESTAMP" "WebGL Assets"
create_optimized_bucket "candlefish-logs-$TIMESTAMP" "Logs"

STATIC_BUCKET="candlefish-static-assets-$TIMESTAMP"
echo -e "${GREEN}✓ S3 buckets created${NC}"
echo ""

# 2. Create CloudFront Distribution
echo -e "${YELLOW}2. Creating CloudFront distribution...${NC}"

DISTRIBUTION_CONFIG=$(cat <<EOF
{
    "CallerReference": "candlefish-$TIMESTAMP",
    "Comment": "Candlefish Operational Design Atelier",
    "Enabled": true,
    "HttpVersion": "http2and3",
    "PriceClass": "PriceClass_100",
    "Origins": {
        "Quantity": 1,
        "Items": [{
            "Id": "S3-$STATIC_BUCKET",
            "DomainName": "$STATIC_BUCKET.s3.amazonaws.com",
            "S3OriginConfig": {
                "OriginAccessIdentity": ""
            },
            "OriginShield": {
                "Enabled": true,
                "OriginShieldRegion": "$REGION"
            }
        }]
    },
    "DefaultRootObject": "index.html",
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$STATIC_BUCKET",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 7,
            "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "Compress": true,
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03"
    }
}
EOF
)

CF_OUTPUT=$(aws cloudfront create-distribution --distribution-config "$DISTRIBUTION_CONFIG" 2>/dev/null || echo "{}")
CF_ID=$(echo "$CF_OUTPUT" | grep -o '"Id": "[^"]*' | grep -o '[^"]*$' | head -1)

if [ -n "$CF_ID" ]; then
    echo -e "${GREEN}✓ CloudFront distribution created: $CF_ID${NC}"
    CF_DOMAIN=$(aws cloudfront get-distribution --id "$CF_ID" --query 'Distribution.DomainName' --output text)
    echo -e "  Domain: ${BLUE}https://$CF_DOMAIN${NC}"
else
    echo -e "${YELLOW}  CloudFront distribution already exists or creation failed${NC}"
fi
echo ""

# 3. Create API Gateway
echo -e "${YELLOW}3. Creating API Gateway...${NC}"

API_OUTPUT=$(aws apigateway create-rest-api \
    --name "candlefish-api-$TIMESTAMP" \
    --description "Candlefish Operational Atelier API" \
    --endpoint-configuration "types=EDGE" 2>/dev/null || echo "{}")

API_ID=$(echo "$API_OUTPUT" | grep -o '"id": "[^"]*' | grep -o '[^"]*$')

if [ -n "$API_ID" ]; then
    echo -e "${GREEN}✓ API Gateway created: $API_ID${NC}"
    echo -e "  Endpoint: ${BLUE}https://$API_ID.execute-api.$REGION.amazonaws.com/prod${NC}"
    
    # Create a simple health check resource
    ROOT_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --query 'items[0].id' --output text)
    
    RESOURCE_OUTPUT=$(aws apigateway create-resource \
        --rest-api-id "$API_ID" \
        --parent-id "$ROOT_ID" \
        --path-part "health" 2>/dev/null || echo "{}")
    
    RESOURCE_ID=$(echo "$RESOURCE_OUTPUT" | grep -o '"id": "[^"]*' | grep -o '[^"]*$')
    
    if [ -n "$RESOURCE_ID" ]; then
        # Create GET method
        aws apigateway put-method \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method GET \
            --authorization-type NONE 2>/dev/null || true
        
        # Create mock integration
        aws apigateway put-integration \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method GET \
            --type MOCK \
            --request-templates '{"application/json": "{\"statusCode\": 200}"}' 2>/dev/null || true
        
        # Create method response
        aws apigateway put-method-response \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method GET \
            --status-code 200 2>/dev/null || true
        
        # Create integration response
        aws apigateway put-integration-response \
            --rest-api-id "$API_ID" \
            --resource-id "$RESOURCE_ID" \
            --http-method GET \
            --status-code 200 \
            --response-templates '{"application/json": "{\"status\":\"healthy\",\"timestamp\":\"$context.requestTime\"}"}' 2>/dev/null || true
        
        # Deploy API
        aws apigateway create-deployment \
            --rest-api-id "$API_ID" \
            --stage-name prod 2>/dev/null || true
        
        echo -e "${GREEN}  ✓ Health check endpoint created${NC}"
    fi
else
    echo -e "${YELLOW}  API Gateway already exists or creation failed${NC}"
fi
echo ""

# 4. Create DynamoDB Table for WebSocket Connections
echo -e "${YELLOW}4. Creating DynamoDB table...${NC}"

aws dynamodb create-table \
    --table-name "candlefish-connections-$TIMESTAMP" \
    --attribute-definitions AttributeName=connectionId,AttributeType=S \
    --key-schema AttributeName=connectionId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --tags Key=Environment,Value=production Key=Project,Value=Candlefish 2>/dev/null || echo "  Table exists"

echo -e "${GREEN}✓ DynamoDB table created${NC}"
echo ""

# 5. Create Simple Lambda Function
echo -e "${YELLOW}5. Creating Lambda function...${NC}"

# Create Lambda execution role
ROLE_OUTPUT=$(aws iam create-role \
    --role-name "candlefish-lambda-role-$TIMESTAMP" \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }' 2>/dev/null || echo "{}")

ROLE_ARN=$(echo "$ROLE_OUTPUT" | grep -o '"Arn": "[^"]*' | grep -o '[^"]*$')

if [ -n "$ROLE_ARN" ]; then
    # Attach basic execution policy
    aws iam attach-role-policy \
        --role-name "candlefish-lambda-role-$TIMESTAMP" \
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" 2>/dev/null || true
    
    # Create Lambda function code
    cat > /tmp/lambda_function.py << 'LAMBDA_CODE'
import json
import datetime

def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'message': 'Candlefish Operational Atelier API',
            'timestamp': datetime.datetime.now().isoformat(),
            'version': '1.0.0',
            'status': 'operational'
        })
    }
LAMBDA_CODE
    
    # Zip the function
    cd /tmp && zip lambda_function.zip lambda_function.py
    
    # Wait for role to propagate
    sleep 10
    
    # Create Lambda function
    LAMBDA_OUTPUT=$(aws lambda create-function \
        --function-name "candlefish-api-handler-$TIMESTAMP" \
        --runtime python3.11 \
        --role "$ROLE_ARN" \
        --handler lambda_function.lambda_handler \
        --zip-file fileb:///tmp/lambda_function.zip \
        --timeout 30 \
        --memory-size 512 \
        --architectures arm64 2>/dev/null || echo "{}")
    
    LAMBDA_ARN=$(echo "$LAMBDA_OUTPUT" | grep -o '"FunctionArn": "[^"]*' | grep -o '[^"]*$')
    
    if [ -n "$LAMBDA_ARN" ]; then
        echo -e "${GREEN}✓ Lambda function created${NC}"
        echo -e "  ARN: ${BLUE}$LAMBDA_ARN${NC}"
    fi
fi
echo ""

# 6. Create CloudWatch Dashboard
echo -e "${YELLOW}6. Creating CloudWatch dashboard...${NC}"

DASHBOARD_CONFIG=$(cat <<EOF
{
    "widgets": [
        {
            "type": "text",
            "width": 24,
            "height": 1,
            "properties": {
                "markdown": "# Candlefish Operational Design Atelier - Real-time Metrics\\n**Environment:** Production | **Region:** $REGION | **Timestamp:** $TIMESTAMP"
            }
        },
        {
            "type": "metric",
            "width": 12,
            "height": 6,
            "properties": {
                "title": "CloudFront Requests",
                "metrics": [
                    ["AWS/CloudFront", "Requests", {"stat": "Sum", "period": 300}],
                    [".", "BytesDownloaded", {"stat": "Sum", "period": 300, "yAxis": "right"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "width": 12,
            "height": 6,
            "properties": {
                "title": "API Performance",
                "metrics": [
                    ["AWS/ApiGateway", "Count", {"stat": "Sum", "period": 60}],
                    [".", "Latency", {"stat": "Average", "period": 60, "yAxis": "right"}]
                ],
                "period": 60,
                "stat": "Average",
                "region": "$REGION"
            }
        },
        {
            "type": "metric",
            "width": 8,
            "height": 6,
            "properties": {
                "title": "Lambda Invocations",
                "metrics": [
                    ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
                    [".", "Errors", {"stat": "Sum", "color": "#d62728"}],
                    [".", "Duration", {"stat": "Average", "yAxis": "right"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION"
            }
        },
        {
            "type": "metric",
            "width": 8,
            "height": 6,
            "properties": {
                "title": "S3 Storage",
                "metrics": [
                    ["AWS/S3", "BucketSizeBytes", {"stat": "Average", "period": 86400}],
                    [".", "NumberOfObjects", {"stat": "Average", "period": 86400, "yAxis": "right"}]
                ],
                "period": 86400,
                "stat": "Average",
                "region": "$REGION"
            }
        },
        {
            "type": "metric",
            "width": 8,
            "height": 6,
            "properties": {
                "title": "Error Rates",
                "metrics": [
                    ["AWS/CloudFront", "4xxErrorRate", {"stat": "Average", "color": "#ff9900"}],
                    [".", "5xxErrorRate", {"stat": "Average", "color": "#d62728"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1"
            }
        }
    ]
}
EOF
)

aws cloudwatch put-dashboard \
    --dashboard-name "Candlefish-Operational-$TIMESTAMP" \
    --dashboard-body "$DASHBOARD_CONFIG" 2>/dev/null || true

echo -e "${GREEN}✓ CloudWatch dashboard created${NC}"
echo ""

# 7. Create SNS Topic for Alerts
echo -e "${YELLOW}7. Creating SNS topic for alerts...${NC}"

SNS_OUTPUT=$(aws sns create-topic --name "candlefish-alerts-$TIMESTAMP" 2>/dev/null || echo "{}")
SNS_ARN=$(echo "$SNS_OUTPUT" | grep -o '"TopicArn": "[^"]*' | grep -o '[^"]*$')

if [ -n "$SNS_ARN" ]; then
    echo -e "${GREEN}✓ SNS topic created: $SNS_ARN${NC}"
    
    # Create CloudWatch alarm for high error rate
    aws cloudwatch put-metric-alarm \
        --alarm-name "candlefish-high-error-rate-$TIMESTAMP" \
        --alarm-description "Alert when error rate exceeds 1%" \
        --metric-name 4xxErrorRate \
        --namespace AWS/CloudFront \
        --statistic Average \
        --period 300 \
        --threshold 1 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$SNS_ARN" 2>/dev/null || true
    
    echo -e "${GREEN}  ✓ CloudWatch alarm created${NC}"
fi
echo ""

# 8. Output Summary
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE} Setup Complete!${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo -e "${GREEN}Resources Created:${NC}"
echo ""
echo -e "📦 ${YELLOW}S3 Buckets:${NC}"
echo -e "   • candlefish-static-assets-$TIMESTAMP"
echo -e "   • candlefish-images-$TIMESTAMP"
echo -e "   • candlefish-webgl-$TIMESTAMP"
echo -e "   • candlefish-logs-$TIMESTAMP"
echo ""

if [ -n "$CF_DOMAIN" ]; then
    echo -e "🌐 ${YELLOW}CloudFront:${NC}"
    echo -e "   • Distribution ID: $CF_ID"
    echo -e "   • Domain: ${BLUE}https://$CF_DOMAIN${NC}"
    echo ""
fi

if [ -n "$API_ID" ]; then
    echo -e "🚀 ${YELLOW}API Gateway:${NC}"
    echo -e "   • API ID: $API_ID"
    echo -e "   • Endpoint: ${BLUE}https://$API_ID.execute-api.$REGION.amazonaws.com/prod${NC}"
    echo -e "   • Health: ${BLUE}https://$API_ID.execute-api.$REGION.amazonaws.com/prod/health${NC}"
    echo ""
fi

echo -e "📊 ${YELLOW}Monitoring:${NC}"
echo -e "   • Dashboard: ${BLUE}https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=Candlefish-Operational-$TIMESTAMP${NC}"
echo -e "   • Logs: ${BLUE}https://console.aws.amazon.com/cloudwatch/home?region=$REGION#logsV2:log-groups${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload static content to S3:"
echo "   aws s3 sync ./build s3://candlefish-static-assets-$TIMESTAMP/"
echo ""
echo "2. Test CloudFront distribution:"
echo "   curl -I https://$CF_DOMAIN"
echo ""
echo "3. Test API endpoint:"
echo "   curl https://$API_ID.execute-api.$REGION.amazonaws.com/prod/health"
echo ""
echo "4. Configure custom domain in Route 53"
echo "5. Enable WAF protection"
echo "6. Set up CI/CD pipeline"
echo ""
echo -e "${GREEN}Infrastructure is ready for deployment!${NC}"

# Save configuration
cat > candlefish-aws-config.json << EOF
{
    "timestamp": "$TIMESTAMP",
    "region": "$REGION",
    "account_id": "$ACCOUNT_ID",
    "s3_bucket": "$STATIC_BUCKET",
    "cloudfront_id": "$CF_ID",
    "cloudfront_domain": "$CF_DOMAIN",
    "api_gateway_id": "$API_ID",
    "lambda_arn": "$LAMBDA_ARN",
    "sns_topic": "$SNS_ARN"
}
EOF

echo ""
echo -e "${YELLOW}Configuration saved to: candlefish-aws-config.json${NC}"