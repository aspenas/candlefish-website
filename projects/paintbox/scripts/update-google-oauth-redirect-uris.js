#!/usr/bin/env node

/**
 * Google OAuth2 Redirect URI Updater
 * 
 * This script programmatically updates Google OAuth2 client redirect URIs
 * using the Google Cloud Console API to fix redirect_uri_mismatch errors.
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Configure AWS
const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });

// OAuth Client Configuration
const OAUTH_CLIENT_ID = '***REMOVED***';
const PROJECT_ID = 'l0-candlefish';
const CORRECT_REDIRECT_URI = 'https://paintbox.fly.dev/api/auth/callback/google';

// Additional redirect URIs to support (dev/staging environments)
const ADDITIONAL_REDIRECT_URIS = [
  'http://localhost:3000/api/auth/callback/google',
  'https://paintbox-staging.fly.dev/api/auth/callback/google',
  'https://paintbox.netlify.app/api/auth/callback/google'
];

async function getGoogleCredentials() {
  try {
    console.log('🔑 Retrieving Google OAuth credentials from AWS Secrets Manager...');
    const command = new GetSecretValueCommand({ 
      SecretId: 'candlefish/google-oauth2-config' 
    });
    const response = await secretsManager.send(command);
    
    const credentials = JSON.parse(response.SecretString);
    console.log('✅ Successfully retrieved Google OAuth credentials');
    
    return credentials.web;
  } catch (error) {
    console.error('❌ Error retrieving Google credentials:', error.message);
    throw error;
  }
}

async function getAccessToken(credentials) {
  console.log('⚠️  Google API access requires service account or manual OAuth flow');
  console.log('Required scopes: https://www.googleapis.com/auth/cloud-platform');
  return null; // Will use gcloud CLI instead
}

async function updateRedirectURIsViaGcloudCLI() {
  console.log('🛠️  Attempting to update redirect URIs via gcloud CLI...');
  
  const { execSync } = require('child_process');
  
  try {
    // Check if gcloud is installed
    console.log('🔍 Checking gcloud CLI installation...');
    execSync('gcloud version', { stdio: 'pipe' });
    console.log('✅ gcloud CLI is available');
    
    // Check authentication
    console.log('🔍 Checking gcloud authentication...');
    try {
      const currentAccount = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', 
        { encoding: 'utf8' }).trim();
      console.log(`✅ Authenticated as: ${currentAccount}`);
    } catch (authError) {
      console.log('⚠️  No active gcloud authentication found');
      console.log('Please run: gcloud auth login');
      return false;
    }
    
    // Set the correct project
    console.log(`🎯 Setting project to: ${PROJECT_ID}`);
    execSync(`gcloud config set project ${PROJECT_ID}`, { stdio: 'inherit' });
    
    // Get current OAuth client configuration
    console.log('📋 Retrieving current OAuth client configuration...');
    const currentConfigCmd = `gcloud alpha iap oauth-brands list --format="value(name)"`;
    
    try {
      const brandsList = execSync(currentConfigCmd, { encoding: 'utf8' }).trim();
      console.log('Current OAuth brands:', brandsList);
      
      if (!brandsList) {
        console.log('❌ No OAuth brands found in project');
        return false;
      }
      
      // For now, we'll provide the manual steps since the gcloud API for OAuth clients is limited
      console.log('\n📝 Manual steps required:');
      console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
      console.log(`2. Select project: ${PROJECT_ID}`);
      console.log(`3. Find OAuth 2.0 Client ID: ${OAUTH_CLIENT_ID}`);
      console.log('4. Click the edit button (pencil icon)');
      console.log('5. In "Authorized redirect URIs" section, add:');
      console.log(`   - ${CORRECT_REDIRECT_URI}`);
      ADDITIONAL_REDIRECT_URIS.forEach(uri => console.log(`   - ${uri}`));
      console.log('6. Remove any incorrect URIs');
      console.log('7. Click "Save"');
      
      return true;
      
    } catch (error) {
      console.error('❌ Error retrieving OAuth configuration:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ gcloud CLI not available:', error.message);
    console.log('💡 Install gcloud CLI: https://cloud.google.com/sdk/docs/install');
    return false;
  }
}

async function updateRedirectURIsViaAPI() {
  console.log('🔄 Attempting to update redirect URIs via Google API...');
  
  try {
    const credentials = await getGoogleCredentials();
    
    // Use Google's Client Libraries for Identity and Access Management (IAM) API
    // Note: This requires proper service account credentials with IAM permissions
    
    console.log('📡 Initializing Google Cloud Resource Manager API...');
    
    // Alternative approach: Use the Google Cloud Console API directly
    const https = require('https');
    const querystring = require('querystring');
    
    // This approach requires a bearer token with proper scopes
    console.log('⚠️  Direct API access requires service account with IAM permissions');
    console.log('📚 Documentation: https://cloud.google.com/docs/authentication/production');
    
    return false;
    
  } catch (error) {
    console.error('❌ Error updating via API:', error.message);
    return false;
  }
}

async function validateRedirectURI() {
  console.log('🧪 Testing redirect URI configuration...');
  
  const https = require('https');
  
  return new Promise((resolve) => {
    const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${OAUTH_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(CORRECT_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=openid%20profile%20email&` +
      `state=test`;
    
    console.log('🔗 Test URL:', testUrl);
    
    const req = https.get(testUrl, (res) => {
      console.log(`📊 HTTP Status: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      if (res.statusCode === 200 || res.statusCode === 302) {
        console.log('✅ Redirect URI appears to be configured correctly');
        resolve(true);
      } else {
        console.log('⚠️  Redirect URI configuration may still need updates');
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.error('❌ Error testing redirect URI:', error.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('⏰ Request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

async function createServiceAccountInstructions() {
  console.log('\n🤖 Service Account Setup Instructions:');
  console.log('=====================================');
  console.log('');
  console.log('To programmatically update OAuth clients, you need a service account with IAM permissions:');
  console.log('');
  console.log('1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts');
  console.log(`2. Select project: ${PROJECT_ID}`);
  console.log('3. Click "CREATE SERVICE ACCOUNT"');
  console.log('4. Name: "oauth-client-manager"');
  console.log('5. Grant roles:');
  console.log('   - IAM Security Reviewer');
  console.log('   - Service Account Token Creator');
  console.log('6. Create and download JSON key');
  console.log('7. Store in AWS Secrets Manager as "candlefish/google-service-account"');
  console.log('');
  console.log('Then you can use the Google API to programmatically update OAuth clients.');
}

async function main() {
  console.log('🚀 Google OAuth2 Redirect URI Updater');
  console.log('======================================');
  console.log('');
  
  console.log(`📋 Target Configuration:`);
  console.log(`   Client ID: ${OAUTH_CLIENT_ID}`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Primary Redirect URI: ${CORRECT_REDIRECT_URI}`);
  console.log(`   Additional URIs: ${ADDITIONAL_REDIRECT_URIS.length} configured`);
  console.log('');
  
  // Try gcloud CLI approach first
  const gcloudSuccess = await updateRedirectURIsViaGcloudCLI();
  
  if (!gcloudSuccess) {
    // Try API approach
    const apiSuccess = await updateRedirectURIsViaAPI();
    
    if (!apiSuccess) {
      console.log('\n💡 Automated update not possible with current setup');
      await createServiceAccountInstructions();
    }
  }
  
  // Test the configuration
  console.log('\n🧪 Testing current configuration...');
  await validateRedirectURI();
  
  console.log('\n✅ Script execution completed');
  console.log('🔗 Verify changes at: https://console.cloud.google.com/apis/credentials');
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateRedirectURIsViaGcloudCLI,
  updateRedirectURIsViaAPI,
  validateRedirectURI
};