# Manual Secret Rotation Guide

## Immediate Actions Required

Since secrets were exposed in the repository, you must rotate them immediately:

### 1. AWS Credentials
```bash
# Log into AWS Console
# Navigate to IAM > Users > Your User > Security Credentials
# Create new Access Key
# Delete the old Access Key ID: AKIAZ5G4HRQHZIBGMDNM
# Update your local AWS credentials:
aws configure
```

### 2. MongoDB Atlas
```bash
# Log into MongoDB Atlas
# Navigate to Database Access
# Edit user 'mihirsheth2911' 
# Generate new password
# Update connection strings in all applications
```

### 3. Google/Firebase API Key
```bash
# Log into Google Cloud Console
# Navigate to APIs & Services > Credentials
# Delete the exposed key: AIzaSyBGHmF2vC4R8tX9pQ6jK3nM7wE1sA5yZ2B
# Create new API key
# Add restrictions (IP, API, etc.)
```

### 4. Smithery API Key
```bash
# Generate new UUID:
uuidgen | tr '[:upper:]' '[:lower:]'
# Update in Smithery dashboard if applicable
```

## Setting Up AWS Secrets Manager

Once you have new AWS credentials:

```bash
# Configure AWS CLI with new credentials
aws configure

# Run the setup script
./scripts/security/setup-aws-secrets.sh

# Verify secrets were created
aws secretsmanager list-secrets --query "SecretList[?contains(Name, 'candlefish/')].[Name]" --output table
```

## Manual Rotation Process

### Using the Python Script
```bash
# Rotate all secrets
python scripts/security/rotate-secrets.py --all

# Rotate specific secret
python scripts/security/rotate-secrets.py --secret candlefish/api/smithery --type api_key

# Verify rotation
python scripts/security/rotate-secrets.py --verify candlefish/api/smithery
```

### Using AWS CLI
```bash
# Get current secret
aws secretsmanager get-secret-value --secret-id candlefish/api/anthropic

# Update secret
aws secretsmanager update-secret \
  --secret-id candlefish/api/anthropic \
  --secret-string '{"api_key":"NEW_API_KEY_HERE"}'

# Add rotation timestamp
aws secretsmanager tag-resource \
  --secret-id candlefish/api/anthropic \
  --tags Key=LastRotated,Value=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

## Automatic Rotation Setup

### Option 1: Crontab (Recommended)
```bash
# Edit crontab
crontab -e

# Add monthly rotation (1st of each month at 3 AM)
0 3 1 * * AWS_PROFILE=default /usr/bin/python3 /path/to/scripts/security/rotate-secrets.py --all >> /var/log/secret-rotation.log 2>&1
```

### Option 2: AWS Lambda
Create a Lambda function that triggers monthly to rotate secrets automatically.

### Option 3: GitHub Actions
```yaml
name: Rotate Secrets
on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly
  workflow_dispatch:  # Manual trigger

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Rotate Secrets
        run: python scripts/security/rotate-secrets.py --all
```

## Testing After Rotation

```bash
# Test MongoDB connection
python -c "from pymongo import MongoClient; client = MongoClient('YOUR_NEW_URI'); print('Connected!')"

# Test AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id candlefish/api/anthropic --query SecretString

# Test application
cd projects/paintbox/nanda-deployment/agents
python agent_bridge_secure.py
```

## Rollback Procedure

If rotation causes issues:

```bash
# AWS Secrets Manager keeps version history
# List versions
aws secretsmanager list-secret-version-ids --secret-id candlefish/api/anthropic

# Restore previous version
aws secretsmanager update-secret-version-stage \
  --secret-id candlefish/api/anthropic \
  --version-stage AWSCURRENT \
  --move-to-version-id PREVIOUS_VERSION_ID
```

## Security Checklist

- [ ] Rotated AWS Access Keys
- [ ] Rotated AWS Secret Keys  
- [ ] Rotated MongoDB password
- [ ] Rotated Google API key
- [ ] Rotated Smithery API key
- [ ] Updated all application configurations
- [ ] Tested all services after rotation
- [ ] Set up automatic rotation
- [ ] Documented new credentials securely
- [ ] Deleted old credentials from all systems

## Support

For issues during rotation:
1. Check AWS CloudTrail logs
2. Review application logs
3. Contact security team if needed