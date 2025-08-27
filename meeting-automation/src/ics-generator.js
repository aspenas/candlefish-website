import ical from 'ical-generator';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class ICSGenerator {
  constructor() {
    this.domain = 'candlefish.ai';
  }

  async generateMeetingInvite(meetingData) {
    const {
      title,
      startTime,
      endTime,
      timezone,
      joinUrl,
      meetingId,
      passcode,
      organizer,
      attendees,
      description
    } = meetingData;

    // Create calendar with METHOD:REQUEST for meeting invitations
    const calendar = ical({
      domain: this.domain,
      method: 'REQUEST',
      prodId: {
        company: 'Candlefish.ai',
        product: 'Meeting Scheduler',
        language: 'EN'
      },
      name: 'Candlefish Meeting',
      timezone: timezone
    });

    // Generate unique UID based on meeting ID
    const uid = `${meetingId}@${this.domain}`;

    // Create event
    const event = calendar.createEvent({
      uid: uid,
      stamp: new Date(),
      start: new Date(startTime),
      end: new Date(endTime),
      summary: title,
      location: joinUrl,
      description: this.formatDescription(joinUrl, meetingId, passcode, description),
      organizer: `${organizer.name} <${organizer.email}>`,
      attendees: attendees.map(email => ({
        email: email,
        rsvp: true,
        status: 'NEEDS-ACTION',
        role: 'REQ-PARTICIPANT'
      })),
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      transp: 'OPAQUE',
      class: 'PUBLIC',
      priority: 5,
      url: joinUrl,
      alarms: [
        {
          type: 'email',
          trigger: 1800, // 30 minutes before
          description: `Reminder: ${title} starting in 30 minutes`
        },
        {
          type: 'display',
          trigger: 900, // 15 minutes before
          description: `${title} starting in 15 minutes`
        }
      ]
    });

    // Add custom properties for Zoom
    event.x('X-ZOOM-MEETING-ID', meetingId);
    event.x('X-ZOOM-PASSCODE', passcode);

    return calendar;
  }

  formatDescription(joinUrl, meetingId, passcode, additionalInfo = '') {
    let description = `Join Zoom Meeting:\n${joinUrl}\n\n`;
    description += `Meeting ID: ${meetingId}\n`;
    description += `Passcode: ${passcode}\n\n`;

    if (additionalInfo) {
      description += `${additionalInfo}\n\n`;
    }

    description += `---\n`;
    description += `Read.ai Copilot will join this meeting to provide:\n`;
    description += `• Real-time transcription\n`;
    description += `• Meeting summary and action items\n`;
    description += `• Shared highlights for all participants\n\n`;
    description += `Meeting organized by Candlefish.ai`;

    return description;
  }

  async saveToFile(calendar, outputPath, filename) {
    try {
      // Ensure directory exists
      await fs.mkdir(outputPath, { recursive: true });

      const fullPath = path.join(outputPath, filename);
      const icsContent = calendar.toString();

      // Debug: Save raw content for inspection
      await fs.writeFile(fullPath + '.debug', icsContent, 'utf8');
      logger.info('Debug ICS saved', { path: fullPath + '.debug' });

      // Validate ICS content
      if (!this.validateICS(icsContent)) {
        logger.error('ICS content preview', {
          content: icsContent.substring(0, 500),
          hasOrganizer: icsContent.includes('ORGANIZER')
        });
        throw new Error('Generated ICS file failed validation');
      }

      await fs.writeFile(fullPath, icsContent, 'utf8');

      logger.info('ICS file saved', { path: fullPath });
      return fullPath;
    } catch (error) {
      logger.error('Failed to save ICS file', { error: error.message });
      throw error;
    }
  }

  validateICS(icsContent) {
    const requiredFields = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      'UID:',
      'DTSTAMP:',
      'DTSTART:',
      'DTEND:',
      'SUMMARY:',
      'ORGANIZER',
      'ATTENDEE',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    for (const field of requiredFields) {
      if (!icsContent.includes(field)) {
        logger.error('ICS validation failed', { missingField: field });
        return false;
      }
    }

    // Check for proper date/time format (either Z suffix or plain local time)
    if (!icsContent.match(/DT(START|END):\d{8}T\d{6}/)) {
      logger.error('ICS validation failed: Invalid date/time format');
      return false;
    }

    return true;
  }

  async parseICSFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      // Basic parsing for verification
      const lines = content.split('\n');
      const event = {};

      for (const line of lines) {
        if (line.startsWith('UID:')) {
          event.uid = line.substring(4).trim();
        } else if (line.startsWith('SUMMARY:')) {
          event.summary = line.substring(8).trim();
        } else if (line.startsWith('DTSTART')) {
          event.start = this.parseDateTime(line);
        } else if (line.startsWith('DTEND')) {
          event.end = this.parseDateTime(line);
        } else if (line.startsWith('LOCATION:')) {
          event.location = line.substring(9).trim();
        }
      }

      return event;
    } catch (error) {
      logger.error('Failed to parse ICS file', { error: error.message });
      throw error;
    }
  }

  parseDateTime(line) {
    const match = line.match(/(\d{8}T\d{6})/);
    if (match) {
      const dt = match[1];
      return new Date(
        dt.substring(0, 4),
        parseInt(dt.substring(4, 6)) - 1,
        dt.substring(6, 8),
        dt.substring(9, 11),
        dt.substring(11, 13),
        dt.substring(13, 15)
      );
    }
    return null;
  }
}
