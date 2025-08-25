import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class ZoomClient {
  constructor(config) {
    this.accountId = config.accountId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = 'https://api.zoom.us/v2';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    try {
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
      
      logger.info('Zoom OAuth token obtained successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Zoom access token', { error: error.message });
      throw new Error(`Zoom authentication failed: ${error.message}`);
    }
  }

  async getCurrentUser() {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get current user', { error: error.message });
      throw error;
    }
  }

  async checkExistingMeeting(topic, startTime, userId = 'me') {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(`${this.baseUrl}/users/${userId}/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          type: 'scheduled',
          page_size: 100
        }
      });

      const targetTime = new Date(startTime).getTime();
      const tolerance = 5 * 60 * 1000; // 5 minutes

      const existingMeeting = response.data.meetings.find(meeting => {
        const meetingTime = new Date(meeting.start_time).getTime();
        return meeting.topic === topic && 
               Math.abs(meetingTime - targetTime) <= tolerance;
      });

      if (existingMeeting) {
        logger.info('Found existing meeting', { id: existingMeeting.id, topic });
        return existingMeeting;
      }

      return null;
    } catch (error) {
      logger.error('Failed to check existing meetings', { error: error.message });
      return null;
    }
  }

  async createMeeting(config) {
    const token = await this.getAccessToken();
    
    // Check for existing meeting first
    const existing = await this.checkExistingMeeting(
      config.topic,
      config.start_time,
      config.userId || 'me'
    );
    
    if (existing) {
      return existing;
    }

    const meetingData = {
      topic: config.topic,
      type: 2, // Scheduled meeting
      start_time: config.start_time,
      duration: config.duration,
      timezone: config.timezone,
      agenda: config.agenda || '',
      settings: {
        host_video: config.settings?.host_video !== false,
        participant_video: config.settings?.participant_video || false,
        join_before_host: config.settings?.join_before_host || false,
        mute_upon_entry: config.settings?.mute_upon_entry !== false,
        waiting_room: config.settings?.waiting_room !== false,
        audio: config.settings?.audio || 'voip',
        auto_recording: config.settings?.recording ? 'cloud' : 'none',
        meeting_authentication: config.settings?.meeting_authentication || false,
        alternative_hosts_email_notification: true
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/users/${config.userId || 'me'}/meetings`,
        meetingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Zoom meeting created', {
        id: response.data.id,
        topic: response.data.topic,
        join_url: response.data.join_url
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create Zoom meeting', { 
        error: error.response?.data || error.message 
      });
      throw new Error(`Failed to create meeting: ${error.message}`);
    }
  }
}