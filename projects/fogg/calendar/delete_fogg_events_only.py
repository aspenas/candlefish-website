#!/usr/bin/env python3
"""Delete only FOGG-related calendar events."""

import json
import sys
import os
import importlib.util
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple

from googleapiclient.errors import HttpError

# Import directly from the files
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'src')

# Load auth.py directly
auth_path = os.path.join(src_dir, 'auth.py')
spec = importlib.util.spec_from_file_location("auth", auth_path)
auth_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth_module)

# Import from utils
sys.path.insert(0, current_dir)
from src.utils.api_client import execute_google_api_call

# Get the functions we need
build_calendar_service = auth_module.build_calendar_service


def find_fogg_events() -> List[Tuple[str, Dict[str, Any]]]:
    """Find all FOGG-related events across all calendars.
    
    Returns:
        List of tuples (calendar_id, event)
    """
    service = build_calendar_service()
    fogg_events = []
    
    print("Searching for FOGG events...")
    
    try:
        # First, get all calendars
        calendar_list = execute_google_api_call(
            lambda: service.calendarList().list().execute(),
            "list_calendars"
        )
        
        calendars = calendar_list.get('items', [])
        print(f"Found {len(calendars)} calendars to search\n")
        
        # Search each calendar for FOGG events
        for cal in calendars:
            cal_id = cal['id']
            cal_name = cal.get('summary', 'Unnamed')
            
            # Check if this is a FOGG-specific calendar
            is_fogg_calendar = 'fogg' in cal_name.lower()
            
            print(f"Searching calendar: {cal_name}")
            if is_fogg_calendar:
                print("  ⚠️  This appears to be a FOGG calendar")
            
            page_token = None
            cal_fogg_events = 0
            
            while True:
                # Search for events with FOGG in the query
                events_result = execute_google_api_call(
                    lambda: service.events().list(
                        calendarId=cal_id,
                        pageToken=page_token,
                        maxResults=250,
                        singleEvents=False,
                        showDeleted=False,
                        q='FOGG'  # Search for FOGG in event content
                    ).execute(),
                    f"search_fogg_events({cal_id})"
                )
                
                for event in events_result.get('items', []):
                    # Double-check the event is FOGG-related
                    summary = event.get('summary', '')
                    description = event.get('description', '')
                    organizer = event.get('organizer', {}).get('email', '')
                    
                    # Check various fields for FOGG references
                    is_fogg = (
                        'fogg' in summary.lower() or
                        'fogg' in description.lower() or
                        'fogg-leadership' in organizer.lower() or
                        is_fogg_calendar
                    )
                    
                    if is_fogg:
                        fogg_events.append((cal_id, event))
                        cal_fogg_events += 1
                        print(f"  Found FOGG event: {summary[:50]}")
                
                page_token = events_result.get('nextPageToken')
                if not page_token:
                    break
            
            # Also search without query to catch events in FOGG calendars
            if is_fogg_calendar:
                print(f"  Getting all events from FOGG calendar...")
                page_token = None
                
                while True:
                    events_result = execute_google_api_call(
                        lambda: service.events().list(
                            calendarId=cal_id,
                            pageToken=page_token,
                            maxResults=250,
                            singleEvents=False,
                            showDeleted=False
                        ).execute(),
                        f"list_all_events({cal_id})"
                    )
                    
                    for event in events_result.get('items', []):
                        # Add all events from FOGG calendar if not already added
                        event_id = event['id']
                        if not any(e[1]['id'] == event_id for e in fogg_events):
                            fogg_events.append((cal_id, event))
                            cal_fogg_events += 1
                    
                    page_token = events_result.get('nextPageToken')
                    if not page_token:
                        break
            
            if cal_fogg_events > 0:
                print(f"  Total FOGG events found: {cal_fogg_events}")
            
    except HttpError as error:
        print(f"Error searching for events: {error}")
    
    return fogg_events


def delete_event_safe(calendar_id: str, event_id: str, event_summary: str = "") -> bool:
    """Safely delete an event.
    
    Returns:
        True if deleted successfully
    """
    service = build_calendar_service()
    
    try:
        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id,
            sendUpdates='all'  # Send cancellation notices for FOGG events
        ).execute()
        
        print(f"✅ Deleted and sent cancellations: {event_summary[:50]}")
        return True
        
    except HttpError as error:
        if error.resp.status in [404, 410]:
            print(f"⏭️  Already deleted: {event_summary[:50]}")
            return True
        else:
            print(f"❌ Failed to delete: {event_summary[:50]} - Error: {error.resp.status}")
            return False
    except Exception as e:
        print(f"❌ Error: {event_summary[:50]} - {str(e)}")
        return False


def analyze_fogg_events(events: List[Tuple[str, Dict[str, Any]]]) -> Dict[str, Any]:
    """Analyze FOGG events to show what will be deleted.
    
    Returns:
        Analysis dictionary
    """
    analysis = {
        'total_events': len(events),
        'recurring_events': 0,
        'single_events': 0,
        'events_with_attendees': 0,
        'total_attendees': 0,
        'unique_attendees': set(),
        'date_range': {'earliest': None, 'latest': None},
        'events_by_type': {}
    }
    
    for cal_id, event in events:
        # Check if recurring
        if 'recurrence' in event:
            analysis['recurring_events'] += 1
        else:
            analysis['single_events'] += 1
        
        # Count attendees
        attendees = event.get('attendees', [])
        if attendees:
            analysis['events_with_attendees'] += 1
            analysis['total_attendees'] += len(attendees)
            for att in attendees:
                email = att.get('email', '')
                if email:
                    analysis['unique_attendees'].add(email)
        
        # Get event dates
        start = event.get('start', {})
        if 'dateTime' in start:
            event_date = start['dateTime']
        elif 'date' in start:
            event_date = start['date']
        else:
            event_date = None
        
        if event_date:
            if not analysis['date_range']['earliest'] or event_date < analysis['date_range']['earliest']:
                analysis['date_range']['earliest'] = event_date
            if not analysis['date_range']['latest'] or event_date > analysis['date_range']['latest']:
                analysis['date_range']['latest'] = event_date
        
        # Categorize event
        summary = event.get('summary', 'No title').lower()
        if 'monthly' in summary or 'sync' in summary:
            event_type = 'Monthly Sync'
        elif 'meeting' in summary or 'mtg' in summary:
            event_type = 'Meeting'
        elif 'retreat' in summary:
            event_type = 'Retreat'
        else:
            event_type = 'Other'
        
        analysis['events_by_type'][event_type] = analysis['events_by_type'].get(event_type, 0) + 1
    
    # Convert set to count
    analysis['unique_attendees_count'] = len(analysis['unique_attendees'])
    analysis['unique_attendees'] = list(analysis['unique_attendees'])[:10]  # Show first 10
    
    return analysis


def main():
    """Main function to delete FOGG events only."""
    
    print("=" * 80)
    print("FOGG EVENT DELETION TOOL")
    print("=" * 80)
    print("\nThis tool will find and delete ONLY FOGG-related calendar events.\n")
    
    # Find all FOGG events
    fogg_events = find_fogg_events()
    
    if not fogg_events:
        print("\n✅ No FOGG events found in any calendar!")
        return
    
    # Analyze what we found
    analysis = analyze_fogg_events(fogg_events)
    
    print("\n" + "=" * 80)
    print("FOGG EVENTS FOUND")
    print("=" * 80)
    print(f"Total FOGG events: {analysis['total_events']}")
    print(f"  - Recurring events: {analysis['recurring_events']}")
    print(f"  - Single events: {analysis['single_events']}")
    print(f"  - Events with attendees: {analysis['events_with_attendees']}")
    print(f"  - Total attendee invites: {analysis['total_attendees']}")
    print(f"  - Unique attendees: {analysis['unique_attendees_count']}")
    
    if analysis['date_range']['earliest']:
        print(f"\nDate range: {analysis['date_range']['earliest'][:10]} to {analysis['date_range']['latest'][:10]}")
    
    print(f"\nEvent types:")
    for event_type, count in analysis['events_by_type'].items():
        print(f"  - {event_type}: {count}")
    
    if analysis['unique_attendees']:
        print(f"\nSample attendees:")
        for email in analysis['unique_attendees'][:5]:
            print(f"  - {email}")
    
    # Save backup
    backup_file = f"fogg_events_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    backup_data = []
    for cal_id, event in fogg_events:
        backup_data.append({
            'calendar_id': cal_id,
            'event_id': event.get('id'),
            'summary': event.get('summary'),
            'start': event.get('start'),
            'recurrence': event.get('recurrence'),
            'attendees': event.get('attendees', []),
            'full_event': event
        })
    
    with open(backup_file, 'w') as f:
        json.dump(backup_data, f, indent=2)
    
    print(f"\n📄 Backup saved to: {backup_file}")
    
    # Confirm deletion
    print("\n" + "=" * 80)
    print("⚠️  WARNING")
    print("=" * 80)
    print("This will DELETE all FOGG events found above.")
    print("Cancellation notices WILL be sent to all attendees.")
    print("\nEvents to delete:")
    
    # Show first 10 events as examples
    for i, (cal_id, event) in enumerate(fogg_events[:10]):
        summary = event.get('summary', 'No title')
        start = event.get('start', {})
        date_str = start.get('dateTime', start.get('date', 'No date'))[:10] if start else 'No date'
        recurring = '🔄' if 'recurrence' in event else '📅'
        print(f"  {i+1}. {recurring} {summary[:40]} ({date_str})")
    
    if len(fogg_events) > 10:
        print(f"  ... and {len(fogg_events) - 10} more events")
    
    confirm = input("\nType 'DELETE FOGG EVENTS' to confirm deletion: ").strip()
    
    if confirm != 'DELETE FOGG EVENTS':
        print("\n❌ Cancelled. No changes made.")
        return
    
    # Delete all FOGG events
    print("\n" + "=" * 80)
    print("DELETING FOGG EVENTS")
    print("=" * 80)
    
    successful = 0
    failed = 0
    
    for cal_id, event in fogg_events:
        event_id = event['id']
        event_summary = event.get('summary', 'No title')
        
        if delete_event_safe(cal_id, event_id, event_summary):
            successful += 1
        else:
            failed += 1
    
    # Final report
    print("\n" + "=" * 80)
    print("DELETION COMPLETE")
    print("=" * 80)
    print(f"✅ Successfully deleted: {successful} FOGG events")
    if failed > 0:
        print(f"❌ Failed to delete: {failed} events")
    
    print("\nAll FOGG calendar events have been processed!")
    print("Cancellation notices have been sent to attendees.")


if __name__ == "__main__":
    main()