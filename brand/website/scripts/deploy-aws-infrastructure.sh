#!/bin/bash

# AWS Infrastructure Deployment Script for Candlefish Operational Design Atelier
# This script deploys the complete AWS infrastructure with cost optimization

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
DOMAIN_NAME="candlefish.ai"

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN} Candlefish Operational Design Atelier${NC}"
echo -e "${GREEN} AWS Infrastructure Deployment${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${YELLOW}Environment:${NC} $ENVIRONMENT"
echo -e "${YELLOW}AWS Region:${NC} $AWS_REGION"
echo -e "${YELLOW}AWS Account:${NC} $AWS_ACCOUNT_ID"
echo -e "${YELLOW}Domain:${NC} $DOMAIN_NAME"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed${NC}"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Terraform is not installed${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}AWS credentials are not configured${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Prerequisites check passed${NC}"
}

# Function to create S3 bucket for Terraform state
create_terraform_backend() {
    echo -e "${YELLOW}Creating Terraform backend...${NC}"
    
    BUCKET_NAME="candlefish-terraform-state"
    TABLE_NAME="candlefish-terraform-locks"
    
    # Create S3 bucket for state
    if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        echo -e "${GREEN}S3 bucket $BUCKET_NAME already exists${NC}"
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION" \
            --acl private
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$BUCKET_NAME" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$BUCKET_NAME" \
            --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'
        
        echo -e "${GREEN}S3 bucket $BUCKET_NAME created${NC}"
    fi
    
    # Create DynamoDB table for state locking
    if aws dynamodb describe-table --table-name "$TABLE_NAME" &>/dev/null; then
        echo -e "${GREEN}DynamoDB table $TABLE_NAME already exists${NC}"
    else
        aws dynamodb create-table \
            --table-name "$TABLE_NAME" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION"
        
        echo -e "${GREEN}DynamoDB table $TABLE_NAME created${NC}"
    fi
}

# Function to create Lambda@Edge function code
create_lambda_functions() {
    echo -e "${YELLOW}Creating Lambda@Edge function directories...${NC}"
    
    LAMBDA_DIR="terraform/modules/cloudfront/lambda"
    mkdir -p "$LAMBDA_DIR"
    
    # Create layers directory for Sharp
    LAYERS_DIR="terraform/modules/cloudfront/layers/sharp"
    mkdir -p "$LAYERS_DIR/nodejs"
    
    # Install Sharp in the layer (requires Node.js)
    if command -v npm &> /dev/null; then
        cd "$LAYERS_DIR/nodejs"
        npm init -y
        npm install sharp
        cd -
        echo -e "${GREEN}Sharp layer prepared${NC}"
    else
        echo -e "${YELLOW}npm not found - Sharp layer needs manual setup${NC}"
    fi
}

# Function to create API Gateway Lambda functions
create_api_lambda_functions() {
    echo -e "${YELLOW}Creating API Gateway Lambda functions...${NC}"
    
    API_LAMBDA_DIR="terraform/modules/api-gateway/lambda"
    mkdir -p "$API_LAMBDA_DIR"
    
    # Create API handler
    cat > "$API_LAMBDA_DIR/api-handler.js" << 'EOF'
// API Handler Lambda Function
exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const path = event.path;
    const method = event.httpMethod;
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS for CORS
    if (method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    // Route handling
    if (path.startsWith('/operational/metrics')) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                metrics: {
                    activeUsers: 42,
                    requestsPerSecond: 127,
                    latencyMs: 23,
                    errorRate: 0.001
                },
                timestamp: new Date().toISOString()
            })
        };
    }
    
    if (path.startsWith('/operational/telemetry')) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                telemetry: {
                    cpuUtilization: 34.5,
                    memoryUsage: 67.2,
                    diskIO: 123.4,
                    networkThroughput: 89.1
                },
                timestamp: new Date().toISOString()
            })
        };
    }
    
    return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Not Found' })
    };
};
EOF
    
    # Create WebSocket handler
    cat > "$API_LAMBDA_DIR/websocket-handler.js" << 'EOF'
// WebSocket Handler Lambda Function
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const apigatewaymanagementapi = new AWS.ApiGatewayManagementApi({
    endpoint: process.env.WEBSOCKET_ENDPOINT
});

exports.handler = async (event, context) => {
    const { connectionId, routeKey } = event.requestContext;
    const tableName = process.env.CONNECTIONS_TABLE;
    
    switch (routeKey) {
        case '$connect':
            await dynamodb.put({
                TableName: tableName,
                Item: {
                    connectionId,
                    connectedAt: new Date().toISOString(),
                    ttl: Math.floor(Date.now() / 1000) + 3600
                }
            }).promise();
            return { statusCode: 200 };
            
        case '$disconnect':
            await dynamodb.delete({
                TableName: tableName,
                Key: { connectionId }
            }).promise();
            return { statusCode: 200 };
            
        case '$default':
            const message = JSON.parse(event.body);
            
            // Broadcast to all connections
            const connections = await dynamodb.scan({
                TableName: tableName
            }).promise();
            
            const postCalls = connections.Items.map(async ({ connectionId }) => {
                try {
                    await apigatewaymanagementapi.postToConnection({
                        ConnectionId: connectionId,
                        Data: JSON.stringify({
                            action: 'broadcast',
                            data: message,
                            timestamp: new Date().toISOString()
                        })
                    }).promise();
                } catch (e) {
                    if (e.statusCode === 410) {
                        await dynamodb.delete({
                            TableName: tableName,
                            Key: { connectionId }
                        }).promise();
                    }
                }
            });
            
            await Promise.all(postCalls);
            return { statusCode: 200 };
            
        default:
            return { statusCode: 400 };
    }
};
EOF
    
    echo -e "${GREEN}API Lambda functions created${NC}"
}

# Function to create WAF log processor
create_waf_log_processor() {
    echo -e "${YELLOW}Creating WAF log processor...${NC}"
    
    WAF_LAMBDA_DIR="terraform/modules/waf/lambda"
    mkdir -p "$WAF_LAMBDA_DIR"
    
    cat > "$WAF_LAMBDA_DIR/waf-log-processor.py" << 'EOF'
import json
import base64
import os

def handler(event, context):
    output = []
    
    for record in event['records']:
        # Decode the log data
        payload = base64.b64decode(record['data']).decode('utf-8')
        log_data = json.loads(payload)
        
        # Process and enrich the log
        processed_log = {
            'timestamp': log_data.get('timestamp'),
            'action': log_data.get('action'),
            'clientIp': log_data.get('httpRequest', {}).get('clientIp'),
            'country': log_data.get('httpRequest', {}).get('country'),
            'uri': log_data.get('httpRequest', {}).get('uri'),
            'method': log_data.get('httpRequest', {}).get('httpMethod'),
            'terminatingRuleId': log_data.get('terminatingRuleId'),
            'environment': os.environ.get('ENVIRONMENT', 'unknown')
        }
        
        # Re-encode the processed log
        output_record = {
            'recordId': record['recordId'],
            'result': 'Ok',
            'data': base64.b64encode(
                json.dumps(processed_log).encode('utf-8')
            ).decode('utf-8')
        }
        
        output.append(output_record)
    
    return {'records': output}
EOF
    
    echo -e "${GREEN}WAF log processor created${NC}"
}

# Function to initialize Terraform
init_terraform() {
    echo -e "${YELLOW}Initializing Terraform...${NC}"
    
    cd terraform
    
    # Create terraform.tfvars
    cat > terraform.tfvars << EOF
environment = "$ENVIRONMENT"
aws_region = "$AWS_REGION"
domain_name = "$DOMAIN_NAME"
vpc_cidr = "10.0.0.0/16"

# EKS Configuration
eks_cluster_version = "1.28"
eks_node_instance_types = ["t3.medium"]
eks_node_desired_capacity = 2
eks_node_min_capacity = 1
eks_node_max_capacity = 5

# RDS Configuration
rds_engine_version = "15.4"
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20
rds_max_allocated_storage = 100

# Redis Configuration
redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

# Cost Optimization
stable_weight = 90
canary_weight = 10
enable_bot_control = false
blocked_countries = []
allowed_ips = []
blocked_ips = []
EOF
    
    terraform init
    
    echo -e "${GREEN}Terraform initialized${NC}"
}

# Function to create immediate infrastructure with AWS CLI
create_immediate_infrastructure() {
    echo -e "${YELLOW}Creating immediate infrastructure with AWS CLI...${NC}"
    
    # Create CloudFront distribution
    echo -e "${YELLOW}Creating CloudFront distribution...${NC}"
    
    DISTRIBUTION_CONFIG=$(cat << EOF
{
    "CallerReference": "candlefish-$(date +%s)",
    "Comment": "Candlefish Operational Design Atelier",
    "Enabled": true,
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-candlefish-static",
                "DomainName": "$ENVIRONMENT-candlefish-static-assets.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultRootObject": "index.html",
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-candlefish-static",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "Compress": true
    },
    "HttpVersion": "http2and3",
    "PriceClass": "PriceClass_All"
}
EOF
    )
    
    # Create the distribution
    DISTRIBUTION_ID=$(aws cloudfront create-distribution \
        --distribution-config "$DISTRIBUTION_CONFIG" \
        --query 'Distribution.Id' \
        --output text)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}CloudFront distribution created: $DISTRIBUTION_ID${NC}"
    fi
    
    # Create S3 buckets
    echo -e "${YELLOW}Creating S3 buckets...${NC}"
    
    for BUCKET in static-assets optimized-images webgl-assets user-content analytics backups; do
        BUCKET_NAME="$ENVIRONMENT-candlefish-$BUCKET"
        
        if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
            echo -e "${GREEN}Bucket $BUCKET_NAME already exists${NC}"
        else
            aws s3api create-bucket \
                --bucket "$BUCKET_NAME" \
                --region "$AWS_REGION" \
                --acl private
            
            # Enable intelligent tiering
            aws s3api put-bucket-intelligent-tiering-configuration \
                --bucket "$BUCKET_NAME" \
                --id "entire-bucket" \
                --intelligent-tiering-configuration "Status=Enabled,Tierings=[{Days=90,AccessTier=ARCHIVE_ACCESS},{Days=180,AccessTier=DEEP_ARCHIVE_ACCESS}]"
            
            echo -e "${GREEN}Bucket $BUCKET_NAME created with intelligent tiering${NC}"
        fi
    done
    
    # Create API Gateway
    echo -e "${YELLOW}Creating API Gateway...${NC}"
    
    API_ID=$(aws apigateway create-rest-api \
        --name "$ENVIRONMENT-candlefish-api" \
        --description "Candlefish Operational Design Atelier API" \
        --endpoint-configuration types=EDGE \
        --query 'id' \
        --output text)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}API Gateway created: $API_ID${NC}"
    fi
    
    # Create WebSocket API
    echo -e "${YELLOW}Creating WebSocket API...${NC}"
    
    WS_API_ID=$(aws apigatewayv2 create-api \
        --name "$ENVIRONMENT-candlefish-websocket" \
        --protocol-type WEBSOCKET \
        --route-selection-expression '$request.body.action' \
        --query 'ApiId' \
        --output text)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}WebSocket API created: $WS_API_ID${NC}"
    fi
}

# Function to generate cost report
generate_cost_report() {
    echo -e "${YELLOW}Generating cost optimization report...${NC}"
    
    cat > cost-optimization-report.md << 'EOF'
# Candlefish AWS Infrastructure Cost Optimization Report

## Estimated Monthly Costs (Production)

### Compute Services
- **CloudFront**: $50-100 (based on 1TB transfer)
- **Lambda@Edge**: $10-20 (1M requests)
- **API Gateway**: $3.50 per million requests
- **Lambda Functions**: $5-10
- **ECS/EKS**: $72 (2x t3.medium instances)

### Storage Services
- **S3 with Intelligent Tiering**: $23 per TB
- **S3 Transfer Acceleration**: $0.04 per GB
- **CloudFront to S3**: No charge (same region)

### Database Services
- **RDS PostgreSQL**: $15 (db.t3.micro)
- **ElastiCache Redis**: $13 (cache.t3.micro)
- **DynamoDB**: $0.25 per million requests

### Monitoring & Security
- **WAF**: $5 + $0.60 per million requests
- **Route 53**: $0.50 per hosted zone + $0.40 per million queries
- **CloudWatch**: $3 per dashboard + logs

### Data Transfer
- **CloudFront to Internet**: $0.085 per GB (first 10TB)
- **Cross-region replication**: $0.02 per GB
- **NAT Gateway**: $45 per month + $0.045 per GB

## Cost Optimization Strategies

### 1. Immediate Optimizations
- Enable S3 Intelligent Tiering (saves 30-70% on storage)
- Use CloudFront compression (reduces transfer by 60-80%)
- Implement aggressive caching (reduces origin requests by 90%)
- Use Lambda@Edge for dynamic content (eliminates EC2 costs)

### 2. Reserved Capacity
- Purchase Reserved Instances for EKS nodes (save 40%)
- Use Savings Plans for compute (save 30%)
- Reserve RDS capacity (save 35%)

### 3. Spot Instances
- Use Spot for non-critical workloads (save 70-90%)
- Implement graceful shutdowns
- Use mixed instance policies

### 4. Architecture Optimizations
- Use S3 Select to reduce data transfer
- Implement request coalescing
- Use SQS for async processing
- Cache API responses in ElastiCache

### 5. Monitoring & Alerts
- Set up billing alerts at $100, $500, $1000
- Use Cost Explorer for trend analysis
- Enable AWS Budgets
- Review Cost and Usage Reports weekly

## Estimated Total Monthly Cost

**Baseline**: $250-350/month
**With optimizations**: $150-200/month
**Annual savings**: $1,200-1,800

## Performance Targets vs Cost

| Metric | Target | Cost Impact |
|--------|--------|-------------|
| Concurrent Users | 1,000 | +$50/month for additional capacity |
| Latency | <100ms | CloudFront included |
| Availability | 99.99% | Multi-AZ included |
| Storage | 1TB | S3 Intelligent Tiering |
| Transfer | 5TB/month | $425 (CloudFront) |

## Recommendations

1. **Start with baseline configuration**
   - Single region deployment
   - Minimal redundancy
   - Monitor actual usage

2. **Scale based on metrics**
   - Add regions as needed
   - Increase instance sizes gradually
   - Enable features incrementally

3. **Review monthly**
   - Analyze Cost Explorer
   - Identify unused resources
   - Optimize based on patterns

EOF
    
    echo -e "${GREEN}Cost report generated: cost-optimization-report.md${NC}"
}

# Function to create monitoring dashboard
create_monitoring_dashboard() {
    echo -e "${YELLOW}Creating CloudWatch dashboard...${NC}"
    
    DASHBOARD_BODY=$(cat << EOF
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    ["AWS/CloudFront", "Requests", {"stat": "Sum"}],
                    [".", "BytesDownloaded", {"stat": "Sum"}],
                    [".", "BytesUploaded", {"stat": "Sum"}],
                    [".", "4xxErrorRate", {"stat": "Average"}],
                    [".", "5xxErrorRate", {"stat": "Average"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "CloudFront Metrics"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
                    [".", "Errors", {"stat": "Sum"}],
                    [".", "Duration", {"stat": "Average"}],
                    [".", "ConcurrentExecutions", {"stat": "Maximum"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$AWS_REGION",
                "title": "Lambda Performance"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    ["AWS/ApiGateway", "Count", {"stat": "Sum"}],
                    [".", "Latency", {"stat": "Average"}],
                    [".", "4XXError", {"stat": "Sum"}],
                    [".", "5XXError", {"stat": "Sum"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$AWS_REGION",
                "title": "API Gateway Metrics"
            }
        }
    ]
}
EOF
    )
    
    aws cloudwatch put-dashboard \
        --dashboard-name "$ENVIRONMENT-candlefish-operational" \
        --dashboard-body "$DASHBOARD_BODY"
    
    echo -e "${GREEN}CloudWatch dashboard created${NC}"
}

# Main execution
main() {
    check_prerequisites
    create_terraform_backend
    create_lambda_functions
    create_api_lambda_functions
    create_waf_log_processor
    create_immediate_infrastructure
    init_terraform
    generate_cost_report
    create_monitoring_dashboard
    
    echo ""
    echo -e "${GREEN}==================================================${NC}"
    echo -e "${GREEN} Infrastructure Setup Complete!${NC}"
    echo -e "${GREEN}==================================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review the cost-optimization-report.md"
    echo "2. Run: cd terraform && terraform plan"
    echo "3. Run: terraform apply"
    echo "4. Update DNS records to point to CloudFront"
    echo ""
    echo -e "${GREEN}CloudFront Distribution:${NC} https://console.aws.amazon.com/cloudfront/v3/home#/distributions/$DISTRIBUTION_ID"
    echo -e "${GREEN}API Gateway:${NC} https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/$ENVIRONMENT"
    echo -e "${GREEN}WebSocket API:${NC} wss://$WS_API_ID.execute-api.$AWS_REGION.amazonaws.com/$ENVIRONMENT"
    echo ""
}

# Run main function
main "$@"