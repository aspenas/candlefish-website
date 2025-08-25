# AWS SES Production Access Request

## Company Information
**Company Name:** Candlefish.ai  
**AWS Account ID:** 681214184463  
**Primary Contact:** Patrick Smith (patrick@candlefish.ai)  
**Website:** https://candlefish.ai  

## Use Case Summary
We are requesting production access for AWS SES to send transactional emails for our business meeting automation platform. Our service sends meeting invitations with calendar attachments to business professionals who explicitly expect these communications as part of our meeting coordination service.

## Email Sending Details

### Email Type and Purpose
- **Type:** Transactional emails only
- **Primary Use:** Meeting invitations and calendar coordination
- **Content:** 
  - Meeting scheduling confirmations
  - Calendar event invitations (.ics attachments)
  - Meeting reminders and updates
  - Meeting cancellation notices

### Volume Estimates
- **Current:** 50-100 emails per month (testing phase)
- **Expected (3 months):** 500-1,000 emails per month
- **Expected (12 months):** 2,000-3,000 emails per month
- **Maximum Daily:** 100 emails
- **Send Rate Required:** 5 emails per second

### Recipient Profile
- **Target Audience:** Business professionals, executives, clients, and partners
- **Relationship:** Recipients have explicitly scheduled meetings through our platform
- **Consent:** All recipients have opted-in by scheduling or accepting meeting invitations
- **Geographic Distribution:** Primarily US-based business professionals

## Technical Implementation

### Domain Configuration
- **Sending Domain:** candlefish.ai
- **Verification Status:** Verified ✓
- **DKIM:** Configured and enabled
- **SPF Record:** `v=spf1 include:amazonses.com ~all`
- **DMARC Record:** `v=DMARC1; p=quarantine; rua=mailto:dmarc@candlefish.ai`
- **Custom MAIL FROM:** mail.candlefish.ai (configured)

### Bounce and Complaint Handling
1. **SNS Topics Configured:**
   - Bounce notifications → SNS topic → Lambda function for automated handling
   - Complaint notifications → SNS topic → Lambda function for immediate suppression

2. **Automated Processes:**
   - Hard bounces: Immediately added to suppression list
   - Soft bounces: Retry logic with exponential backoff (max 3 attempts)
   - Complaints: Immediate removal from all sending lists
   - Unsubscribe: One-click unsubscribe link in all emails

3. **Monitoring and Alerts:**
   - CloudWatch alarms for bounce rate > 5%
   - CloudWatch alarms for complaint rate > 0.1%
   - Daily reports on sending metrics

### List Management Practices
- **Double Opt-in:** Not applicable (transactional only)
- **List Source:** Only users who actively schedule meetings through our platform
- **List Hygiene:** 
  - Automatic removal of bounced addresses
  - Automatic suppression of complaint addresses
  - No purchased, rented, or third-party lists

### Content Quality Standards
- **Personalization:** All emails are individually personalized with meeting details
- **No Marketing:** Strictly transactional content only
- **Clear Identification:** All emails clearly identify Candlefish.ai as sender
- **CAN-SPAM Compliance:**
  - Valid physical address included
  - Clear sender identification
  - Accurate subject lines
  - Unsubscribe mechanism in every email

## Security and Compliance

### Authentication
- IAM roles with least privilege access
- API keys stored in AWS Secrets Manager
- MFA enabled on AWS account
- Regular security audits

### Data Protection
- No storage of email content beyond sending logs
- PII handled according to GDPR/CCPA requirements
- Encryption in transit (TLS)
- 30-day retention for sending logs

### Monitoring Infrastructure
```
SES → CloudWatch Metrics → SNS Alerts → Operations Team
     ↓
   Kinesis Firehose → S3 (for audit logs)
```

## Business Justification

### Why Production Access is Needed
1. **Legitimate Business Need:** Our platform automates meeting scheduling for businesses
2. **User Expectation:** Recipients expect timely meeting invitations
3. **Low Volume, High Value:** Each email represents a scheduled business meeting
4. **Professional Communications:** B2B only, no consumer marketing

### Impact of Sandbox Limitations
- Cannot send to new business contacts without manual verification
- Delays in meeting coordination
- Poor user experience requiring recipient verification

## Commitment to Best Practices

We commit to:
1. Maintaining bounce rate below 5%
2. Maintaining complaint rate below 0.1%
3. Sending only to recipients who expect our emails
4. Never sending unsolicited commercial email
5. Immediately investigating and addressing any deliverability issues
6. Following all AWS SES Terms of Service

## Supporting Documentation

### Sample Email Content
```
Subject: Meeting Invitation: Project Review - Dec 28, 2024

From: Candlefish Meeting Coordinator <meetings@candlefish.ai>
To: john.doe@company.com

Dear John,

You have been invited to the following meeting:

Title: Project Review
Date: December 28, 2024
Time: 2:00 PM EST
Duration: 1 hour
Location: Virtual (Zoom link provided)

Please find the calendar invitation attached.

Best regards,
Candlefish Meeting Automation

---
To unsubscribe from meeting notifications: [unsubscribe link]
Candlefish.ai, 123 Business Ave, Suite 100, Austin, TX 78701
```

## Contact Information
**Technical Contact:** Patrick Smith  
**Email:** patrick@candlefish.ai  
**Phone:** Available upon request  
**Availability:** Monday-Friday, 9 AM - 6 PM CST  

## Additional Notes
- We have successfully operated similar email systems with other providers
- Our team has extensive experience with email deliverability best practices
- We are committed to maintaining the highest sending standards

---

*This request is submitted in accordance with AWS SES documentation and best practices for production access.*