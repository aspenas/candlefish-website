#!/usr/bin/env node

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

async function sendProductionEmail() {
  console.log('\n🚀 Sending Meeting Invitation (Production Mode)');
  console.log('============================================\n');
  
  const sesClient = new SESClient({ 
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
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
Patrick

--
Patrick Smith
Candlefish.ai
patrick@candlefish.ai`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; }
    .details { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .zoom-link { color: #2d8cff; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <p>Hi Erusin, Katie, and Jon —</p>
  <p>Looking forward to our conversation. Here are the details:</p>
  <div class="details">
    <p><strong>Time:</strong> Friday, August 29, 3:00 PM–4:00 PM MDT<br>
    <strong>Join Zoom:</strong> <a href="${zoomMeeting.join_url}" class="zoom-link">${zoomMeeting.join_url}</a><br>
    <strong>Meeting ID:</strong> ${zoomMeeting.id}<br>
    <strong>Passcode:</strong> ${zoomMeeting.password || zoomMeeting.passcode}</p>
  </div>
  <p>I've also scheduled <strong>Read.ai Copilot</strong> to join — it produces a shared set of notes and highlights we'll all receive after the call. If you'd prefer not to have it participate, just let me know and I'll disable it. If you haven't seen the output before, it's surprisingly fun and useful.</p>
  <p>I've attached a calendar invite for your convenience.</p>
  <p>Best,<br>Patrick</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin-top: 30px;">
  <p style="color: #666; font-size: 14px;">
    Patrick Smith<br>
    Candlefish.ai<br>
    <a href="mailto:patrick@candlefish.ai">patrick@candlefish.ai</a>
  </p>
</body>
</html>`;

    // Create MIME message with attachment
    const boundary = `----=_Part_${Date.now()}`;
    const rawMessage = `From: Patrick Smith <patrick@candlefish.ai>
To: erusin@retti.com, katie@retti.com, jon@jdenver.com
Cc: patrick@candlefish.ai
Subject: =?UTF-8?B?${Buffer.from('Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)').toString('base64')}?=
Reply-To: patrick@candlefish.ai
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="${boundary}"

--${boundary}
Content-Type: multipart/alternative; boundary="${boundary}_alt"

--${boundary}_alt
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: base64

${Buffer.from(emailBody).toString('base64')}

--${boundary}_alt
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: base64

${Buffer.from(htmlBody).toString('base64')}

--${boundary}_alt--

--${boundary}
Content-Type: text/calendar; charset=UTF-8; method=REQUEST
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="Candlefish-Meeting.ics"

${Buffer.from(icsContent).toString('base64')}

--${boundary}--`;

    // Send using raw email to include attachment
    const { SendRawEmailCommand } = await import('@aws-sdk/client-ses');
    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawMessage)
      },
      Source: 'patrick@candlefish.ai',
      Destinations: [
        'erusin@retti.com',
        'katie@retti.com', 
        'jon@jdenver.com',
        'patrick@candlefish.ai'
      ]
    });
    
    console.log('Sending email via AWS SES (Production)...');
    console.log('From: patrick@candlefish.ai');
    console.log('To: erusin@retti.com, katie@retti.com, jon@jdenver.com');
    console.log('CC: patrick@candlefish.ai\n');
    
    const response = await sesClient.send(command);
    
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${response.MessageId}`);
    
    // Save confirmation
    const result = {
      success: true,
      messageId: response.MessageId,
      timestamp: new Date().toISOString(),
      recipients: {
        to: ['erusin@retti.com', 'katie@retti.com', 'jon@jdenver.com'],
        cc: ['patrick@candlefish.ai']
      }
    };
    
    await fs.writeFile('email_send_confirmation.json', JSON.stringify(result, null, 2));
    console.log('\n📄 Confirmation saved to email_send_confirmation.json');
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('not verified')) {
      console.log('\n⚠️  Still in sandbox mode. Checking account details...');
      
      // Check sending statistics
      const { GetSendStatisticsCommand } = await import('@aws-sdk/client-ses');
      try {
        const stats = await sesClient.send(new GetSendStatisticsCommand({}));
        console.log('Send statistics:', stats);
      } catch (e) {
        console.log('Could not retrieve statistics');
      }
    }
    
    throw error;
  }
}

// Run the script
sendProductionEmail().catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});