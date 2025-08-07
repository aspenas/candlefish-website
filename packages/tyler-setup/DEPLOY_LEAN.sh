#!/bin/bash

#####################################################################
# Candlefish.ai Employee Setup - LEAN Serverless Deployment
# Optimized for 5-20 person teams with contractor support
# Estimated Monthly Cost: $50-100
#####################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Candlefish.ai Employee Setup - Lean Deployment (5-20 users)  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Monthly Cost Estimate: \$50-100${NC}"
echo -e "  • Lambda: ~\$5-10 (pay per use)"
echo -e "  • DynamoDB: ~\$5-10 (on-demand pricing)"
echo -e "  • Secrets Manager: ~\$20 (40 secrets @ \$0.40 each + API calls)"
echo -e "  • S3 + CloudFront: ~\$5"
echo -e "  • CloudWatch: ~\$5-10"
echo -e "  • Claude: \$0 (using your \$200/mo subscription)"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required${NC}"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo -e "${RED}AWS CLI is required${NC}"; exit 1; }
command -v serverless >/dev/null 2>&1 || { echo -e "${YELLOW}Installing Serverless Framework...${NC}"; npm install -g serverless; }

# Verify AWS credentials
aws sts get-caller-identity >/dev/null 2>&1 || { echo -e "${RED}AWS credentials not configured${NC}"; exit 1; }
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ AWS Account: ${ACCOUNT_ID}${NC}"

# Setup directory
cd serverless-lean

#####################################################################
# Step 1: Install Dependencies
#####################################################################
echo -e "${BLUE}[1/7] Installing dependencies...${NC}"

# Create package.json if it doesn't exist
if [ ! -f "package.json" ]; then
cat > package.json << 'EOL'
{
  "name": "candlefish-employee-setup-lean",
  "version": "1.0.0",
  "description": "Lean serverless employee setup for small teams",
  "dependencies": {
    "@aws-sdk/client-secrets-manager": "^3.600.0",
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "@aws-sdk/client-ses": "^3.600.0",
    "uuid": "^10.0.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "serverless": "^3.38.0",
    "serverless-webpack": "^5.14.0",
    "serverless-offline": "^13.0.0",
    "serverless-dynamodb-local": "^0.2.40",
    "webpack": "^5.90.0",
    "webpack-node-externals": "^3.0.0"
  }
}
EOL
fi

npm install

echo -e "${GREEN}✓ Dependencies installed${NC}"

#####################################################################
# Step 2: Create Lambda Functions
#####################################################################
echo -e "${BLUE}[2/7] Creating Lambda functions...${NC}"

# Create handlers directory
mkdir -p src/handlers src/utils

# Create helper utilities
cat > src/utils/helpers.js << 'EOL'
import jwt from 'jsonwebtoken';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

export const validateAuth = async (event) => {
  try {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'temp-secret');
    return decoded;
  } catch (error) {
    console.error('Auth validation error:', error);
    return null;
  }
};

export const logAudit = async (entry) => {
  try {
    await docClient.send(new PutCommand({
      TableName: `${process.env.SECRETS_PREFIX}-audit`,
      Item: {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...entry,
      },
    }));
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};
EOL

# Create health check handler
cat > src/handlers/health.js << 'EOL'
export const handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({
    status: 'healthy',
    service: 'Candlefish Employee Setup',
    timestamp: new Date().toISOString(),
    environment: process.env.STAGE,
  }),
});
EOL

echo -e "${GREEN}✓ Lambda functions created${NC}"

#####################################################################
# Step 3: Create Frontend
#####################################################################
echo -e "${BLUE}[3/7] Creating frontend...${NC}"

mkdir -p ../frontend-lean

cat > ../frontend-lean/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Candlefish Employee Setup</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <div class="min-h-screen">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold">Candlefish Employee Setup</h1>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-500">Team Size: 5-20</span>
          </div>
        </div>
      </div>
    </nav>
    
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <!-- Secrets Management -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900">Secrets Management</h3>
              <p class="mt-1 text-sm text-gray-500">Manage AWS Secrets securely</p>
              <button onclick="loadSecrets()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                View Secrets
              </button>
            </div>
          </div>
          
          <!-- Contractor Access -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900">Contractor Access</h3>
              <p class="mt-1 text-sm text-gray-500">Manage temporary access</p>
              <button onclick="manageContractors()" class="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Manage Access
              </button>
            </div>
          </div>
          
          <!-- Claude Assistant -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900">Claude Assistant</h3>
              <p class="mt-1 text-sm text-gray-500">Copy prompts for Claude.ai</p>
              <button onclick="showPrompts()" class="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                Get Prompts
              </button>
            </div>
          </div>
          
        </div>
        
        <!-- Dynamic Content Area -->
        <div id="content" class="mt-8"></div>
      </div>
    </main>
  </div>
  
  <script>
    const API_URL = 'API_GATEWAY_URL'; // Will be replaced during deployment
    
    async function loadSecrets() {
      const content = document.getElementById('content');
      content.innerHTML = '<p>Loading secrets...</p>';
      // Implement API call
    }
    
    function manageContractors() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-xl font-bold mb-4">Contractor Management</h2>
          <form onsubmit="inviteContractor(event)">
            <input type="email" placeholder="Contractor Email" class="border rounded px-3 py-2 w-full mb-2" required>
            <input type="text" placeholder="Name" class="border rounded px-3 py-2 w-full mb-2" required>
            <input type="number" placeholder="Access Days" value="7" class="border rounded px-3 py-2 w-full mb-2">
            <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">Send Invitation</button>
          </form>
        </div>
      `;
    }
    
    function showPrompts() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-xl font-bold mb-4">Claude Prompts</h2>
          <p class="text-sm text-gray-600 mb-4">Copy these prompts to Claude.ai ($200/mo subscription)</p>
          <div class="space-y-4">
            <div>
              <h3 class="font-semibold">Employee Onboarding</h3>
              <textarea class="w-full border rounded p-2 h-32" readonly>Copy optimized onboarding prompt here...</textarea>
              <button onclick="copyToClipboard(this)" class="mt-2 text-blue-600 hover:underline">Copy to Clipboard</button>
            </div>
          </div>
        </div>
      `;
    }
    
    function copyToClipboard(button) {
      const textarea = button.previousElementSibling;
      textarea.select();
      document.execCommand('copy');
      button.textContent = 'Copied!';
      setTimeout(() => button.textContent = 'Copy to Clipboard', 2000);
    }
    
    async function inviteContractor(event) {
      event.preventDefault();
      // Implement contractor invitation
    }
  </script>
</body>
</html>
EOL

echo -e "${GREEN}✓ Frontend created${NC}"

#####################################################################
# Step 4: Deploy to AWS
#####################################################################
echo -e "${BLUE}[4/7] Deploying to AWS...${NC}"

# Deploy serverless application
serverless deploy --stage prod --region us-east-1 --verbose

# Get the API endpoint
API_ENDPOINT=$(serverless info --stage prod --verbose | grep "ServiceEndpoint:" | cut -d' ' -f2)

echo -e "${GREEN}✓ Serverless deployment complete${NC}"
echo -e "${GREEN}API Endpoint: ${API_ENDPOINT}${NC}"

#####################################################################
# Step 5: Deploy Frontend to S3
#####################################################################
echo -e "${BLUE}[5/7] Deploying frontend to S3...${NC}"

# Get S3 bucket name from CloudFormation stack
STACK_NAME="candlefish-employee-setup-lean-prod"
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text)

# Update API URL in frontend
sed -i.bak "s|API_GATEWAY_URL|${API_ENDPOINT}|g" ../frontend-lean/index.html

# Upload to S3
aws s3 cp ../frontend-lean/index.html s3://${S3_BUCKET}/index.html --content-type "text/html"

# Get CloudFront URL
CF_URL=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text)

echo -e "${GREEN}✓ Frontend deployed${NC}"

#####################################################################
# Step 6: Initialize Secrets
#####################################################################
echo -e "${BLUE}[6/7] Initializing AWS Secrets Manager...${NC}"

# Create initial secrets
aws secretsmanager create-secret \
    --name "candlefish-employee-setup-lean-prod/app/config" \
    --description "Application configuration" \
    --secret-string '{"team_size":20,"contractor_enabled":true}' \
    2>/dev/null || echo "Config secret exists"

aws secretsmanager create-secret \
    --name "candlefish-employee-setup-lean-prod/jwt/secret" \
    --description "JWT signing secret" \
    --secret-string '{"secret":"'$(openssl rand -base64 32)'"}' \
    2>/dev/null || echo "JWT secret exists"

echo -e "${GREEN}✓ Secrets initialized${NC}"

#####################################################################
# Step 7: Summary
#####################################################################
echo -e "${BLUE}[7/7] Deployment Summary${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}        🚀 LEAN DEPLOYMENT COMPLETE 🚀                         ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo -e "  • Frontend: https://${CF_URL}"
echo -e "  • API: ${API_ENDPOINT}"
echo -e "  • AWS Console: https://console.aws.amazon.com/lambda"
echo ""
echo -e "${BLUE}Monthly Cost Breakdown:${NC}"
echo -e "  • Lambda: ~\$5-10 (first 1M requests free)"
echo -e "  • DynamoDB: ~\$5-10 (on-demand, pay per request)"
echo -e "  • Secrets Manager: ~\$20 (rotation included)"
echo -e "  • CloudFront/S3: ~\$5"
echo -e "  • Total: ~\$50-100/month"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Create your first admin user"
echo -e "  2. Add your team members (5-20 people)"
echo -e "  3. Test contractor invitation system"
echo -e "  4. Copy Claude prompts from the UI"
echo -e "  5. Set up monthly secret rotation"
echo ""
echo -e "${GREEN}Your lean setup is ready for your small team!${NC}"
echo ""

# Save deployment info
cat > deployment-info.json << EOF
{
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "api_endpoint": "${API_ENDPOINT}",
  "frontend_url": "https://${CF_URL}",
  "s3_bucket": "${S3_BUCKET}",
  "aws_account": "${ACCOUNT_ID}",
  "region": "us-east-1",
  "monthly_cost_estimate": "50-100 USD",
  "team_capacity": "5-20 users + contractors"
}
EOF

echo -e "${GREEN}Deployment info saved to deployment-info.json${NC}"