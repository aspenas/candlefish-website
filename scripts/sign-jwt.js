#!/usr/bin/env node

/**
 * Sign JWT tokens using private key from AWS Secrets Manager
 * 
 * Usage:
 *   node sign-jwt.js --payload '{"sub":"user123","name":"John Doe"}'
 *   node sign-jwt.js --payload-file payload.json
 *   echo '{"sub":"user123"}' | node sign-jwt.js
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i += 2) {
  argMap[args[i]] = args[i + 1];
}

// AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Convert JWK to PEM format
 */
function jwkToPem(jwk) {
  // Create public key from JWK components
  const keyData = {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
    d: jwk.d,
    p: jwk.p,
    q: jwk.q,
    dp: jwk.dp,
    dq: jwk.dq,
    qi: jwk.qi
  };
  
  // Use Node.js crypto to create key from JWK
  const privateKey = crypto.createPrivateKey({
    format: 'jwk',
    key: keyData
  });
  
  // Export as PEM
  return privateKey.export({
    type: 'pkcs1',
    format: 'pem'
  });
}

/**
 * Get private key from AWS Secrets Manager
 */
async function getPrivateKey() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/private-key'
    });
    
    const response = await secretsClient.send(command);
    const privateKeyJwk = JSON.parse(response.SecretString);
    
    // Convert JWK to PEM format for jsonwebtoken library
    const privateKeyPem = jwkToPem(privateKeyJwk);
    
    return { 
      key: privateKeyPem, 
      kid: privateKeyJwk.kid 
    };
  } catch (error) {
    console.error('Error fetching private key from AWS:', error.message);
    throw error;
  }
}

/**
 * Get payload from various sources
 */
async function getPayload() {
  // From --payload argument
  if (argMap['--payload']) {
    return JSON.parse(argMap['--payload']);
  }
  
  // From --payload-file argument
  if (argMap['--payload-file']) {
    const content = fs.readFileSync(argMap['--payload-file'], 'utf8');
    return JSON.parse(content);
  }
  
  // From stdin
  if (!process.stdin.isTTY) {
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error('Invalid JSON from stdin'));
        }
      });
      process.stdin.on('error', reject);
    });
  }
  
  // Default test payload
  return {
    sub: 'test-user-' + Date.now(),
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
  };
}

/**
 * Main function to sign JWT
 */
async function signJWT() {
  try {
    console.error('🔐 Fetching private key from AWS Secrets Manager...');
    const { key: privateKey, kid } = await getPrivateKey();
    
    console.error('📝 Getting payload...');
    const payload = await getPayload();
    
    // Add standard claims if not present
    const now = Math.floor(Date.now() / 1000);
    const enrichedPayload = {
      ...payload,
      iat: payload.iat || now,
      exp: payload.exp || now + (60 * 60 * 24), // 24 hours default
      iss: payload.iss || 'paintbox.fly.dev',
      jti: payload.jti || crypto.randomUUID()
    };
    
    console.error('✍️  Signing JWT...');
    const token = jwt.sign(enrichedPayload, privateKey, {
      algorithm: 'RS256',
      header: {
        kid: kid,
        typ: 'JWT'
      }
    });
    
    // Output the token to stdout
    console.log(token);
    
    // Log details to stderr
    console.error('\n✅ JWT signed successfully!');
    console.error('📊 Token Details:');
    console.error('  • Algorithm: RS256');
    console.error('  • Key ID:', kid);
    console.error('  • Issued At:', new Date(enrichedPayload.iat * 1000).toISOString());
    console.error('  • Expires:', new Date(enrichedPayload.exp * 1000).toISOString());
    console.error('  • Subject:', enrichedPayload.sub);
    console.error('  • Issuer:', enrichedPayload.iss);
    console.error('\n🔍 Verify at: https://jwt.io');
    console.error('📍 JWKS URL: https://paintbox.fly.dev/.well-known/jwks.json');
    
    if (argMap['--decode']) {
      console.error('\n📄 Decoded Token:');
      console.error(JSON.stringify(jwt.decode(token, { complete: true }), null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error signing JWT:', error.message);
    process.exit(1);
  }
}

// Show help if requested
if (argMap['--help'] || argMap['-h']) {
  console.log(`
JWT Token Signer
================

Sign JWT tokens using private key from AWS Secrets Manager.

Usage:
  node sign-jwt.js [options]
  
Options:
  --payload <json>      JWT payload as JSON string
  --payload-file <file> Read payload from JSON file
  --decode              Also output decoded token to stderr
  --help, -h            Show this help message
  
Examples:
  # Sign with inline payload
  node sign-jwt.js --payload '{"sub":"user123","name":"John Doe"}'
  
  # Sign from file
  node sign-jwt.js --payload-file user.json
  
  # Sign from stdin
  echo '{"sub":"user123"}' | node sign-jwt.js
  
  # Sign and decode
  node sign-jwt.js --payload '{"sub":"user123"}' --decode
  
  # Save token to file
  node sign-jwt.js --payload '{"sub":"user123"}' > token.txt
  
  # Use in curl request
  TOKEN=$(node sign-jwt.js --payload '{"sub":"user123"}')
  curl -H "Authorization: Bearer $TOKEN" https://api.example.com
  
Environment Variables:
  AWS_REGION           AWS region (default: us-east-1)
  AWS_ACCESS_KEY_ID    AWS access key (uses IAM role if not set)
  AWS_SECRET_ACCESS_KEY AWS secret key (uses IAM role if not set)
  
Notes:
  • Private key is fetched from: paintbox/production/jwt/private-key
  • JWKS endpoint: https://paintbox.fly.dev/.well-known/jwks.json
  • Default expiry: 24 hours
  • Output: Token to stdout, logs to stderr
  `);
  process.exit(0);
}

// Run the signing process
signJWT();