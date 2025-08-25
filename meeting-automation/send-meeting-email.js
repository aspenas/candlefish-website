#!/usr/bin/env node

import { EmailDispatcher } from './src/email-dispatcher.js';
import { loadEmailCredentials } from './src/load-credentials.js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

async function sendMeetingEmail() {
  console.log('\n📧 Sending Meeting Invitation Email');
  console.log('=====================================\n');
  
  try {
    // Load the saved Zoom meeting details
    const zoomMeeting = JSON.parse(
      await fs.readFile('zoom_meeting.json', 'utf8')
    );
    
    console.log('Meeting Details:');
    console.log(`  ID: ${zoomMeeting.id}`);
    console.log(`  Topic: ${zoomMeeting.topic}`);
    console.log(`  Passcode: ${zoomMeeting.password || zoomMeeting.passcode}\n`);
    
    // Initialize email dispatcher
    const emailCreds = await loadEmailCredentials();
    const dispatcher = new EmailDispatcher(emailCreds);
    
    // Configure email details
    const meetingDetails = {
      attendees: ["erusin@retti.com", "katie@retti.com", "jon@jdenver.com"],
      date: "2025-08-29",
      startTime: "15:00",
      endTime: "16:00",
      timezone: "America/Denver",
      joinUrl: zoomMeeting.join_url,
      meetingId: String(zoomMeeting.id),
      passcode: zoomMeeting.password || zoomMeeting.passcode
    };
    
    // Generate email content
    const emailContent = dispatcher.generateEmailContent(meetingDetails);
    
    // Create ICS attachment
    const icsPath = '/Users/patricksmith/candlefish-ai/calendar/Candlefish-Meeting.ics';
    const attachment = await dispatcher.createAttachment(icsPath, 'Candlefish-Meeting.ics');
    
    // Send email
    console.log('Sending to:');
    console.log('  • erusin@retti.com');
    console.log('  • katie@retti.com');
    console.log('  • jon@jdenver.com');
    console.log('CC: patrick@candlefish.ai\n');
    
    const result = await dispatcher.sendEmail({
      to: meetingDetails.attendees,
      cc: ["patrick@candlefish.ai"],
      subject: "Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)",
      content: emailContent,
      attachments: [attachment]
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Provider: ${result.provider}`);
    
    // Save result
    await fs.writeFile('email_send.json', JSON.stringify(result, null, 2));
    console.log('\nEmail details saved to email_send.json');
    
  } catch (error) {
    console.error('\n❌ Failed to send email:');
    console.error(error.message);
    
    if (error.message.includes('not verified')) {
      console.log('\n💡 Solution: The domain candlefish.ai is verified, but emails may need individual verification in sandbox mode.');
      console.log('   Or request production access to send to any email address.');
    }
    
    process.exit(1);
  }
}

sendMeetingEmail();