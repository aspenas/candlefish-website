const express = require('express');
const cors = require('cors');
const AWS = require('@aws-sdk/client-secrets-manager');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize AWS Secrets Manager
const secretsClient = new AWS.SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined // Use IAM role if no explicit credentials
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'paintbox-api',
    environment: process.env.NODE_ENV || 'production'
  });
});

// JWKS endpoint for JWT public keys
app.get('/.well-known/jwks.json', async (req, res) => {
  try {
    // Get public keys from AWS Secrets Manager
    const command = new AWS.GetSecretValueCommand({ 
      SecretId: 'paintbox/production/jwt/public-keys' 
    });
    const response = await secretsClient.send(command);
    const publicKeys = JSON.parse(response.SecretString);
    
    // Format as JWKS response
    const jwks = {
      keys: Object.entries(publicKeys).map(([kid, key]) => ({
        kty: key.kty || 'RSA',
        use: key.use || 'sig',
        kid: kid,
        alg: key.alg || 'RS256',
        n: key.n,
        e: key.e
      }))
    };
    
    res.setHeader('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(jwks);
  } catch (error) {
    console.error('Error fetching JWKS:', error);
    res.status(500).json({ 
      error: 'Failed to fetch JWKS',
      message: error.message 
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🔐 JWKS Server v1.0`);
  console.log(`📍 Running on port ${port}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/health`);
  console.log(`🔑 JWKS endpoint: http://localhost:${port}/.well-known/jwks.json`);
});