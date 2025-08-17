#!/bin/bash

# Salesforce Sandbox Setup Script
# This script helps configure Salesforce sandbox credentials

echo "🔧 Salesforce Sandbox Setup"
echo "=========================="
echo ""

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "This script will help you configure Salesforce sandbox credentials."
echo "You'll need the following from your Salesforce Connected App:"
echo ""
echo "1. Client ID (Consumer Key)"
echo "2. Client Secret (Consumer Secret)"
echo "3. Username (your sandbox username)"
echo "4. Password (your sandbox password)"
echo "5. Security Token (from your sandbox user settings)"
echo ""

# Ask if user wants to proceed
read -p "Do you have these credentials ready? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📚 To get these credentials:"
    echo "1. Log into your Salesforce sandbox"
    echo "2. Go to Setup → App Manager"
    echo "3. Create a New Connected App with:"
    echo "   - Enable OAuth Settings: ✓"
    echo "   - Callback URL: https://login.salesforce.com/services/oauth2/success"
    echo "   - OAuth Scopes: Full access (full)"
    echo "4. Save and note the Client ID and Secret"
    echo "5. For Security Token: Setup → My Personal Information → Reset Security Token"
    echo ""
    echo "Re-run this script when you have the credentials."
    exit 0
fi

echo ""
echo "📝 Please enter your Salesforce sandbox credentials:"
echo ""

# Collect credentials
read -p "Client ID (Consumer Key): " CLIENT_ID
read -p "Client Secret (Consumer Secret): " CLIENT_SECRET
read -p "Username: " USERNAME
read -s -p "Password: " PASSWORD
echo ""
read -p "Security Token: " SECURITY_TOKEN
read -p "Instance URL (e.g., https://mydomain--sandbox.sandbox.my.salesforce.com): " INSTANCE_URL

echo ""
echo "🔐 Storing credentials in AWS Secrets Manager..."

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
    --name "paintbox/salesforce" \
    --description "Salesforce sandbox credentials for Paintbox" \
    --secret-string "{
        \"SALESFORCE_CLIENT_ID\": \"$CLIENT_ID\",
        \"SALESFORCE_CLIENT_SECRET\": \"$CLIENT_SECRET\",
        \"SALESFORCE_USERNAME\": \"$USERNAME\",
        \"SALESFORCE_PASSWORD\": \"$PASSWORD\",
        \"SALESFORCE_SECURITY_TOKEN\": \"$SECURITY_TOKEN\",
        \"SALESFORCE_INSTANCE_URL\": \"$INSTANCE_URL\"
    }" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Credentials stored successfully in AWS Secrets Manager"
else
    echo "⚠️  Secret already exists, updating..."
    aws secretsmanager update-secret \
        --secret-id "paintbox/salesforce" \
        --secret-string "{
            \"SALESFORCE_CLIENT_ID\": \"$CLIENT_ID\",
            \"SALESFORCE_CLIENT_SECRET\": \"$CLIENT_SECRET\",
            \"SALESFORCE_USERNAME\": \"$USERNAME\",
            \"SALESFORCE_PASSWORD\": \"$PASSWORD\",
            \"SALESFORCE_SECURITY_TOKEN\": \"$SECURITY_TOKEN\",
            \"SALESFORCE_INSTANCE_URL\": \"$INSTANCE_URL\"
        }"
    echo "✅ Credentials updated successfully"
fi

echo ""
echo "🔄 Now updating environment variables for local development..."

# Create or update .env.local with non-sensitive config
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    touch .env.local
fi

# Add Salesforce configuration if not already present
if ! grep -q "SALESFORCE_LOGIN_URL" .env.local; then
    echo "" >> .env.local
    echo "# Salesforce Configuration" >> .env.local
    echo "SALESFORCE_LOGIN_URL=https://test.salesforce.com" >> .env.local
fi

echo ""
echo "🧪 Testing Salesforce connection..."

# Test the connection
curl -s "http://localhost:3006/api/v1/salesforce/test" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ API endpoint is accessible"
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Restart your development server: npm run dev"
    echo "2. Test the connection at: http://localhost:3006/api/v1/salesforce/test"
    echo "3. Try searching for customers in the Paintbox estimator"
    echo ""
    echo "🔍 Useful endpoints:"
    echo "- Connection test: GET /api/v1/salesforce/test"
    echo "- Search customers: GET /api/v1/salesforce/search?q=searchterm"
    echo ""
else
    echo "⚠️  Development server not running on localhost:3006"
    echo "Start the server with: npm run dev"
fi
