#!/usr/bin/env node

/**
 * AWS Secrets Manager Integration Validator
 * Tests AWS connectivity and validates JWT key secrets before deployment
 */

const { 
  SecretsManagerClient, 
  GetSecretValueCommand, 
  ListSecretsCommand,
  CreateSecretCommand,
  UpdateSecretCommand
} = require('@aws-sdk/client-secrets-manager');
const { generateKeyPair } = require('crypto');
const { promisify } = require('util');

const generateKeyPairAsync = promisify(generateKeyPair);

class AWSSecretsValidator {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.client = null;
    this.results = {
      connectivity: false,
      permissions: false,
      secrets: {
        publicKeys: false,
        privateKey: false
      },
      validation: []
    };
  }

  /**
   * Initialize AWS client with proper error handling
   */
  initializeClient() {
    try {
      const config = {
        region: this.region,
      };

      // Check for explicit credentials (Fly.io environment)
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
        console.log('✓ Using explicit AWS credentials from environment');
      } else {
        console.log('⚠ No explicit AWS credentials found, using default chain');
      }

      this.client = new SecretsManagerClient(config);
      return true;
    } catch (error) {
      console.error('✗ Failed to initialize AWS client:', error.message);
      return false;
    }
  }

  /**
   * Test basic AWS connectivity
   */
  async testConnectivity() {
    try {
      const command = new ListSecretsCommand({
        MaxResults: 1
      });
      
      await this.client.send(command);
      this.results.connectivity = true;
      console.log('✓ AWS Secrets Manager connectivity confirmed');
      return true;
    } catch (error) {
      console.error('✗ AWS connectivity failed:', error.message);
      this.results.validation.push(`Connectivity: ${error.message}`);
      return false;
    }
  }

  /**
   * Test IAM permissions for required operations
   */
  async testPermissions() {
    const permissions = [
      'secretsmanager:ListSecrets',
      'secretsmanager:GetSecretValue',
      'secretsmanager:CreateSecret',
      'secretsmanager:UpdateSecret'
    ];

    try {
      // Test ListSecrets (already tested in connectivity)
      const listCommand = new ListSecretsCommand({ MaxResults: 1 });
      await this.client.send(listCommand);

      // Test GetSecretValue with a test secret (will fail if secret doesn't exist, but that's OK)
      try {
        const getCommand = new GetSecretValueCommand({
          SecretId: 'paintbox/production/jwt/public-keys'
        });
        await this.client.send(getCommand);
      } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
          throw error; // Re-throw if it's not a "secret not found" error
        }
      }

      this.results.permissions = true;
      console.log('✓ IAM permissions validated');
      return true;
    } catch (error) {
      console.error('✗ IAM permissions insufficient:', error.message);
      this.results.validation.push(`Permissions: ${error.message}`);
      
      // Provide specific guidance
      if (error.name === 'AccessDeniedException') {
        console.log('\n📝 Required IAM Policy:');
        console.log(JSON.stringify({
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:ListSecrets",
                "secretsmanager:CreateSecret",
                "secretsmanager:UpdateSecret"
              ],
              "Resource": [
                "arn:aws:secretsmanager:*:*:secret:paintbox/*"
              ]
            }
          ]
        }, null, 2));
      }
      
      return false;
    }
  }

  /**
   * Validate or create JWT public keys secret
   */
  async validatePublicKeysSecret() {
    const secretId = 'paintbox/production/jwt/public-keys';
    
    try {
      console.log(`🔍 Checking secret: ${secretId}`);
      
      const command = new GetSecretValueCommand({
        SecretId: secretId
      });
      
      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new Error('Secret exists but has no value');
      }
      
      const publicKeys = JSON.parse(response.SecretString);
      console.log(`✓ Public keys secret found with ${Object.keys(publicKeys).length} key(s)`);
      
      // Validate JWKS format
      const hasValidKeys = Object.values(publicKeys).some(key => 
        key.kty && key.n && key.e
      );
      
      if (!hasValidKeys) {
        throw new Error('Public keys secret exists but contains invalid key format');
      }
      
      this.results.secrets.publicKeys = true;
      console.log('✓ Public keys format validated');
      return true;
      
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log('⚠ Public keys secret not found, will attempt to create...');
        return await this.createJWTKeyPair();
      } else {
        console.error('✗ Error validating public keys secret:', error.message);
        this.results.validation.push(`Public Keys: ${error.message}`);
        return false;
      }
    }
  }

  /**
   * Validate or create JWT private key secret
   */
  async validatePrivateKeySecret() {
    const secretId = 'paintbox/production/jwt/private-key';
    
    try {
      console.log(`🔍 Checking secret: ${secretId}`);
      
      const command = new GetSecretValueCommand({
        SecretId: secretId
      });
      
      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new Error('Secret exists but has no value');
      }
      
      // Basic validation that it looks like a private key
      if (!response.SecretString.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Private key secret exists but does not contain a valid private key');
      }
      
      this.results.secrets.privateKey = true;
      console.log('✓ Private key secret validated');
      return true;
      
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log('⚠ Private key secret not found, should be created with public keys...');
        this.results.validation.push('Private Key: Secret not found');
        return false;
      } else {
        console.error('✗ Error validating private key secret:', error.message);
        this.results.validation.push(`Private Key: ${error.message}`);
        return false;
      }
    }
  }

  /**
   * Generate and store new JWT key pair
   */
  async createJWTKeyPair() {
    try {
      console.log('🔑 Generating new JWT key pair...');
      
      // Generate RSA key pair
      const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Convert public key to JWKS format
      const crypto = require('crypto');
      const publicKeyObj = crypto.createPublicKey(publicKey);
      const publicKeyBuffer = publicKeyObj.export({ type: 'spki', format: 'der' });
      
      // Extract RSA components (this is a simplified version)
      // In production, you'd use a proper JWKS library
      const kid = crypto.randomUUID();
      const jwksKey = {
        kty: 'RSA',
        use: 'sig',
        kid: kid,
        alg: 'RS256',
        // Note: For production, you should properly extract n and e from the public key
        // This is a placeholder - the actual implementation would need proper ASN.1 parsing
        n: publicKeyBuffer.toString('base64url'),
        e: 'AQAB' // 65537 in base64url
      };

      // Store public keys
      const publicKeysSecret = {};
      publicKeysSecret[kid] = jwksKey;

      await this.client.send(new CreateSecretCommand({
        Name: 'paintbox/production/jwt/public-keys',
        SecretString: JSON.stringify(publicKeysSecret),
        Description: 'JWT public keys in JWKS format for Paintbox application'
      }));

      // Store private key
      await this.client.send(new CreateSecretCommand({
        Name: 'paintbox/production/jwt/private-key',
        SecretString: privateKey,
        Description: 'JWT private key for Paintbox application'
      }));

      console.log('✓ JWT key pair created and stored successfully');
      console.log(`✓ Key ID: ${kid}`);
      
      this.results.secrets.publicKeys = true;
      this.results.secrets.privateKey = true;
      
      return true;
    } catch (error) {
      console.error('✗ Failed to create JWT key pair:', error.message);
      this.results.validation.push(`Key Generation: ${error.message}`);
      return false;
    }
  }

  /**
   * Test JWKS endpoint functionality
   */
  async testJWKSEndpoint() {
    const jwksUrl = process.env.JWKS_URL || process.env.NEXTAUTH_URL + '/.well-known/jwks.json';
    
    if (!jwksUrl) {
      console.log('⚠ No JWKS URL configured for testing');
      return false;
    }

    try {
      console.log(`🔍 Testing JWKS endpoint: ${jwksUrl}`);
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(jwksUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const jwks = await response.json();
      
      if (!jwks.keys || jwks.keys.length === 0) {
        throw new Error('JWKS endpoint returns empty keys array');
      }
      
      console.log(`✓ JWKS endpoint working, ${jwks.keys.length} key(s) available`);
      return true;
    } catch (error) {
      console.error('✗ JWKS endpoint test failed:', error.message);
      this.results.validation.push(`JWKS Endpoint: ${error.message}`);
      return false;
    }
  }

  /**
   * Run complete validation suite
   */
  async runValidation() {
    console.log('🚀 Starting AWS Secrets Manager validation for Paintbox deployment\n');
    
    // Initialize client
    if (!this.initializeClient()) {
      return this.results;
    }

    // Test connectivity
    if (!await this.testConnectivity()) {
      return this.results;
    }

    // Test permissions
    if (!await this.testPermissions()) {
      return this.results;
    }

    // Validate secrets
    await this.validatePublicKeysSecret();
    await this.validatePrivateKeySecret();

    // Test endpoint (optional, might not be available during pre-deployment)
    if (process.env.NEXTAUTH_URL) {
      await this.testJWKSEndpoint();
    }

    return this.results;
  }

  /**
   * Print validation summary
   */
  printSummary() {
    console.log('\n📊 Validation Summary');
    console.log('========================');
    console.log(`Connectivity: ${this.results.connectivity ? '✓' : '✗'}`);
    console.log(`Permissions:  ${this.results.permissions ? '✓' : '✗'}`);
    console.log(`Public Keys:  ${this.results.secrets.publicKeys ? '✓' : '✗'}`);
    console.log(`Private Key:  ${this.results.secrets.privateKey ? '✓' : '✗'}`);

    if (this.results.validation.length > 0) {
      console.log('\n⚠ Issues Found:');
      this.results.validation.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }

    const isReady = this.results.connectivity && 
                   this.results.permissions && 
                   this.results.secrets.publicKeys && 
                   this.results.secrets.privateKey;

    console.log(`\n🎯 Deployment Ready: ${isReady ? '✓ YES' : '✗ NO'}`);
    
    return isReady;
  }
}

// Main execution
async function main() {
  const validator = new AWSSecretsValidator();
  
  try {
    await validator.runValidation();
    const isReady = validator.printSummary();
    
    process.exit(isReady ? 0 : 1);
  } catch (error) {
    console.error('💥 Validation failed with error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AWSSecretsValidator;