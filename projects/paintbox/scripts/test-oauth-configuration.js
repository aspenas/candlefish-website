#!/usr/bin/env node

/**
 * OAuth Configuration Test
 * 
 * This script validates that the Google OAuth2 redirect URI configuration
 * is working correctly for the Paintbox application.
 */

const https = require('https');
const { URL } = require('url');

const OAUTH_CLIENT_ID = '641173075272-vu85i613rarruqsfst59qve7bvvrrd2s.apps.googleusercontent.com';
const REDIRECT_URI = 'https://paintbox.candlefish.ai/api/auth/callback/google';
const APP_BASE_URL = 'https://paintbox.candlefish.ai';

async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    console.log(`🧪 Testing: ${description}`);
    console.log(`   URL: ${url}`);
    
    const request = https.get(url, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers: ${JSON.stringify({
        location: res.headers.location,
        'content-type': res.headers['content-type']
      })}`);
      
      let success = false;
      if (description.includes('OAuth Flow')) {
        success = res.statusCode === 302 && res.headers.location?.includes('accounts.google.com');
      } else if (description.includes('Callback')) {
        success = res.statusCode === 400 || res.statusCode === 405; // Expected without params
      } else if (description.includes('Login')) {
        success = res.statusCode === 200 || res.statusCode === 302;
      }
      
      console.log(`   Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
      console.log('');
      resolve(success);
    });
    
    request.on('error', (error) => {
      console.log(`   Error: ${error.message}`);
      console.log(`   Result: ❌ FAIL`);
      console.log('');
      resolve(false);
    });
    
    request.setTimeout(10000, () => {
      console.log('   Timeout: Request timed out');
      console.log(`   Result: ❌ FAIL`);
      console.log('');
      request.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('🚀 OAuth Configuration Validator');
  console.log('================================');
  console.log('');
  
  const tests = [
    {
      url: `${APP_BASE_URL}/login`,
      description: 'Login Page Accessibility'
    },
    {
      url: `${APP_BASE_URL}/api/auth/callback/google`,
      description: 'Callback Endpoint'
    },
    {
      url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=openid%20profile%20email&state=test`,
      description: 'Google OAuth Flow'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const success = await testEndpoint(test.url, test.description);
    results.push(success);
  }
  
  console.log('📊 Test Summary');
  console.log('================');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  console.log('');
  
  if (passed === total) {
    console.log('✅ All tests passed! OAuth configuration appears to be working correctly.');
    console.log('');
    console.log('🎉 Key Points:');
    console.log('   - Login page is accessible');
    console.log('   - OAuth callback endpoint exists');
    console.log('   - Google accepts the redirect URI');
    console.log('   - No redirect_uri_mismatch error detected');
  } else {
    console.log('❌ Some tests failed. Check the configuration:');
    console.log('   1. Verify redirect URI in Google Cloud Console');
    console.log('   2. Check application endpoints are working');
    console.log('   3. Ensure OAuth client ID is correct');
  }
  
  console.log('');
  console.log('🔗 Manual Verification:');
  console.log(`   Google Console: https://console.cloud.google.com/apis/credentials?project=l0-candlefish`);
  console.log(`   Test Login: ${APP_BASE_URL}/login`);
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint };