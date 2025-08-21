#!/bin/bash

# Quick script to add patrick@candlefish.ai as owner to l0-candlefish project

echo "🔐 Adding patrick@candlefish.ai as Owner to l0-candlefish Project"
echo "================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}Choose authentication method:${NC}"
echo "1) Open Google Cloud Console in browser (Easiest)"
echo "2) Authenticate with gcloud CLI"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo -e "${BLUE}Opening Google Cloud Console IAM page...${NC}"
    open "https://console.cloud.google.com/iam-admin/iam?project=l0-candlefish"

    echo ""
    echo -e "${YELLOW}Manual Steps:${NC}"
    echo "1. Click '+ GRANT ACCESS' button"
    echo "2. Enter: patrick@candlefish.ai"
    echo "3. Select role: Owner (under Basic)"
    echo "4. Click SAVE"
    echo ""
    echo -e "${GREEN}✅ Once done, patrick@candlefish.ai will be an owner!${NC}"

elif [ "$choice" = "2" ]; then
    echo ""
    echo -e "${YELLOW}Authenticating with gcloud...${NC}"

    # Remove the problematic service account override
    gcloud config unset auth/credential_file_override

    echo ""
    echo "Please authenticate with your patrick.smith@gmail.com account:"
    gcloud auth login

    echo ""
    echo -e "${YELLOW}Setting project to l0-candlefish...${NC}"
    gcloud config set project l0-candlefish

    echo ""
    echo -e "${YELLOW}Adding patrick@candlefish.ai as owner...${NC}"
    gcloud projects add-iam-policy-binding l0-candlefish \
        --member="user:patrick@candlefish.ai" \
        --role="roles/owner"

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Successfully added patrick@candlefish.ai as owner!${NC}"

        echo ""
        echo -e "${YELLOW}Verifying the change...${NC}"
        gcloud projects get-iam-policy l0-candlefish \
            --flatten="bindings[].members" \
            --format="table(bindings.role,bindings.members)" \
            --filter="bindings.members:patrick@candlefish.ai"
    else
        echo ""
        echo -e "${RED}❌ Failed to add owner. Please try the manual method (option 1).${NC}"
    fi
else
    echo "Invalid choice. Exiting."
    exit 1
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. patrick@candlefish.ai will receive an email invitation"
echo "2. Accept the invitation from that email"
echo "3. Create new OAuth credentials under patrick@candlefish.ai"
echo "4. Update Paintbox with new credentials"
echo ""
echo -e "${GREEN}Migration Step 1 Complete!${NC}"
