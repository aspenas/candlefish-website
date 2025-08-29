#!/usr/bin/env python3

import os
import sys
import json
import smtplib
import argparse
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, List
import time

def load_gmail_credentials():
    """Load Gmail SMTP credentials from environment or AWS Secrets Manager"""
    import subprocess
    
    try:
        result = subprocess.run(
            ["aws", "secretsmanager", "get-secret-value", "--secret-id", "candlefish/gmail-app-password"],
            capture_output=True,
            text=True,
            check=True
        )
        secret_data = json.loads(result.stdout)
        credentials = json.loads(secret_data['SecretString'])
        return credentials['email'], credentials['password']
    except:
        email = os.getenv('GMAIL_EMAIL', 'patrick.smith@gmail.com')
        password = os.getenv('GMAIL_APP_PASSWORD')
        if not password:
            print("Warning: Gmail app password not found in AWS Secrets or environment")
            print("Please set GMAIL_APP_PASSWORD environment variable")
            print("To create an app password: https://myaccount.google.com/apppasswords")
            sys.exit(1)
        return email, password

def send_cancellation_email(
    sender_email: str,
    sender_password: str,
    recipient_email: str,
    ics_file_path: str,
    event_summary: str = "FOGG Event"
):
    """Send a cancellation email with iCalendar attachment"""
    
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = f"Event Cancellation: {event_summary}"
    
    body = f"""Dear FOGG Member,

This email contains an automatic cancellation for the following event:
{event_summary}

The attached calendar file will remove this event from your Outlook, Teams, or other calendar applications.

Please open the attached .ics file to process the cancellation.

If the event doesn't automatically remove from your calendar:
1. Download the attached .ics file
2. Double-click to open it
3. Your calendar application should prompt you to remove the event

Thank you for your understanding.

Best regards,
FOGG Calendar System
"""
    
    msg.attach(MIMEText(body, 'plain'))
    
    with open(ics_file_path, 'rb') as f:
        attachment = MIMEBase('text', 'calendar')
        attachment.set_payload(f.read())
        encoders.encode_base64(attachment)
        attachment.add_header(
            'Content-Disposition',
            f'attachment; filename={os.path.basename(ics_file_path)}'
        )
        attachment.add_header('Content-Type', 'text/calendar; method=CANCEL')
        msg.attach(attachment)
    
    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            print(f"✓ Sent cancellation to {recipient_email}")
            return True
    except Exception as e:
        print(f"✗ Failed to send to {recipient_email}: {e}")
        return False

def extract_email_from_filename(filename: str) -> str:
    """Extract email address from filename format: email_at_domain_com_EVENT.ics"""
    parts = filename.replace('.ics', '').split('_')
    
    for i, part in enumerate(parts):
        if part == 'at' and i > 0 and i < len(parts) - 1:
            email_parts = parts[:i+2]
            
            remaining = '_'.join(parts[i+2:])
            if '_' in remaining:
                domain_parts = remaining.split('_')
                for j, domain_part in enumerate(domain_parts):
                    if domain_part in ['com', 'net', 'org', 'edu', 'gov', 'io']:
                        email_parts.extend(domain_parts[:j+1])
                        break
            
            email = '_'.join(email_parts).replace('_at_', '@').replace('_', '.')
            return email
    
    return None

def main():
    parser = argparse.ArgumentParser(description='Send iCalendar cancellation emails to FOGG members')
    parser.add_argument(
        '--dir',
        default='ical_cancellations_20250826_111022',
        help='Directory containing .ics cancellation files'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Test mode - only show what would be sent'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='Delay between emails in seconds (default: 1.0)'
    )
    
    args = parser.parse_args()
    
    cancellation_dir = Path(args.dir)
    if not cancellation_dir.exists():
        print(f"Error: Directory {cancellation_dir} not found")
        sys.exit(1)
    
    ics_files = list(cancellation_dir.glob('*.ics'))
    if not ics_files:
        print(f"No .ics files found in {cancellation_dir}")
        sys.exit(1)
    
    print(f"Found {len(ics_files)} cancellation files")
    
    email_to_files: Dict[str, List[Path]] = {}
    for ics_file in ics_files:
        email = extract_email_from_filename(ics_file.name)
        if email:
            if email not in email_to_files:
                email_to_files[email] = []
            email_to_files[email].append(ics_file)
        else:
            print(f"Warning: Could not extract email from {ics_file.name}")
    
    unique_emails = sorted(email_to_files.keys())
    print(f"\nWill send cancellations to {len(unique_emails)} unique email addresses:")
    for email in unique_emails:
        print(f"  - {email} ({len(email_to_files[email])} events)")
    
    if args.test:
        print("\nTest mode - no emails will be sent")
        return
    
    sender_email, sender_password = load_gmail_credentials()
    print(f"\nUsing sender email: {sender_email}")
    
    input("\nPress Enter to begin sending cancellation emails...")
    
    total_sent = 0
    total_failed = 0
    
    for email, files in email_to_files.items():
        print(f"\nProcessing {email} ({len(files)} cancellations)...")
        
        for ics_file in files:
            event_name = ics_file.stem.replace(email.replace('@', '_at_').replace('.', '_') + '_', '')
            
            if send_cancellation_email(
                sender_email,
                sender_password,
                email,
                str(ics_file),
                event_name
            ):
                total_sent += 1
            else:
                total_failed += 1
            
            if args.delay > 0:
                time.sleep(args.delay)
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Successfully sent: {total_sent}")
    print(f"  Failed: {total_failed}")
    print(f"  Total recipients: {len(unique_emails)}")
    
    if total_failed > 0:
        print("\nNote: Failed sends may be due to:")
        print("  - Invalid email addresses")
        print("  - Gmail rate limiting")
        print("  - Network issues")
        print("  Re-run the script to retry failed sends")

if __name__ == '__main__':
    main()