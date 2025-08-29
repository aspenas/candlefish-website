#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from typing import Dict, List
import subprocess
import time

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
    cancellation_dir = Path('ical_cancellations_20250826_111022')
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
    
    unique_emails = sorted(email_to_files.keys())
    print(f"\nWill send cancellations to {len(unique_emails)} unique email addresses:")
    for email in unique_emails:
        print(f"  - {email} ({len(email_to_files[email])} events)")
    
    print("\n" + "="*60)
    print("READY TO SEND CANCELLATION EMAILS")
    print("="*60)
    
    print("\nThe iCalendar cancellation files have been generated and are ready.")
    print("\nTo send these cancellations, you have several options:")
    print("\n1. MANUAL EMAIL (Recommended):")
    print("   - Open your email client")
    print("   - Create a new email to each recipient")
    print("   - Subject: 'FOGG Event Cancellations'")
    print("   - Attach their corresponding .ics file(s)")
    print("   - The files will automatically cancel the events when opened")
    
    print("\n2. BULK EMAIL via Mail App:")
    print("   - Select all .ics files for a recipient")
    print("   - Right-click → Share → Mail")
    print("   - This will create an email with all attachments")
    
    print("\n3. AUTOMATED (requires Gmail App Password):")
    print("   - Go to https://myaccount.google.com/apppasswords")
    print("   - Generate an app password for 'Mail'")
    print("   - Export GMAIL_APP_PASSWORD='your-app-password'")
    print("   - Run: python3 send_cancellation_emails.py")
    
    print("\nGenerated files are in:", cancellation_dir.absolute())
    print("\nEach recipient has individual cancellation files that will:")
    print("  ✓ Remove events from Google Calendar")
    print("  ✓ Remove events from Outlook")
    print("  ✓ Remove events from Teams")
    print("  ✓ Remove events from Apple Calendar")

if __name__ == '__main__':
    main()