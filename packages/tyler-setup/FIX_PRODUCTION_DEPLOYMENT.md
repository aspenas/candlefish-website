# 🚨 CRITICAL: Fix Production Deployment - GraphQL Backend Missing

## Problem Summary

The Tyler Setup platform appears in "demo mode" because:
- **Frontend**: Expects GraphQL API at `/graphql` endpoint
- **Backend**: Only REST API deployed, no GraphQL endpoint exists
- **Result**: Complete communication failure between frontend and backend

## Immediate Actions Required

### Option 1: Deploy GraphQL Backend (RECOMMENDED)

1. **Deploy the GraphQL Gateway Lambda**
   ```bash
   cd /Users/patricksmith/candlefish-ai/packages/tyler-setup/lambda/graphql-gateway
   npm install
   zip -r graphql-gateway.zip .
   aws lambda create-function \
     --function-name candlefish-employee-setup-prod-graphql \
     --runtime nodejs18.x \
     --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role \
     --handler index.handler \
     --zip-file fileb://graphql-gateway.zip \
     --timeout 30 \
     --memory-size 1024
   ```

2. **Add GraphQL endpoint to API Gateway**
   ```bash
   aws apigateway put-method \
     --rest-api-id 5x6gs2o6b6 \
     --resource-id $(aws apigateway get-resources --rest-api-id 5x6gs2o6b6 --query 'items[?path==`/`].id' --output text) \
     --http-method POST \
     --authorization-type NONE
   
   aws apigateway put-integration \
     --rest-api-id 5x6gs2o6b6 \
     --resource-id $(aws apigateway get-resources --rest-api-id 5x6gs2o6b6 --query 'items[?path==`/`].id' --output text) \
     --http-method POST \
     --type AWS_PROXY \
     --integration-http-method POST \
     --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$(aws sts get-caller-identity --query Account --output text):function:candlefish-employee-setup-prod-graphql/invocations
   ```

3. **Deploy WebSocket support for subscriptions**
   ```bash
   cd /Users/patricksmith/candlefish-ai/packages/tyler-setup/lambda/websocket-service
   npm install
   zip -r websocket.zip .
   # Deploy WebSocket API Gateway and Lambda
   ```

4. **Update and redeploy frontend with correct endpoints**
   ```bash
   cd /Users/patricksmith/candlefish-ai/packages/tyler-setup/frontend
   echo "VITE_GRAPHQL_ENDPOINT=https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql" > .env.production
   echo "VITE_WS_ENDPOINT=wss://[websocket-api-id].execute-api.us-east-1.amazonaws.com/prod" >> .env.production
   npm run build
   aws s3 sync dist/ s3://candlefish-employee-setup-lean-prod-web/ --delete
   aws cloudfront create-invalidation --distribution-id [CF-DIST-ID] --paths "/*"
   ```

### Option 2: Convert Frontend to REST (NOT Recommended)

This would require rewriting the entire frontend to use REST instead of GraphQL:
- Replace Apollo Client with fetch/axios
- Rewrite all queries and mutations
- Remove real-time subscriptions
- Significant development effort

### Option 3: Deploy the Full Stack (Clean Slate)

1. **Use the original full-stack deployment**
   ```bash
   cd /Users/patricksmith/candlefish-ai/packages/tyler-setup
   ./DEPLOY_PRODUCTION.sh
   ```

2. **Ensure all services are deployed**:
   - ECS Fargate for GraphQL server
   - RDS PostgreSQL database
   - ElastiCache Redis
   - Lambda functions for federation
   - WebSocket API Gateway

## Current State vs Expected State

### Current State (BROKEN)
```
Frontend (React + Apollo) ---X---> API Gateway (REST only)
                                         |
                                         v
                                    Lambda Functions
                                    (REST handlers)
```

### Expected State (WORKING)
```
Frontend (React + Apollo) -------> API Gateway (/graphql)
         |                              |
         |                              v
         |                         GraphQL Gateway
         |                              |
         |                              v
         |                    [Federation Services]
         |                     /        |        \
         v                   Auth   Secrets   Users
    WebSocket API <--------> Lambda  Lambda  Lambda
    (Subscriptions)            |        |        |
                               v        v        v
                            DynamoDB   RDS   Secrets
                                             Manager
```

## Validation Steps

1. **Test GraphQL endpoint**
   ```bash
   curl -X POST https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "{ __typename }"}'
   ```

2. **Test authentication flow**
   ```bash
   curl -X POST https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "mutation { login(input: { email: \"admin@candlefish.ai\", password: \"test\" }) { success token } }"}'
   ```

3. **Verify WebSocket connections**
   ```javascript
   const ws = new WebSocket('wss://[api-id].execute-api.us-east-1.amazonaws.com/prod');
   ws.onopen = () => console.log('Connected');
   ws.onmessage = (e) => console.log('Message:', e.data);
   ```

## Timeline

- **Option 1**: 2-4 hours to deploy and test GraphQL backend
- **Option 2**: 2-3 days to rewrite frontend for REST
- **Option 3**: 4-6 hours for complete redeployment

## Recommendation

**Go with Option 1** - Deploy the missing GraphQL backend:
- Least disruptive
- Preserves existing frontend work
- Enables all planned features
- Can be done immediately

## Next Steps

1. **Immediate**: Deploy GraphQL Gateway Lambda
2. **Today**: Add /graphql endpoint to API Gateway
3. **Today**: Test authentication and basic queries
4. **Tomorrow**: Deploy WebSocket support
5. **Tomorrow**: Full integration testing

---

**Status**: URGENT - Production is currently non-functional
**Owner**: DevOps Team
**Deadline**: ASAP
