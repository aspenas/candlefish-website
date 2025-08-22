#!/bin/bash

# Fix "View Reports" Button on NANDA Dashboard
# This script deploys the fix to your live server

echo "🔧 Fixing 'View Reports' button on NANDA Dashboard"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build the updated dashboard
echo -e "${YELLOW}Step 1: Building the dashboard...${NC}"
cd /Users/patricksmith/candlefish-ai/apps/nanda-dashboard
npm run build

# Step 2: Test locally first (optional)
echo -e "${YELLOW}Step 2: Testing locally...${NC}"
echo "You can test locally by running: npm run dev"
echo "Visit http://localhost:5173 to verify the fix"
read -p "Do you want to test locally first? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run dev &
    DEV_PID=$!
    echo "Development server running on http://localhost:5173"
    echo "Press any key to continue deployment..."
    read -n 1
    kill $DEV_PID 2>/dev/null
fi

# Step 3: Deploy to your server
echo -e "${YELLOW}Step 3: Deploying to server...${NC}"
read -p "Enter your server address (e.g., nanda.candlefish.ai): " SERVER_ADDRESS
read -p "Enter your SSH user (e.g., root): " SSH_USER

# Create deployment package
echo "Creating deployment package..."
tar -czf nanda-dashboard-fix.tar.gz dist/

# Upload to server
echo "Uploading to server..."
scp nanda-dashboard-fix.tar.gz ${SSH_USER}@${SERVER_ADDRESS}:/tmp/

# Deploy on server
echo "Deploying on server..."
ssh ${SSH_USER}@${SERVER_ADDRESS} << 'ENDSSH'
    # Backup current version
    echo "Backing up current dashboard..."
    cp -r /var/www/nanda-dashboard /var/www/nanda-dashboard.backup.$(date +%Y%m%d-%H%M%S)
    
    # Extract new version
    echo "Extracting new version..."
    cd /tmp
    tar -xzf nanda-dashboard-fix.tar.gz
    
    # Deploy new version
    echo "Deploying new version..."
    rm -rf /var/www/nanda-dashboard/dist
    mv dist /var/www/nanda-dashboard/
    
    # Set permissions
    chown -R www-data:www-data /var/www/nanda-dashboard
    
    # Restart services if needed
    if command -v nginx &> /dev/null; then
        echo "Restarting nginx..."
        systemctl reload nginx
    fi
    
    if command -v pm2 &> /dev/null; then
        echo "Restarting PM2 apps..."
        pm2 restart all
    fi
    
    echo "Deployment complete!"
ENDSSH

# Cleanup
rm nanda-dashboard-fix.tar.gz

echo ""
echo -e "${GREEN}✅ Fix deployed successfully!${NC}"
echo ""
echo "The 'View Reports' button should now be working on https://${SERVER_ADDRESS}"
echo ""
echo "What was fixed:"
echo "1. Added ReportsPage component with comprehensive reporting functionality"
echo "2. Connected the 'View Reports' button to show the reports page"
echo "3. Added report generation and download capabilities"
echo "4. Included performance metrics and historical data visualization"
echo ""
echo "If you still have issues, check the browser console for errors."