import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class ReadAiClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.read.ai/v1';
  }

  async scheduleMeetingBot(meetingData) {
    const { joinUrl, meetingId, passcode, topic, startTime, duration, participants } = meetingData;
    
    const requestData = {
      meeting_url: joinUrl,
      meeting_id: meetingId,
      passcode: passcode,
      meeting_name: topic,
      start_time: startTime,
      duration_minutes: duration,
      bot_name: "Read.ai Copilot",
      enable_transcription: true,
      enable_recording: false,
      enable_summary: true,
      enable_action_items: true,
      share_with: participants,
      settings: {
        auto_join: true,
        send_summary_email: true,
        detect_speakers: true,
        generate_highlights: true
      }
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/meetings/schedule`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Read.ai Copilot scheduled', {
        botId: response.data.bot_id,
        meetingId: meetingId,
        status: response.data.status
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to schedule Read.ai Copilot', { 
        error: error.response?.data || error.message 
      });
      
      // Non-critical error - meeting can proceed without Read.ai
      return {
        scheduled: false,
        error: error.message,
        bot_id: null
      };
    }
  }

  async checkBotStatus(botId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/bots/${botId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to check bot status', { error: error.message });
      return { status: 'unknown', error: error.message };
    }
  }

  async cancelBot(botId) {
    try {
      const response = await axios.delete(
        `${this.apiUrl}/bots/${botId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      logger.info('Read.ai bot cancelled', { botId });
      return response.data;
    } catch (error) {
      logger.error('Failed to cancel bot', { error: error.message });
      throw error;
    }
  }
}