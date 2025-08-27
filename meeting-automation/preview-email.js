import { EmailDispatcher } from './src/email-dispatcher.js';
import { ICSGenerator } from './src/ics-generator.js';
import { MEETING_CONFIG } from './src/config.js';

// Create mock meeting data for preview
const mockMeeting = {
  id: "89234567890",
  join_url: "https://candlefish.zoom.us/j/89234567890?pwd=abc123DEF456ghi789",
  password: "825943",
  passcode: "825943",
  topic: "Candlefish.ai × Retti — Working Session"
};

// Create email dispatcher
const dispatcher = new EmailDispatcher({ provider: 'preview' });

// Generate email content
const emailContent = dispatcher.generateEmailContent({
  attendees: ["erusin@retti.com", "katie@retti.com", "jon@jdenver.com"],
  date: "2025-08-29",
  startTime: "15:00",
  endTime: "16:00",
  timezone: "America/Denver",
  joinUrl: mockMeeting.join_url,
  meetingId: mockMeeting.id,
  passcode: mockMeeting.passcode
});

console.log("\n📧 EMAIL PREVIEW FOR RETTI TEAM");
console.log("=" .repeat(70));
console.log("\nFROM: Patrick Smith <patrick@candlefish.ai>");
console.log("TO: erusin@retti.com, katie@retti.com, jon@jdenver.com");
console.log("CC: patrick@candlefish.ai");
console.log("SUBJECT: Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)");
console.log("ATTACHMENT: Candlefish-Meeting.ics");
console.log("\n" + "-".repeat(70));
console.log("PLAIN TEXT VERSION:");
console.log("-".repeat(70) + "\n");
console.log(emailContent.plain);
console.log("\n" + "-".repeat(70));
console.log("HTML VERSION (rendered as text):");
console.log("-".repeat(70) + "\n");

// Extract readable text from HTML
const htmlText = emailContent.html
  .replace(/<style[^>]*>.*?<\/style>/gs, '')
  .replace(/<[^>]+>/g, '\n')
  .replace(/\n\s*\n/g, '\n\n')
  .trim();

console.log(htmlText);

// Show ICS preview
console.log("\n" + "=".repeat(70));
console.log("📅 CALENDAR INVITE PREVIEW (ICS FILE)");
console.log("=".repeat(70) + "\n");

const icsGen = new ICSGenerator();
const calendar = await icsGen.generateMeetingInvite({
  title: mockMeeting.topic,
  startTime: new Date("2025-08-29T15:00:00-06:00"),
  endTime: new Date("2025-08-29T16:00:00-06:00"),
  timezone: "America/Denver",
  joinUrl: mockMeeting.join_url,
  meetingId: mockMeeting.id,
  passcode: mockMeeting.passcode,
  organizer: {
    name: "Patrick Smith",
    email: "patrick@candlefish.ai"
  },
  attendees: ["erusin@retti.com", "katie@retti.com", "jon@jdenver.com"],
  description: "Meeting with Read.ai Copilot enabled"
});

const icsContent = calendar.toString();
// Show key parts of ICS file
const icsLines = icsContent.split('\n');
const keyLines = [
  'BEGIN:VCALENDAR',
  'VERSION:',
  'METHOD:',
  'BEGIN:VEVENT',
  'SUMMARY:',
  'DTSTART:',
  'DTEND:',
  'LOCATION:',
  'ORGANIZER:',
  'ATTENDEE:'
];

console.log("Key ICS fields:");
icsLines.forEach(line => {
  if (keyLines.some(key => line.startsWith(key))) {
    console.log(line);
  }
});

console.log("\n" + "=".repeat(70));
console.log("📱 WHAT RECIPIENTS WILL SEE:");
console.log("=".repeat(70) + "\n");

console.log("1. EMAIL CLIENT:");
console.log("   • Subject: 'Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)'");
console.log("   • From: Patrick Smith (patrick@candlefish.ai)");
console.log("   • Calendar attachment that auto-adds to their calendar");
console.log("   • Professional HTML formatting with Zoom details");
console.log("");
console.log("2. CALENDAR ENTRY:");
console.log("   • Title: Candlefish.ai × Retti — Working Session");
console.log("   • When: Friday, August 29, 2025");
console.log("   • Time: 3:00 PM - 4:00 PM MDT (1:00 PM - 2:00 PM PDT for California)");
console.log("   • Location: Zoom Meeting (click to join)");
console.log("   • Reminder: 30 minutes before via email");
console.log("   • Reminder: 15 minutes before as popup");
console.log("");
console.log("3. ZOOM MEETING:");
console.log("   • One-click join from email or calendar");
console.log("   • Meeting ID and passcode included");
console.log("   • Waiting room enabled for security");
console.log("   • Host video on, participant video optional");
console.log("");
console.log("4. READ.AI COPILOT:");
console.log("   • Will join automatically as 'Read.ai Copilot'");
console.log("   • Provides transcript and summary after the call");
console.log("   • Shared with all participants");
console.log("   • Can be disabled if requested");

console.log("\n" + "=".repeat(70));
