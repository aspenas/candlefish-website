#!/usr/bin/env node

import fs from 'fs/promises';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Shortwave API endpoint
const SHORTWAVE_API_URL = process.env.SHORTWAVE_API_URL || 'https://api.shortwave.com/v1';
const SHORTWAVE_API_KEY = process.env.SHORTWAVE_API_KEY;

async function sendViaShortwave() {
  console.log('\n📧 Sending Meeting Invitation via Shortwave');
  console.log('=========================================\n');

  try {
    // Load meeting details
    const zoomMeeting = JSON.parse(
      await fs.readFile('zoom_meeting.json', 'utf8')
    );

    // Load ICS file
    const icsContent = await fs.readFile(
      '/Users/patricksmith/candlefish-ai/calendar/Candlefish-Meeting.ics',
      'utf8'
    );

    const emailBody = `Hi Erusin, Katie, and Jon —

Looking forward to our conversation. Here are the details:

Time: Friday, August 29, 3:00 PM–4:00 PM MDT
Join Zoom: ${zoomMeeting.join_url}
Meeting ID: ${zoomMeeting.id}
Passcode: ${zoomMeeting.password || zoomMeeting.passcode}

I've also scheduled Read.ai Copilot to join — it produces a shared set of notes and highlights we'll all receive after the call.
If you'd prefer not to have it participate, just let me know and I'll disable it.
If you haven't seen the output before, it's surprisingly fun and useful.

I've attached a calendar invite for your convenience.

Best,
Patrick`;

    // Shortwave API payload
    const payload = {
      to: ['erusin@retti.com', 'katie@retti.com', 'jon@jdenver.com'],
      from: 'patrick@candlefish.ai',
      subject: 'Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)',
      body: emailBody,
      attachments: [
        {
          filename: 'Candlefish-Meeting.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar',
          encoding: 'base64'
        }
      ]
    };

    if (!SHORTWAVE_API_KEY) {
      console.log('⚠️  Shortwave API key not found in environment');
      console.log('\nTo use Shortwave API, set:');
      console.log('export SHORTWAVE_API_KEY="your-api-key"');
      console.log('\nAlternatively, you can:');
      console.log('1. Send manually via Shortwave UI');
      console.log('2. Use the email content from shortwave-email.md');
      return;
    }

    console.log('Sending to: erusin@retti.com, katie@retti.com, jon@jdenver.com');
    console.log('Subject: Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)');
    console.log('Attachment: Candlefish-Meeting.ics\n');

    const response = await fetch(`${SHORTWAVE_API_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SHORTWAVE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email sent successfully via Shortwave!');
      console.log('Message ID:', result.messageId || result.id);

      // Save confirmation
      await fs.writeFile('shortwave_send_confirmation.json', JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        messageId: result.messageId || result.id,
        recipients: payload.to
      }, null, 2));

      console.log('\n📄 Confirmation saved to shortwave_send_confirmation.json');
    } else {
      const error = await response.text();
      console.error('❌ Failed to send via Shortwave:', response.status, error);
      console.log('\nPlease check your Shortwave API key and try again');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n💡 Make sure you have:');
    console.log('1. Set SHORTWAVE_API_KEY environment variable');
    console.log('2. Installed dependencies: npm install node-fetch');
  }
}

// Check if we need to install node-fetch
async function checkDependencies() {
  try {
    await import('node-fetch');
    sendViaShortwave();
  } catch (error) {
    console.log('Installing node-fetch...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('npm install node-fetch');
    console.log('✅ Dependencies installed');

    // Try again
    sendViaShortwave();
  }
}

checkDependencies();
