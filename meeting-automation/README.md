# Candlefish Meeting Automation System

Automated Zoom meeting scheduler with Read.ai Copilot integration and email dispatch for patrick@candlefish.ai.

## Features

✅ **Zoom Meeting Creation** - Uses Candlefish.ai Zoom account OAuth  
✅ **Read.ai Copilot** - Automatically scheduled for transcripts & notes  
✅ **ICS Calendar Generation** - RFC5545-compliant calendar invites  
✅ **Email Dispatch** - AWS SES or Gmail with attachments  
✅ **Duplicate Detection** - Prevents creating duplicate meetings  
✅ **Comprehensive Logging** - Full audit trail of all operations

## Quick Start

```bash
# Validate setup
node src/validate.js

# Run the automation
./run-meeting-automation.sh
```

## Configuration

Edit `src/config.js` to customize:

```javascript
ORGANIZER_EMAIL: "patrick@candlefish.ai"  // Candlefish domain
TITLE: "Your Meeting Title"
DATE_LOCAL: "2025-08-29"
START_LOCAL: "15:00"
END_LOCAL: "16:00"
TIMEZONE: "America/Denver"
ATTENDEES: ["email1@example.com", "email2@example.com"]
```

## Credentials

The system automatically loads credentials from AWS Secrets Manager:

- **Zoom OAuth**: `zoom-api-credentials` (Candlefish account)
- **Email**: AWS SES using IAM role
- **Read.ai**: Optional - add `READ_AI_API_KEY` if available

## Output Files

After running, the following files are created:

- `zoom_meeting.json` - Complete Zoom meeting details
- `read_ai_summary.json` - Read.ai bot scheduling confirmation
- `calendar/Candlefish-Meeting.ics` - Calendar invite file
- `email_send.json` - Email delivery confirmation
- `meeting_dispatch_summary.json` - Complete workflow summary
- `logs/meeting-automation.log` - Detailed execution logs

## Workflow Steps

1. **Initialize** - Load credentials from AWS Secrets Manager
2. **Parse Time** - Convert local time to UTC with timezone handling
3. **Create Zoom** - Create meeting via Zoom OAuth API
4. **Schedule Read.ai** - Add Copilot bot (if configured)
5. **Generate ICS** - Create RFC5545 calendar invite
6. **Send Email** - Dispatch via AWS SES with attachment
7. **Save Summary** - Generate JSON summaries and logs

## API Integrations

### Zoom API (OAuth Server-to-Server)
- Endpoint: `https://api.zoom.us/v2`
- Auth: OAuth 2.0 with account credentials grant
- Scopes: `meeting:write:admin`, `user:read`

### AWS SES
- Region: `us-east-1`
- From: `patrick@candlefish.ai`
- Method: Raw email with MIME attachments

### Read.ai (Optional)
- Endpoint: `https://api.read.ai/v1`
- Features: Transcription, summary, action items

## Validation

Run validation to check all services:

```bash
node src/validate.js
```

This checks:
- ✅ Zoom OAuth authentication
- ✅ AWS SES configuration  
- ✅ Meeting configuration validity
- ⚠️ Read.ai API (optional)

## Environment Variables

Optional overrides (defaults to AWS Secrets Manager):

```bash
CANDLEFISH_ZOOM_ACCOUNT_ID=xxx
CANDLEFISH_ZOOM_CLIENT_ID=xxx
CANDLEFISH_ZOOM_CLIENT_SECRET=xxx
READ_AI_API_KEY=xxx (optional)
EMAIL_PROVIDER=ses|gmail
AWS_REGION=us-east-1
LOG_LEVEL=info|debug
```

## Error Handling

- **Duplicate meetings**: Automatically detected and reused
- **Read.ai failures**: Non-critical, meeting proceeds
- **Email failures**: Critical error with detailed logging
- **Network retries**: Automatic with exponential backoff

## Security

- Credentials stored in AWS Secrets Manager
- No hardcoded secrets in code
- OAuth 2.0 for Zoom authentication
- TLS for all API communications
- Audit logging for compliance

## License

© 2025 Candlefish.ai - Internal Use Only