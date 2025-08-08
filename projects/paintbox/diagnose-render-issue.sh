#!/bin/bash

echo "🔍 Diagnosing Paintbox Render Deployment Issue"
echo "============================================="
echo ""

# Get API key
export RENDER_API_KEY=$(aws secretsmanager get-secret-value --secret-id render-api-key --query SecretString --output text)

SERVICE_ID="srv-d26n6mggjchc73e6pmu0"

# Get service details
echo "📊 Service Status:"
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID" | \
  jq '{name: .service.name, suspended: .service.suspended, status: .service.serviceDetails.maintenanceMode}'

echo ""
echo "🚀 Latest Deployment:"
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=1" | \
  jq '.[0].deploy | {id: .id, status: .status, createdAt: .createdAt, trigger: .trigger}'

echo ""
echo "💡 Common Issues:"
echo "1. Missing start script in package.json"
echo "2. Port binding issue (should use process.env.PORT)"
echo "3. Missing dependencies"
echo "4. Node version mismatch"
echo ""
echo "📝 Next Steps:"
echo "1. Check logs at: https://dashboard.render.com/web/$SERVICE_ID/logs"
echo "2. Verify package.json has 'start' script"
echo "3. Ensure app listens on process.env.PORT || 3000"
echo "4. Check if all production dependencies are in 'dependencies' (not devDependencies)"
