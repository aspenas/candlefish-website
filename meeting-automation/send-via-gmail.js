#!/usr/bin/env node

import { google } from 'googleapis';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const client = new SecretsManagerClient({ region: "us-east-1" });

async function getGmailCredentials() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: "pkb/gmail/candlefish-ai-gmail-com/token"
    });

    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString);

    // Parse the token data
    const tokenData = typeof secret.token_data === 'string'
      ? JSON.parse(secret.token_data)
      : secret.token_data;

    return {
      email: secret.email || 'candlefish.ai@gmail.com',
      credentials: tokenData
    };
  } catch (error) {
    console.error('Failed to get Gmail credentials:', error.message);
    throw error;
  }
}

async function sendViaGmail() {
  console.log('\n📧 Sending Meeting Invitation via Gmail API');
  console.log('==========================================\n');

  try {
    // Get Gmail credentials from AWS
    const { email, credentials } = await getGmailCredentials();

    // Load meeting details
    const zoomMeeting = JSON.parse(
      await fs.readFile('zoom_meeting.json', 'utf8')
    );

    // Load ICS file
    const icsContent = await fs.readFile(
      '/Users/patricksmith/candlefish-ai/calendar/Candlefish-Meeting.ics',
      'utf8'
    );

    // Setup Gmail API
    const auth = new google.auth.OAuth2();
    auth.setCredentials(credentials);

    const gmail = google.gmail({ version: 'v1', auth });

    // Create email content
    const to = ['erusin@retti.com', 'katie@retti.com', 'jon@jdenver.com'];
    const subject = 'Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)';

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

    // Create MIME message with attachment
    const boundary = '----=_Part_0_123456789';
    const messageParts = [
      `From: Patrick Smith <${email}>`,
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      emailBody,
      '',
      `--${boundary}`,
      'Content-Type: text/calendar; charset=UTF-8; method=REQUEST',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="Candlefish-Meeting.ics"',
      '',
      Buffer.from(icsContent).toString('base64'),
      '',
      `--${boundary}--`
    ];

    const message = messageParts.join('\r\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    console.log(`Sending from: ${email}`);
    console.log(`To: ${to.join(', ')}`);
    console.log('Subject:', subject);
    console.log('Attachment: Candlefish-Meeting.ics\n');

    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log('✅ Email sent successfully via Gmail!');
    console.log('Message ID:', result.data.id);
    console.log('Thread ID:', result.data.threadId);

    // Save confirmation
    await fs.writeFile('gmail_send_confirmation.json', JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      messageId: result.data.id,
      threadId: result.data.threadId,
      recipients: to,
      from: email
    }, null, 2));

    console.log('\n📄 Confirmation saved to gmail_send_confirmation.json');
    console.log('\n✅ Meeting invitation sent to Retti team!');

  } catch (error) {
    console.error('❌ Error sending email:', error.message);

    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Token may be expired. You may need to re-authenticate.');
    } else if (error.message.includes('googleapis')) {
      console.log('\n💡 Installing googleapis package...');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('npm install googleapis');
      console.log('✅ Dependencies installed. Please run again.');
    }
  }
}

// Check and install dependencies
async function checkDependencies() {
  try {
    await import('googleapis');
    sendViaGmail();
  } catch (error) {
    console.log('Installing googleapis package...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('npm install googleapis');
    console.log('✅ Dependencies installed');

    // Dynamic import after installation
    sendViaGmail();
  }
}

checkDependencies();
