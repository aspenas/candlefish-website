#!/bin/bash

echo "🎨 Checking Paintbox Deployment Status..."
echo "========================================"

# Get API key from AWS
export RENDER_API_KEY=$(aws secretsmanager get-secret-value --secret-id render-api-key --query SecretString --output text)

# Service details
SERVICE_ID="srv-d26n6mggjchc73e6pmu0"
DEPLOY_ID="dep-d26npq8tcggs73d3vl10"

# Check deployment status
STATUS=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys/$DEPLOY_ID" | \
  jq -r '.status')

echo "Status: $STATUS"
echo ""
echo "📊 Dashboard: https://dashboard.render.com/web/$SERVICE_ID"
echo "📝 Logs: https://dashboard.render.com/web/$SERVICE_ID/logs"

if [ "$STATUS" = "live" ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo "🌐 Your app is live at: https://paintbox-app.onrender.com"
elif [ "$STATUS" = "build_in_progress" ] || [ "$STATUS" = "deploy_in_progress" ]; then
  echo ""
  echo "⏳ Deployment in progress..."
  echo "Check back in a few minutes."
else
  echo ""
  echo "❌ Deployment status: $STATUS"
fi
