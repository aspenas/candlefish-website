#!/usr/bin/env node

// Test sending to only patrick@candlefish.ai (verified)
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import fs from 'fs/promises';

async function testSend() {
  const sesClient = new SESClient({ region: 'us-east-1' });

  try {
    const zoomMeeting = JSON.parse(
      await fs.readFile('zoom_meeting.json', 'utf8')
    );

    const command = new SendEmailCommand({
      Source: 'patrick@candlefish.ai',
      Destination: {
        ToAddresses: ['patrick@candlefish.ai']  // Only sending to verified address
      },
      Message: {
        Subject: {
          Data: 'TEST: Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)'
        },
        Body: {
          Text: {
            Data: `TEST EMAIL - Meeting Ready

Zoom Meeting Created Successfully!
Meeting ID: ${zoomMeeting.id}
Passcode: ${zoomMeeting.password || zoomMeeting.passcode}
Join URL: ${zoomMeeting.join_url}

Time: Friday, August 29, 3:00 PM–4:00 PM MDT

Once we exit sandbox mode, this will be sent to:
- erusin@retti.com
- katie@retti.com
- jon@jdenver.com

AWS SES is currently in sandbox mode. To send to unverified recipients, we need production access.`
          }
        }
      }
    });

    console.log('Sending test email to patrick@candlefish.ai...');
    const response = await sesClient.send(command);

    console.log('✅ Test email sent successfully!');
    console.log(`Message ID: ${response.MessageId}`);
    console.log('\nThis confirms:');
    console.log('- AWS SES is working');
    console.log('- patrick@candlefish.ai is verified');
    console.log('- We can send emails');
    console.log('\n⚠️  To send to Retti team, we need:');
    console.log('1. Exit sandbox mode (request production access)');
    console.log('2. OR have recipients click verification links');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSend();
