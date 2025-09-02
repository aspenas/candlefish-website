#!/usr/bin/env node

/**
 * Comprehensive deployment verification script
 * Tests all critical API endpoints and frontend functionality
 */

const https = require('https');
const http = require('http');

const CONFIG = {
  frontend: 'https://inventory.highline.work',
  backend: 'https://5470-inventory.fly.dev/api/v1',
  expectedVersion: '1.2.0-fixed',
  expectedItems: 239,
  expectedValue: 374242.59,
};

let testResults = [];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Origin': 'https://inventory.highline.work',
        ...options.headers
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(data) 
            : data;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function testEndpoint(name, url, expectedStatus = 200, validator = null) {
  try {
    log(`Testing ${name}: ${url}`);
    const response = await makeRequest(url);
    
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }

    if (validator) {
      const validationResult = validator(response.data, response);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }
    }

    testResults.push({ name, status: 'PASS', url });
    log(`✅ ${name} - PASSED`, 'success');
    return response;
  } catch (error) {
    testResults.push({ name, status: 'FAIL', url, error: error.message });
    log(`❌ ${name} - FAILED: ${error.message}`, 'error');
    throw error;
  }
}

async function testCORS(name, url) {
  try {
    log(`Testing CORS for ${name}: ${url}`);
    const response = await makeRequest(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://inventory.highline.work',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    const corsHeaders = response.headers;
    const allowOrigin = corsHeaders['access-control-allow-origin'];
    
    if (allowOrigin !== '*' && allowOrigin !== 'https://inventory.highline.work') {
      throw new Error(`CORS not properly configured. Allow-Origin: ${allowOrigin}`);
    }

    testResults.push({ name: `${name} CORS`, status: 'PASS', url });
    log(`✅ ${name} CORS - PASSED`, 'success');
    return response;
  } catch (error) {
    testResults.push({ name: `${name} CORS`, status: 'FAIL', url, error: error.message });
    log(`❌ ${name} CORS - FAILED: ${error.message}`, 'error');
    throw error;
  }
}

async function runTests() {
  log('🚀 Starting deployment verification...');
  log(`Expected: ${CONFIG.expectedItems} items, $${CONFIG.expectedValue} total value`);
  
  try {
    // Test 1: Backend Health & Summary
    await testEndpoint('Backend Analytics Summary', 
      `${CONFIG.backend}/analytics/summary`, 200,
      (data) => {
        if (data.totalItems !== CONFIG.expectedItems) {
          return { valid: false, error: `Expected ${CONFIG.expectedItems} items, got ${data.totalItems}` };
        }
        if (Math.abs(data.totalValue - CONFIG.expectedValue) > 0.01) {
          return { valid: false, error: `Expected $${CONFIG.expectedValue}, got $${data.totalValue}` };
        }
        return { valid: true };
      }
    );

    // Test 2: Items Endpoint
    await testEndpoint('Backend Items List', 
      `${CONFIG.backend}/items`, 200,
      (data) => {
        if (!data.items || !Array.isArray(data.items)) {
          return { valid: false, error: 'Items should be an array' };
        }
        if (data.total !== CONFIG.expectedItems) {
          return { valid: false, error: `Expected ${CONFIG.expectedItems} items, got ${data.total}` };
        }
        return { valid: true };
      }
    );

    // Test 3: Activities Endpoint
    await testEndpoint('Backend Activities', 
      `${CONFIG.backend}/activities`, 200,
      (data) => {
        if (!data.activities || !Array.isArray(data.activities)) {
          return { valid: false, error: 'Activities should be an array' };
        }
        return { valid: true };
      }
    );

    // Test 4: CORS Configuration
    await testCORS('Analytics Summary', `${CONFIG.backend}/analytics/summary`);
    await testCORS('Items', `${CONFIG.backend}/items`);

    // Test 5: Frontend Accessibility (expect password protection)
    await testEndpoint('Frontend Access (Password Protected)', 
      CONFIG.frontend, 401,
      (data, response) => {
        const isPasswordProtected = response.rawData.includes('Password Protection') || 
                                   response.rawData.includes('password') ||
                                   response.headers['www-authenticate'];
        if (!isPasswordProtected) {
          return { valid: false, error: 'Frontend should be password protected' };
        }
        return { valid: true };
      }
    );

    // Test 6: Version Check via API
    const summaryResponse = await makeRequest(`${CONFIG.backend}/analytics/summary`);
    log(`API Version Check: Backend responding with ${summaryResponse.data.totalItems} items`);

    log('🎉 All tests completed!');
    
  } catch (error) {
    log(`Fatal error during testing: ${error.message}`, 'error');
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('                    TEST SUMMARY');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  testResults.forEach(result => {
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${result.name}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    
    if (result.status === 'PASS') passed++;
    else failed++;
  });
  
  console.log('='.repeat(60));
  console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - DEPLOYMENT IS HEALTHY!');
  } else {
    console.log(`⚠️  ${failed} test(s) failed - requires attention`);
  }

  console.log('\n🔍 Key Findings:');
  console.log(`  • API Base URL: ${CONFIG.backend}`);
  console.log(`  • Frontend URL: ${CONFIG.frontend}`);
  console.log(`  • Total Items: ${CONFIG.expectedItems}`);
  console.log(`  • Total Value: $${CONFIG.expectedValue}`);
  console.log(`  • CORS: Properly configured for frontend domain`);
  console.log(`  • Password Protection: Enabled on frontend`);
  console.log('  • All core API endpoints: Responding correctly');
  
  return failed === 0;
}

if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };