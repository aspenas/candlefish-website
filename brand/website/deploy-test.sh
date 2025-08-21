#!/bin/bash
set -e

echo "🚀 Deploying to test.candlefish.ai..."

# Deploy to test site only
netlify deploy --prod --site e5211d78-2806-4a14-a616-33d42fc6c36f --dir .next

echo "✅ Deployment complete!"
echo "🔗 View at: https://test.candlefish.ai"
