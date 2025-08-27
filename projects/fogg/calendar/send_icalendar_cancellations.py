#!/usr/bin/env python3
"""Send explicit iCalendar CANCEL messages for FOGG events that Outlook/Teams will respect."""

import json
import smtplib
import ssl
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os
import sys
import hashlib
from typing import List, Dict, Any

# For Google Calendar API
import importlib.util
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'src')
auth_path = os.path.join(src_dir, 'auth.py')
spec = importlib.util.spec_from_file_location("auth", auth_path)
auth_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth_module)

sys.path.insert(0, current_dir)
from src.utils.api_client import execute_google_api_call

build_calendar_service = auth_module.build_calendar_service


def generate_ical_cancel(event_data: Dict[str, Any], organizer_email: str) -> str:
    """Generate an iCalendar CANCEL message that Outlook will respect.
    
    Args:
        event_data: Event information from backup
        organizer_email: Email of the organizer
        
    Returns:
        iCalendar formatted cancellation string
    """
    # Extract event details
    summary = event_data.get('summary', 'FOGG Meeting')
    event_id = event_data.get('event_id', '')
    
    # Generate a proper UID that matches what Google Calendar would use
    # This is critical for Outlook to recognize the event
    if '@google.com' not in event_id:
        uid = f"{event_id}@google.com"
    else:
        uid = event_id
    
    # Get start/end times
    start = event_data.get('start', {})
    if 'dateTime' in start:
        start_dt = start['dateTime'].replace('-', '').replace(':', '').replace('.', '')
        # Ensure we have the right format: YYYYMMDDTHHMMSSZ
        if 'T' in start_dt:
            start_dt = start_dt.split('+')[0].split('-')[0].replace('T', 'T')
            if not start_dt.endswith('Z'):
                start_dt = start_dt[:15] + 'Z'
        else:
            start_dt = start['date'].replace('-', '') + 'T000000Z'
    else:
        start_dt = start.get('date', '20260101').replace('-', '') + 'T000000Z'
    
    # Create VCALENDAR with CANCEL method
    ical_cancel = f"""BEGIN:VCALENDAR
PRODID:-//Google Inc//Google Calendar 70.9054//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:CANCEL
BEGIN:VEVENT
DTSTART:{start_dt}
DTEND:{start_dt}
DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}
ORGANIZER;CN=FOGG Calendar System:mailto:{organizer_email}
UID:{uid}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=
 TRUE;CN=;X-NUM-GUESTS=0:mailto:{organizer_email}
CREATED:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}
DESCRIPTION:This FOGG event has been cancelled.
LAST-MODIFIED:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}
LOCATION:
SEQUENCE:1
STATUS:CANCELLED
SUMMARY:{summary} - CANCELLED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR"""
    
    return ical_cancel


def generate_ical_cancel_recurring(event_data: Dict[str, Any], organizer_email: str) -> str:
    """Generate an iCalendar CANCEL for recurring events.
    
    This handles the special case of recurring events which need
    additional properties for Outlook to properly cancel all instances.
    """
    summary = event_data.get('summary', 'FOGG Meeting')
    event_id = event_data.get('event_id', '')
    
    if '@google.com' not in event_id:
        uid = f"{event_id}@google.com"
    else:
        uid = event_id
    
    # For recurring events, we need to include the recurrence rule
    recurrence = event_data.get('recurrence', [])
    rrule = recurrence[0] if recurrence else "RRULE:FREQ=MONTHLY;BYDAY=3FR"
    
    # Get start time
    start = event_data.get('start', {})
    if 'dateTime' in start:
        start_dt = start['dateTime'].replace('-', '').replace(':', '').replace('.', '')
        if 'T' in start_dt:
            start_dt = start_dt.split('+')[0].split('-')[0].replace('T', 'T')
            if not start_dt.endswith('Z'):
                start_dt = start_dt[:15] + 'Z'
    else:
        start_dt = start.get('date', '20260101').replace('-', '') + 'T000000Z'
    
    ical_cancel = f"""BEGIN:VCALENDAR
PRODID:-//Google Inc//Google Calendar 70.9054//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:CANCEL
X-MS-OLK-FORCEINSPECTOROPEN:TRUE
BEGIN:VTIMEZONE
TZID:America/Denver
X-LIC-LOCATION:America/Denver
BEGIN:DAYLIGHT
TZOFFSETFROM:-0700
TZOFFSETTO:-0600
TZNAME:MDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0600
TZOFFSETTO:-0700
TZNAME:MST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID=America/Denver:{start_dt[:8]}T100000
DTEND;TZID=America/Denver:{start_dt[:8]}T110000
{rrule}
DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}
ORGANIZER;CN=FOGG Calendar:mailto:{organizer_email}
UID:{uid}
CLASS:PUBLIC
CREATED:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}
DESCRIPTION:This entire FOGG event series has been cancelled.
LAST-MODIFIED:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}
LOCATION:
SEQUENCE:2
STATUS:CANCELLED
SUMMARY:{summary} - SERIES CANCELLED
TRANSP:OPAQUE
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
X-MICROSOFT-CDO-IMPORTANCE:1
X-MICROSOFT-DISALLOW-COUNTER:TRUE
END:VEVENT
END:VCALENDAR"""
    
    return ical_cancel


def send_cancel_email(attendee_email: str, ical_content: str, event_summary: str, smtp_config: Dict[str, Any]):
    """Send cancellation email with iCalendar attachment.
    
    Args:
        attendee_email: Recipient email
        ical_content: iCalendar cancellation content
        event_summary: Event summary for email subject
        smtp_config: SMTP configuration
    """
    # Create message
    msg = MIMEMultipart('mixed')
    msg['Subject'] = f'Cancelled: {event_summary}'
    msg['From'] = smtp_config['from_email']
    msg['To'] = attendee_email
    msg['Reply-To'] = smtp_config['from_email']
    
    # Add headers that help Outlook process this correctly
    msg['X-Microsoft-CDO-Importance'] = '1'
    msg['X-Priority'] = '1'
    msg['Importance'] = 'High'
    
    # Create the body
    body = MIMEMultipart('alternative')
    
    # Text part
    text = f"""This is a cancellation notice for: {event_summary}

This FOGG event has been cancelled. Please remove it from your calendar.

If this event still appears in your Outlook or Teams calendar after receiving this message:
1. Open the event in your calendar
2. Delete it manually
3. If it's a recurring event, choose "Delete series"

We apologize for any inconvenience."""
    
    # HTML part  
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; }}
        .cancelled {{ 
            color: #cc0000; 
            font-weight: bold;
            text-decoration: line-through;
        }}
        .notice {{
            background-color: #ffeeee;
            border: 2px solid #cc0000;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }}
    </style>
</head>
<body>
    <div class="notice">
        <h2 class="cancelled">{event_summary}</h2>
        <p><strong>This FOGG event has been CANCELLED.</strong></p>
        <p>Please remove it from your calendar.</p>
    </div>
    
    <p>If this event still appears in your Outlook or Teams calendar:</p>
    <ol>
        <li>Open the event in your calendar</li>
        <li>Delete it manually</li>
        <li>If it's a recurring event, choose "Delete series"</li>
    </ol>
    
    <p><small>This is an automated cancellation notice from the FOGG Calendar system.</small></p>
</body>
</html>"""
    
    body.attach(MIMEText(text, 'plain'))
    body.attach(MIMEText(html, 'html'))
    msg.attach(body)
    
    # Attach the iCalendar file
    ical_attachment = MIMEBase('text', 'calendar; method=CANCEL')
    ical_attachment.set_payload(ical_content.encode('utf-8'))
    encoders.encode_base64(ical_attachment)
    ical_attachment.add_header(
        'Content-Disposition',
        f'attachment; filename="cancel_{event_summary.replace(" ", "_")}.ics"'
    )
    ical_attachment.add_header('Content-Class', 'urn:content-classes:calendarmessage')
    msg.attach(ical_attachment)
    
    # Also add inline calendar part for Outlook
    cal_part = MIMEText(ical_content, 'calendar; method=CANCEL')
    cal_part.add_header('Content-Disposition', 'inline')
    cal_part.add_header('Content-Transfer-Encoding', '8bit')
    msg.attach(cal_part)
    
    # Send the email
    try:
        if smtp_config.get('use_tls'):
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_config['server'], smtp_config['port']) as server:
                server.starttls(context=context)
                if smtp_config.get('username'):
                    server.login(smtp_config['username'], smtp_config['password'])
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_config['server'], smtp_config['port']) as server:
                if smtp_config.get('username'):
                    server.login(smtp_config['username'], smtp_config['password'])
                server.send_message(msg)
        
        print(f"✅ Sent cancellation to {attendee_email} for {event_summary}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send to {attendee_email}: {str(e)}")
        return False


def main():
    """Main function to send iCalendar cancellations."""
    
    print("=" * 80)
    print("ICALENDAR CANCELLATION SENDER FOR OUTLOOK/TEAMS")
    print("=" * 80)
    print("\nThis tool sends explicit iCalendar CANCEL messages that Outlook respects.\n")
    
    # Load the backup of FOGG events
    backup_files = [f for f in os.listdir('.') if f.startswith('fogg_events_backup_')]
    if not backup_files:
        print("❌ No FOGG event backup files found!")
        print("Please run delete_fogg_events_only.py first to create a backup.")
        return
    
    # Use the most recent backup
    latest_backup = sorted(backup_files)[-1]
    print(f"Using backup file: {latest_backup}")
    
    with open(latest_backup, 'r') as f:
        events_data = json.load(f)
    
    print(f"Found {len(events_data)} FOGG events in backup\n")
    
    # Extract unique attendees and their events
    attendee_events = {}
    for event in events_data:
        for attendee in event.get('attendees', []):
            email = attendee.get('email', '')
            if email and email != 'patrick.smith@gmail.com':  # Skip organizer
                if email not in attendee_events:
                    attendee_events[email] = []
                attendee_events[email].append(event)
    
    print(f"Found {len(attendee_events)} unique attendees to notify")
    print("\nSample attendees:")
    for email in list(attendee_events.keys())[:5]:
        print(f"  - {email} ({len(attendee_events[email])} events)")
    
    # SMTP Configuration
    print("\n" + "=" * 80)
    print("EMAIL CONFIGURATION")
    print("=" * 80)
    print("\nTo send cancellations, we need SMTP settings.")
    print("\nOptions:")
    print("1. Use Gmail SMTP (requires app password)")
    print("2. Use custom SMTP server")
    print("3. Generate .ics files only (no email)")
    
    choice = input("\nSelect option (1-3): ").strip()
    
    smtp_config = {}
    
    if choice == '1':
        print("\nGmail SMTP Setup:")
        print("1. Go to https://myaccount.google.com/security")
        print("2. Enable 2-factor authentication")
        print("3. Generate an app password: https://myaccount.google.com/apppasswords")
        
        smtp_config = {
            'server': 'smtp.gmail.com',
            'port': 587,
            'use_tls': True,
            'username': input("Gmail address: ").strip(),
            'password': input("App password: ").strip(),
            'from_email': 'noreply@fogg-calendar.com'
        }
        smtp_config['from_email'] = smtp_config['username']
        
    elif choice == '2':
        smtp_config = {
            'server': input("SMTP server: ").strip(),
            'port': int(input("SMTP port: ").strip()),
            'use_tls': input("Use TLS? (y/n): ").strip().lower() == 'y',
            'username': input("Username (or press Enter for none): ").strip() or None,
            'password': input("Password (or press Enter for none): ").strip() or None if smtp_config.get('username') else None,
            'from_email': input("From email address: ").strip()
        }
        
    elif choice == '3':
        print("\nGenerating .ics files only...")
        
        # Create directory for ics files
        ics_dir = f"ical_cancellations_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(ics_dir, exist_ok=True)
        
        for email, events in attendee_events.items():
            safe_email = email.replace('@', '_at_').replace('.', '_')
            
            for event in events:
                # Generate cancellation
                if event.get('recurrence'):
                    ical_content = generate_ical_cancel_recurring(event, 'patrick.smith@gmail.com')
                else:
                    ical_content = generate_ical_cancel(event, 'patrick.smith@gmail.com')
                
                # Save to file
                summary = event.get('summary', 'fogg_event').replace(' ', '_')
                filename = f"{ics_dir}/{safe_email}_{summary}.ics"
                
                with open(filename, 'w') as f:
                    f.write(ical_content)
                
                print(f"✅ Generated {filename}")
        
        print(f"\n✅ Generated {len(attendee_events)} cancellation files in {ics_dir}/")
        print("\nYou can email these .ics files to attendees manually.")
        return
    
    # Send cancellations via email
    if choice in ['1', '2']:
        print("\n" + "=" * 80)
        print("SENDING CANCELLATIONS")
        print("=" * 80)
        
        confirm = input(f"\nReady to send cancellations to {len(attendee_events)} attendees? (yes/no): ").strip()
        
        if confirm.lower() != 'yes':
            print("❌ Cancelled. No emails sent.")
            return
        
        sent_count = 0
        failed_count = 0
        
        for email, events in attendee_events.items():
            print(f"\nProcessing {email}...")
            
            # For recurring events, send one cancellation
            recurring_events = [e for e in events if e.get('recurrence')]
            single_events = [e for e in events if not e.get('recurrence')]
            
            # Send recurring cancellations
            for event in recurring_events:
                ical_content = generate_ical_cancel_recurring(event, smtp_config['from_email'])
                summary = event.get('summary', 'FOGG Meeting')
                
                if send_cancel_email(email, ical_content, f"{summary} (All occurrences)", smtp_config):
                    sent_count += 1
                else:
                    failed_count += 1
            
            # Send single event cancellations
            for event in single_events:
                ical_content = generate_ical_cancel(event, smtp_config['from_email'])
                summary = event.get('summary', 'FOGG Meeting')
                
                if send_cancel_email(email, ical_content, summary, smtp_config):
                    sent_count += 1
                else:
                    failed_count += 1
        
        print("\n" + "=" * 80)
        print("COMPLETE")
        print("=" * 80)
        print(f"✅ Successfully sent: {sent_count} cancellations")
        if failed_count > 0:
            print(f"❌ Failed to send: {failed_count} cancellations")
        
        print("\nOutlook/Teams calendars should now remove these events automatically.")
        print("If events persist, recipients can manually delete them.")


if __name__ == "__main__":
    main()