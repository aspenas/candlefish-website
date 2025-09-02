# JWT Implementation Complete ✅

## Overview
Complete JWT (JSON Web Token) infrastructure has been successfully implemented with signing, verification, and key rotation capabilities.

## Live Endpoints

### JWKS Endpoint
- **URL**: https://paintbox.fly.dev/.well-known/jwks.json
- **Status**: ✅ Live and working
- **Current Key ID**: `88672a69-26ae-45db-b73c-93debf7ea87d`

## Components Implemented

### 1. JWT Key Management
- **Private Key Storage**: AWS Secrets Manager (`paintbox/production/jwt/private-key`)
- **Public Key Storage**: AWS Secrets Manager (`paintbox/production/jwt/public-keys`)
- **Key Format**: RSA 2048-bit keys in JWK format
- **Algorithm**: RS256 (RSA Signature with SHA-256)

### 2. JWT Signing (`scripts/sign-jwt.js`)
Sign JWT tokens using the private key from AWS Secrets Manager.

```bash
# Basic usage
node scripts/sign-jwt.js --payload '{"sub":"user123","name":"John Doe"}'

# From file
node scripts/sign-jwt.js --payload-file user.json

# From stdin
echo '{"sub":"user123"}' | node scripts/sign-jwt.js
```

**Features**:
- Fetches private key from AWS Secrets Manager
- Adds standard claims (iat, exp, iss, jti)
- 24-hour default expiry
- Outputs token to stdout, logs to stderr

### 3. JWT Verification (`scripts/verify-jwt.js`)
Verify JWT tokens using the JWKS endpoint.

```bash
# Verify token
node scripts/verify-jwt.js <token>

# From stdin
echo '<token>' | node scripts/verify-jwt.js

# With verbose output
node scripts/verify-jwt.js <token> --verbose
```

**Features**:
- Fetches public keys from JWKS endpoint
- Validates signature and expiry
- Shows token claims and remaining validity
- Caches JWKS for 10 minutes

### 4. Key Generation (`scripts/generate-full-jwt-keys.sh`)
Generate new JWT key pairs with complete RSA components.

```bash
./scripts/generate-full-jwt-keys.sh
```

**Features**:
- Generates RSA 2048-bit key pair
- Converts to JWK format with all components
- Stores in AWS Secrets Manager
- Generates unique key ID (UUID)

### 5. Key Rotation Workflow (`.github/workflows/jwt-rotate.yml`)
Automated monthly key rotation via GitHub Actions.

**Features**:
- Runs monthly on the 1st at 3 AM UTC
- Manual trigger available
- Keeps last 2 keys for graceful rotation
- Updates both private and public keys
- Verifies JWKS endpoint after rotation

### 6. Express API Integration
JWKS endpoint added to Paintbox Express server (`api-server-enhanced.js`).

```javascript
app.get('/.well-known/jwks.json', async (req, res) => {
  // Fetches public keys from AWS Secrets Manager
  // Returns properly formatted JWKS response
});
```

## Example Workflow

### Complete Example (`scripts/jwt-example.sh`)
Demonstrates the full JWT workflow:

```bash
./scripts/jwt-example.sh
```

This script:
1. Creates a payload
2. Signs the JWT
3. Verifies the token
4. Shows how to use in API requests

## Security Considerations

### Key Storage
- Private keys never exposed in code or logs
- Stored encrypted in AWS Secrets Manager
- Access controlled via IAM roles

### Token Security
- RS256 algorithm (asymmetric cryptography)
- Public key verification via JWKS
- Automatic expiry (default 24 hours)
- Unique JWT ID (jti) for each token

### CORS Configuration
- JWKS endpoint allows cross-origin access
- 10-minute cache for performance
- Public endpoint (no authentication required)

## Testing

### Quick Test
```bash
# Sign a test token
TOKEN=$(node scripts/sign-jwt.js --payload '{"sub":"test-user"}')

# Verify it
echo "$TOKEN" | node scripts/verify-jwt.js

# Check JWKS endpoint
curl https://paintbox.fly.dev/.well-known/jwks.json | jq
```

### Integration Test
```bash
# Run complete example
./scripts/jwt-example.sh
```

## Monitoring

### Health Checks
- JWKS endpoint: https://paintbox.fly.dev/.well-known/jwks.json
- API health: https://paintbox.fly.dev/api/health

### Key Rotation Status
- Check GitHub Actions: `.github/workflows/jwt-rotate.yml`
- Last rotation: Check AWS Secrets Manager version history
- Next rotation: 1st of next month, 3 AM UTC

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   ```bash
   unset AWS_PROFILE  # Avoid credential conflicts
   ```

2. **Token Expired**
   - Default expiry is 24 hours
   - Generate new token with sign-jwt.js

3. **JWKS Not Updated**
   - Restart Paintbox app after key rotation
   - Check AWS Secrets Manager for latest keys

4. **Verification Failed**
   - Ensure token was signed with current key
   - Check JWKS endpoint is accessible
   - Verify issuer matches (paintbox.fly.dev)

## Next Steps

### Recommended Enhancements
1. **Add refresh token support** for long-lived sessions
2. **Implement token revocation** list
3. **Add multiple key support** for zero-downtime rotation
4. **Create middleware** for Express/Next.js apps
5. **Add monitoring** for key rotation failures

### Integration Points
- Add JWT verification to API endpoints
- Implement user authentication flow
- Add role-based access control (RBAC)
- Integrate with frontend applications

## Files Created/Modified

### New Files
- `/scripts/sign-jwt.js` - JWT signing utility
- `/scripts/verify-jwt.js` - JWT verification utility
- `/scripts/generate-full-jwt-keys.sh` - Key generation script
- `/scripts/jwt-example.sh` - Complete example workflow
- `/projects/paintbox/api-jwks-server.js` - Standalone JWKS server

### Modified Files
- `/projects/paintbox/api-server-enhanced.js` - Added JWKS endpoint
- `/.github/workflows/jwt-rotate.yml` - Key rotation workflow

### AWS Secrets
- `paintbox/production/jwt/private-key` - Private signing key
- `paintbox/production/jwt/public-keys` - Public verification keys

## Success Metrics
✅ JWKS endpoint live and accessible
✅ JWT signing working with AWS Secrets Manager
✅ JWT verification working with JWKS endpoint
✅ Key rotation workflow configured
✅ Complete example demonstrating full flow
✅ Documentation complete

---

**Status**: 🟢 PRODUCTION READY

The JWT infrastructure is fully operational and ready for integration into authentication and authorization systems.
