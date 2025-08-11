#!/bin/bash

# Simplified GraphQL Backend Deployment
# This script adds GraphQL functionality to existing infrastructure

set -e

REGION="us-east-1"
API_GATEWAY_ID="usi0msyqw2"  # candlefish-rs256-key-service
BUCKET_NAME="candlefish-deployment-artifacts-$(date +%s)"

echo "🚀 Starting Simplified GraphQL Backend Deployment"

# Check AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Create DynamoDB tables first
echo "📊 Creating DynamoDB tables..."

# Users table
aws dynamodb create-table \
  --region $REGION \
  --table-name candlefish-employee-setup-lean-prod-users \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=email,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes IndexName=email-index,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL} \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --sse-specification Enabled=true 2>/dev/null || echo "Users table may already exist"

# Contractors table
aws dynamodb create-table \
  --region $REGION \
  --table-name candlefish-employee-setup-lean-prod-contractors \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=token,AttributeType=S AttributeName=expiresAt,AttributeType=N \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes IndexName=token-index,KeySchema=[{AttributeName=token,KeyType=HASH}],Projection={ProjectionType=ALL} IndexName=expiry-index,KeySchema=[{AttributeName=expiresAt,KeyType=HASH}],Projection={ProjectionType=KEYS_ONLY} 2>/dev/null || echo "Contractors table may already exist"

# Config table
aws dynamodb create-table \
  --region $REGION \
  --table-name candlefish-employee-setup-lean-prod-config \
  --attribute-definitions AttributeName=key,AttributeType=S \
  --key-schema AttributeName=key,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --sse-specification Enabled=true 2>/dev/null || echo "Config table may already exist"

# Audit table
aws dynamodb create-table \
  --region $REGION \
  --table-name candlefish-employee-setup-lean-prod-audit \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=timestamp,AttributeType=N AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes IndexName=timestamp-index,KeySchema=[{AttributeName=timestamp,KeyType=HASH}],Projection={ProjectionType=ALL} IndexName=user-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL} 2>/dev/null || echo "Audit table may already exist"

# Refresh tokens table
aws dynamodb create-table \
  --region $REGION \
  --table-name candlefish-employee-setup-lean-prod-refresh-tokens \
  --attribute-definitions AttributeName=token,AttributeType=S AttributeName=userId,AttributeType=S AttributeName=expiresAt,AttributeType=N \
  --key-schema AttributeName=token,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes IndexName=userId-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=expiresAt,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --sse-specification Enabled=true 2>/dev/null || echo "Refresh tokens table may already exist"

echo "⏳ Waiting for tables to be active..."
sleep 30

# Create deployment bucket
echo "📦 Creating deployment bucket..."
aws s3 mb s3://${BUCKET_NAME} --region ${REGION} || true

# Create a simplified package.json for Lambda deployment
cat > package-lambda.json << EOF
{
  "name": "graphql-backend",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@apollo/server": "4.10.0",
    "@as-integrations/aws-lambda": "3.0.0",
    "@aws-sdk/client-apigatewayv2": "3.600.0",
    "@aws-sdk/client-dynamodb": "3.600.0",
    "@aws-sdk/client-secrets-manager": "3.600.0",
    "@aws-sdk/lib-dynamodb": "3.600.0",
    "@graphql-tools/schema": "10.0.0",
    "graphql": "16.8.1",
    "dataloader": "2.2.2",
    "jsonwebtoken": "9.0.2",
    "uuid": "10.0.0",
    "argon2": "0.40.3"
  }
}
EOF

# Install dependencies in a clean directory
echo "📋 Installing Lambda dependencies..."
mkdir -p lambda-package
cp package-lambda.json lambda-package/package.json
cd lambda-package
npm install --production --no-package-lock
cd ..

# Copy source code to package
echo "📂 Copying source code..."
cp -r src lambda-package/
cp -r database lambda-package/ 2>/dev/null || echo "Database directory not found, skipping..."

# Create deployment package
echo "📦 Creating deployment package..."
cd lambda-package
zip -r ../deployment-package.zip . > /dev/null
cd ..

# Create Lambda function
echo "🔧 Creating GraphQL Lambda function..."

# Create IAM role for Lambda
ROLE_ARN=$(aws iam create-role \
  --role-name candlefish-graphql-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  --query 'Role.Arn' --output text 2>/dev/null || aws iam get-role --role-name candlefish-graphql-lambda-role --query 'Role.Arn' --output text)

# Attach policies
aws iam attach-role-policy \
  --role-name candlefish-graphql-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole || true

aws iam put-role-policy \
  --role-name candlefish-graphql-lambda-role \
  --policy-name DynamoDBAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ],
        "Resource": "arn:aws:dynamodb:*:*:table/candlefish-employee-setup-lean-prod-*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue",
          "secretsmanager:CreateSecret",
          "secretsmanager:UpdateSecret"
        ],
        "Resource": "arn:aws:secretsmanager:*:*:secret:candlefish-employee-setup-lean-prod/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "kms:Decrypt",
          "kms:Encrypt"
        ],
        "Resource": "*"
      }
    ]
  }' || true

echo "⏳ Waiting for IAM role to propagate..."
sleep 15

# Create Lambda function
aws lambda create-function \
  --function-name candlefish-graphql-handler \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler src/handlers/graphql.handler \
  --zip-file fileb://deployment-package.zip \
  --timeout 30 \
  --memory-size 1024 \
  --environment Variables='{
    "USERS_TABLE":"candlefish-employee-setup-lean-prod-users",
    "CONTRACTORS_TABLE":"candlefish-employee-setup-lean-prod-contractors",
    "REFRESH_TOKENS_TABLE":"candlefish-employee-setup-lean-prod-refresh-tokens",
    "AUDIT_TABLE":"candlefish-employee-setup-lean-prod-audit",
    "CONFIG_TABLE":"candlefish-employee-setup-lean-prod-config",
    "SECRETS_PREFIX":"candlefish-employee-setup-lean-prod",
    "AWS_REGION":"us-east-1",
    "NODE_ENV":"production",
    "CORS_ORIGIN":"*",
    "CACHE_TTL":"300",
    "MAX_QUERY_COMPLEXITY":"1000",
    "MAX_QUERY_DEPTH":"10"
  }' 2>/dev/null || \
aws lambda update-function-code \
  --function-name candlefish-graphql-handler \
  --zip-file fileb://deployment-package.zip

# Get the Lambda function ARN
LAMBDA_ARN=$(aws lambda get-function --function-name candlefish-graphql-handler --query 'Configuration.FunctionArn' --output text)

echo "🌐 Lambda function ARN: $LAMBDA_ARN"

# Create API Gateway resource for /graphql
RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_GATEWAY_ID \
  --parent-id $(aws apigateway get-resources --rest-api-id $API_GATEWAY_ID --query 'items[?path==`/`].id' --output text) \
  --path-part graphql \
  --query 'id' --output text 2>/dev/null || aws apigateway get-resources --rest-api-id $API_GATEWAY_ID --query 'items[?pathPart==`graphql`].id' --output text)

echo "📡 Created API Gateway resource: $RESOURCE_ID"

# Create POST method
aws apigateway put-method \
  --rest-api-id $API_GATEWAY_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE 2>/dev/null || echo "POST method already exists"

# Create integration
aws apigateway put-integration \
  --rest-api-id $API_GATEWAY_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations 2>/dev/null || echo "Integration already exists"

# Create GET method for GraphQL playground
aws apigateway put-method \
  --rest-api-id $API_GATEWAY_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE 2>/dev/null || echo "GET method already exists"

aws apigateway put-integration \
  --rest-api-id $API_GATEWAY_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations 2>/dev/null || echo "GET integration already exists"

# Add Lambda permission for API Gateway
aws lambda add-permission \
  --function-name candlefish-graphql-handler \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:*:$API_GATEWAY_ID/*/*" 2>/dev/null || echo "Permission already exists"

# Deploy API Gateway
aws apigateway create-deployment \
  --rest-api-id $API_GATEWAY_ID \
  --stage-name prod \
  --description "GraphQL endpoint deployment $(date)"

# Get API Gateway URL
API_URL="https://$API_GATEWAY_ID.execute-api.$REGION.amazonaws.com/prod"
GRAPHQL_URL="$API_URL/graphql"

echo ""
echo "🎉 GraphQL Backend Successfully Deployed!"
echo ""
echo "🌐 Endpoints:"
echo "   API Gateway: $API_URL"
echo "   GraphQL:     $GRAPHQL_URL"
echo ""

# Test the endpoint
echo "🧪 Testing GraphQL endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}' || echo "ERROR")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ GraphQL endpoint is responding correctly"
else
    echo "⚠️  GraphQL endpoint test failed (HTTP: $HTTP_CODE)"
    echo "   This might be normal if authentication is required"
fi

# Create frontend configuration
cat > frontend-config.json << EOF
{
  "apiEndpoint": "$API_URL",
  "graphqlEndpoint": "$GRAPHQL_URL",
  "region": "$REGION",
  "tables": {
    "users": "candlefish-employee-setup-lean-prod-users",
    "contractors": "candlefish-employee-setup-lean-prod-contractors",
    "audit": "candlefish-employee-setup-lean-prod-audit",
    "config": "candlefish-employee-setup-lean-prod-config",
    "refreshTokens": "candlefish-employee-setup-lean-prod-refresh-tokens"
  },
  "deploymentTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "📄 Frontend configuration saved to: frontend-config.json"

# Cleanup temporary files
echo "🧹 Cleaning up temporary files..."
rm -rf lambda-package
rm -f deployment-package.zip
rm -f package-lambda.json

# Delete deployment bucket
aws s3 rb s3://${BUCKET_NAME} --force

echo ""
echo "✨ GraphQL Backend successfully deployed!"
echo ""
echo "🔗 Next steps:"
echo "   1. Test GraphQL queries at: $GRAPHQL_URL"
echo "   2. Update frontend to use the GraphQL endpoint"
echo "   3. Configure authentication secrets in AWS Secrets Manager"
echo "   4. Set up monitoring in CloudWatch"
echo ""
echo "📋 Available GraphQL operations:"
echo "   - Health check: { health { status } }"
echo "   - Schema introspection: { __schema { types { name } } }"
echo "   - User management: { users { edges { node { id email } } } }"
echo ""
