#!/usr/bin/env node

/**
 * Test script to verify Google OAuth configuration
 * This checks if the redirect_uri_mismatch is resolved
 */

const https = require('https');

const CLIENT_ID = '641173075272-vu85i613rarruqsfst59qve7bvvrrd2s.apps.googleusercontent.com';
const REDIRECT_URI = 'https://paintbox.candlefish.ai/api/auth/callback/google';
const APP_URL = 'https://paintbox.candlefish.ai';

console.log('🔍 Testing Google OAuth Configuration Fix...\n');

console.log('Configuration:');
console.log(`- Client ID: ${CLIENT_ID}`);
console.log(`- Redirect URI: ${REDIRECT_URI}`);
console.log(`- App URL: ${APP_URL}\n`);

// Test 1: Check if the app is responding
console.log('1. Testing app health...');
const req1 = https.request(`${APP_URL}/api/health`, (res) => {
  console.log(`   App health status: ${res.statusCode}`);
  
  // Test 2: Check NextAuth configuration
  console.log('\n2. Testing NextAuth signin endpoint...');
  const req2 = https.request(`${APP_URL}/api/auth/signin`, (res2) => {
    console.log(`   NextAuth signin status: ${res2.statusCode}`);
    
    // Test 3: Try to initiate Google OAuth flow
    console.log('\n3. Testing Google OAuth initiation...');
    const req3 = https.request(`${APP_URL}/api/auth/signin/google`, (res3) => {
      console.log(`   Google OAuth initiation status: ${res3.statusCode}`);
      
      if (res3.statusCode === 302) {
        const location = res3.headers.location;
        if (location && location.includes('accounts.google.com')) {
          console.log('   ✅ OAuth flow initiated successfully!');
          console.log(`   Redirect URL: ${location.substring(0, 100)}...`);
          
          // Check if the redirect_uri parameter is correct
          const url = new URL(location);
          const redirectUri = url.searchParams.get('redirect_uri');
          console.log(`   Redirect URI in OAuth: ${redirectUri}`);
          
          if (redirectUri === REDIRECT_URI) {
            console.log('   ✅ Redirect URI matches expected value!');
          } else {
            console.log('   ❌ Redirect URI mismatch!');
            console.log(`   Expected: ${REDIRECT_URI}`);
            console.log(`   Actual: ${redirectUri}`);
          }
        } else {
          console.log('   ❌ OAuth flow not redirecting to Google');
          console.log(`   Location: ${location}`);
        }
      } else {
        console.log('   ❌ OAuth flow failed to initiate');
      }
      
      console.log('\n📋 Summary:');
      console.log('- NEXTAUTH_URL has been set to: https://paintbox.candlefish.ai');
      console.log('- Google Client ID is configured');  
      console.log('- Expected redirect URI: https://paintbox.candlefish.ai/api/auth/callback/google');
      console.log('\nIf you still see redirect_uri_mismatch, verify in Google Cloud Console:');
      console.log('1. Go to Google Cloud Console > APIs & Services > Credentials');
      console.log('2. Find OAuth Client ID: 641173075272-vu85i613rarruqsfst59qve7bvvrrd2s');
      console.log('3. Ensure "https://paintbox.candlefish.ai/api/auth/callback/google" is in Authorized redirect URIs');
      console.log('4. Save and wait 5 minutes for propagation');
      
    });
    
    req3.on('error', (err) => {
      console.log(`   ❌ Google OAuth test failed: ${err.message}`);
    });
    
    req3.end();
  });
  
  req2.on('error', (err) => {
    console.log(`   ❌ NextAuth test failed: ${err.message}`);
  });
  
  req2.end();
});

req1.on('error', (err) => {
  console.log(`   ❌ App health test failed: ${err.message}`);
});

req1.end();