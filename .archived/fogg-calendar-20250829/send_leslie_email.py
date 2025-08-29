#!/usr/bin/env python3

import subprocess
from pathlib import Path
import time

def send_email_to_leslie():
    """Send cancellation email to leslie@spiralmethod.com"""
    
    cancellation_dir = Path('ical_cancellations_20250826_111022')
    leslie_files = sorted(cancellation_dir.glob('leslie_at_spiralmethod_com_*.ics'))
    
    if not leslie_files:
        print("No cancellation files found for leslie@spiralmethod.com")
        return False
    
    print(f"Found {len(leslie_files)} cancellation files for Leslie")
    
    # Build attachment list for AppleScript
    attachment_script = ""
    for attachment in leslie_files:
        # Escape the file path for AppleScript
        file_path = str(attachment.absolute()).replace('"', '\\"')
        attachment_script += f'''
        make new attachment with properties {{file name:POSIX file "{file_path}"}} at after the last paragraph
        '''
    
    # Create AppleScript to send email
    applescript = f'''
    tell application "Mail"
        set newMessage to make new outgoing message with properties {{subject:"FOGG Event Cancellations", content:"Dear Leslie,\\n\\nThis email contains automatic cancellations for FOGG events that have been removed from our calendar system.\\n\\nThe attached calendar files (.ics) will automatically remove these events from your calendar when opened. This works with:\\n• Google Calendar\\n• Microsoft Outlook\\n• Microsoft Teams\\n• Apple Calendar\\n\\nSimply open each attached file to process the cancellations.\\n\\nIf the events don't automatically remove:\\n1. Download the attached .ics files\\n2. Double-click each file to open it\\n3. Your calendar application should prompt you to remove the event\\n\\nThank you for your understanding.\\n\\nBest regards,\\nFOGG Calendar System", visible:false}}
        
        tell newMessage
            make new to recipient at end of to recipients with properties {{address:"leslie@spiralmethod.com"}}
            {attachment_script}
        end tell
        
        delay 2
        send newMessage
    end tell
    '''
    
    print("Sending email to leslie@spiralmethod.com...")
    
    try:
        result = subprocess.run(
            ['osascript', '-e', applescript],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print(f"✓ Successfully sent {len(leslie_files)} cancellations to leslie@spiralmethod.com")
            return True
        else:
            print(f"✗ Failed to send to leslie@spiralmethod.com")
            print(f"Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("✗ Timeout sending email")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == '__main__':
    send_email_to_leslie()