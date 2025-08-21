#!/usr/bin/env tsx
/**
 * Test script for JWKS AWS Secrets Manager integration
 * Usage: npx tsx scripts/test-jwks-aws.ts
 */

import { fetchJWKS, getJWKSMetadata, listJWKSVersions, testConnection } from '../lib/services/jwks-secrets-manager';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function testAWSConfiguration() {
  logSection('AWS Configuration Check');

  const config = {
    region: process.env.AWS_REGION || 'not set',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Not set',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Not set',
    sessionToken: process.env.AWS_SESSION_TOKEN ? '✓ Set' : '✗ Not set'
  };

  console.log('AWS Configuration:');
  console.log(`  Region: ${config.region}`);
  console.log(`  Access Key ID: ${config.accessKeyId}`);
  console.log(`  Secret Access Key: ${config.secretAccessKey}`);
  console.log(`  Session Token: ${config.sessionToken}`);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    log('\nWarning: AWS credentials not found in environment', 'yellow');
    log('Will attempt to use IAM role/instance profile', 'yellow');
  }
}

async function testConnectionToAWS() {
  logSection('Testing AWS Connection');

  try {
    const connected = await testConnection();
    if (connected) {
      log('✓ Successfully connected to AWS Secrets Manager', 'green');
    } else {
      log('✗ Failed to connect to AWS Secrets Manager', 'red');
    }
    return connected;
  } catch (error) {
    log('✗ Connection test failed with error:', 'red');
    console.error(error);
    return false;
  }
}

async function testFetchJWKS() {
  logSection('Fetching JWKS from AWS');

  try {
    const startTime = Date.now();
    const jwks = await fetchJWKS();
    const fetchTime = Date.now() - startTime;

    log(`✓ Successfully fetched JWKS in ${fetchTime}ms`, 'green');
    console.log(`\nJWKS Data:`);
    console.log(`  Number of keys: ${jwks.keys.length}`);

    jwks.keys.forEach((key, index) => {
      console.log(`\n  Key ${index + 1}:`);
      console.log(`    Kid: ${key.kid}`);
      console.log(`    Algorithm: ${key.alg}`);
      console.log(`    Key Type: ${key.kty}`);
      console.log(`    Use: ${key.use}`);
      console.log(`    Modulus (n): ${key.n.substring(0, 50)}...`);
      console.log(`    Exponent (e): ${key.e}`);
    });

    return true;
  } catch (error) {
    log('✗ Failed to fetch JWKS:', 'red');
    console.error(error);
    return false;
  }
}

async function testGetMetadata() {
  logSection('Fetching Secret Metadata');

  try {
    const metadata = await getJWKSMetadata();

    log('✓ Successfully fetched metadata', 'green');
    console.log('\nSecret Metadata:');
    console.log(`  Name: ${metadata.name}`);
    console.log(`  ARN: ${metadata.arn}`);
    console.log(`  Version ID: ${metadata.versionId}`);
    console.log(`  Last Modified: ${metadata.lastModified.toISOString()}`);
    console.log(`  Rotation Enabled: ${metadata.rotationEnabled}`);
    if (metadata.nextRotation) {
      console.log(`  Next Rotation: ${metadata.nextRotation.toISOString()}`);
    }

    return true;
  } catch (error) {
    log('✗ Failed to fetch metadata:', 'red');
    console.error(error);
    return false;
  }
}

async function testListVersions() {
  logSection('Listing Secret Versions');

  try {
    const versions = await listJWKSVersions();

    log('✓ Successfully listed versions', 'green');
    console.log(`\nFound ${versions.length} version(s):`);
    versions.forEach((version, index) => {
      console.log(`  ${index + 1}. ${version}`);
    });

    return true;
  } catch (error) {
    log('✗ Failed to list versions:', 'red');
    console.error(error);
    return false;
  }
}

async function testPerformance() {
  logSection('Performance Test');

  const iterations = 5;
  const times: number[] = [];

  console.log(`Running ${iterations} fetch operations...`);

  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = Date.now();
      await fetchJWKS();
      const fetchTime = Date.now() - startTime;
      times.push(fetchTime);
      console.log(`  Iteration ${i + 1}: ${fetchTime}ms`);
    } catch (error) {
      log(`  Iteration ${i + 1}: Failed`, 'red');
    }
  }

  if (times.length > 0) {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log('\nPerformance Summary:');
    console.log(`  Average: ${avg}ms`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);

    if (avg < 100) {
      log('  ✓ Excellent performance', 'green');
    } else if (avg < 500) {
      log('  ✓ Good performance', 'green');
    } else if (avg < 1000) {
      log('  ⚠ Acceptable performance', 'yellow');
    } else {
      log('  ✗ Poor performance', 'red');
    }
  }
}

async function testEndToEnd() {
  logSection('End-to-End Test via HTTP');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = `${baseUrl}/.well-known/jwks.json`;

  console.log(`Testing endpoint: ${url}`);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JWKS-Test-Script'
      }
    });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      log(`✗ HTTP ${response.status}: ${response.statusText}`, 'red');
      return false;
    }

    const data = await response.json();
    const source = response.headers.get('x-jwks-source');
    const cacheControl = response.headers.get('cache-control');
    const etag = response.headers.get('etag');

    log(`✓ Successfully fetched JWKS via HTTP in ${responseTime}ms`, 'green');
    console.log('\nResponse Details:');
    console.log(`  Status: ${response.status}`);
    console.log(`  Source: ${source || 'unknown'}`);
    console.log(`  Keys: ${data.keys?.length || 0}`);
    console.log(`  Cache-Control: ${cacheControl || 'not set'}`);
    console.log(`  ETag: ${etag || 'not set'}`);

    // Test caching with If-None-Match
    if (etag) {
      console.log('\nTesting ETag caching...');
      const cachedResponse = await fetch(url, {
        headers: {
          'If-None-Match': etag,
          'User-Agent': 'JWKS-Test-Script'
        }
      });

      if (cachedResponse.status === 304) {
        log('  ✓ ETag caching working (304 Not Modified)', 'green');
      } else {
        log('  ⚠ ETag caching not working as expected', 'yellow');
      }
    }

    return true;
  } catch (error) {
    log('✗ Failed to fetch JWKS via HTTP:', 'red');
    console.error(error);
    return false;
  }
}

async function main() {
  console.log(colors.cyan + colors.bright);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         JWKS AWS Secrets Manager Test Suite           ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = {
    awsConfig: true,
    connection: false,
    fetchJWKS: false,
    metadata: false,
    versions: false,
    performance: false,
    endToEnd: false
  };

  // Run tests
  await testAWSConfiguration();
  results.connection = await testConnectionToAWS();

  if (results.connection) {
    results.fetchJWKS = await testFetchJWKS();
    results.metadata = await testGetMetadata();
    results.versions = await testListVersions();

    if (results.fetchJWKS) {
      await testPerformance();
      results.performance = true;
    }
  }

  // Only test HTTP endpoint if it's running
  if (process.env.SKIP_HTTP_TEST !== 'true') {
    results.endToEnd = await testEndToEnd();
  }

  // Summary
  logSection('Test Summary');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log('Test Results:');
  console.log(`  AWS Configuration: ${results.awsConfig ? '✓' : '✗'}`);
  console.log(`  AWS Connection: ${results.connection ? '✓' : '✗'}`);
  console.log(`  Fetch JWKS: ${results.fetchJWKS ? '✓' : '✗'}`);
  console.log(`  Get Metadata: ${results.metadata ? '✓' : '✗'}`);
  console.log(`  List Versions: ${results.versions ? '✓' : '✗'}`);
  console.log(`  Performance: ${results.performance ? '✓' : '✗'}`);
  console.log(`  End-to-End HTTP: ${results.endToEnd ? '✓' : '✗'}`);

  console.log('\n' + '─'.repeat(60));

  if (passed === total) {
    log(`✓ All tests passed (${passed}/${total})`, 'green');
    process.exit(0);
  } else if (passed > total / 2) {
    log(`⚠ Some tests passed (${passed}/${total})`, 'yellow');
    process.exit(1);
  } else {
    log(`✗ Most tests failed (${passed}/${total})`, 'red');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  log('Fatal error:', 'red');
  console.error(error);
  process.exit(1);
});
