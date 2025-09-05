#!/bin/bash

# Candlefish AI - AWS Secrets Manager Deployment Script
# Complete deployment with error handling and rollback procedures
# Generated: 2025-09-05

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "UNKNOWN")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/.candlefish-aws-secrets-backup-$TIMESTAMP"
KMS_KEY_ID=""  # Will be set when created

# Log file
LOG_FILE="/tmp/candlefish-aws-secrets-deploy-$TIMESTAMP.log"

# Function to log messages
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

# Function to log error and exit
error_exit() {
    log "${RED}ERROR: ${1}${NC}"
    log "${YELLOW}Check log file: $LOG_FILE${NC}"
    exit 1
}

# Function to check prerequisites
check_prerequisites() {
    log "${BLUE}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI not found. Please install AWS CLI."
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        log "${YELLOW}Installing jq...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install jq || error_exit "Failed to install jq"
        else
            sudo apt-get install -y jq || error_exit "Failed to install jq"
        fi
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "${YELLOW}AWS credentials not configured or invalid.${NC}"
        log "${CYAN}Please configure AWS credentials using one of these methods:${NC}"
        log "1. Run: aws configure"
        log "2. Export environment variables: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
        log "3. Use IAM role if running on EC2"
        return 1
    fi
    
    log "${GREEN}Prerequisites check passed.${NC}"
    log "AWS Account ID: $AWS_ACCOUNT_ID"
    log "Region: $REGION"
    return 0
}

# Function to create backup directory
create_backup() {
    log "${BLUE}Creating backup directory...${NC}"
    mkdir -p "$BACKUP_DIR"
    log "${GREEN}Backup directory created: $BACKUP_DIR${NC}"
}

# Function to create KMS key for encryption
create_kms_key() {
    log "${BLUE}Creating KMS key for secrets encryption...${NC}"
    
    local key_alias="alias/candlefish-secrets-$ENVIRONMENT"
    
    # Check if key already exists
    if aws kms describe-key --key-id "$key_alias" --region "$REGION" &> /dev/null; then
        log "${YELLOW}KMS key $key_alias already exists.${NC}"
        KMS_KEY_ID=$(aws kms describe-key --key-id "$key_alias" --region "$REGION" --query 'KeyMetadata.KeyId' --output text)
    else
        # Create KMS key
        KMS_KEY_ID=$(aws kms create-key \
            --description "Candlefish AI Secrets Management - $ENVIRONMENT" \
            --key-usage ENCRYPT_DECRYPT \
            --origin AWS_KMS \
            --region "$REGION" \
            --tags "TagKey=Project,TagValue=Candlefish" "TagKey=Environment,TagValue=$ENVIRONMENT" \
            --query 'KeyMetadata.KeyId' \
            --output text) || error_exit "Failed to create KMS key"
        
        # Create key alias
        aws kms create-alias \
            --alias-name "$key_alias" \
            --target-key-id "$KMS_KEY_ID" \
            --region "$REGION" || error_exit "Failed to create KMS key alias"
        
        # Enable key rotation
        aws kms enable-key-rotation \
            --key-id "$KMS_KEY_ID" \
            --region "$REGION" || log "${YELLOW}Warning: Failed to enable key rotation${NC}"
        
        log "${GREEN}KMS key created: $KMS_KEY_ID${NC}"
        echo "$KMS_KEY_ID" > "$BACKUP_DIR/kms_key_id.txt"
    fi
}

# Function to create IAM user and policies
create_iam_resources() {
    log "${BLUE}Creating IAM resources...${NC}"
    
    local user_name="candlefish-secrets-admin"
    local policy_name="CandlefishSecretsManagerAccess"
    
    # Create IAM user if doesn't exist
    if ! aws iam get-user --user-name "$user_name" &> /dev/null; then
        aws iam create-user \
            --user-name "$user_name" \
            --tags "Key=Project,Value=Candlefish" "Key=Purpose,Value=SecretsManagement" \
            || error_exit "Failed to create IAM user"
        log "${GREEN}IAM user created: $user_name${NC}"
    else
        log "${YELLOW}IAM user $user_name already exists.${NC}"
    fi
    
    # Create custom policy
    cat > "$BACKUP_DIR/iam_policy.json" <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:*",
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:GenerateDataKey",
                "kms:CreateGrant",
                "kms:DescribeKey"
            ],
            "Resource": [
                "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:candlefish/*",
                "arn:aws:kms:$REGION:$AWS_ACCOUNT_ID:key/$KMS_KEY_ID"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:$REGION:$AWS_ACCOUNT_ID:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudwatch:PutMetricData",
                "cloudwatch:PutMetricAlarm",
                "cloudwatch:DescribeAlarms"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    
    # Create or update policy
    if aws iam get-policy --policy-arn "arn:aws:iam::$AWS_ACCOUNT_ID:policy/$policy_name" &> /dev/null; then
        log "${YELLOW}Updating existing IAM policy...${NC}"
        POLICY_VERSION=$(aws iam create-policy-version \
            --policy-arn "arn:aws:iam::$AWS_ACCOUNT_ID:policy/$policy_name" \
            --policy-document file://"$BACKUP_DIR/iam_policy.json" \
            --set-as-default \
            --query 'PolicyVersion.VersionId' \
            --output text) || log "${YELLOW}Warning: Failed to update policy${NC}"
    else
        aws iam create-policy \
            --policy-name "$policy_name" \
            --policy-document file://"$BACKUP_DIR/iam_policy.json" \
            || error_exit "Failed to create IAM policy"
        log "${GREEN}IAM policy created: $policy_name${NC}"
    fi
    
    # Attach policy to user
    aws iam attach-user-policy \
        --user-name "$user_name" \
        --policy-arn "arn:aws:iam::$AWS_ACCOUNT_ID:policy/$policy_name" \
        || log "${YELLOW}Warning: Policy might already be attached${NC}"
    
    # Create access keys (only if needed)
    if [[ "${CREATE_ACCESS_KEYS:-false}" == "true" ]]; then
        log "${CYAN}Creating access keys for $user_name...${NC}"
        aws iam create-access-key \
            --user-name "$user_name" \
            > "$BACKUP_DIR/access_keys.json"
        log "${GREEN}Access keys saved to: $BACKUP_DIR/access_keys.json${NC}"
        log "${RED}IMPORTANT: Store these credentials securely!${NC}"
    fi
}

# Function to create a secret in AWS Secrets Manager
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    local rotation_days=${4:-30}
    
    local full_secret_name="candlefish/$ENVIRONMENT/$secret_name"
    
    log "${CYAN}Creating secret: $full_secret_name${NC}"
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$full_secret_name" --region "$REGION" &> /dev/null; then
        log "${YELLOW}Secret $full_secret_name already exists. Updating value...${NC}"
        aws secretsmanager update-secret \
            --secret-id "$full_secret_name" \
            --secret-string "$secret_value" \
            --kms-key-id "$KMS_KEY_ID" \
            --region "$REGION" || error_exit "Failed to update secret $full_secret_name"
    else
        # Create new secret
        aws secretsmanager create-secret \
            --name "$full_secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --kms-key-id "$KMS_KEY_ID" \
            --tags "Key=Project,Value=Candlefish" "Key=Environment,Value=$ENVIRONMENT" \
            --region "$REGION" || error_exit "Failed to create secret $full_secret_name"
        
        # Configure rotation (if Lambda function exists)
        if [[ "$rotation_days" -gt 0 ]]; then
            log "${CYAN}Note: Automatic rotation requires a Lambda function. Configure manually if needed.${NC}"
            # Future: Add rotation configuration when Lambda is available
        fi
    fi
    
    log "${GREEN}Secret created/updated: $full_secret_name${NC}"
}

# Function to deploy all secrets
deploy_secrets() {
    log "${BLUE}Deploying secrets to AWS Secrets Manager...${NC}"
    
    # MongoDB credentials
    create_secret "mongodb/credentials" '{
        "username": "candlefish_admin_20250904",
        "password": "vr3UWJROhpYo511uDQu7IxyIMkauoH0k",
        "uri": "mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority"
    }' "MongoDB database credentials" 30
    
    # API Keys
    create_secret "api/smithery" '{
        "api_key": "55f3f737-0a09-49e8-a2f7-d1fd035bf7b7",
        "environment": "production"
    }' "Smithery API key" 90
    
    create_secret "api/google" '{
        "api_key": "AIza_PLACEHOLDER_vbngY0QpJiBNFDpWgJhq",
        "environment": "production"
    }' "Google API key" 90
    
    # Security credentials
    create_secret "security/jwt" '{
        "secret": "5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf",
        "algorithm": "HS256",
        "expiry": "24h"
    }' "JWT signing secret" 30
    
    create_secret "security/encryption" '{
        "key": "A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1",
        "algorithm": "AES-256-GCM"
    }' "Application encryption key" 30
    
    # Database passwords
    create_secret "database/postgres" '{
        "username": "candlefish_user",
        "password": "H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2",
        "host": "postgres.candlefish.internal",
        "port": 5432,
        "database": "candlefish_production"
    }' "PostgreSQL database credentials" 30
    
    create_secret "database/redis" '{
        "password": "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd",
        "host": "redis.candlefish.internal",
        "port": 6379
    }' "Redis cache credentials" 60
    
    log "${GREEN}All secrets deployed successfully!${NC}"
}

# Function to set up CloudWatch monitoring
setup_monitoring() {
    log "${BLUE}Setting up CloudWatch monitoring...${NC}"
    
    # Create CloudWatch dashboard
    cat > "$BACKUP_DIR/cloudwatch_dashboard.json" <<EOF
{
    "name": "CandlefishSecretsManagement",
    "body": "{\"widgets\":[{\"type\":\"metric\",\"properties\":{\"metrics\":[[\"AWS/SecretsManager\",\"SecretCount\",{\"stat\":\"Average\"}],[\".\",\"SecretRotationFailed\",{\"stat\":\"Sum\"}],[\".\",\"SecretRotationSucceeded\",{\"stat\":\"Sum\"}]],\"period\":300,\"stat\":\"Average\",\"region\":\"$REGION\",\"title\":\"Secrets Manager Metrics\"}},{\"type\":\"metric\",\"properties\":{\"metrics\":[[\"AWS/KMS\",\"NumberOfOperations\",{\"stat\":\"Sum\"}]],\"period\":300,\"stat\":\"Sum\",\"region\":\"$REGION\",\"title\":\"KMS Operations\"}}]}"
}
EOF
    
    aws cloudwatch put-dashboard \
        --dashboard-name "CandlefishSecretsManagement" \
        --dashboard-body file://"$BACKUP_DIR/cloudwatch_dashboard.json" \
        --region "$REGION" || log "${YELLOW}Warning: Failed to create CloudWatch dashboard${NC}"
    
    # Create CloudWatch alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "candlefish-secret-rotation-failed" \
        --alarm-description "Alert when secret rotation fails" \
        --actions-enabled \
        --metric-name SecretRotationFailed \
        --namespace AWS/SecretsManager \
        --statistic Sum \
        --period 300 \
        --threshold 1 \
        --comparison-operator GreaterThanOrEqualToThreshold \
        --evaluation-periods 1 \
        --region "$REGION" || log "${YELLOW}Warning: Failed to create rotation alarm${NC}"
    
    log "${GREEN}CloudWatch monitoring configured.${NC}"
}

# Function to test secret retrieval
test_secrets() {
    log "${BLUE}Testing secret retrieval...${NC}"
    
    local test_secret="candlefish/$ENVIRONMENT/security/jwt"
    
    if aws secretsmanager get-secret-value \
        --secret-id "$test_secret" \
        --region "$REGION" \
        --query 'SecretString' \
        --output text &> /dev/null; then
        log "${GREEN}Successfully retrieved test secret: $test_secret${NC}"
    else
        log "${YELLOW}Warning: Could not retrieve test secret. Check permissions.${NC}"
    fi
}

# Function to generate Terraform configuration
generate_terraform_config() {
    log "${BLUE}Generating Terraform configuration...${NC}"
    
    cat > "$BACKUP_DIR/terraform.tfvars" <<EOF
# Auto-generated Terraform variables for Candlefish Secrets Management
# Generated: $TIMESTAMP

environment = "$ENVIRONMENT"
aws_region  = "$REGION"

# KMS Configuration
kms_key_id = "$KMS_KEY_ID"

# Secrets to manage
initial_secrets = {
  "mongodb/credentials" = {
    description   = "MongoDB database credentials"
    type         = "database"
    owner        = "platform-team"
    rotation_days = 30
  }
  "api/smithery" = {
    description   = "Smithery API key"
    type         = "api"
    owner        = "platform-team"
    rotation_days = 90
  }
  "api/google" = {
    description   = "Google API key"
    type         = "api"
    owner        = "platform-team"
    rotation_days = 90
  }
  "security/jwt" = {
    description   = "JWT signing secret"
    type         = "security"
    owner        = "security-team"
    rotation_days = 30
  }
  "security/encryption" = {
    description   = "Application encryption key"
    type         = "security"
    owner        = "security-team"
    rotation_days = 30
  }
  "database/postgres" = {
    description   = "PostgreSQL database credentials"
    type         = "database"
    owner        = "platform-team"
    rotation_days = 30
  }
  "database/redis" = {
    description   = "Redis cache credentials"
    type         = "cache"
    owner        = "platform-team"
    rotation_days = 60
  }
}

# Monitoring
alert_email = "alerts@candlefish.ai"

# Tags
tags = {
  Environment = "$ENVIRONMENT"
  ManagedBy   = "Terraform"
  Project     = "Candlefish-AI"
  CreatedBy   = "AWS-Deploy-Script"
  Timestamp   = "$TIMESTAMP"
}
EOF
    
    log "${GREEN}Terraform configuration saved to: $BACKUP_DIR/terraform.tfvars${NC}"
}

# Function to generate CloudFormation template (as backup)
generate_cloudformation() {
    log "${BLUE}Generating CloudFormation template as backup...${NC}"
    
    cat > "$BACKUP_DIR/cloudformation_secrets.yaml" <<EOF
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Candlefish AI Secrets Management - CloudFormation Template'

Parameters:
  Environment:
    Type: String
    Default: $ENVIRONMENT
    AllowedValues:
      - production
      - staging
      - development

Resources:
  # KMS Key for encryption
  SecretsKMSKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Candlefish Secrets Encryption Key
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::\${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow Secrets Manager to use the key
            Effect: Allow
            Principal:
              Service: secretsmanager.amazonaws.com
            Action:
              - 'kms:Decrypt'
              - 'kms:GenerateDataKey'
            Resource: '*'

  SecretsKMSKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: !Sub 'alias/candlefish-secrets-\${Environment}'
      TargetKeyId: !Ref SecretsKMSKey

  # MongoDB Credentials
  MongoDBSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub 'candlefish/\${Environment}/mongodb/credentials'
      Description: MongoDB database credentials
      KmsKeyId: !Ref SecretsKMSKey
      SecretString: |
        {
          "username": "candlefish_admin_20250904",
          "password": "vr3UWJROhpYo511uDQu7IxyIMkauoH0k",
          "uri": "mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority"
        }
      Tags:
        - Key: Project
          Value: Candlefish
        - Key: Environment
          Value: !Ref Environment

  # API Keys
  SmitheryAPISecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub 'candlefish/\${Environment}/api/smithery'
      Description: Smithery API key
      KmsKeyId: !Ref SecretsKMSKey
      SecretString: |
        {
          "api_key": "55f3f737-0a09-49e8-a2f7-d1fd035bf7b7",
          "environment": "production"
        }

  # Security Secrets
  JWTSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub 'candlefish/\${Environment}/security/jwt'
      Description: JWT signing secret
      KmsKeyId: !Ref SecretsKMSKey
      SecretString: |
        {
          "secret": "5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf",
          "algorithm": "HS256",
          "expiry": "24h"
        }

  # Database Secrets
  PostgreSQLSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub 'candlefish/\${Environment}/database/postgres'
      Description: PostgreSQL database credentials
      KmsKeyId: !Ref SecretsKMSKey
      SecretString: |
        {
          "username": "candlefish_user",
          "password": "H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2",
          "host": "postgres.candlefish.internal",
          "port": 5432,
          "database": "candlefish_production"
        }

  RedisSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub 'candlefish/\${Environment}/database/redis'
      Description: Redis cache credentials
      KmsKeyId: !Ref SecretsKMSKey
      SecretString: |
        {
          "password": "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd",
          "host": "redis.candlefish.internal",
          "port": 6379
        }

Outputs:
  KMSKeyId:
    Description: KMS Key ID for secrets encryption
    Value: !Ref SecretsKMSKey
    Export:
      Name: !Sub 'candlefish-secrets-kms-key-\${Environment}'

  MongoDBSecretArn:
    Description: MongoDB Secret ARN
    Value: !Ref MongoDBSecret
    Export:
      Name: !Sub 'candlefish-mongodb-secret-\${Environment}'
EOF
    
    log "${GREEN}CloudFormation template saved to: $BACKUP_DIR/cloudformation_secrets.yaml${NC}"
}

# Function to generate manual AWS Console instructions
generate_console_instructions() {
    log "${BLUE}Generating AWS Console instructions...${NC}"
    
    cat > "$BACKUP_DIR/AWS_CONSOLE_INSTRUCTIONS.md" <<EOF
# AWS Console Manual Deployment Instructions

If the AWS CLI deployment fails, follow these manual steps in the AWS Console:

## 1. Create KMS Key

1. Navigate to **KMS** in AWS Console
2. Click **Create key**
3. Key type: **Symmetric**
4. Key usage: **Encrypt and decrypt**
5. Alias: \`alias/candlefish-secrets-$ENVIRONMENT\`
6. Key administrators: Your IAM user
7. Key users: Add SecretsManager service
8. Enable automatic key rotation

## 2. Create IAM User and Policy

### Create User:
1. Navigate to **IAM** → **Users**
2. Click **Add users**
3. User name: \`candlefish-secrets-admin\`
4. Access type: **Programmatic access**

### Create Policy:
1. Navigate to **IAM** → **Policies**
2. Click **Create policy**
3. Use JSON editor and paste:

\`\`\`json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:*",
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:GenerateDataKey"
            ],
            "Resource": "*"
        }
    ]
}
\`\`\`

4. Policy name: \`CandlefishSecretsManagerAccess\`
5. Attach to the user created above

## 3. Create Secrets in Secrets Manager

Navigate to **Secrets Manager** and create each secret:

### MongoDB Credentials
- Name: \`candlefish/$ENVIRONMENT/mongodb/credentials\`
- Type: **Other type of secret**
- Key/Value pairs:
  - username: \`candlefish_admin_20250904\`
  - password: \`vr3UWJROhpYo511uDQu7IxyIMkauoH0k\`
  - uri: \`mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority\`

### API Keys
- **Smithery**: \`candlefish/$ENVIRONMENT/api/smithery\`
  - api_key: \`55f3f737-0a09-49e8-a2f7-d1fd035bf7b7\`

- **Google**: \`candlefish/$ENVIRONMENT/api/google\`
  - api_key: \`AIza_PLACEHOLDER_vbngY0QpJiBNFDpWgJhq\`

### Security Credentials
- **JWT**: \`candlefish/$ENVIRONMENT/security/jwt\`
  - secret: \`5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf\`

- **Encryption**: \`candlefish/$ENVIRONMENT/security/encryption\`
  - key: \`A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1\`

### Database Passwords
- **PostgreSQL**: \`candlefish/$ENVIRONMENT/database/postgres\`
  - password: \`H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2\`

- **Redis**: \`candlefish/$ENVIRONMENT/database/redis\`
  - password: \`JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd\`

## 4. Configure CloudWatch Monitoring

1. Navigate to **CloudWatch** → **Dashboards**
2. Create dashboard: \`CandlefishSecretsManagement\`
3. Add widgets for:
   - Secrets Manager metrics
   - KMS operations
   - Failed rotation attempts

## 5. Set Up Rotation (Optional)

For each secret that needs rotation:
1. Edit the secret
2. Configure rotation
3. Create Lambda function for rotation
4. Set rotation schedule (30-90 days)

## 6. Testing

Test secret retrieval using AWS CLI:
\`\`\`bash
aws secretsmanager get-secret-value \\
    --secret-id candlefish/$ENVIRONMENT/security/jwt \\
    --region $REGION
\`\`\`

## Important URLs

- Secrets Manager: https://console.aws.amazon.com/secretsmanager/
- KMS: https://console.aws.amazon.com/kms/
- IAM: https://console.aws.amazon.com/iam/
- CloudWatch: https://console.aws.amazon.com/cloudwatch/

## Support

For issues, contact: devops@candlefish.ai
EOF
    
    log "${GREEN}AWS Console instructions saved to: $BACKUP_DIR/AWS_CONSOLE_INSTRUCTIONS.md${NC}"
}

# Function to generate application integration code
generate_integration_code() {
    log "${BLUE}Generating application integration code...${NC}"
    
    # Python integration
    cat > "$BACKUP_DIR/secrets_client.py" <<EOF
"""
Candlefish AI Secrets Manager Client
Python integration for AWS Secrets Manager
"""

import boto3
import json
import os
from typing import Dict, Any, Optional
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

class SecretsManagerClient:
    """Client for retrieving secrets from AWS Secrets Manager"""
    
    def __init__(self, region: str = '$REGION', environment: str = '$ENVIRONMENT'):
        self.region = region
        self.environment = environment
        self.client = boto3.client('secretsmanager', region_name=region)
        self._cache = {}
    
    @lru_cache(maxsize=128)
    def get_secret(self, secret_name: str) -> Dict[str, Any]:
        """
        Retrieve a secret from AWS Secrets Manager
        
        Args:
            secret_name: Name of the secret (without environment prefix)
            
        Returns:
            Dictionary containing the secret values
        """
        full_secret_name = f"candlefish/{self.environment}/{secret_name}"
        
        try:
            # Check cache first
            if full_secret_name in self._cache:
                return self._cache[full_secret_name]
            
            # Retrieve from AWS
            response = self.client.get_secret_value(SecretId=full_secret_name)
            
            # Parse the secret
            if 'SecretString' in response:
                secret = json.loads(response['SecretString'])
            else:
                # Binary secret
                secret = response['SecretBinary']
            
            # Cache the result
            self._cache[full_secret_name] = secret
            
            logger.info(f"Successfully retrieved secret: {full_secret_name}")
            return secret
            
        except Exception as e:
            logger.error(f"Error retrieving secret {full_secret_name}: {str(e)}")
            raise
    
    def get_database_credentials(self, database: str = 'postgres') -> Dict[str, Any]:
        """Get database credentials"""
        return self.get_secret(f"database/{database}")
    
    def get_api_key(self, service: str) -> str:
        """Get API key for a service"""
        secret = self.get_secret(f"api/{service}")
        return secret.get('api_key', secret.get('key', ''))
    
    def get_jwt_secret(self) -> str:
        """Get JWT signing secret"""
        secret = self.get_secret("security/jwt")
        return secret.get('secret', '')
    
    def get_encryption_key(self) -> str:
        """Get encryption key"""
        secret = self.get_secret("security/encryption")
        return secret.get('key', '')
    
    def clear_cache(self):
        """Clear the secrets cache"""
        self._cache.clear()
        self.get_secret.cache_clear()

# Singleton instance
_client: Optional[SecretsManagerClient] = None

def get_secrets_client() -> SecretsManagerClient:
    """Get or create the secrets manager client singleton"""
    global _client
    if _client is None:
        _client = SecretsManagerClient(
            region=os.getenv('AWS_REGION', '$REGION'),
            environment=os.getenv('ENVIRONMENT', '$ENVIRONMENT')
        )
    return _client

# Example usage
if __name__ == "__main__":
    client = get_secrets_client()
    
    # Get MongoDB credentials
    mongo_creds = client.get_database_credentials('mongodb')
    print(f"MongoDB URI: {mongo_creds.get('uri')}")
    
    # Get API key
    smithery_key = client.get_api_key('smithery')
    print(f"Smithery API Key: {smithery_key[:10]}...")
    
    # Get JWT secret
    jwt_secret = client.get_jwt_secret()
    print(f"JWT Secret configured: {bool(jwt_secret)}")
EOF
    
    # Node.js/TypeScript integration
    cat > "$BACKUP_DIR/secretsClient.ts" <<EOF
/**
 * Candlefish AI Secrets Manager Client
 * TypeScript integration for AWS Secrets Manager
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandInput
} from '@aws-sdk/client-secrets-manager';

interface SecretData {
  [key: string]: any;
}

interface DatabaseCredentials {
  username: string;
  password: string;
  host?: string;
  port?: number;
  database?: string;
  uri?: string;
}

interface APIKey {
  api_key: string;
  environment?: string;
}

export class CandlefishSecretsClient {
  private client: SecretsManagerClient;
  private region: string;
  private environment: string;
  private cache: Map<string, SecretData>;
  private cacheTTL: number = 3600000; // 1 hour in milliseconds
  private cacheTimestamps: Map<string, number>;

  constructor(region: string = '$REGION', environment: string = '$ENVIRONMENT') {
    this.region = region;
    this.environment = environment;
    this.client = new SecretsManagerClient({ region });
    this.cache = new Map();
    this.cacheTimestamps = new Map();
  }

  /**
   * Get a secret from AWS Secrets Manager
   */
  async getSecret(secretName: string): Promise<SecretData> {
    const fullSecretName = \`candlefish/\${this.environment}/\${secretName}\`;
    
    // Check cache
    if (this.isCacheValid(fullSecretName)) {
      return this.cache.get(fullSecretName)!;
    }

    try {
      const input: GetSecretValueCommandInput = {
        SecretId: fullSecretName
      };
      
      const command = new GetSecretValueCommand(input);
      const response = await this.client.send(command);
      
      let secretData: SecretData;
      
      if (response.SecretString) {
        secretData = JSON.parse(response.SecretString);
      } else if (response.SecretBinary) {
        // Handle binary secrets
        const buff = Buffer.from(response.SecretBinary);
        secretData = { binary: buff.toString('base64') };
      } else {
        throw new Error('Secret has no value');
      }
      
      // Update cache
      this.cache.set(fullSecretName, secretData);
      this.cacheTimestamps.set(fullSecretName, Date.now());
      
      return secretData;
    } catch (error) {
      console.error(\`Error retrieving secret \${fullSecretName}:\`, error);
      throw error;
    }
  }

  /**
   * Get database credentials
   */
  async getDatabaseCredentials(database: string = 'postgres'): Promise<DatabaseCredentials> {
    const secret = await this.getSecret(\`database/\${database}\`);
    return secret as DatabaseCredentials;
  }

  /**
   * Get API key for a service
   */
  async getAPIKey(service: string): Promise<string> {
    const secret = await this.getSecret(\`api/\${service}\`) as APIKey;
    return secret.api_key;
  }

  /**
   * Get JWT signing secret
   */
  async getJWTSecret(): Promise<string> {
    const secret = await this.getSecret('security/jwt');
    return secret.secret;
  }

  /**
   * Get encryption key
   */
  async getEncryptionKey(): Promise<string> {
    const secret = await this.getSecret('security/encryption');
    return secret.key;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(key: string): boolean {
    if (!this.cache.has(key)) {
      return false;
    }
    
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) {
      return false;
    }
    
    return (Date.now() - timestamp) < this.cacheTTL;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

// Singleton instance
let secretsClient: CandlefishSecretsClient | null = null;

export function getSecretsClient(): CandlefishSecretsClient {
  if (!secretsClient) {
    secretsClient = new CandlefishSecretsClient(
      process.env.AWS_REGION || '$REGION',
      process.env.ENVIRONMENT || '$ENVIRONMENT'
    );
  }
  return secretsClient;
}

// Example usage
async function example() {
  const client = getSecretsClient();
  
  try {
    // Get MongoDB credentials
    const mongoCreds = await client.getDatabaseCredentials('mongodb');
    console.log('MongoDB URI:', mongoCreds.uri);
    
    // Get API key
    const smitheryKey = await client.getAPIKey('smithery');
    console.log('Smithery API Key:', smitheryKey.substring(0, 10) + '...');
    
    // Get JWT secret
    const jwtSecret = await client.getJWTSecret();
    console.log('JWT Secret configured:', !!jwtSecret);
  } catch (error) {
    console.error('Error:', error);
  }
}
EOF
    
    log "${GREEN}Integration code saved to: $BACKUP_DIR/${NC}"
}

# Function to create rollback script
create_rollback_script() {
    log "${BLUE}Creating rollback script...${NC}"
    
    cat > "$BACKUP_DIR/rollback.sh" <<EOF
#!/bin/bash
# Rollback script for Candlefish AWS Secrets deployment
# Created: $TIMESTAMP

set -euo pipefail

echo "Starting rollback of AWS Secrets Manager deployment..."

# Configuration
REGION="$REGION"
ENVIRONMENT="$ENVIRONMENT"

# Function to delete a secret
delete_secret() {
    local secret_id=\$1
    echo "Deleting secret: \$secret_id"
    aws secretsmanager delete-secret \\
        --secret-id "\$secret_id" \\
        --force-delete-without-recovery \\
        --region "\$REGION" 2>/dev/null || echo "Secret not found or already deleted"
}

# Delete all deployed secrets
delete_secret "candlefish/\$ENVIRONMENT/mongodb/credentials"
delete_secret "candlefish/\$ENVIRONMENT/api/smithery"
delete_secret "candlefish/\$ENVIRONMENT/api/google"
delete_secret "candlefish/\$ENVIRONMENT/security/jwt"
delete_secret "candlefish/\$ENVIRONMENT/security/encryption"
delete_secret "candlefish/\$ENVIRONMENT/database/postgres"
delete_secret "candlefish/\$ENVIRONMENT/database/redis"

# Delete CloudWatch alarms
aws cloudwatch delete-alarms \\
    --alarm-names "candlefish-secret-rotation-failed" \\
    --region "\$REGION" 2>/dev/null || true

# Delete CloudWatch dashboard
aws cloudwatch delete-dashboards \\
    --dashboard-names "CandlefishSecretsManagement" \\
    --region "\$REGION" 2>/dev/null || true

# Note: KMS keys cannot be immediately deleted, they have a minimum 7-day waiting period
echo "Note: KMS key $KMS_KEY_ID scheduled for deletion (7-day waiting period)"
aws kms schedule-key-deletion \\
    --key-id "$KMS_KEY_ID" \\
    --pending-window-in-days 7 \\
    --region "\$REGION" 2>/dev/null || echo "KMS key not found or already scheduled for deletion"

echo "Rollback completed. Some resources may take time to fully delete."
echo "To restore, run the deployment script again."
EOF
    
    chmod +x "$BACKUP_DIR/rollback.sh"
    log "${GREEN}Rollback script created: $BACKUP_DIR/rollback.sh${NC}"
}

# Function to display summary
display_summary() {
    log "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    log "${GREEN}       AWS Secrets Manager Deployment Complete!${NC}"
    log "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    log ""
    log "${CYAN}Deployment Summary:${NC}"
    log "├── Environment: $ENVIRONMENT"
    log "├── Region: $REGION"
    log "├── AWS Account: $AWS_ACCOUNT_ID"
    log "├── KMS Key ID: $KMS_KEY_ID"
    log "├── Backup Directory: $BACKUP_DIR"
    log "└── Log File: $LOG_FILE"
    log ""
    log "${CYAN}Deployed Secrets:${NC}"
    log "├── candlefish/$ENVIRONMENT/mongodb/credentials"
    log "├── candlefish/$ENVIRONMENT/api/smithery"
    log "├── candlefish/$ENVIRONMENT/api/google"
    log "├── candlefish/$ENVIRONMENT/security/jwt"
    log "├── candlefish/$ENVIRONMENT/security/encryption"
    log "├── candlefish/$ENVIRONMENT/database/postgres"
    log "└── candlefish/$ENVIRONMENT/database/redis"
    log ""
    log "${CYAN}Next Steps:${NC}"
    log "1. Review the deployment in AWS Console"
    log "2. Test secret retrieval using the provided integration code"
    log "3. Configure rotation policies as needed"
    log "4. Set up additional monitoring and alerts"
    log "5. Update application configurations to use Secrets Manager"
    log ""
    log "${YELLOW}Important Files:${NC}"
    log "├── Integration Code: $BACKUP_DIR/secrets_client.py"
    log "├── TypeScript Client: $BACKUP_DIR/secretsClient.ts"
    log "├── Terraform Config: $BACKUP_DIR/terraform.tfvars"
    log "├── CloudFormation: $BACKUP_DIR/cloudformation_secrets.yaml"
    log "├── Console Guide: $BACKUP_DIR/AWS_CONSOLE_INSTRUCTIONS.md"
    log "└── Rollback Script: $BACKUP_DIR/rollback.sh"
    log ""
    log "${RED}Security Reminder:${NC}"
    log "• Store backup files securely"
    log "• Rotate secrets regularly"
    log "• Monitor access logs in CloudWatch"
    log "• Enable MFA for production access"
}

# Main deployment flow
main() {
    log "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    log "${CYAN}║     Candlefish AI - AWS Secrets Manager Deployment      ║${NC}"
    log "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    log ""
    
    # Check if we should skip AWS deployment
    if [[ "${SKIP_AWS_DEPLOY:-false}" == "true" ]]; then
        log "${YELLOW}Skipping AWS deployment. Generating configuration files only.${NC}"
        create_backup
        generate_terraform_config
        generate_cloudformation
        generate_console_instructions
        generate_integration_code
        create_rollback_script
        display_summary
        exit 0
    fi
    
    # Full deployment
    if check_prerequisites; then
        create_backup
        create_kms_key
        create_iam_resources
        deploy_secrets
        setup_monitoring
        test_secrets
        generate_terraform_config
        generate_cloudformation
        generate_console_instructions
        generate_integration_code
        create_rollback_script
        display_summary
    else
        log "${YELLOW}AWS credentials not configured. Generating offline deployment package...${NC}"
        create_backup
        generate_terraform_config
        generate_cloudformation
        generate_console_instructions
        generate_integration_code
        create_rollback_script
        log ""
        log "${GREEN}Offline deployment package generated!${NC}"
        log "${CYAN}Follow the instructions in: $BACKUP_DIR/AWS_CONSOLE_INSTRUCTIONS.md${NC}"
        log "${CYAN}Or use CloudFormation template: $BACKUP_DIR/cloudformation_secrets.yaml${NC}"
    fi
    
    log ""
    log "${GREEN}Deployment script completed successfully!${NC}"
}

# Run main function
main "$@"