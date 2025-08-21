#!/usr/bin/env node

/**
 * AWS Secrets Manager Integration Validation Script
 * Tests the complete integration between Fly.io and AWS Secrets Manager
 */

const https = require('https');
const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require('@aws-sdk/client-secrets-manager');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test configuration
const APP_URL = process.env.APP_URL || 'https://paintbox.fly.dev';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Make HTTPS request
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

/**
 * Test JWKS endpoint
 */
async function testJWKSEndpoint() {
  console.log(`\n${colors.cyan}Testing JWKS Endpoint...${colors.reset}`);

  try {
    const url = `${APP_URL}/.well-known/jwks.json`;
    console.log(`  URL: ${url}`);

    const response = await httpsGet(url);
    console.log(`  Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }

    const jwks = JSON.parse(response.body);

    // Check for keys
    if (!jwks.keys || !Array.isArray(jwks.keys)) {
      throw new Error('Invalid JWKS format - missing keys array');
    }

    if (jwks.keys.length === 0) {
      throw new Error('JWKS returns empty keys array');
    }

    console.log(`  ${colors.green}✓${colors.reset} JWKS contains ${jwks.keys.length} key(s)`);

    // Validate key structure
    for (const key of jwks.keys) {
      if (!key.kty || !key.kid || !key.n || !key.e) {
        throw new Error(`Invalid key structure: ${JSON.stringify(key)}`);
      }
    }

    console.log(`  ${colors.green}✓${colors.reset} All keys have valid structure`);

    // Check headers
    const source = response.headers['x-jwks-source'];
    if (source) {
      console.log(`  Source: ${source}`);
      if (source === 'fallback' || source === 'fallback-error') {
        testResults.warnings.push('JWKS using fallback keys (AWS integration may be failing)');
      }
    }

    const responseTime = response.headers['x-response-time'];
    if (responseTime) {
      console.log(`  Response Time: ${responseTime}`);
    }

    testResults.passed.push('JWKS endpoint working');
    return jwks;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} ${error.message}`);
    testResults.failed.push(`JWKS endpoint: ${error.message}`);
    return null;
  }
}

/**
 * Test AWS Secrets Manager direct access
 */
async function testAWSSecretsManager() {
  console.log(`\n${colors.cyan}Testing AWS Secrets Manager Access...${colors.reset}`);

  try {
    const client = new SecretsManagerClient({
      region: AWS_REGION,
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } : undefined
    });

    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/public-keys'
    });

    console.log('  Fetching secret from AWS...');
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret has no value');
    }

    const publicKeys = JSON.parse(response.SecretString);
    const keyCount = Object.keys(publicKeys).length;

    console.log(`  ${colors.green}✓${colors.reset} Retrieved ${keyCount} key(s) from AWS Secrets Manager`);
    testResults.passed.push('AWS Secrets Manager access working');

    return publicKeys;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} ${error.message}`);

    if (error.name === 'AccessDeniedException') {
      console.log(`  ${colors.yellow}Note: IAM permissions issue - run fix-aws-iam-permissions.sh${colors.reset}`);
    }

    testResults.failed.push(`AWS Secrets Manager: ${error.message}`);
    return null;
  }
}

/**
 * Compare JWKS endpoint with AWS Secrets Manager
 */
function compareKeys(jwksKeys, awsKeys) {
  console.log(`\n${colors.cyan}Comparing JWKS with AWS Secrets Manager...${colors.reset}`);

  if (!jwksKeys || !awsKeys) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Cannot compare - one source failed`);
    return;
  }

  // Convert JWKS array to object for comparison
  const jwksKeyMap = {};
  for (const key of jwksKeys.keys) {
    jwksKeyMap[key.kid] = key;
  }

  let match = true;

  for (const [kid, awsKey] of Object.entries(awsKeys)) {
    const jwksKey = jwksKeyMap[kid];

    if (!jwksKey) {
      console.log(`  ${colors.red}✗${colors.reset} Key ${kid} missing in JWKS`);
      match = false;
      continue;
    }

    if (jwksKey.n !== awsKey.n) {
      console.log(`  ${colors.red}✗${colors.reset} Key ${kid} modulus mismatch`);
      match = false;
      continue;
    }

    console.log(`  ${colors.green}✓${colors.reset} Key ${kid} matches`);
  }

  if (match && Object.keys(awsKeys).length === jwksKeys.keys.length) {
    console.log(`  ${colors.green}✓${colors.reset} All keys match between JWKS and AWS`);
    testResults.passed.push('JWKS keys match AWS Secrets Manager');
  } else {
    testResults.warnings.push('Key mismatch between JWKS and AWS Secrets Manager');
  }
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint() {
  console.log(`\n${colors.cyan}Testing Health Endpoint...${colors.reset}`);

  try {
    const url = `${APP_URL}/api/health`;
    console.log(`  URL: ${url}`);

    const response = await httpsGet(url);
    console.log(`  Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }

    const health = JSON.parse(response.body);

    if (health.status === 'healthy') {
      console.log(`  ${colors.green}✓${colors.reset} Application is healthy`);
      testResults.passed.push('Health check passed');
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Application status: ${health.status}`);
      testResults.warnings.push(`Health status: ${health.status}`);
    }

    return health;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} ${error.message}`);
    testResults.failed.push(`Health endpoint: ${error.message}`);
    return null;
  }
}

/**
 * Test environment configuration
 */
function testEnvironment() {
  console.log(`\n${colors.cyan}Testing Environment Configuration...${colors.reset}`);

  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];

  const missing = [];

  for (const key of required) {
    if (process.env[key]) {
      console.log(`  ${colors.green}✓${colors.reset} ${key} is set`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${key} is missing`);
      missing.push(key);
    }
  }

  if (missing.length === 0) {
    testResults.passed.push('Environment configuration complete');
  } else {
    testResults.failed.push(`Missing environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations() {
  const recommendations = [];

  if (testResults.failed.some(f => f.includes('JWKS endpoint'))) {
    recommendations.push('Fix JWKS endpoint implementation in app/api/.well-known/jwks.json/route.ts');
  }

  if (testResults.failed.some(f => f.includes('AWS Secrets Manager'))) {
    recommendations.push('Check AWS IAM permissions - run ./scripts/fix-aws-iam-permissions.sh');
    recommendations.push('Verify AWS credentials are set correctly in Fly.io');
  }

  if (testResults.warnings.some(w => w.includes('fallback'))) {
    recommendations.push('AWS integration is failing - check Fly.io logs for errors');
    recommendations.push('Ensure AWS SDK is properly initialized in the application');
  }

  if (testResults.warnings.some(w => w.includes('mismatch'))) {
    recommendations.push('Keys are out of sync - redeploy application to update JWKS');
  }

  return recommendations;
}

/**
 * Main validation function
 */
async function validate() {
  console.log('='.repeat(60));
  console.log(`${colors.magenta}AWS Secrets Manager Integration Validation${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`App URL: ${APP_URL}`);
  console.log(`AWS Region: ${AWS_REGION}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Run tests
  testEnvironment();
  const jwks = await testJWKSEndpoint();
  const awsKeys = await testAWSSecretsManager();
  compareKeys(jwks, awsKeys);
  await testHealthEndpoint();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.magenta}Validation Summary${colors.reset}`);
  console.log('='.repeat(60));

  if (testResults.passed.length > 0) {
    console.log(`\n${colors.green}Passed Tests (${testResults.passed.length}):${colors.reset}`);
    testResults.passed.forEach(test => console.log(`  ✓ ${test}`));
  }

  if (testResults.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings (${testResults.warnings.length}):${colors.reset}`);
    testResults.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
  }

  if (testResults.failed.length > 0) {
    console.log(`\n${colors.red}Failed Tests (${testResults.failed.length}):${colors.reset}`);
    testResults.failed.forEach(test => console.log(`  ✗ ${test}`));
  }

  // Generate recommendations
  const recommendations = generateRecommendations();
  if (recommendations.length > 0) {
    console.log(`\n${colors.cyan}Recommendations:${colors.reset}`);
    recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
  }

  // Overall status
  console.log('\n' + '='.repeat(60));
  if (testResults.failed.length === 0 && testResults.warnings.length === 0) {
    console.log(`${colors.green}✅ All tests passed! AWS integration is working correctly.${colors.reset}`);
    process.exit(0);
  } else if (testResults.failed.length === 0) {
    console.log(`${colors.yellow}⚠ Tests passed with warnings. Review recommendations above.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some tests failed. AWS integration needs attention.${colors.reset}`);
    process.exit(1);
  }
}

// Run validation
validate().catch(error => {
  console.error(`${colors.red}Fatal error during validation:${colors.reset}`, error);
  process.exit(1);
});
