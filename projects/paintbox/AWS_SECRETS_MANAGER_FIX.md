# AWS Secrets Manager Integration Fix for Paintbox on Fly.io

## Problem Summary

The JWKS endpoint at `https://paintbox.fly.dev/.well-known/jwks.json` was returning empty keys despite:
- AWS Secrets Manager containing valid RSA public keys
- AWS credentials being configured in Fly.io environment variables
- The application having the necessary code to fetch secrets

## Root Causes Identified

1. **IAM Permissions**: The AWS user credentials in Fly.io lacked the `secretsmanager:GetSecretValue` permission
2. **SDK Initialization**: The AWS SDK wasn't properly configured for the Fly.io environment
3. **Error Handling**: The JWKS endpoint wasn't gracefully handling AWS SDK failures
4. **Missing Initialization**: Secrets weren't being loaded at application startup

## Solution Implemented

### 1. Enhanced JWKS Endpoint (`app/api/.well-known/jwks.json/route.ts`)

- **Proper AWS SDK initialization** with explicit credential configuration
- **Comprehensive error handling** with specific error type detection
- **Caching mechanism** to reduce AWS API calls (10-minute TTL)
- **Fallback to hardcoded keys** if AWS fails
- **Detailed logging** for debugging in production
- **Response headers** indicating source (aws/cache/fallback)

### 2. AWS Secrets Initialization (`lib/startup/initialize-aws-secrets.ts`)

- **Automatic secret loading** on application startup
- **Support for multiple secret types** (JWT keys, database, Redis, etc.)
- **Environment variable injection** for compatibility
- **Parallel loading** for faster startup
- **Critical vs optional secrets** handling

### 3. IAM Permissions Fix (`scripts/fix-aws-iam-permissions.sh`)

Creates/updates IAM policy with required permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:paintbox/*"
    }
  ]
}
```

### 4. Deployment Script (`scripts/deploy-with-aws-secrets.sh`)

Complete deployment workflow that:
- Verifies AWS credentials and permissions
- Tests Secrets Manager access before deployment
- Updates Fly.io environment variables
- Builds and deploys the application
- Validates JWKS endpoint after deployment

### 5. Validation Tools

- **`scripts/check-fly-aws-permissions.js`**: Tests AWS permissions from Fly.io perspective
- **`scripts/validate-aws-integration.js`**: Comprehensive integration validation

## Deployment Instructions

### Step 1: Fix IAM Permissions

```bash
# Run the IAM fix script
./scripts/fix-aws-iam-permissions.sh

# This will:
# - Create/update IAM user: paintbox-fly-user
# - Attach proper Secrets Manager permissions
# - Optionally create new access keys
```

### Step 2: Update Fly.io Secrets

```bash
# Set AWS credentials in Fly.io
flyctl secrets set -a paintbox \
  AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY" \
  AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY" \
  AWS_REGION="us-east-1" \
  AUTO_INIT_SECRETS="true"
```

### Step 3: Deploy Application

```bash
# Run the deployment script
./scripts/deploy-with-aws-secrets.sh

# Or deploy manually
flyctl deploy -a paintbox
```

### Step 4: Validate Integration

```bash
# Run validation script
node scripts/validate-aws-integration.js

# Or test manually
curl https://paintbox.fly.dev/.well-known/jwks.json | jq .
```

## Architecture Details

### Request Flow

1. Client requests `/.well-known/jwks.json`
2. JWKS endpoint checks cache (10-minute TTL)
3. If cache miss, fetches from AWS Secrets Manager
4. If AWS fails, returns hardcoded fallback keys
5. Response includes headers indicating source

### Secret Structure in AWS

Location: `paintbox/production/jwt/public-keys`

Format:
```json
{
  "88672a69-26ae-45db-b73c-93debf7ea87d": {
    "kty": "RSA",
    "n": "...",
    "e": "AQAB",
    "kid": "88672a69-26ae-45db-b73c-93debf7ea87d",
    "use": "sig",
    "alg": "RS256"
  }
}
```

### Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AUTO_INIT_SECRETS` | Auto-load secrets on startup | `true` |

## Monitoring and Debugging

### Check Application Logs

```bash
# View recent logs
flyctl logs -a paintbox

# SSH into container
flyctl ssh console -a paintbox

# Check environment variables
flyctl secrets list -a paintbox
```

### Debug AWS SDK Issues

Look for log entries starting with `[JWKS]` or `[AWS Init]`:

- `[JWKS] Using explicit AWS credentials` - Credentials found
- `[JWKS] ACCESS DENIED` - IAM permissions issue
- `[JWKS] SECRET NOT FOUND` - Secret doesn't exist
- `[JWKS] Using fallback keys` - AWS integration failed

### Response Headers

The JWKS endpoint includes debugging headers:

- `X-JWKS-Source`: `aws` | `cache` | `fallback` | `fallback-error`
- `X-Response-Time`: Response time in milliseconds
- `X-Error`: Error message (if using fallback due to error)

## Security Considerations

1. **Principle of Least Privilege**: IAM policy only grants access to `paintbox/*` secrets
2. **Credential Rotation**: Rotate AWS access keys regularly
3. **Audit Logging**: All secret access is logged in CloudTrail
4. **Fallback Keys**: Hardcoded keys ensure service continuity but should be updated if rotated
5. **HTTPS Only**: Fly.io enforces HTTPS for all requests

## Troubleshooting

### JWKS Returns Empty Keys

1. Check AWS credentials are set: `flyctl secrets list -a paintbox`
2. Verify IAM permissions: `./scripts/check-fly-aws-permissions.js`
3. Check application logs: `flyctl logs -a paintbox`
4. Test AWS access directly: `aws secretsmanager get-secret-value --secret-id paintbox/production/jwt/public-keys`

### AWS SDK Errors

1. **AccessDeniedException**: Run `./scripts/fix-aws-iam-permissions.sh`
2. **ResourceNotFoundException**: Verify secret exists in AWS Secrets Manager
3. **Network errors**: Check Fly.io network configuration

### Performance Issues

1. Enable caching (already implemented with 10-minute TTL)
2. Consider increasing cache TTL if keys don't rotate frequently
3. Monitor AWS API rate limits

## Future Improvements

1. **Key Rotation Automation**: Implement automatic key rotation with zero downtime
2. **Multi-Region Support**: Add fallback to different AWS regions
3. **Metrics Collection**: Add CloudWatch metrics for secret access patterns
4. **Secret Versioning**: Support multiple key versions during rotation
5. **Health Check Integration**: Add secret availability to health checks

## Support

For issues or questions:
1. Check application logs: `flyctl logs -a paintbox`
2. Run validation: `node scripts/validate-aws-integration.js`
3. Review this documentation
4. Check AWS CloudTrail for API call history

## Files Modified/Created

- `/app/api/.well-known/jwks.json/route.ts` - Enhanced JWKS endpoint
- `/lib/startup/initialize-aws-secrets.ts` - Secrets initialization
- `/scripts/fix-aws-iam-permissions.sh` - IAM permission fix
- `/scripts/deploy-with-aws-secrets.sh` - Deployment script
- `/scripts/check-fly-aws-permissions.js` - Permission checker
- `/scripts/validate-aws-integration.js` - Integration validator

## Success Criteria

✅ JWKS endpoint returns valid keys
✅ Keys match those in AWS Secrets Manager
✅ Application can fetch secrets on startup
✅ Proper error handling and fallback
✅ Comprehensive logging for debugging
✅ Automated deployment process