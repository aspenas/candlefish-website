import { loadZoomCredentials, loadReadAiCredentials, loadEmailCredentials } from './load-credentials.js';
import { ZoomClient } from './zoom-client.js';
import { MEETING_CONFIG } from './config.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Validating Candlefish Meeting Automation Setup\n');
console.log('=' .repeat(60));

async function validateCredentials() {
  const results = {
    zoom: false,
    readAi: false,
    email: false
  };
  
  // Check Zoom credentials
  console.log('\n1️⃣ Checking Zoom Credentials (Candlefish.ai)...');
  try {
    const zoomCreds = await loadZoomCredentials();
    
    if (!zoomCreds.accountId || !zoomCreds.clientId || !zoomCreds.clientSecret) {
      console.log('   ❌ Missing Zoom credentials');
    } else {
      console.log('   ✅ Zoom credentials loaded');
      console.log(`   • Account ID: ${zoomCreds.accountId.substring(0, 8)}...`);
      console.log(`   • Client ID: ${zoomCreds.clientId.substring(0, 8)}...`);
      console.log(`   • User Email: ${zoomCreds.userEmail}`);
      
      // Test Zoom OAuth
      try {
        const client = new ZoomClient(zoomCreds);
        const token = await client.getAccessToken();
        if (token) {
          console.log('   ✅ Zoom OAuth authentication successful');
          
          // Get user info
          const user = await client.getCurrentUser();
          console.log(`   • Zoom User: ${user.first_name} ${user.last_name} (${user.email})`);
          results.zoom = true;
        }
      } catch (error) {
        console.log(`   ❌ Zoom OAuth failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Failed to load Zoom credentials: ${error.message}`);
  }
  
  // Check Read.ai credentials
  console.log('\n2️⃣ Checking Read.ai Credentials...');
  try {
    const readAiCreds = await loadReadAiCredentials();
    
    if (!readAiCreds.apiKey) {
      console.log('   ⚠️  No Read.ai API key found');
      console.log('   ℹ️  Read.ai is optional - meetings will work without it');
    } else {
      console.log('   ✅ Read.ai credentials loaded');
      console.log(`   • API Key: ${readAiCreds.apiKey.substring(0, 8)}...`);
      console.log(`   • API URL: ${readAiCreds.apiUrl}`);
      results.readAi = true;
    }
  } catch (error) {
    console.log(`   ⚠️  Read.ai not configured: ${error.message}`);
  }
  
  // Check Email configuration
  console.log('\n3️⃣ Checking Email Configuration...');
  try {
    const emailCreds = await loadEmailCredentials();
    
    console.log(`   • Provider: ${emailCreds.provider}`);
    
    if (emailCreds.provider === 'ses') {
      console.log('   ✅ AWS SES configured');
      console.log(`   • From: patrick@candlefish.ai`);
      console.log(`   • Region: ${emailCreds.region}`);
      
      if (!emailCreds.accessKeyId) {
        console.log('   ℹ️  Using IAM role/instance profile for SES');
      }
      results.email = true;
    } else if (emailCreds.provider === 'gmail') {
      if (!emailCreds.user || !emailCreds.appPassword) {
        console.log('   ❌ Gmail credentials missing');
      } else {
        console.log('   ✅ Gmail configured');
        console.log(`   • User: ${emailCreds.user}`);
        results.email = true;
      }
    }
  } catch (error) {
    console.log(`   ❌ Email configuration failed: ${error.message}`);
  }
  
  return results;
}

async function validateConfiguration() {
  console.log('\n4️⃣ Validating Meeting Configuration...');
  
  const config = MEETING_CONFIG;
  const issues = [];
  
  // Check required fields
  if (!config.ORGANIZER_EMAIL || config.ORGANIZER_EMAIL !== 'patrick@candlefish.ai') {
    issues.push('Organizer email should be patrick@candlefish.ai');
  }
  
  if (!config.ATTENDEES || config.ATTENDEES.length === 0) {
    issues.push('No attendees specified');
  }
  
  if (!config.DATE_LOCAL || !config.START_LOCAL || !config.END_LOCAL) {
    issues.push('Missing date/time configuration');
  }
  
  if (!config.TIMEZONE) {
    issues.push('Missing timezone');
  }
  
  if (issues.length === 0) {
    console.log('   ✅ Configuration valid');
    console.log(`   • Organizer: ${config.ORGANIZER_NAME} (${config.ORGANIZER_EMAIL})`);
    console.log(`   • Title: ${config.TITLE}`);
    console.log(`   • Date: ${config.DATE_LOCAL}`);
    console.log(`   • Time: ${config.START_LOCAL} - ${config.END_LOCAL} ${config.TIMEZONE}`);
    console.log(`   • Attendees: ${config.ATTENDEES.join(', ')}`);
    return true;
  } else {
    console.log('   ❌ Configuration issues found:');
    issues.forEach(issue => console.log(`      • ${issue}`));
    return false;
  }
}

async function main() {
  const credResults = await validateCredentials();
  const configValid = await validateConfiguration();
  
  console.log('\n' + '=' .repeat(60));
  console.log('VALIDATION SUMMARY\n');
  
  const ready = credResults.zoom && credResults.email && configValid;
  
  if (ready) {
    console.log('✅ System is ready for meeting automation!');
    console.log('\nTo run the automation:');
    console.log('  ./run-meeting-automation.sh');
    console.log('\nOr directly:');
    console.log('  npm start');
  } else {
    console.log('⚠️  System needs configuration:');
    
    if (!credResults.zoom) {
      console.log('\n• Zoom: Add Candlefish Zoom OAuth credentials');
      console.log('  - Set in AWS Secrets Manager: zoom-api-credentials');
      console.log('  - Or set environment variables: CANDLEFISH_ZOOM_*');
    }
    
    if (!credResults.email) {
      console.log('\n• Email: Configure AWS SES or Gmail');
      console.log('  - For SES: Ensure AWS credentials are available');
      console.log('  - For Gmail: Set GMAIL_USER and GMAIL_APP_PASSWORD');
    }
    
    if (!configValid) {
      console.log('\n• Configuration: Fix issues in src/config.js');
    }
    
    if (!credResults.readAi) {
      console.log('\n• Read.ai (Optional): Not configured');
      console.log('  - Meetings will work without Read.ai');
      console.log('  - To enable: Add READ_AI_API_KEY to environment');
    }
  }
  
  console.log('\n' + '=' .repeat(60));
}

main().catch(console.error);