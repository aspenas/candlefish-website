#!/bin/bash

# Complete the GraphQL deployment

echo "🚀 Completing GraphQL deployment..."

cd dist

# Create Lambda if it doesn't exist
if ! aws lambda get-function --function-name tyler-setup-graphql 2>/dev/null; then
  echo "Creating Lambda function..."
  aws lambda create-function \
    --function-name tyler-setup-graphql \
    --runtime nodejs18.x \
    --role arn:aws:iam::207567767039:role/tyler-setup-graphql-role \
    --handler graphql-handler.handler \
    --zip-file fileb://../graphql-function.zip \
    --timeout 30 \
    --memory-size 1024 \
    --region us-east-1 \
    --environment "Variables={STAGE=prod,NODE_ENV=production}"
fi

# Create HTTP API
API_ID=$(aws apigatewayv2 create-api \
  --name tyler-setup-graphql-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="*",AllowHeaders="*" \
  --region us-east-1 \
  --query ApiId \
  --output text)

echo "API Gateway ID: $API_ID"

# Create Lambda integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:207567767039:function:tyler-setup-graphql \
  --payload-format-version 2.0 \
  --region us-east-1 \
  --query IntegrationId \
  --output text)

# Create routes
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /graphql" \
  --target integrations/$INTEGRATION_ID \
  --region us-east-1

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /graphql" \
  --target integrations/$INTEGRATION_ID \
  --region us-east-1

# Grant permissions
aws lambda add-permission \
  --function-name tyler-setup-graphql \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:207567767039:$API_ID/*/*" \
  --region us-east-1 2>/dev/null || true

# Create deployment stage
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name prod \
  --auto-deploy \
  --region us-east-1

# Get endpoint
ENDPOINT=$(aws apigatewayv2 get-api --api-id $API_ID --region us-east-1 --query ApiEndpoint --output text)

echo "✅ GraphQL API deployed!"
echo "📍 GraphQL Endpoint: $ENDPOINT/graphql"
echo ""
echo "Test with:"
echo "curl -X POST $ENDPOINT/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{health{status}}\"}'"
