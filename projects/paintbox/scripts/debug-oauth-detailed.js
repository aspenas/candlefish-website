#!/usr/bin/env node

/**
 * Detailed OAuth debugging script
 * Tests the complete OAuth flow and identifies specific issues
 */

const https = require('https');

const CLIENT_ID = '***REMOVED***';
const APP_URL = 'https://paintbox.fly.dev';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options.headers
      },
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          location: res.headers.location
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🔍 Detailed OAuth Debugging...\n');

  try {
    // Test 1: Check NextAuth configuration endpoint
    console.log('1. Testing NextAuth configuration...');
    const configResponse = await makeRequest(`${APP_URL}/api/auth/session`);
    console.log(`   Session endpoint status: ${configResponse.statusCode}`);
    
    if (configResponse.body) {
      try {
        const session = JSON.parse(configResponse.body);
        console.log('   Session response:', session);
      } catch (e) {
        console.log('   Session response (first 200 chars):', configResponse.body.substring(0, 200));
      }
    }
    
    // Test 2: Check NextAuth providers endpoint
    console.log('\n2. Testing NextAuth providers...');
    const providersResponse = await makeRequest(`${APP_URL}/api/auth/providers`);
    console.log(`   Providers endpoint status: ${providersResponse.statusCode}`);
    
    if (providersResponse.body) {
      try {
        const providers = JSON.parse(providersResponse.body);
        console.log('   Available providers:', Object.keys(providers));
        if (providers.google) {
          console.log('   Google provider config:', {
            id: providers.google.id,
            name: providers.google.name,
            type: providers.google.type,
            signinUrl: providers.google.signinUrl,
            callbackUrl: providers.google.callbackUrl
          });
        }
      } catch (e) {
        console.log('   Providers response (first 200 chars):', providersResponse.body.substring(0, 200));
      }
    }

    // Test 3: Test Google OAuth initiation with different methods
    console.log('\n3. Testing Google OAuth initiation (GET request)...');
    const oauthGetResponse = await makeRequest(`${APP_URL}/api/auth/signin/google`, {
      method: 'GET'
    });
    console.log(`   GET request status: ${oauthGetResponse.statusCode}`);
    if (oauthGetResponse.location) {
      console.log(`   Redirect location: ${oauthGetResponse.location}`);
    } else {
      console.log('   No redirect location found');
      console.log('   Response body (first 300 chars):', oauthGetResponse.body.substring(0, 300));
    }

    // Test 4: Test with POST request (form submission simulation)
    console.log('\n4. Testing Google OAuth initiation (POST request)...');
    const oauthPostResponse = await makeRequest(`${APP_URL}/api/auth/signin/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': '0'
      }
    });
    console.log(`   POST request status: ${oauthPostResponse.statusCode}`);
    if (oauthPostResponse.location) {
      console.log(`   Redirect location: ${oauthPostResponse.location}`);
      
      // Parse Google OAuth URL
      if (oauthPostResponse.location.includes('accounts.google.com')) {
        console.log('   ✅ Successfully redirecting to Google!');
        const url = new URL(oauthPostResponse.location);
        console.log('   OAuth parameters:');
        console.log(`     - client_id: ${url.searchParams.get('client_id')}`);
        console.log(`     - redirect_uri: ${url.searchParams.get('redirect_uri')}`);
        console.log(`     - scope: ${url.searchParams.get('scope')}`);
        console.log(`     - response_type: ${url.searchParams.get('response_type')}`);
        console.log(`     - state: ${url.searchParams.get('state')?.substring(0, 20)}...`);
        
        // Verify the redirect URI matches what we expect
        const redirectUri = url.searchParams.get('redirect_uri');
        const expectedRedirectUri = 'https://paintbox.fly.dev/api/auth/callback/google';
        
        if (redirectUri === expectedRedirectUri) {
          console.log('   ✅ Redirect URI is correct!');
        } else {
          console.log('   ❌ Redirect URI mismatch!');
          console.log(`   Expected: ${expectedRedirectUri}`);
          console.log(`   Actual:   ${redirectUri}`);
        }
      } else {
        console.log('   ❌ Not redirecting to Google OAuth');
        console.log(`   Redirect URL: ${oauthPostResponse.location}`);
      }
    } else {
      console.log('   No redirect found in POST response');
      console.log('   Response body (first 300 chars):', oauthPostResponse.body.substring(0, 300));
    }

    // Test 5: Check if there are any error parameters
    console.log('\n5. Testing signin page for errors...');
    const signinResponse = await makeRequest(`${APP_URL}/login`);
    console.log(`   Login page status: ${signinResponse.statusCode}`);
    
    if (signinResponse.body.includes('error')) {
      console.log('   ⚠️  Error found on login page');
      // Extract error from URL or page content
      const errorMatch = signinResponse.body.match(/error[=:]([^&\s"'<>]+)/i);
      if (errorMatch) {
        console.log(`   Error: ${errorMatch[1]}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('- App is deployed at: https://paintbox.fly.dev');
  console.log('- Expected Client ID: ***REMOVED***');
  console.log('- Expected Redirect URI: https://paintbox.fly.dev/api/auth/callback/google');
  console.log('\nTo fix redirect_uri_mismatch, ensure Google Cloud Console has:');
  console.log('1. The correct Client ID');
  console.log('2. The exact redirect URI: https://paintbox.fly.dev/api/auth/callback/google');
  console.log('3. No typos or extra/missing characters');
  console.log('4. The OAuth consent screen is published (not in testing mode)');
}

main().catch(console.error);