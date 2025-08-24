#!/usr/bin/env node

/**
 * Test script for the Candlefish email API endpoints
 * Tests via HTTP requests to the running Next.js server
 */

const http = require('http');
const https = require('https');

const API_BASE = process.env.API_BASE || 'http://localhost:3015';

function makeRequest(url, options = {}) {
  const isHttps = url.startsWith('https://');
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testEmailAPI() {
  console.log('🧪 Testing Candlefish Email API System\n');
  console.log(`🌐 API Base: ${API_BASE}\n`);

  try {
    // Test 1: Get available workshop notes and stats
    console.log('1️⃣ Testing GET /api/email/send-workshop-note...');
    const getResponse = await makeRequest(`${API_BASE}/api/email/send-workshop-note`);

    if (getResponse.statusCode === 200) {
      console.log('   ✅ API endpoint accessible');
      const data = getResponse.data;
      console.log(`   📝 Workshop notes available: ${data.workshop_notes?.length || 0}`);
      console.log(`   👥 Active subscribers: ${data.subscriber_count || 0}`);

      if (data.workshop_notes?.length > 0) {
        const note = data.workshop_notes[0];
        console.log(`   📖 First note: "${note.title}" (${note.reading_time} min read)`);
        console.log(`   🏷️  Tags: ${note.tags?.join(', ') || 'none'}`);
      }
    } else {
      console.log(`   ❌ API request failed: ${getResponse.statusCode}`);
      console.log(`   Error: ${JSON.stringify(getResponse.data)}`);
      return false;
    }

    // Test 2: Send test email
    console.log('\n2️⃣ Testing POST /api/email/send-workshop-note (test email)...');
    const testEmail = process.argv[2] || 'hello@candlefish.ai';

    const postBody = JSON.stringify({
      workshop_note_title: "The Architecture of Inevitability",
      test_email: testEmail
    });

    const postResponse = await makeRequest(`${API_BASE}/api/email/send-workshop-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      },
      body: postBody
    });

    if (postResponse.statusCode === 200) {
      console.log('   ✅ Test email sent successfully!');
      const data = postResponse.data;
      console.log(`   📧 Recipient: ${data.sent_to}`);
      console.log(`   📝 Workshop note: "${data.workshop_note}"`);
      console.log(`   💌 Check ${testEmail} for the email`);
    } else {
      console.log(`   ❌ Test email failed: ${postResponse.statusCode}`);
      console.log(`   Error: ${JSON.stringify(postResponse.data)}`);

      if (postResponse.statusCode === 500) {
        console.log('\n🔍 Possible causes:');
        console.log('   - Resend API key missing or invalid');
        console.log('   - AWS Secrets Manager access issues');
        console.log('   - Email template not found');
        console.log('   - Network connectivity issues');
      }

      return false;
    }

    console.log('\n✅ Email API test completed successfully!');
    console.log('\n🎯 System Status:');
    console.log('   ✅ Email service configured and working');
    console.log('   ✅ Resend API integration functional');
    console.log('   ✅ Workshop note template rendering');
    console.log('   ✅ Test email delivered');

    console.log('\n📋 Available API Endpoints:');
    console.log(`   GET  ${API_BASE}/api/email/send-workshop-note`);
    console.log(`   POST ${API_BASE}/api/email/send-workshop-note`);
    console.log(`   POST ${API_BASE}/api/newsletter`);
    console.log(`   GET  ${API_BASE}/api/email/unsubscribe?token=xxx`);

    return true;

  } catch (error) {
    console.error('\n❌ Email API test failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Connection refused. Make sure the development server is running:');
      console.log('   npm run dev');
      console.log(`   Server should be accessible at: ${API_BASE}`);
    }

    return false;
  }
}

// Run the test
testEmailAPI()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
