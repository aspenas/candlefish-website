#!/bin/bash

# Candlefish AI - Complete AWS Secrets Manager Deployment
# Master deployment script with all methods
# Generated: 2025-09-05

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}     Candlefish AI - AWS Secrets Manager Full Deployment${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Deployment Options:${NC}"
echo "1) Deploy with AWS CLI (requires AWS credentials)"
echo "2) Deploy with Terraform (Infrastructure as Code)"
echo "3) Deploy with CloudFormation (AWS native)"
echo "4) Generate manual deployment package (for AWS Console)"
echo "5) Deploy to local Vault only (development)"
echo ""

read -p "Select deployment method (1-5): " DEPLOY_METHOD

case $DEPLOY_METHOD in
    1)
        echo -e "${GREEN}Deploying with AWS CLI...${NC}"
        # Check for AWS credentials
        if aws sts get-caller-identity &> /dev/null; then
            echo -e "${GREEN}AWS credentials found. Starting deployment...${NC}"
            ./aws-secrets-deploy.sh
        else
            echo -e "${YELLOW}AWS credentials not configured.${NC}"
            echo "Please run: aws configure"
            echo "Or set environment variables:"
            echo "  export AWS_ACCESS_KEY_ID=your_access_key"
            echo "  export AWS_SECRET_ACCESS_KEY=your_secret_key"
            echo "  export AWS_DEFAULT_REGION=us-east-1"
            exit 1
        fi
        ;;
        
    2)
        echo -e "${GREEN}Deploying with Terraform...${NC}"
        cd terraform
        
        # Check if Terraform is installed
        if ! command -v terraform &> /dev/null; then
            echo -e "${YELLOW}Installing Terraform...${NC}"
            brew install terraform || {
                echo -e "${RED}Failed to install Terraform. Please install manually.${NC}"
                exit 1
            }
        fi
        
        # Initialize Terraform
        echo -e "${BLUE}Initializing Terraform...${NC}"
        terraform init || {
            echo -e "${YELLOW}Terraform init failed. Creating local backend...${NC}"
            # Use local backend if S3 fails
            cat > backend.tf <<EOF
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
EOF
            terraform init
        }
        
        # Create secrets file for Terraform
        echo -e "${BLUE}Creating secrets configuration...${NC}"
        cat > secrets.auto.tfvars <<EOF
# Auto-generated secrets values
# DO NOT COMMIT TO GIT

mongodb_credentials = {
  username = "candlefish_admin_20250904"
  password = "vr3UWJROhpYo511uDQu7IxyIMkauoH0k"
  uri      = "mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority"
}

api_keys = {
  smithery = "55f3f737-0a09-49e8-a2f7-d1fd035bf7b7"
  google   = "AIza_PLACEHOLDER_vbngY0QpJiBNFDpWgJhq"
}

security_secrets = {
  jwt_secret      = "5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf"
  encryption_key  = "A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1"
}

database_passwords = {
  postgres = "H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2"
  redis    = "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd"
}
EOF
        
        # Plan deployment
        echo -e "${BLUE}Planning Terraform deployment...${NC}"
        terraform plan -out=tfplan || {
            echo -e "${RED}Terraform plan failed. Check configuration.${NC}"
            exit 1
        }
        
        # Apply deployment
        echo -e "${CYAN}Review the plan above. Deploy? (yes/no): ${NC}"
        read -p "" CONFIRM
        if [[ "$CONFIRM" == "yes" ]]; then
            terraform apply tfplan
            echo -e "${GREEN}Terraform deployment complete!${NC}"
            
            # Output important values
            echo -e "${CYAN}Deployment Outputs:${NC}"
            terraform output
        else
            echo -e "${YELLOW}Deployment cancelled.${NC}"
        fi
        
        cd ..
        ;;
        
    3)
        echo -e "${GREEN}Deploying with CloudFormation...${NC}"
        
        # Check for AWS CLI
        if ! aws sts get-caller-identity &> /dev/null; then
            echo -e "${RED}AWS credentials required for CloudFormation.${NC}"
            exit 1
        fi
        
        STACK_NAME="candlefish-secrets-management"
        TEMPLATE_FILE="$HOME/.candlefish-aws-secrets-backup-*/cloudformation_secrets.yaml"
        
        # Find the latest template
        LATEST_TEMPLATE=$(ls -t $TEMPLATE_FILE 2>/dev/null | head -1)
        
        if [[ ! -f "$LATEST_TEMPLATE" ]]; then
            echo -e "${YELLOW}CloudFormation template not found. Generating...${NC}"
            SKIP_AWS_DEPLOY=true ./aws-secrets-deploy.sh
            LATEST_TEMPLATE=$(ls -t $TEMPLATE_FILE 2>/dev/null | head -1)
        fi
        
        echo -e "${BLUE}Deploying CloudFormation stack: $STACK_NAME${NC}"
        aws cloudformation deploy \
            --template-file "$LATEST_TEMPLATE" \
            --stack-name "$STACK_NAME" \
            --parameter-overrides Environment=production \
            --capabilities CAPABILITY_IAM \
            --region us-east-1 || {
                echo -e "${RED}CloudFormation deployment failed.${NC}"
                exit 1
            }
        
        echo -e "${GREEN}CloudFormation deployment complete!${NC}"
        
        # Get stack outputs
        echo -e "${CYAN}Stack Outputs:${NC}"
        aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --query 'Stacks[0].Outputs' \
            --output table
        ;;
        
    4)
        echo -e "${GREEN}Generating manual deployment package...${NC}"
        SKIP_AWS_DEPLOY=true ./aws-secrets-deploy.sh
        
        # Get the latest backup directory
        BACKUP_DIR=$(ls -dt $HOME/.candlefish-aws-secrets-backup-* | head -1)
        
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}     Manual Deployment Package Generated!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${CYAN}Package Location:${NC} $BACKUP_DIR"
        echo ""
        echo -e "${CYAN}Contents:${NC}"
        echo "├── AWS_CONSOLE_INSTRUCTIONS.md - Step-by-step manual guide"
        echo "├── cloudformation_secrets.yaml - CloudFormation template"
        echo "├── terraform.tfvars - Terraform configuration"
        echo "├── secrets_client.py - Python integration code"
        echo "├── secretsClient.ts - TypeScript integration code"
        echo "└── rollback.sh - Rollback script"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Open AWS_CONSOLE_INSTRUCTIONS.md for manual steps"
        echo "2. Or use cloudformation_secrets.yaml in AWS Console"
        echo "3. Configure AWS credentials and run option 1, 2, or 3"
        ;;
        
    5)
        echo -e "${GREEN}Deploying to local Vault...${NC}"
        
        # Check if Vault is running
        if ! curl -s http://localhost:8201/v1/sys/health &> /dev/null; then
            echo -e "${YELLOW}Starting local Vault...${NC}"
            docker-compose -f docker-compose.local.yml up -d vault
            sleep 5
        fi
        
        # Load secrets into Vault
        echo -e "${BLUE}Loading secrets into local Vault...${NC}"
        
        VAULT_ADDR="http://localhost:8201"
        VAULT_TOKEN=$(cat ~/.candlefish-secrets-*/vault_root_token.txt 2>/dev/null || echo "root")
        
        # MongoDB credentials
        curl -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
            -d '{"data": {"username": "candlefish_admin_20250904", "password": "vr3UWJROhpYo511uDQu7IxyIMkauoH0k", "uri": "mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority"}}' \
            $VAULT_ADDR/v1/secret/data/mongodb/credentials
        
        # API keys
        curl -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
            -d '{"data": {"smithery": "55f3f737-0a09-49e8-a2f7-d1fd035bf7b7", "google": "AIza_PLACEHOLDER_vbngY0QpJiBNFDpWgJhq"}}' \
            $VAULT_ADDR/v1/secret/data/api/keys
        
        # Security secrets
        curl -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
            -d '{"data": {"jwt_secret": "5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf", "encryption_key": "A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1"}}' \
            $VAULT_ADDR/v1/secret/data/security/secrets
        
        # Database passwords
        curl -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
            -d '{"data": {"postgres": "H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2", "redis": "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd"}}' \
            $VAULT_ADDR/v1/secret/data/database/passwords
        
        echo -e "${GREEN}Local Vault deployment complete!${NC}"
        echo -e "${CYAN}Access Vault UI:${NC} http://localhost:8201"
        echo -e "${CYAN}Root Token:${NC} $VAULT_TOKEN"
        ;;
        
    *)
        echo -e "${RED}Invalid option selected.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}              Deployment Process Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Show summary of what was deployed
echo -e "${CYAN}Deployment Summary:${NC}"
echo "├── Method: Option $DEPLOY_METHOD"
echo "├── Environment: production"
echo "├── Region: us-east-1"
echo "└── Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo -e "${YELLOW}Security Reminders:${NC}"
echo "• Enable MFA for production AWS access"
echo "• Rotate secrets every 30-90 days"
echo "• Monitor CloudWatch for unauthorized access"
echo "• Store backup files securely"
echo "• Never commit secrets to Git"
echo ""

echo -e "${CYAN}Testing Commands:${NC}"
echo ""
echo "# Test with AWS CLI:"
echo "aws secretsmanager get-secret-value \\"
echo "    --secret-id candlefish/production/security/jwt \\"
echo "    --region us-east-1"
echo ""
echo "# Test with Python:"
echo "python3 ~/.candlefish-aws-secrets-backup-*/secrets_client.py"
echo ""

echo -e "${GREEN}Deployment documentation available at:${NC}"
echo "~/candlefish-aws-secrets-backup-*/AWS_CONSOLE_INSTRUCTIONS.md"