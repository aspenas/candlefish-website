#!/bin/bash

# GraphQL Backend Deployment Script
# This script deploys the Tyler Setup GraphQL backend to AWS

set -e

STACK_NAME="candlefish-employee-setup-lean-prod"
REGION="us-east-1"
BUCKET_NAME="candlefish-deployment-artifacts-$(date +%s)"

echo "🚀 Starting GraphQL Backend Deployment"

# Check AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Create deployment bucket
echo "📦 Creating deployment bucket..."
aws s3 mb s3://${BUCKET_NAME} --region ${REGION} || true

# Create a simplified package.json for Lambda deployment
cat > package-lambda.json << EOF
{
  "name": "graphql-backend",
  "version": "1.0.0",
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
    "uuid": "10.0.0"
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
cp -r database lambda-package/

# Create deployment package
echo "📦 Creating deployment package..."
cd lambda-package
zip -r ../deployment-package.zip . > /dev/null
cd ..

# Upload package to S3
echo "⬆️  Uploading deployment package..."
aws s3 cp deployment-package.zip s3://${BUCKET_NAME}/deployment-package.zip

# Update CloudFormation template with S3 location
sed "s|CodeUri: ./|CodeUri: s3://${BUCKET_NAME}/deployment-package.zip|g" deploy-template.yaml > deploy-template-s3.yaml

# Deploy CloudFormation stack
echo "🏗️  Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file deploy-template-s3.yaml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides Stage=prod ServiceName=candlefish-employee-setup-lean \
    --capabilities CAPABILITY_IAM \
    --region ${REGION}

# Get outputs
echo "📋 Getting deployment outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs' \
    --output table)

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📊 Stack Outputs:"
echo "$OUTPUTS"

# Get specific endpoints
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

GRAPHQL_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`GraphQLEndpoint`].OutputValue' \
    --output text)

WEBSOCKET_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketEndpoint`].OutputValue' \
    --output text)

echo ""
echo "🌐 Endpoints:"
echo "   API Gateway: $API_ENDPOINT"
echo "   GraphQL:     $GRAPHQL_ENDPOINT"
echo "   WebSocket:   $WEBSOCKET_ENDPOINT"
echo ""

# Test GraphQL endpoint
echo "🧪 Testing GraphQL endpoint..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/health" || echo "ERROR")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed (HTTP: $HEALTH_CHECK)"
fi

# Create frontend configuration
cat > frontend-config.json << EOF
{
  "apiEndpoint": "$API_ENDPOINT",
  "graphqlEndpoint": "$GRAPHQL_ENDPOINT",
  "websocketEndpoint": "$WEBSOCKET_ENDPOINT",
  "region": "$REGION",
  "deploymentTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "📄 Frontend configuration saved to: frontend-config.json"

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf lambda-package
rm -f deployment-package.zip
rm -f package-lambda.json
rm -f deploy-template-s3.yaml

# Delete deployment bucket
aws s3 rm s3://${BUCKET_NAME}/deployment-package.zip
aws s3 rb s3://${BUCKET_NAME}

echo ""
echo "✨ GraphQL Backend successfully deployed to production!"
echo ""
echo "🔗 Next steps:"
echo "   1. Update your frontend to use the endpoints above"
echo "   2. Configure authentication secrets in AWS Secrets Manager"
echo "   3. Set up monitoring alerts in CloudWatch"
echo "   4. Test GraphQL operations using the GraphQL endpoint"
echo ""
