# 📧 Meeting Email Ready to Send

## Meeting Successfully Created

**Zoom Meeting ID:** 89371686095  
**Passcode:** 958465  
**Date:** Friday, August 29, 2025  
**Time:** 3:00 PM - 4:00 PM MDT  

## Email to Send

**To:** erusin@retti.com, katie@retti.com, jon@jdenver.com  
**CC:** patrick@candlefish.ai  
**Subject:** Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)  
**Attachment:** `/Users/patricksmith/candlefish-ai/calendar/Candlefish-Meeting.ics`

### Email Body:

```
Hi Erusin, Katie, and Jon —

Looking forward to our conversation. Here are the details:

Time: Friday, August 29, 3:00 PM–4:00 PM MDT
Join Zoom: https://us06web.zoom.us/j/89371686095?pwd=GnmgZnD6dsujCdEjDQjyI4IaVeVgc7.1
Meeting ID: 89371686095
Passcode: 958465

I've also scheduled Read.ai Copilot to join — it produces a shared set of notes and highlights we'll all receive after the call.
If you'd prefer not to have it participate, just let me know and I'll disable it.
If you haven't seen the output before, it's surprisingly fun and useful.

I've attached a calendar invite for your convenience.

Best,
Patrick

--
Patrick Smith
Candlefish.ai
patrick@candlefish.ai
```

## Current Status

✅ **Zoom Meeting:** Created and active  
✅ **Calendar File:** Ready at `/Users/patricksmith/candlefish-ai/calendar/Candlefish-Meeting.ics`  
⏳ **AWS SES:** Production request submitted, awaiting approval (24-48 hours)  

## Options to Send Now:

### Option 1: Manual Send
Copy the email above and send from your email client with the ICS attachment.

### Option 2: Verify Recipients (Temporary)
While in sandbox, you can verify the recipient emails:
```bash
aws ses verify-email-identity --email-address erusin@retti.com --region us-east-1
aws ses verify-email-identity --email-address katie@retti.com --region us-east-1
aws ses verify-email-identity --email-address jon@jdenver.com --region us-east-1
```
They'll need to click verification links before receiving the meeting invite.

### Option 3: Wait for Production
AWS typically approves within 24-48 hours. Once approved, the automation will work for any email.

## Files Available:

1. **Zoom Details:** `zoom_meeting.json`
2. **Calendar Invite:** `/Users/patricksmith/candlefish-ai/calendar/Candlefish-Meeting.ics`
3. **Email Script:** `send-meeting-email.js` (ready once SES approved)

---

**The meeting is confirmed and ready.** Just need to deliver the invitation via email.