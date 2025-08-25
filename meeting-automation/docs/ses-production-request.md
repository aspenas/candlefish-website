# AWS SES Production Access Request

## Account Information
- **AWS Account ID**: 681214184463
- **Account Name**: Candlefish
- **Region**: us-east-1
- **Primary Domain**: candlefish.ai
- **Primary Sender**: patrick@candlefish.ai

## Current Status (Sandbox Mode)
- **Daily Send Quota**: 200 emails
- **Send Rate**: 1 email per second
- **Verified Domain**: candlefish.ai (pending DNS verification)
- **Verified Email**: patrick@candlefish.ai

## Production Requirements

### Use Case Description
We are building an automated meeting scheduling and management system that needs to send:
1. **Meeting Invitations**: Calendar invites to meeting participants
2. **Meeting Reminders**: Automated reminders before meetings
3. **Meeting Follow-ups**: Post-meeting summaries and action items
4. **System Notifications**: Account verifications, password resets, system alerts

### Expected Volume
- **Initial Phase** (0-3 months): 100-500 emails per day
- **Growth Phase** (3-6 months): 500-2,000 emails per day
- **Scale Phase** (6+ months): 2,000-10,000 emails per day

### Compliance Measures

#### 1. **Bounce Handling**
- Configuration set: `candlefish-main` with bounce notifications
- SNS Topic: `ses-bounces-candlefish`
- Automatic suppression list management
- CloudWatch monitoring for bounce rates

#### 2. **Complaint Handling**
- SNS Topic: `ses-complaints-candlefish`
- Immediate unsubscribe processing
- Complaint rate monitoring via CloudWatch
- Target: < 0.1% complaint rate

#### 3. **List Management**
- Double opt-in for all mailing lists
- Clear unsubscribe links in all emails
- Preference center for email frequency control
- Automatic suppression of bounced/complained addresses

#### 4. **Email Authentication**
- **SPF**: `v=spf1 include:amazonses.com ~all`
- **DKIM**: Three DKIM keys configured
- **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@candlefish.ai`
- **Domain Verification**: TXT record configured

#### 5. **Content Quality**
- All emails are transactional (no marketing)
- Clear sender identification
- Relevant, requested content only
- Professional email templates

#### 6. **Monitoring & Alerting**
- CloudWatch dashboards for:
  - Send rate
  - Bounce rate (target < 5%)
  - Complaint rate (target < 0.1%)
  - Delivery rate (target > 95%)
- SNS alerts for threshold breaches
- Weekly reports on email metrics

### Infrastructure

#### Email Sending Architecture
```
Application → SES API → Configuration Set → SNS Topics → CloudWatch
                ↓
          Email Delivery
                ↓
         Recipient Inbox
```

#### Feedback Loop Processing
```
Bounce/Complaint → SNS Topic → Lambda Function → Suppression List
                                      ↓
                                 Database Update
```

### Security & Privacy
- All API calls use IAM roles with least privilege
- Secrets stored in AWS Secrets Manager
- TLS encryption for all email transmission
- No storage of email content after sending
- GDPR compliant data handling

### Contact Information
- **Technical Contact**: Patrick Smith (patrick@candlefish.ai)
- **Abuse Contact**: abuse@candlefish.ai
- **Compliance Contact**: compliance@candlefish.ai

## Request Summary
We request production access to AWS SES to support our legitimate business need for transactional email sending. We have implemented comprehensive bounce and complaint handling, email authentication, and monitoring systems to ensure high deliverability and compliance with AWS SES policies.

## DNS Records Status

### Required DNS Records
The following DNS records need to be configured at Porkbun:

1. **Domain Verification** (TXT)
   - Name: `_amazonses.candlefish.ai`
   - Value: `liicSomu3mFbN6Ax02kB1pQ9pb8V8LIwXtsRUs7hfUo=`

2. **DKIM Records** (CNAME)
   - `6gdr23zgrmihk4albjcz3dmezm732rcl._domainkey.candlefish.ai` → `6gdr23zgrmihk4albjcz3dmezm732rcl.dkim.amazonses.com`
   - `zcuwunlejthh3d4jr3r4unxt73ynqi7i._domainkey.candlefish.ai` → `zcuwunlejthh3d4jr3r4unxt73ynqi7i.dkim.amazonses.com`
   - `hylzjwsxrzuqzxsyylqjeio4xfqqf23w._domainkey.candlefish.ai` → `hylzjwsxrzuqzxsyylqjeio4xfqqf23w.dkim.amazonses.com`

3. **SPF Record** (TXT)
   - Name: `candlefish.ai`
   - Value: `v=spf1 include:amazonses.com ~all`

4. **DMARC Record** (TXT)
   - Name: `_dmarc.candlefish.ai`
   - Value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@candlefish.ai; ruf=mailto:dmarc@candlefish.ai; fo=1`

## How to Submit Production Request

1. Go to AWS SES Console: https://console.aws.amazon.com/ses/home?region=us-east-1
2. Click on "Account dashboard" in the left sidebar
3. In the "Account-level settings" section, find "Request production access"
4. Click "Request production access"
5. Fill out the form with the information above
6. Submit the request

AWS typically responds within 24-48 hours.