#!/bin/bash
set -e

echo "🚀 Deploying to test.candlefish.ai..."

# Deploy to test site only (using the correct site ID)
netlify deploy --prod --site 39b5e2aa-5a6f-42c8-a721-807b164c90d9 --dir out

echo "✅ Deployment complete!"
echo "🔗 View at: https://test.candlefish.ai"
