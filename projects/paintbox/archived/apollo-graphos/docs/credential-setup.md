# Credential Configuration Guide

This guide covers setting up all necessary API credentials for the Apollo GraphOS federation system.

## Overview

The system requires credentials for:
- Apollo Studio (GraphQL schema registry and monitoring)
- Salesforce (CRM integration)  
- Company Cam (photo management)
- AWS (deployment infrastructure)

## 1. Apollo Studio Setup

### Step 1: Create Apollo Studio Account
1. Visit [Apollo Studio](https://studio.apollographql.com/)
2. Create an account or sign in
3. Create a new graph named "paintbox"

### Step 2: Generate API Key
1. Go to your graph settings in Apollo Studio
2. Navigate to "API Keys" section
3. Create a new API key with "Contributor" permissions
4. Copy the API key (format: `service:paintbox:xxxxxxxx`)

### Step 3: Configure Environment
```bash
# Set environment variables
export APOLLO_KEY="service:paintbox:your-actual-key-here"
export APOLLO_GRAPH_REF="paintbox@main"

# Or add to .env file
echo "APOLLO_KEY=service:paintbox:your-actual-key-here" >> .env
echo "APOLLO_GRAPH_REF=paintbox@main" >> .env
```

### Step 4: Verify Connection
```bash
# Install Apollo Rover CLI
curl -sSL https://rover.apollo.dev/nix/latest | sh

# Test connection
rover config whoami
```

## 2. Salesforce API Setup

### Step 1: Create Salesforce Connected App
1. Log into Salesforce as an administrator
2. Go to Setup → App Manager → New Connected App
3. Fill in basic information:
   - Connected App Name: "Paintbox Integration"
   - API Name: "Paintbox_Integration"
   - Contact Email: your email

### Step 2: Configure OAuth Settings
1. Enable OAuth Settings
2. Callback URL: `https://paintbox.candlefish.ai/auth/callback`
3. Selected OAuth Scopes:
   - Access and manage your data (api)
   - Perform requests on your behalf at any time (refresh_token, offline_access)
   - Access your basic information (id, profile, email, address, phone)

### Step 3: Get Credentials
After saving the connected app:
1. Copy the Consumer Key (Client ID)
2. Copy the Consumer Secret (Client Secret)
3. Get your username and password+security_token

### Step 4: Configure Environment
```bash
export SALESFORCE_CLIENT_ID="your_consumer_key_here"
export SALESFORCE_CLIENT_SECRET="your_consumer_secret_here"  
export SALESFORCE_USERNAME="your_username@company.com"
export SALESFORCE_PASSWORD="your_password_plus_security_token"
```

### Step 5: Test Connection
```bash
# Test Salesforce authentication
curl -X POST https://login.salesforce.com/services/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=$SALESFORCE_CLIENT_ID&client_secret=$SALESFORCE_CLIENT_SECRET&username=$SALESFORCE_USERNAME&password=$SALESFORCE_PASSWORD"
```

## 3. Company Cam API Setup

### Step 1: Get API Token
1. Log into your Company Cam account
2. Go to Account Settings → API
3. Generate a new API token
4. Copy the token

### Step 2: Configure Environment
```bash
export COMPANY_CAM_API_TOKEN="your_api_token_here"
export COMPANY_CAM_BASE_URL="https://api.companycam.com"
```

### Step 3: Test Connection
```bash
# Test Company Cam API
curl -H "Authorization: Bearer $COMPANY_CAM_API_TOKEN" \
  https://api.companycam.com/v2/users/me
```

## 4. AWS Secrets Manager Setup (Production)

For production deployments, store sensitive credentials in AWS Secrets Manager:

### Step 1: Create Secrets
```bash
# Apollo Studio API Key
aws secretsmanager create-secret \
  --name "apollo-graphos/api-key" \
  --description "Apollo Studio API key for GraphQL federation" \
  --secret-string "service:paintbox:your-apollo-key-here"

# Salesforce Credentials
aws secretsmanager create-secret \
  --name "apollo-graphos/salesforce-credentials" \
  --description "Salesforce API credentials" \
  --secret-string '{
    "client_id": "your_salesforce_client_id",
    "client_secret": "your_salesforce_client_secret", 
    "username": "your_salesforce_username@company.com",
    "password": "your_salesforce_password_plus_token"
  }'

# Company Cam Credentials  
aws secretsmanager create-secret \
  --name "apollo-graphos/companycam-credentials" \
  --description "Company Cam API credentials" \
  --secret-string '{
    "api_token": "your_company_cam_api_token",
    "base_url": "https://api.companycam.com"
  }'
```

### Step 2: Configure IAM Permissions
Create an IAM policy for the application to read secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:apollo-graphos/*"
      ]
    }
  ]
}
```

### Step 3: Update Application Configuration
The application will automatically load secrets from AWS Secrets Manager in production environments.

## 5. GitHub Secrets Setup (CI/CD)

For automated deployments, configure these secrets in your GitHub repository:

1. Go to your repository settings
2. Navigate to Secrets and Variables → Actions
3. Add the following repository secrets:

### Required Secrets:
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key for deployment  
- `APOLLO_STAGING_KEY`: Apollo Studio API key for staging environment
- `APOLLO_PRODUCTION_KEY`: Apollo Studio API key for production environment
- `SLACK_WEBHOOK_URL`: Slack webhook for deployment notifications (optional)

## 6. Local Development Setup

### Step 1: Copy Environment Template
```bash
cp .env.template .env
```

### Step 2: Fill in Your Credentials
Edit the `.env` file with your actual API credentials:

```bash
# Apollo Studio
APOLLO_KEY=service:paintbox:your-actual-key-here
APOLLO_GRAPH_REF=paintbox@main

# Salesforce
SALESFORCE_CLIENT_ID=your_actual_client_id
SALESFORCE_CLIENT_SECRET=your_actual_client_secret
SALESFORCE_USERNAME=your_username@company.com
SALESFORCE_PASSWORD=your_password_plus_security_token

# Company Cam
COMPANY_CAM_API_TOKEN=your_actual_api_token
```

### Step 3: Verify Setup
```bash
# Start the development server
npm run dev

# Test GraphQL endpoint
curl -X POST http://localhost:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { __schema { queryType { name } } }"}'
```

## Security Best Practices

1. **Never commit credentials to version control**
   - Add `.env` to `.gitignore`
   - Use `.env.template` for documentation only

2. **Use different credentials for different environments**
   - Development: Local `.env` file
   - Staging: AWS Secrets Manager or environment variables
   - Production: AWS Secrets Manager with IAM roles

3. **Rotate credentials regularly**
   - Set up automated credential rotation where possible
   - Monitor credential usage for anomalies

4. **Limit credential permissions**
   - Use least-privilege principle
   - Create service-specific API users where possible

5. **Monitor credential usage**
   - Enable logging for API access
   - Set up alerts for unusual activity

## Troubleshooting

### Common Issues:

1. **Apollo Studio connection fails**
   - Verify API key format: `service:graph-name:key`
   - Check network connectivity to Apollo Studio
   - Ensure API key has correct permissions

2. **Salesforce authentication fails**  
   - Verify username/password combination
   - Check if security token is appended to password
   - Ensure Connected App has correct OAuth settings

3. **Company Cam API returns 401**
   - Verify API token is correct
   - Check token expiration date
   - Ensure API token has required permissions

4. **AWS Secrets Manager access denied**
   - Check IAM permissions for the application role
   - Verify secret names match exactly
   - Ensure correct AWS region is specified

For additional support, check the troubleshooting section in the main deployment guide.
