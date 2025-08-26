#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

async function sendViaSMTP() {
  console.log('\n📧 Sending Meeting Invitation via SMTP');
  console.log('======================================\n');

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

    // Check for Gmail credentials
    const gmailUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.log('⚠️  Gmail credentials not found in environment');
      console.log('\nTo send via Gmail, set:');
      console.log('export GMAIL_USER="your-email@gmail.com"');
      console.log('export GMAIL_APP_PASSWORD="your-app-password"');
      console.log('\nTo get an app password:');
      console.log('1. Go to https://myaccount.google.com/security');
      console.log('2. Enable 2-factor authentication');
      console.log('3. Create an app password for Mail');
      return;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

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
    <strong>Join Zoom:</strong> <a href="${zoomMeeting.join_url}">${zoomMeeting.join_url}</a><br>
    <strong>Meeting ID:</strong> ${zoomMeeting.id}<br>
    <strong>Passcode:</strong> ${zoomMeeting.password || zoomMeeting.passcode}</p>
  </div>
  <p>I've also scheduled <strong>Read.ai Copilot</strong> to join — it produces a shared set of notes and highlights we'll all receive after the call.</p>
  <p>I've attached a calendar invite for your convenience.</p>
  <p>Best,<br>Patrick</p>
  <hr>
  <p style="color: #666;">
    Patrick Smith<br>
    Candlefish.ai<br>
    <a href="mailto:patrick@candlefish.ai">patrick@candlefish.ai</a>
  </p>
</body>
</html>`;

    const mailOptions = {
      from: `Patrick Smith <${gmailUser}>`,
      to: 'erusin@retti.com, katie@retti.com, jon@jdenver.com',
      subject: 'Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)',
      text: emailBody,
      html: htmlBody,
      attachments: [
        {
          filename: 'Candlefish-Meeting.ics',
          content: icsContent,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST'
        }
      ]
    };

    console.log(`Sending from: ${gmailUser}`);
    console.log('To: erusin@retti.com, katie@retti.com, jon@jdenver.com');
    console.log('Subject: Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)');
    console.log('Attachment: Candlefish-Meeting.ics\n');

    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Accepted:', result.accepted.join(', '));

    // Save confirmation
    await fs.writeFile('smtp_send_confirmation.json', JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      messageId: result.messageId,
      accepted: result.accepted,
      from: gmailUser
    }, null, 2));

    console.log('\n📄 Confirmation saved to smtp_send_confirmation.json');
    console.log('\n✅ Meeting invitation sent to Retti team!');

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('auth')) {
      console.log('\n💡 Authentication failed. Make sure you:');
      console.log('1. Use an app password, not your regular password');
      console.log('2. Have 2-factor authentication enabled');
      console.log('3. Created an app password at https://myaccount.google.com/apppasswords');
    }
  }
}

sendViaSMTP();
