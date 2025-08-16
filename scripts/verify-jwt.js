#!/usr/bin/env node

/**
 * Verify JWT tokens using JWKS endpoint
 * 
 * Usage:
 *   node verify-jwt.js <token>
 *   node verify-jwt.js --token <token>
 *   echo '<token>' | node verify-jwt.js
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    argMap[args[i]] = args[i + 1];
    i++;
  } else {
    argMap['token'] = args[i];
  }
}

// JWKS client configuration
const client = jwksClient({
  jwksUri: 'https://paintbox.fly.dev/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

/**
 * Get signing key from JWKS
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
}

/**
 * Get token from various sources
 */
async function getToken() {
  // From direct argument
  if (argMap['token']) {
    return argMap['token'];
  }
  
  // From --token argument
  if (argMap['--token']) {
    return argMap['--token'];
  }
  
  // From stdin
  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data.trim()));
    });
  }
  
  throw new Error('No token provided');
}

/**
 * Verify JWT token
 */
async function verifyJWT() {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('No token provided');
    }
    
    console.error('🔍 Verifying JWT token...');
    console.error('📍 JWKS endpoint: https://paintbox.fly.dev/.well-known/jwks.json');
    
    // Decode without verification first to check structure
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }
    
    console.error('🔑 Key ID:', decoded.header.kid);
    console.error('📋 Algorithm:', decoded.header.alg);
    
    // Verify the token
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: ['paintbox.fly.dev', 'https://paintbox.fly.dev']
    }, (err, verified) => {
      if (err) {
        console.error('❌ Verification failed:', err.message);
        
        if (err.name === 'TokenExpiredError') {
          console.error('⏰ Token expired at:', err.expiredAt);
        } else if (err.name === 'JsonWebTokenError') {
          console.error('🚫 Token error:', err.message);
        }
        
        // Still show the payload for debugging
        console.error('\n📄 Token payload (unverified):');
        console.error(JSON.stringify(decoded.payload, null, 2));
        
        process.exit(1);
      } else {
        console.error('✅ Token verified successfully!');
        
        // Output verified payload to stdout
        console.log(JSON.stringify(verified, null, 2));
        
        // Log details to stderr
        console.error('\n📊 Token Claims:');
        console.error('  • Subject:', verified.sub);
        console.error('  • Issuer:', verified.iss);
        console.error('  • Issued:', new Date(verified.iat * 1000).toISOString());
        console.error('  • Expires:', new Date(verified.exp * 1000).toISOString());
        
        const now = Math.floor(Date.now() / 1000);
        const remaining = verified.exp - now;
        
        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          console.error(`  • Valid for: ${hours}h ${minutes}m`);
        }
        
        if (verified.name) console.error('  • Name:', verified.name);
        if (verified.email) console.error('  • Email:', verified.email);
        if (verified.role) console.error('  • Role:', verified.role);
        
        if (argMap['--verbose'] || argMap['-v']) {
          console.error('\n📄 Full Token:');
          console.error(JSON.stringify(decoded, null, 2));
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Show help if requested
if (argMap['--help'] || argMap['-h']) {
  console.log(`
JWT Token Verifier
==================

Verify JWT tokens using JWKS endpoint.

Usage:
  node verify-jwt.js <token>
  node verify-jwt.js --token <token>
  echo '<token>' | node verify-jwt.js
  
Options:
  --token <jwt>    JWT token to verify
  --verbose, -v    Show full decoded token
  --help, -h       Show this help message
  
Examples:
  # Verify token directly
  node verify-jwt.js eyJhbGciOiJSUzI1NiIs...
  
  # Verify from file
  cat token.txt | node verify-jwt.js
  
  # Verify from variable
  node verify-jwt.js --token "$TOKEN"
  
  # Verify with verbose output
  node verify-jwt.js "$TOKEN" --verbose
  
  # Sign and verify in pipeline
  node sign-jwt.js --payload '{"sub":"user123"}' | node verify-jwt.js
  
Output:
  • Verified payload to stdout (JSON)
  • Verification details to stderr
  • Exit code 0 on success, 1 on failure
  
JWKS Endpoint:
  https://paintbox.fly.dev/.well-known/jwks.json
  
Notes:
  • Only RS256 algorithm is supported
  • JWKS is cached for 10 minutes
  • Token must have valid signature and not be expired
  `);
  process.exit(0);
}

// Run the verification process
verifyJWT();