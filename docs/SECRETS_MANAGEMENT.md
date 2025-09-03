# Secrets Management Guide

## Overview

This guide documents the secure secrets management system for Candlefish AI using AWS Secrets Manager. All sensitive credentials have been removed from the codebase and are now managed through AWS Secrets Manager.

## Security Alert Resolution

We have addressed GitHub security alerts by:
1. Removing all hardcoded credentials from the repository
2. Replacing secrets with secure placeholders
3. Implementing AWS Secrets Manager integration
4. Creating automated rotation scripts

## AWS Secrets Manager Structure

All secrets are stored in AWS Secrets Manager with the following naming convention:

```
candlefish/
├── aws/
│   └── credentials         # AWS access keys for Terraform
├── mongodb/
│   └── credentials         # MongoDB connection details
├── api/
│   ├── anthropic          # Anthropic Claude API key
│   ├── google             # Google/Firebase API key
│   └── smithery           # Smithery API key
├── auth/
│   └── jwt                # JWT signing secret
└── security/
    └── encryption         # Data encryption key
```

## Quick Start

### 1. Initial Setup

Run the setup script to create all necessary secrets in AWS:

```bash
./scripts/security/setup-aws-secrets.sh
```

This script will:
- Check AWS CLI configuration
- Create or update all required secrets
- Generate secure passwords where needed
- Output the created secret ARNs

### 2. Rotate Secrets

To rotate all secrets:

```bash
python scripts/security/rotate-secrets.py --all
```

To rotate a specific secret:

```bash
python scripts/security/rotate-secrets.py --secret candlefish/api/smithery --type api_key
```

### 3. Using Secrets in Code

#### Python Applications

```python
from lib.aws_secrets import get_env_or_secret, get_secrets_manager

# Get API key (checks env var first, then AWS Secrets Manager)
api_key = get_env_or_secret(
    "ANTHROPIC_API_KEY",           # Environment variable name
    "candlefish/api/anthropic",    # AWS secret name
    "api_key"                       # Key within the secret
)

# Get database credentials
secrets_mgr = get_secrets_manager()
db_creds = secrets_mgr.get_database_credentials()
mongo_uri = db_creds['uri']
```

#### Node.js/TypeScript Applications

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName) {
    try {
        const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        return JSON.parse(data.SecretString);
    } catch (error) {
        console.error('Error retrieving secret:', error);
        throw error;
    }
}

// Usage
const mongoCredentials = await getSecret('candlefish/mongodb/credentials');
```

## Environment Variables

For local development, you can still use environment variables. The system checks environment variables first before querying AWS Secrets Manager.

Create a `.env` file (never commit this):

```bash
cp .env.example .env
# Edit .env with your actual values
```

## Files Updated

The following files have been updated to remove hardcoded secrets:

1. **terraform.tfvars.example** - AWS credentials replaced with placeholders
2. **DEPLOY_NOW.md** - Deployment credentials replaced with placeholders
3. **google-services.json.template** - Google API key replaced with placeholder
4. **agent_bridge.py** - MongoDB and API credentials replaced with placeholders
5. **agent_bridge_secure.py** - New secure version using AWS Secrets Manager

## Security Best Practices

1. **Never commit real credentials** - Always use placeholders in example files
2. **Use AWS IAM roles** - In production, use IAM roles instead of access keys
3. **Rotate regularly** - Set up automatic rotation every 90 days
4. **Limit access** - Use IAM policies to restrict secret access
5. **Audit access** - Enable CloudTrail logging for secret access
6. **Use versioning** - AWS Secrets Manager maintains version history

## Automatic Rotation

Set up a cron job or AWS Lambda for automatic rotation:

```bash
# Add to crontab for monthly rotation
0 0 1 * * /usr/bin/python3 /path/to/scripts/security/rotate-secrets.py --all
```

## IAM Policy Example

Create an IAM policy for accessing Candlefish secrets:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:candlefish/*"
        }
    ]
}
```

## Troubleshooting

### Secret Not Found

```bash
# List all Candlefish secrets
aws secretsmanager list-secrets --query "SecretList[?contains(Name, 'candlefish/')]"

# Get specific secret value
aws secretsmanager get-secret-value --secret-id candlefish/api/anthropic
```

### Permission Denied

Ensure your AWS credentials have the necessary permissions:

```bash
# Check current identity
aws sts get-caller-identity

# Test secret access
aws secretsmanager get-secret-value --secret-id candlefish/api/anthropic --query SecretString
```

### Connection Issues

If AWS Secrets Manager is unavailable, the system falls back to environment variables:

1. Ensure `.env` file exists with necessary variables
2. Check AWS region configuration
3. Verify network connectivity to AWS

## Migration Checklist

- [x] Remove all hardcoded secrets from repository
- [x] Create AWS Secrets Manager entries
- [x] Update application code to use secrets manager
- [x] Create rotation scripts
- [x] Document the new process
- [x] Test secret retrieval
- [ ] Set up automatic rotation
- [ ] Configure CloudTrail logging
- [ ] Update CI/CD pipelines

## Support

For issues or questions about secrets management:

1. Check this documentation
2. Review AWS Secrets Manager logs in CloudWatch
3. Contact the security team

## Important Notes

⚠️ **All previously exposed secrets must be rotated immediately** as they were visible in the repository history.

⚠️ **Never use the example/template files for production** - they contain only placeholders.

⚠️ **Always verify secret rotation** after running rotation scripts.