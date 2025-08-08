#!/bin/bash

echo "🔐 Setting up AWS Secrets Manager for PromoterOS"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Secret name for PromoterOS
SECRET_NAME="promoteros/production/config"

echo ""
echo "📝 Creating/updating secrets in AWS Secrets Manager..."

# Create the secret JSON (without exposing values in the script)
cat > /tmp/promoteros-secrets.json << 'EOF'
{
  "ANTHROPIC_API_KEY": "REPLACE_WITH_ACTUAL_KEY",
  "OPENAI_API_KEY": "REPLACE_WITH_ACTUAL_KEY",
  "TOGETHER_API_KEY": "REPLACE_WITH_ACTUAL_KEY",
  "FIREWORKS_API_KEY": "REPLACE_WITH_ACTUAL_KEY",
  "TIKTOK_CLIENT_KEY": "REPLACE_WITH_ACTUAL_KEY",
  "TIKTOK_CLIENT_SECRET": "REPLACE_WITH_ACTUAL_KEY",
  "TIKTOK_ORG_ID": "REPLACE_WITH_ACTUAL_ID",
  "DATABASE_URL": "REPLACE_WITH_ACTUAL_URL",
  "REDIS_URL": "REPLACE_WITH_ACTUAL_URL",
  "APP_SECRET_KEY": "REPLACE_WITH_ACTUAL_KEY"
}
EOF

echo ""
echo "⚠️  WARNING: Update /tmp/promoteros-secrets.json with actual values before running:"
echo ""
echo "    aws secretsmanager create-secret \\"
echo "        --name $SECRET_NAME \\"
echo "        --description 'PromoterOS Production Secrets' \\"
echo "        --secret-string file:///tmp/promoteros-secrets.json"
echo ""
echo "Or update existing secret:"
echo ""
echo "    aws secretsmanager update-secret \\"
echo "        --secret-id $SECRET_NAME \\"
echo "        --secret-string file:///tmp/promoteros-secrets.json"
echo ""
echo "Then delete the temp file:"
echo "    rm /tmp/promoteros-secrets.json"
echo ""
echo "📚 To retrieve secrets in your application:"
echo ""
echo "    aws secretsmanager get-secret-value --secret-id $SECRET_NAME"
