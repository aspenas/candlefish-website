import { ZoomClient } from './zoom-client.js';
import { ReadAiClient } from './read-ai-client.js';
import { ICSGenerator } from './ics-generator.js';
import { EmailDispatcher } from './email-dispatcher.js';
import { loadZoomCredentials, loadReadAiCredentials, loadEmailCredentials } from './load-credentials.js';
import { MEETING_CONFIG } from './config.js';
import { format, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/meeting-automation.log' })
  ]
});

export class MeetingOrchestrator {
  constructor() {
    this.zoomClient = null;
    this.readAiClient = null;
    this.icsGenerator = new ICSGenerator();
    this.emailDispatcher = null;
    this.results = {};
  }

  async initialize() {
    logger.info('Initializing meeting orchestrator');
    
    try {
      // Load credentials
      const zoomCreds = await loadZoomCredentials();
      const readAiCreds = await loadReadAiCredentials();
      const emailCreds = await loadEmailCredentials();
      
      // Initialize clients
      this.zoomClient = new ZoomClient(zoomCreds);
      this.readAiClient = new ReadAiClient(readAiCreds);
      this.emailDispatcher = new EmailDispatcher(emailCreds);
      
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services', { error: error.message });
      throw error;
    }
  }

  parseTimeConfiguration(config) {
    const { DATE_LOCAL, START_LOCAL, END_LOCAL, TIMEZONE } = config;
    
    // Parse local date and time
    const startDateTime = `${DATE_LOCAL}T${START_LOCAL}:00`;
    const endDateTime = `${DATE_LOCAL}T${END_LOCAL}:00`;
    
    // Convert to UTC
    const startUTC = zonedTimeToUtc(startDateTime, TIMEZONE);
    const endUTC = zonedTimeToUtc(endDateTime, TIMEZONE);
    
    // Calculate duration in minutes
    const duration = Math.round((endUTC - startUTC) / 60000);
    
    return {
      startLocal: startDateTime,
      endLocal: endDateTime,
      startUTC: startUTC,
      endUTC: endUTC,
      startISO: startUTC.toISOString(),
      endISO: endUTC.toISOString(),
      duration: duration,
      timezone: TIMEZONE
    };
  }

  async createZoomMeeting(config, timeData) {
    logger.info('Creating Zoom meeting', { topic: config.TITLE });
    
    const meetingConfig = {
      topic: config.TITLE,
      start_time: timeData.startISO,
      duration: timeData.duration,
      timezone: config.TIMEZONE,
      agenda: `Meeting organized by ${config.ORGANIZER_NAME} (${config.ORGANIZER_EMAIL})`,
      settings: config.ZOOM_SETTINGS
    };
    
    try {
      const meeting = await this.zoomClient.createMeeting(meetingConfig);
      
      // Save meeting details
      await this.saveJSON('zoom_meeting.json', meeting);
      
      this.results.zoom = {
        id: meeting.id,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        passcode: meeting.password || meeting.passcode,
        topic: meeting.topic,
        startTime: meeting.start_time,
        duration: meeting.duration
      };
      
      logger.info('Zoom meeting created successfully', {
        id: meeting.id,
        joinUrl: meeting.join_url
      });
      
      return meeting;
    } catch (error) {
      logger.error('Failed to create Zoom meeting', { error: error.message });
      throw error;
    }
  }

  async scheduleReadAiCopilot(config, zoomMeeting, timeData) {
    if (!config.READ_AI_SETTINGS.enabled) {
      logger.info('Read.ai Copilot disabled by configuration');
      return null;
    }
    
    logger.info('Scheduling Read.ai Copilot');
    
    const botData = {
      joinUrl: zoomMeeting.join_url,
      meetingId: String(zoomMeeting.id),
      passcode: zoomMeeting.password || zoomMeeting.passcode,
      topic: zoomMeeting.topic,
      startTime: timeData.startISO,
      duration: timeData.duration,
      participants: config.READ_AI_SETTINGS.deliver_to
    };
    
    try {
      const readAiResponse = await this.readAiClient.scheduleMeetingBot(botData);
      
      // Save Read.ai response
      await this.saveJSON('read_ai_summary.json', readAiResponse);
      
      this.results.readAi = readAiResponse;
      
      logger.info('Read.ai Copilot scheduled', {
        botId: readAiResponse.bot_id,
        status: readAiResponse.status || 'scheduled'
      });
      
      return readAiResponse;
    } catch (error) {
      logger.warn('Read.ai scheduling failed (non-critical)', { error: error.message });
      this.results.readAi = { scheduled: false, error: error.message };
      return null;
    }
  }

  async generateCalendarInvite(config, zoomMeeting, timeData) {
    logger.info('Generating ICS calendar invite');
    
    const meetingData = {
      title: config.TITLE,
      startTime: timeData.startUTC,
      endTime: timeData.endUTC,
      timezone: config.TIMEZONE,
      joinUrl: zoomMeeting.join_url,
      meetingId: String(zoomMeeting.id),
      passcode: zoomMeeting.password || zoomMeeting.passcode,
      organizer: {
        name: config.ORGANIZER_NAME,
        email: config.ORGANIZER_EMAIL
      },
      attendees: config.ATTENDEES,
      description: `Meeting with Read.ai Copilot enabled for automatic notes and highlights.`
    };
    
    try {
      const calendar = await this.icsGenerator.generateMeetingInvite(meetingData);
      
      // Ensure calendar directory exists
      await fs.mkdir(config.ICS_OUTPUT_DIR, { recursive: true });
      
      const icsPath = await this.icsGenerator.saveToFile(
        calendar,
        config.ICS_OUTPUT_DIR,
        config.ICS_FILENAME
      );
      
      this.results.icsPath = icsPath;
      
      logger.info('Calendar invite generated', { path: icsPath });
      
      return icsPath;
    } catch (error) {
      logger.error('Failed to generate calendar invite', { error: error.message });
      throw error;
    }
  }

  async sendEmailInvitation(config, zoomMeeting, icsPath, timeData) {
    logger.info('Sending email invitations');
    
    const emailContent = this.emailDispatcher.generateEmailContent({
      attendees: config.ATTENDEES,
      date: config.DATE_LOCAL,
      startTime: config.START_LOCAL,
      endTime: config.END_LOCAL,
      timezone: config.TIMEZONE,
      joinUrl: zoomMeeting.join_url,
      meetingId: String(zoomMeeting.id),
      passcode: zoomMeeting.password || zoomMeeting.passcode
    });
    
    try {
      // Create ICS attachment
      const attachment = await this.emailDispatcher.createAttachment(
        icsPath,
        config.ICS_FILENAME
      );
      
      const emailData = {
        to: config.ATTENDEES,
        cc: config.CC_LIST,
        subject: config.EMAIL_SUBJECT,
        content: emailContent,
        attachments: [attachment]
      };
      
      const result = await this.emailDispatcher.sendEmail(emailData);
      
      // Save email send confirmation
      await this.saveJSON('email_send.json', result);
      
      this.results.email = result;
      
      logger.info('Email sent successfully', {
        messageId: result.messageId,
        provider: result.provider
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to send email', { error: error.message });
      throw error;
    }
  }

  async generateSummary(config, timeData) {
    const summary = {
      title: config.TITLE,
      start_local: config.START_LOCAL,
      end_local: config.END_LOCAL,
      timezone: config.TIMEZONE,
      date: config.DATE_LOCAL,
      formatted_time: this.emailDispatcher.formatLocalTime(
        config.DATE_LOCAL,
        config.START_LOCAL,
        config.END_LOCAL,
        config.TIMEZONE
      ),
      zoom: {
        id: this.results.zoom.id,
        join_url: this.results.zoom.joinUrl,
        passcode: this.results.zoom.passcode,
        host_url: this.results.zoom.startUrl
      },
      ics_path: this.results.icsPath,
      email_message_id: this.results.email?.messageId,
      email_provider: this.results.email?.provider,
      read_ai: this.results.readAi,
      attendees: config.ATTENDEES,
      cc_list: config.CC_LIST,
      organizer: {
        name: config.ORGANIZER_NAME,
        email: config.ORGANIZER_EMAIL
      }
    };
    
    // Save summary
    await this.saveJSON('meeting_dispatch_summary.json', summary);
    
    return summary;
  }

  async saveJSON(filename, data) {
    try {
      const filepath = path.join(process.cwd(), filename);
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      logger.info('JSON saved', { file: filepath });
    } catch (error) {
      logger.warn('Failed to save JSON', { file: filename, error: error.message });
    }
  }

  printSummary(summary) {
    console.log('\n' + '='.repeat(60));
    console.log('MEETING AUTOMATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📅 Meeting: ${summary.title}`);
    console.log(`⏰ Time: ${summary.formatted_time}`);
    console.log(`\n🔗 Zoom Details:`);
    console.log(`   Join URL: ${summary.zoom.join_url}`);
    console.log(`   Meeting ID: ${summary.zoom.id}`);
    console.log(`   Passcode: ${summary.zoom.passcode}`);
    console.log(`   Host URL: ${summary.zoom.host_url}`);
    console.log(`\n📧 Email Status:`);
    console.log(`   ✅ Sent to: ${summary.attendees.join(', ')}`);
    console.log(`   ✅ CC'd to: ${summary.cc_list.join(', ')}`);
    console.log(`   Message ID: ${summary.email_message_id}`);
    console.log(`   Provider: ${summary.email_provider}`);
    
    if (summary.read_ai?.bot_id) {
      console.log(`\n🤖 Read.ai Copilot:`);
      console.log(`   ✅ Scheduled (Bot ID: ${summary.read_ai.bot_id})`);
    } else if (summary.read_ai?.error) {
      console.log(`\n🤖 Read.ai Copilot:`);
      console.log(`   ⚠️  Failed to schedule: ${summary.read_ai.error}`);
    }
    
    console.log(`\n📎 Calendar Invite: ${summary.ics_path}`);
    console.log(`\n✅ All tasks completed successfully!`);
    console.log('='.repeat(60) + '\n');
  }

  async execute(config = MEETING_CONFIG) {
    logger.info('Starting meeting automation workflow');
    
    try {
      // Step 1: Initialize services
      await this.initialize();
      
      // Step 2: Parse time configuration
      const timeData = this.parseTimeConfiguration(config);
      logger.info('Time configuration parsed', timeData);
      
      // Step 3: Create Zoom meeting
      const zoomMeeting = await this.createZoomMeeting(config, timeData);
      
      // Step 4: Schedule Read.ai Copilot
      await this.scheduleReadAiCopilot(config, zoomMeeting, timeData);
      
      // Step 5: Generate ICS calendar invite
      const icsPath = await this.generateCalendarInvite(config, zoomMeeting, timeData);
      
      // Step 6: Send email invitations
      await this.sendEmailInvitation(config, zoomMeeting, icsPath, timeData);
      
      // Step 7: Generate and save summary
      const summary = await this.generateSummary(config, timeData);
      
      // Step 8: Print human-readable summary
      this.printSummary(summary);
      
      logger.info('Meeting automation workflow completed successfully');
      
      return summary;
    } catch (error) {
      logger.error('Meeting automation workflow failed', { error: error.message });
      throw error;
    }
  }
}