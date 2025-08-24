#!/bin/bash

echo "Deploying inventory site to inventory.highline.work..."

cd ~/candlefish-ai/apps/5470-inventory

# Build the project
echo "Building 5470-inventory..."
npm install
npm run build

# Deploy to Netlify
echo "Deploying to Netlify..."
netlify deploy --prod --dir=.next --site=$INVENTORY_SITE_ID

echo "Deployment complete!"
echo "Access at: https://inventory.highline.work"
echo "Default credentials: highline / [password will be set in Netlify]"
