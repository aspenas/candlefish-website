#!/bin/bash
set -e

echo "⚠️  WARNING: This will deploy to PRODUCTION (candlefish.ai)"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Deployment cancelled"
  exit 1
fi

echo "🚀 Deploying to candlefish.ai..."

# Deploy to production site
netlify deploy --prod --site candlefish-grotto --dir .next

echo "✅ Production deployment complete!"
echo "🔗 View at: https://candlefish.ai"
