#!/usr/bin/env python3

import os
import subprocess
from pathlib import Path
from typing import Dict, List
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

def send_email_with_attachments(recipient: str, attachments: List[Path]):
    """Send email using macOS Mail app via AppleScript"""
    
    # Build attachment list for AppleScript
    attachment_script = ""
    for attachment in attachments:
        attachment_script += f'''
        make new attachment with properties {{file name:POSIX file "{attachment.absolute()}"}} at after the last paragraph
        '''
    
    # Create AppleScript to send email
    applescript = f'''
    tell application "Mail"
        set newMessage to make new outgoing message with properties {{subject:"FOGG Event Cancellations", content:"Dear FOGG Member,\\n\\nThis email contains automatic cancellations for FOGG events that have been removed from our calendar system.\\n\\nThe attached calendar files (.ics) will automatically remove these events from your calendar when opened. This works with:\\n• Google Calendar\\n• Microsoft Outlook\\n• Microsoft Teams\\n• Apple Calendar\\n\\nSimply open each attached file to process the cancellations.\\n\\nIf the events don't automatically remove:\\n1. Download the attached .ics files\\n2. Double-click each file to open it\\n3. Your calendar application should prompt you to remove the event\\n\\nThank you for your understanding.\\n\\nBest regards,\\nFOGG Calendar System", visible:true}}
        
        tell newMessage
            make new to recipient at end of to recipients with properties {{address:"{recipient}"}}
            {attachment_script}
        end tell
        
        send newMessage
    end tell
    '''
    
    try:
        result = subprocess.run(
            ['osascript', '-e', applescript],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✓ Sent {len(attachments)} cancellations to {recipient}")
            return True
        else:
            print(f"✗ Failed to send to {recipient}: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"✗ Timeout sending to {recipient}")
        return False
    except Exception as e:
        print(f"✗ Error sending to {recipient}: {e}")
        return False

def main():
    cancellation_dir = Path('ical_cancellations_20250826_111022')
    if not cancellation_dir.exists():
        print(f"Error: Directory {cancellation_dir} not found")
        return
    
    ics_files = list(cancellation_dir.glob('*.ics'))
    if not ics_files:
        print(f"No .ics files found in {cancellation_dir}")
        return
    
    print(f"Found {len(ics_files)} cancellation files")
    
    # Group files by recipient email
    email_to_files: Dict[str, List[Path]] = {}
    for ics_file in ics_files:
        email = extract_email_from_filename(ics_file.name)
        if email:
            if email not in email_to_files:
                email_to_files[email] = []
            email_to_files[email].append(ics_file)
    
    unique_emails = sorted(email_to_files.keys())
    print(f"\nWill send cancellations to {len(unique_emails)} unique email addresses")
    
    print("\n" + "="*60)
    print("SENDING CANCELLATION EMAILS VIA MAIL APP")
    print("="*60)
    
    print("\nThis will use your default Mail app account to send emails.")
    print("Each email will contain all cancellation files for that recipient.")
    
    print("\nStarting email send process...")
    
    total_sent = 0
    total_failed = 0
    
    for email, files in email_to_files.items():
        if send_email_with_attachments(email, files):
            total_sent += 1
        else:
            total_failed += 1
        
        # Small delay between sends to avoid overwhelming Mail app
        time.sleep(2)
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Successfully sent: {total_sent}")
    print(f"  Failed: {total_failed}")
    print(f"  Total recipients: {len(unique_emails)}")
    
    if total_failed > 0:
        print("\nNote: Failed sends may need to be sent manually.")
        print("Check your Mail app's Outbox and Sent folders.")

if __name__ == '__main__':
    main()