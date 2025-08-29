#!/usr/bin/env python3

import subprocess
from pathlib import Path

def create_zoom_invite_draft():
    """Create a draft email for Zoom invitation in Mail app"""
    
    # Check if calendar file exists
    calendar_file = Path('/Users/patricksmith/candlefish-ai/calendar/Candlefish-Meeting.ics')
    
    # Prepare attachment script if file exists
    attachment_script = ""
    if calendar_file.exists():
        attachment_script = f'''
        make new attachment with properties {{file name:POSIX file "{calendar_file.absolute()}"}} at after the last paragraph
        '''
    
    # Create AppleScript to create draft (not send)
    applescript = f'''
    tell application "Mail"
        -- Create new draft message
        set newMessage to make new outgoing message with properties {{subject:"Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)", content:"Hi Erusin, Katie, and Jon —

Looking forward to our conversation. Here are the details:

Time: Friday, August 29, 3:00 PM–4:00 PM MDT
Join Zoom: https://us06web.zoom.us/j/89371686095?pwd=GnmgZnD6dsujCdEjDQjyI4IaVeVgc7.1
Meeting ID: 893 7168 6095
Passcode: 958465

I've also scheduled Read.ai Copilot to join — it produces a shared set of notes and highlights we'll all receive after the call.

Best,
Patrick", visible:true}}
        
        tell newMessage
            -- Add recipients
            make new to recipient at end of to recipients with properties {{address:"erusin@retti.com"}}
            make new to recipient at end of to recipients with properties {{address:"katie@retti.com"}}
            make new to recipient at end of to recipients with properties {{address:"jon@jdenver.com"}}
            
            -- Set sender to patrick@candlefish.ai
            set sender to "Patrick Smith <patrick@candlefish.ai>"
            {attachment_script}
        end tell
        
        -- Activate Mail and show the draft
        activate
    end tell
    '''
    
    print("Creating draft email in Mail app...")
    print("From: patrick@candlefish.ai")
    print("To: erusin@retti.com, katie@retti.com, jon@jdenver.com")
    print("Subject: Candlefish × Retti — Zoom details for Friday (3–4 PM MDT)")
    if calendar_file.exists():
        print(f"Attachment: {calendar_file.name}")
    print("\nOpening Mail app with draft...")
    
    try:
        result = subprocess.run(
            ['osascript', '-e', applescript],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("\n✓ Draft created successfully in Mail app")
            print("✓ Please review and click Send when ready")
            return True
        else:
            print(f"\n✗ Failed to create draft")
            if result.stderr:
                print(f"Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("\n✗ Timeout creating draft")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

if __name__ == '__main__':
    create_zoom_invite_draft()