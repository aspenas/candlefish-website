# AWS Secrets Manager Integration for JWKS

## Overview
This document describes the production-ready AWS Secrets Manager integration for serving JWT public keys via the JWKS endpoint in the Paintbox Next.js application deployed on Fly.io.

## Architecture

### Components
1. **JWKS Endpoint**: `/.well-known/jwks.json` - Serves public keys for JWT verification
2. **AWS Secrets Manager Service**: Dedicated service for fetching keys from AWS
3. **Multi-layer Caching**: Memory cache + HTTP caching headers
4. **Fallback Mechanism**: Hardcoded keys for reliability

### Data Flow
```
Client Request → JWKS Endpoint
                    ↓
                Check Cache (10min TTL)
                    ↓ (miss)
                AWS Secrets Manager
                    ↓ (success/fail)
                Update Cache
                    ↓
                Return Response
```

## AWS Configuration

### Secret Details
- **Secret Name**: `paintbox/production/jwt/public-keys`
- **Region**: `us-east-1`
- **Account**: `681214184463`
- **Format**: JSON object with key ID as keys

### Required IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:681214184463:secret:paintbox/production/jwt/public-keys-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:681214184463:key/*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

## Implementation Files

### Core Services
- `/lib/services/jwks-secrets-manager.ts` - AWS Secrets Manager service
- `/app/.well-known/jwks.json/route.ts` - Direct JWKS endpoint handler
- `/app/api/.well-known/jwks.json/route.ts` - API route handler (backup)

### Scripts
- `/scripts/test-jwks-aws.ts` - Comprehensive test suite
- `/scripts/setup-fly-aws-secrets.sh` - Fly.io AWS credentials setup

## Deployment

### Setting AWS Credentials on Fly.io
```bash
# Run the setup script
./scripts/setup-fly-aws-secrets.sh

# Or manually set secrets
fly secrets set --app paintbox \
  AWS_REGION=us-east-1 \
  AWS_ACCESS_KEY_ID=<your-key-id> \
  AWS_SECRET_ACCESS_KEY=<your-secret-key>
```

### Environment Variables
```env
# Required
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from-aws>
AWS_SECRET_ACCESS_KEY=<from-aws>

# Optional
AWS_SESSION_TOKEN=<for-temporary-creds>
```

## Testing

### Local Testing
```bash
# Test AWS connection and fetch
npx tsx scripts/test-jwks-aws.ts

# Test with HTTP endpoint
SKIP_HTTP_TEST=false npx tsx scripts/test-jwks-aws.ts
```

### Production Testing
```bash
# Test the deployed endpoint
curl https://paintbox.fly.dev/.well-known/jwks.json

# Check response headers
curl -I https://paintbox.fly.dev/.well-known/jwks.json

# Verify with specific script
./scripts/setup-fly-aws-secrets.sh --test
```

## Performance Characteristics

### Response Times
- **Cache Hit**: < 5ms
- **AWS Fetch**: 75-100ms (average)
- **Fallback**: < 10ms

### Caching Strategy
- **Memory Cache**: 10 minutes (600 seconds)
- **Browser Cache**: 10 minutes via Cache-Control header
- **ETag Support**: 304 Not Modified for unchanged content
- **Stale-While-Revalidate**: Serves stale content while fetching

### Reliability Features
1. **3x Retry Logic**: Automatic retries with exponential backoff
2. **Timeout Protection**: 5-second timeout per request
3. **Fallback Keys**: Always returns valid JWKS even on failure
4. **Connection Pooling**: Reuses HTTPS connections
5. **Graceful Degradation**: Falls back to cached or hardcoded keys

## Monitoring

### Key Metrics
- Request count and cache hit rate
- AWS success/failure rates
- Response times by source (cache/aws/fallback)
- Last error details and timestamp

### Health Checks
The `/api/health` endpoint includes JWKS verification:
```json
{
  "checks": {
    "jwks": {
      "status": "pass",
      "message": "JWKS endpoint accessible",
      "responseTime": 45
    }
  }
}
```

### Logging
All operations are logged with prefixes:
- `[JWKS]` - Endpoint handler logs
- `[JWKS-SM]` - Secrets Manager service logs

## Troubleshooting

### Common Issues

#### 1. 404 Not Found
- **Cause**: Route not properly configured
- **Fix**: Ensure `/app/.well-known/jwks.json/route.ts` exists
- **Alternative**: Use `/api/.well-known/jwks.json` with rewrite

#### 2. AWS Access Denied
- **Cause**: Missing IAM permissions or credentials
- **Fix**: Run `./scripts/setup-fly-aws-secrets.sh` to configure
- **Verify**: Check `fly secrets list --app paintbox`

#### 3. Empty Keys Response
- **Cause**: Secret format incorrect or parsing error
- **Fix**: Verify secret format in AWS Console
- **Expected Format**:
```json
{
  "88672a69-26ae-45db-b73c-93debf7ea87d": {
    "kty": "RSA",
    "use": "sig",
    "alg": "RS256",
    "n": "...",
    "e": "AQAB"
  }
}
```

#### 4. Slow Response Times
- **Cause**: Cold start or AWS latency
- **Fix**: Cache is working after first request
- **Monitor**: Check X-JWKS-Source header

### Debug Commands
```bash
# Check AWS credentials
aws sts get-caller-identity

# Test secret access
aws secretsmanager get-secret-value \
  --secret-id paintbox/production/jwt/public-keys \
  --region us-east-1

# Check Fly.io logs
fly logs --app paintbox | grep JWKS

# Monitor in real-time
fly logs --app paintbox -f | grep -E "JWKS|jwks"
```

## Security Considerations

1. **Never expose private keys** - Only public keys in JWKS
2. **Use HTTPS only** - Endpoint forces HTTPS via Fly.io
3. **Rotate keys regularly** - Monthly rotation recommended
4. **Limit AWS permissions** - Use least privilege principle
5. **Monitor access patterns** - Check for unusual activity

## Maintenance

### Key Rotation
1. Generate new keypair
2. Update AWS Secrets Manager with new public key
3. Keep old key for grace period (24-48 hours)
4. Remove old key after grace period

### Updating Fallback Keys
1. Get latest from AWS: `aws secretsmanager get-secret-value ...`
2. Update hardcoded keys in route handlers
3. Deploy new version
4. Verify fallback works by blocking AWS temporarily

## Cost Optimization

### AWS Costs
- **Secrets Manager**: $0.40/month per secret
- **API Calls**: $0.05 per 10,000 API calls
- **Estimated Monthly**: < $1.00 with caching

### Optimization Tips
1. Increase cache TTL if keys rarely change
2. Use CloudFront for global distribution
3. Consider parameter store for lower cost (less features)
4. Monitor API call patterns to optimize cache

## Support

### Resources
- AWS Secrets Manager Docs: https://docs.aws.amazon.com/secretsmanager/
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Fly.io Secrets: https://fly.io/docs/reference/secrets/

### Contact
- Project: Paintbox
- Team: Candlefish.ai
- AWS Account: 681214184463

---

Last Updated: August 21, 2025
Version: 1.0.0
