// Meeting Configuration for Candlefish.ai
export const MEETING_CONFIG = {
  // Organizer Information
  ORGANIZER_NAME: "Patrick Smith",
  ORGANIZER_EMAIL: "patrick@candlefish.ai",  // Updated to Candlefish domain

  // Meeting Details
  TITLE: "Candlefish.ai × Retti — Working Session",
  DATE_LOCAL: "2025-08-29",
  START_LOCAL: "15:00",
  END_LOCAL: "16:00",
  TIMEZONE: "America/Denver",

  // Participants
  ATTENDEES: ["erusin@retti.com", "katie@retti.com", "jon@jdenver.com"],
  CC_LIST: ["patrick@candlefish.ai"],

  // File Output
  ICS_OUTPUT_DIR: "/Users/patricksmith/candlefish-ai/calendar/",
  ICS_FILENAME: "Candlefish-Meeting.ics",

  // Email Configuration
  EMAIL_SUBJECT: "Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)",
  EMAIL_FROM_NAME: "Patrick Smith",
  EMAIL_FROM_ADDRESS: "noreply@candlefish.ai",  // Using domain-verified address

  // Zoom Settings (using Candlefish.ai Zoom account)
  ZOOM_SETTINGS: {
    waiting_room: true,
    join_before_host: false,
    audio: "voip",
    mute_upon_entry: true,
    host_video: true,
    participant_video: false,
    meeting_authentication: false,
    recording: false
  },

  // Read.ai Settings
  READ_AI_SETTINGS: {
    enabled: true,
    label: "Read.ai Copilot",
    deliver_to: ["erusin@retti.com", "katie@retti.com", "jon@jdenver.com", "patrick@candlefish.ai"]
  }
};

// Zoom Account Configuration for Candlefish.ai
export const ZOOM_CONFIG = {
  accountId: process.env.ZOOM_ACCOUNT_ID || process.env.CANDLEFISH_ZOOM_ACCOUNT_ID,
  clientId: process.env.ZOOM_CLIENT_ID || process.env.CANDLEFISH_ZOOM_CLIENT_ID,
  clientSecret: process.env.ZOOM_CLIENT_SECRET || process.env.CANDLEFISH_ZOOM_CLIENT_SECRET,
  userEmail: "patrick@candlefish.ai"  // Candlefish.ai Zoom user
};

// Email Configuration
export const EMAIL_CONFIG = {
  provider: process.env.EMAIL_PROVIDER || 'ses',
  from: {
    name: MEETING_CONFIG.EMAIL_FROM_NAME,
    address: MEETING_CONFIG.EMAIL_FROM_ADDRESS
  },
  replyTo: "patrick@candlefish.ai",
  domain: "candlefish.ai"
};
