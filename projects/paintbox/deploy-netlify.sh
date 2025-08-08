#!/bin/bash

echo "🎨 Paintbox Netlify Deployment Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}Netlify CLI not found. Installing...${NC}"
    npm install -g netlify-cli
fi

# Function to check build
check_build() {
    echo -e "${GREEN}Testing static export build...${NC}"

    # Clean previous builds
    rm -rf .next out

    # Run build
    if npm run build; then
        echo -e "${GREEN}✅ Build successful!${NC}"

        # Check if out directory was created
        if [ -d "out" ]; then
            echo -e "${GREEN}✅ Static export created in 'out' directory${NC}"

            # Count files
            FILE_COUNT=$(find out -type f | wc -l)
            echo -e "${GREEN}📁 Generated ${FILE_COUNT} files${NC}"
        else
            echo -e "${RED}❌ 'out' directory not found. Static export may have failed.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Build failed!${NC}"
        exit 1
    fi
}

# Function to deploy
deploy_to_netlify() {
    echo ""
    echo -e "${GREEN}Deploying to Netlify...${NC}"

    # Check if logged in
    if ! netlify status &> /dev/null; then
        echo -e "${YELLOW}Please login to Netlify:${NC}"
        netlify login
    fi

    # Deploy options
    echo ""
    echo "Deployment options:"
    echo "1) Deploy to production"
    echo "2) Deploy draft (preview)"
    echo "3) Create new site and deploy"
    read -p "Choose option (1-3): " option

    case $option in
        1)
            netlify deploy --prod --dir=out
            ;;
        2)
            netlify deploy --dir=out
            ;;
        3)
            netlify init
            netlify deploy --prod --dir=out
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            exit 1
            ;;
    esac
}

# Function to show post-deployment steps
post_deployment() {
    echo ""
    echo -e "${GREEN}Post-Deployment Steps:${NC}"
    echo "1. Set environment variables in Netlify Dashboard"
    echo "2. Configure custom domain (if needed)"
    echo "3. Deploy backend API to Railway/Heroku/etc"
    echo "4. Update NEXT_PUBLIC_API_URL with backend URL"
    echo ""
    echo -e "${YELLOW}Important: This is a static site deployment.${NC}"
    echo "API routes and dynamic features require a separate backend."
}

# Main execution
echo "This script will:"
echo "1. Test the static export build"
echo "2. Deploy to Netlify"
echo "3. Provide post-deployment instructions"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    check_build
    deploy_to_netlify
    post_deployment

    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
else
    echo "Deployment cancelled."
fi
