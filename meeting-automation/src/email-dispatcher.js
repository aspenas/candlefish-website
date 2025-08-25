import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class EmailDispatcher {
  constructor(config) {
    this.provider = config.provider || 'ses';
    this.fromAddress = 'noreply@candlefish.ai';  // Using verified domain
    this.fromName = 'Patrick Smith';
    
    if (this.provider === 'ses') {
      this.sesClient = new SESClient({ 
        region: config.region || 'us-east-1' 
      });
    } else {
      // Gmail transporter
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.appPassword
        }
      });
    }
  }

  formatAttendeeNames(emails) {
    const names = emails.map(email => {
      const name = email.split('@')[0]
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      return name;
    });
    
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    
    const last = names.pop();
    return `${names.join(', ')}, and ${last}`;
  }

  formatLocalTime(date, startTime, endTime, timezone) {
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: timezone
    };
    
    const dateStr = new Date(`${date}T${startTime}`).toLocaleDateString('en-US', options);
    const start = this.formatTime(startTime);
    const end = this.formatTime(endTime);
    const tz = this.getTimezoneAbbr(timezone);
    
    return `${dateStr}, ${start}–${end} ${tz}`;
  }

  formatTime(time) {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayHour}:${minute} ${period}`;
  }

  getTimezoneAbbr(timezone) {
    const abbrs = {
      'America/Denver': 'MDT',
      'America/New_York': 'EDT',
      'America/Los_Angeles': 'PDT',
      'America/Chicago': 'CDT'
    };
    return abbrs[timezone] || 'UTC';
  }

  generateEmailContent(meetingData) {
    const {
      attendees,
      date,
      startTime,
      endTime,
      timezone,
      joinUrl,
      meetingId,
      passcode
    } = meetingData;

    const friendlyNames = this.formatAttendeeNames(attendees);
    const timeWindow = this.formatLocalTime(date, startTime, endTime, timezone);

    const plainText = `Hi ${friendlyNames} —

Looking forward to our conversation. Here are the details:

Time: ${timeWindow}
Join Zoom: ${joinUrl}
Meeting ID: ${meetingId}
Passcode: ${passcode}

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

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .meeting-details { background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: 600; display: inline-block; width: 100px; }
    .value { color: #0066cc; }
    .zoom-link { color: #2d8cff; text-decoration: none; font-weight: 500; }
    .read-ai-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <p>Hi ${friendlyNames} —</p>
    
    <p>Looking forward to our conversation. Here are the details:</p>
    
    <div class="meeting-details">
      <div class="detail-row">
        <span class="label">Time:</span>
        <span class="value">${timeWindow}</span>
      </div>
      <div class="detail-row">
        <span class="label">Join Zoom:</span>
        <a href="${joinUrl}" class="zoom-link">${joinUrl}</a>
      </div>
      <div class="detail-row">
        <span class="label">Meeting ID:</span>
        <span class="value">${meetingId}</span>
      </div>
      <div class="detail-row">
        <span class="label">Passcode:</span>
        <span class="value">${passcode}</span>
      </div>
    </div>
    
    <div class="read-ai-note">
      <strong>📝 Read.ai Copilot</strong><br>
      I've scheduled Read.ai Copilot to join — it produces a shared set of notes and highlights we'll all receive after the call.
      If you'd prefer not to have it participate, just let me know and I'll disable it.
      If you haven't seen the output before, it's surprisingly fun and useful.
    </div>
    
    <p>I've attached a calendar invite for your convenience.</p>
    
    <div class="signature">
      <p>Best,<br>Patrick</p>
      <p style="color: #666; font-size: 14px;">
        Patrick Smith<br>
        Candlefish.ai<br>
        <a href="mailto:patrick@candlefish.ai" style="color: #0066cc;">patrick@candlefish.ai</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    return { plain: plainText, html };
  }

  async sendEmail(emailData) {
    const {
      to,
      cc,
      subject,
      content,
      attachments
    } = emailData;

    const messageData = {
      from: `${this.fromName} <${this.fromAddress}>`,
      to: to.join(', '),
      cc: cc ? cc.join(', ') : undefined,
      subject: subject,
      text: content.plain,
      html: content.html,
      attachments: attachments || [],
      headers: {
        'X-Mailer': 'Candlefish Meeting Automation',
        'X-Priority': '3',
        'Reply-To': this.fromAddress
      }
    };

    try {
      let messageId;
      
      if (this.provider === 'ses') {
        messageId = await this.sendViaSES(messageData);
      } else {
        messageId = await this.sendViaGmail(messageData);
      }
      
      logger.info('Email sent successfully', {
        to: to,
        cc: cc,
        subject: subject,
        messageId: messageId,
        provider: this.provider
      });
      
      return { success: true, messageId, provider: this.provider };
    } catch (error) {
      logger.error('Failed to send email', { 
        error: error.message,
        provider: this.provider 
      });
      throw error;
    }
  }

  async sendViaSES(messageData) {
    // Create message with nodemailer for proper MIME formatting
    const transporter = nodemailer.createTransport({
      SES: { ses: this.sesClient, aws: { SendRawEmailCommand } }
    });

    const info = await transporter.sendMail(messageData);
    return info.messageId;
  }

  async sendViaGmail(messageData) {
    const info = await this.transporter.sendMail(messageData);
    return info.messageId;
  }

  async createAttachment(filePath, filename) {
    try {
      const content = await fs.readFile(filePath);
      
      return {
        filename: filename || 'meeting.ics',
        content: content,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        contentDisposition: 'attachment'
      };
    } catch (error) {
      logger.error('Failed to create attachment', { error: error.message });
      throw error;
    }
  }
}