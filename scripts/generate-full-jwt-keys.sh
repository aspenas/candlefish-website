#!/bin/bash
# Generate complete JWT key pair with both private and public components

set -e

echo "🔐 Generating complete JWT key pair..."

# Generate RSA key pair in PEM format
openssl genrsa -out /tmp/private_key.pem 2048
openssl rsa -in /tmp/private_key.pem -pubout -out /tmp/public_key.pem

# Generate a unique key ID
KEY_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

echo "📝 Converting to JWK format..."

# Create Node.js script to convert PEM to JWK properly
cat > /tmp/pem-to-jwk.js << 'EOF'
const fs = require('fs');
const crypto = require('crypto');

// Read PEM files
const privateKeyPem = fs.readFileSync('/tmp/private_key.pem', 'utf8');
const publicKeyPem = fs.readFileSync('/tmp/public_key.pem', 'utf8');

// Get key ID from command line
const keyId = process.argv[2];

// Convert private key to JWK (includes all components)
const privateKey = crypto.createPrivateKey(privateKeyPem);
const privateJwk = privateKey.export({ format: 'jwk' });
privateJwk.kid = keyId;
privateJwk.use = 'sig';
privateJwk.alg = 'RS256';

// Convert public key to JWK
const publicKey = crypto.createPublicKey(publicKeyPem);
const publicJwk = publicKey.export({ format: 'jwk' });
publicJwk.kid = keyId;
publicJwk.use = 'sig';
publicJwk.alg = 'RS256';

// Output results
console.log('PRIVATE_JWK=' + JSON.stringify(privateJwk));
console.log('PUBLIC_JWK=' + JSON.stringify(publicJwk));
EOF

# Run the conversion
node /tmp/pem-to-jwk.js "$KEY_ID" > /tmp/jwk-output.txt

# Extract the JWKs
PRIVATE_JWK=$(grep "^PRIVATE_JWK=" /tmp/jwk-output.txt | cut -d'=' -f2-)
PUBLIC_JWK=$(grep "^PUBLIC_JWK=" /tmp/jwk-output.txt | cut -d'=' -f2-)

# Create public keys object with kid as key
PUBLIC_KEYS=$(echo "{\"$KEY_ID\": $PUBLIC_JWK}")

echo "✅ Generated JWT key pair with ID: $KEY_ID"

# Store in AWS Secrets Manager
echo "📤 Storing keys in AWS Secrets Manager..."

# Store complete private key (with all RSA components)
aws secretsmanager put-secret-value \
  --secret-id "paintbox/production/jwt/private-key" \
  --secret-string "$PRIVATE_JWK" \
  --region us-east-1

# Store public keys
aws secretsmanager put-secret-value \
  --secret-id "paintbox/production/jwt/public-keys" \
  --secret-string "$PUBLIC_KEYS" \
  --region us-east-1

# Clean up temp files
rm -f /tmp/private_key.pem /tmp/public_key.pem /tmp/pem-to-jwk.js /tmp/jwk-output.txt

echo "✅ JWT keys successfully stored in AWS Secrets Manager"
echo ""
echo "Key Details:"
echo "  • Key ID: $KEY_ID"
echo "  • Algorithm: RS256"
echo "  • Private key: paintbox/production/jwt/private-key"
echo "  • Public keys: paintbox/production/jwt/public-keys"
echo ""
echo "Test with:"
echo "  node scripts/sign-jwt.js --payload '{\"sub\":\"test-user\"}'"