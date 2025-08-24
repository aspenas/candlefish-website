# Candlefish Email Notification System

## Overview

A complete email notification system using Resend for the Candlefish workshop notes. This system embodies the principle: **"We publish when we discover something worth sharing. No content calendar. No SEO games. Just operational patterns."**

## 🎯 Features

- **Sophisticated Email Templates**: Typography-focused design matching Candlefish Atelier standards
- **Subscription Management**: Subscribe/unsubscribe functionality with database storage
- **Workshop Note Distribution**: Send beautifully formatted workshop notes to subscribers
- **Unsubscribe System**: One-click unsubscribe with elegant confirmation pages
- **Email Analytics**: Track campaigns, subscribers, and delivery metrics
- **AWS Integration**: Secure API key management via AWS Secrets Manager

## 📧 Email Template Design

The email template features:
- **Operational Color System**: Depth-void (#0D1B2A), Operation-active (#3FD3C6), etc.
- **Typography Hierarchy**: Display fonts for headers, editorial fonts for content
- **Mobile Responsive**: Optimized for all devices
- **Dark Mode Support**: Automatic adaptation based on user preferences
- **Professional Layout**: Clean, minimal design focused on readability

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Set Resend API key (development)
export RESEND_API_KEY="your-resend-api-key"

# Or use AWS Secrets Manager (production)
aws secretsmanager put-secret-value \
  --secret-id "candlefish/resend/api-key" \
  --secret-string '{"api_key":"your-resend-api-key"}'
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Email Sending

```bash
# Send test email
curl -X POST http://localhost:3015/api/email/send-workshop-note \
  -H "Content-Type: application/json" \
  -d '{
    "workshop_note_title": "The Architecture of Inevitability",
    "test_email": "your-email@example.com"
  }'
```

## 📚 API Endpoints

### Newsletter Subscription

**Subscribe to workshop notes:**
```bash
POST /api/newsletter
Content-Type: application/json

{
  "email": "subscriber@example.com",
  "name": "Subscriber Name" // optional
}
```

**Unsubscribe:**
```bash
DELETE /api/newsletter
Content-Type: application/json

{
  "email": "subscriber@example.com"
}
```

### Email Campaign Management

**Send workshop note:**
```bash
POST /api/email/send-workshop-note
Content-Type: application/json

{
  "workshop_note_title": "The Architecture of Inevitability",
  "test_email": "test@example.com" // optional, for testing
}
```

**Get system overview:**
```bash
GET /api/email/manage
```

**Unsubscribe via token (email links):**
```bash
GET /api/email/unsubscribe?token=unsubscribe-token
```

## 🗄️ Database Schema

The system uses the following tables:

### email_subscribers
- `id`: UUID primary key
- `email`: Unique email address
- `name`: Optional subscriber name
- `status`: active | unsubscribed | bounced | pending
- `unsubscribe_token`: Unique token for unsubscribe links
- `created_at`, `updated_at`: Timestamps

### workshop_notes
- `id`: UUID primary key
- `title`: Workshop note title
- `content`: Full markdown content
- `summary`: Brief summary
- `category`: Content category
- `tags`: Array of tags
- `reading_time`: Estimated reading time in minutes
- `published_at`: Publication timestamp

### email_campaigns
- `id`: UUID primary key
- `workshop_note_id`: Reference to workshop note
- `subject`: Email subject line
- `recipient_count`: Number of recipients
- `status`: draft | sending | sent | failed
- `sent_at`: Campaign send timestamp

## 🏗️ Architecture

### Email Service (`lib/email/resend-service.ts`)
- Resend API integration
- Template rendering with markdown-to-HTML conversion
- Rate limiting for bulk sends
- Error handling and retry logic

### Database Service (`lib/email/database-service.ts`)
- In-memory storage for development
- PostgreSQL schema for production
- Subscriber management
- Campaign tracking

### AWS Secrets Service (`lib/email/aws-secrets.ts`)
- Secure API key retrieval
- Caching for performance
- Error handling with fallbacks

## 🎨 Email Template Structure

```html
<!-- Header -->
<div class="header">
    <div class="logo">Candlefish Atelier</div>
    <div class="tagline">Operational patterns · Technical philosophy</div>
</div>

<!-- Content -->
<div class="content">
    <h1 class="note-title">{{title}}</h1>
    <div class="note-meta">
        <span class="reading-time">{{reading_time}} min read</span>
        <span class="category">{{category}}</span>
    </div>
    <div class="note-summary">{{summary}}</div>
    <div class="note-content">{{{content}}}</div>
    
    <!-- Operational Principle Callout -->
    <div class="operational-principle">
        <h3>Operational Pattern</h3>
        <p>We publish when we discover something worth sharing...</p>
    </div>
</div>

<!-- Footer with unsubscribe -->
<div class="footer">
    <a href="{{unsubscribe_url}}">Unsubscribe</a>
</div>
```

## 🔧 Configuration

### Environment Variables
- `RESEND_API_KEY`: Resend API key (development)
- `AWS_REGION`: AWS region for Secrets Manager
- `NEXT_PUBLIC_BASE_URL`: Base URL for unsubscribe links

### AWS Secrets
- `candlefish/resend/api-key`: Primary Resend API key
- `candlefish/resend-api-key`: Fallback Resend API key

## 🧪 Testing

### Manual Testing
```bash
# Test email system
curl -X GET http://localhost:3015/api/email/manage

# Subscribe test user
curl -X POST http://localhost:3015/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'

# Send test email
curl -X POST http://localhost:3015/api/email/send-workshop-note \
  -H "Content-Type: application/json" \
  -d '{
    "workshop_note_title": "The Architecture of Inevitability",
    "test_email": "test@example.com"
  }'

# Unsubscribe
curl -X DELETE http://localhost:3015/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Automated Testing
```bash
# Run test suite
node scripts/test-email-system.js
```

## 🚀 Deployment

### Development
1. Set `RESEND_API_KEY` environment variable
2. Start development server: `npm run dev`
3. Test endpoints at `http://localhost:3015`

### Production
1. Store Resend API key in AWS Secrets Manager
2. Configure environment variables in deployment platform
3. Set up PostgreSQL database with provided schema
4. Deploy application with email system enabled

### Netlify Deployment
Add to Netlify environment variables:
```
RESEND_API_KEY=your-resend-api-key
AWS_REGION=us-east-1
NEXT_PUBLIC_BASE_URL=https://candlefish.ai
```

## 📊 Success Metrics

The email system successfully:
- ✅ **Sent test email** to hello@candlefish.ai with "The Architecture of Inevitability"
- ✅ **Rendered beautiful template** with Candlefish design standards
- ✅ **Handled subscriptions** with database storage
- ✅ **Provided unsubscribe functionality** with elegant pages
- ✅ **Integrated with AWS Secrets Manager** for secure API key management
- ✅ **Created comprehensive API endpoints** for all email operations

## 🎯 Usage Examples

### Send Workshop Note to All Subscribers
```javascript
// API call to send to all active subscribers
await fetch('/api/email/send-workshop-note', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workshop_note_title: 'The Architecture of Inevitability'
  })
})
```

### Subscribe New User
```javascript
await fetch('/api/newsletter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'new-subscriber@example.com',
    name: 'New Subscriber'
  })
})
```

## 🔮 Future Enhancements

- **Production Database**: Replace in-memory storage with PostgreSQL
- **Email Analytics**: Enhanced tracking with open/click rates
- **A/B Testing**: Template and subject line testing
- **Email Sequences**: Automated welcome and nurture sequences
- **Segment Management**: Advanced subscriber categorization

## 📞 Support

For issues or questions about the email system:
1. Check server logs for error messages
2. Verify Resend API key is correctly configured
3. Ensure AWS credentials are properly set up
4. Review database schema and migrations

The email system embodies Candlefish's operational philosophy: sophisticated, thoughtful, and focused on delivering real value rather than optimizing for metrics.
