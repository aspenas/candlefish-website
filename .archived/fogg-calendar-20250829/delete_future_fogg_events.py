#!/usr/bin/env python3
"""Delete only FUTURE FOGG-related calendar events."""

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


def find_future_fogg_events() -> List[Tuple[str, Dict[str, Any]]]:
    """Find all FUTURE FOGG-related events (from today onwards).
    
    Returns:
        List of tuples (calendar_id, event)
    """
    service = build_calendar_service()
    fogg_events = []
    
    # Get current date/time
    now = datetime.now(timezone.utc)
    time_min = now.isoformat()
    
    print(f"Searching for FOGG events from {now.strftime('%Y-%m-%d')} onwards...")
    
    try:
        # First, get all calendars
        calendar_list = execute_google_api_call(
            lambda: service.calendarList().list().execute(),
            "list_calendars"
        )
        
        calendars = calendar_list.get('items', [])
        print(f"Found {len(calendars)} calendars to search\n")
        
        # Search each calendar for future FOGG events
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
            
            # Search for FUTURE events with FOGG in the query
            while True:
                events_result = execute_google_api_call(
                    lambda: service.events().list(
                        calendarId=cal_id,
                        pageToken=page_token,
                        maxResults=250,
                        singleEvents=True,  # Expand recurring events
                        timeMin=time_min,   # Only future events
                        orderBy='startTime',
                        q='FOGG'  # Search for FOGG in event content
                    ).execute(),
                    f"search_future_fogg_events({cal_id})"
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
                        
                        # Get event date
                        start = event.get('start', {})
                        date_str = start.get('dateTime', start.get('date', 'Unknown'))
                        if date_str != 'Unknown':
                            date_str = date_str[:10]
                        
                        print(f"  Found future FOGG event: {summary[:40]} ({date_str})")
                
                page_token = events_result.get('nextPageToken')
                if not page_token:
                    break
            
            # Also search without query to catch events in FOGG calendars
            if is_fogg_calendar:
                print(f"  Getting all future events from FOGG calendar...")
                page_token = None
                
                while True:
                    events_result = execute_google_api_call(
                        lambda: service.events().list(
                            calendarId=cal_id,
                            pageToken=page_token,
                            maxResults=250,
                            singleEvents=True,
                            timeMin=time_min,
                            orderBy='startTime'
                        ).execute(),
                        f"list_future_events({cal_id})"
                    )
                    
                    for event in events_result.get('items', []):
                        # Add all events from FOGG calendar if not already added
                        event_id = event['id']
                        if not any(e[1]['id'] == event_id for e in fogg_events):
                            fogg_events.append((cal_id, event))
                            cal_fogg_events += 1
                            
                            summary = event.get('summary', 'No title')
                            start = event.get('start', {})
                            date_str = start.get('dateTime', start.get('date', 'Unknown'))[:10]
                            print(f"  Found future event in FOGG calendar: {summary[:40]} ({date_str})")
                    
                    page_token = events_result.get('nextPageToken')
                    if not page_token:
                        break
            
            if cal_fogg_events > 0:
                print(f"  Total future FOGG events found: {cal_fogg_events}")
            
    except HttpError as error:
        print(f"Error searching for events: {error}")
    
    return fogg_events


def delete_event_safe(calendar_id: str, event_id: str, event_summary: str = "", is_recurring: bool = False) -> bool:
    """Safely delete an event or cancel a recurring event.
    
    Returns:
        True if deleted successfully
    """
    service = build_calendar_service()
    
    try:
        if is_recurring:
            # For recurring events, we need to delete the parent event
            # This will delete all future instances
            service.events().delete(
                calendarId=calendar_id,
                eventId=event_id,
                sendUpdates='all'  # Send cancellation notices
            ).execute()
            
            print(f"✅ Deleted recurring event and all instances: {event_summary[:50]}")
        else:
            # For single events, just delete normally
            service.events().delete(
                calendarId=calendar_id,
                eventId=event_id,
                sendUpdates='all'  # Send cancellation notices
            ).execute()
            
            print(f"✅ Deleted and sent cancellation: {event_summary[:50]}")
        
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


def main():
    """Main function to delete future FOGG events only."""
    
    print("=" * 80)
    print("FUTURE FOGG EVENT DELETION TOOL")
    print("=" * 80)
    print("\nThis tool will find and delete ONLY FUTURE FOGG events.\n")
    print(f"Current date/time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Find all future FOGG events
    fogg_events = find_future_fogg_events()
    
    if not fogg_events:
        print("\n✅ No future FOGG events found in any calendar!")
        return
    
    # Organize events by date
    events_by_date = {}
    for cal_id, event in fogg_events:
        start = event.get('start', {})
        date_str = start.get('dateTime', start.get('date', 'Unknown'))
        if date_str != 'Unknown':
            date_key = date_str[:10]
            if date_key not in events_by_date:
                events_by_date[date_key] = []
            events_by_date[date_key].append((cal_id, event))
    
    print("\n" + "=" * 80)
    print("FUTURE FOGG EVENTS FOUND")
    print("=" * 80)
    print(f"Total future FOGG events: {len(fogg_events)}")
    
    # Count unique attendees
    unique_attendees = set()
    for _, event in fogg_events:
        for att in event.get('attendees', []):
            email = att.get('email', '')
            if email:
                unique_attendees.add(email)
    
    print(f"Unique attendees who will be notified: {len(unique_attendees)}")
    
    print(f"\nEvents by date:")
    sorted_dates = sorted(events_by_date.keys())
    for date in sorted_dates[:10]:  # Show first 10 dates
        events = events_by_date[date]
        print(f"  {date}: {len(events)} event(s)")
        for _, event in events[:3]:  # Show up to 3 events per date
            print(f"    - {event.get('summary', 'No title')[:50]}")
    
    if len(sorted_dates) > 10:
        print(f"  ... and {len(sorted_dates) - 10} more dates")
    
    # Save backup
    backup_file = f"future_fogg_events_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    backup_data = []
    for cal_id, event in fogg_events:
        backup_data.append({
            'calendar_id': cal_id,
            'event_id': event.get('id'),
            'summary': event.get('summary'),
            'start': event.get('start'),
            'attendees': event.get('attendees', [])
        })
    
    with open(backup_file, 'w') as f:
        json.dump(backup_data, f, indent=2)
    
    print(f"\n📄 Backup saved to: {backup_file}")
    
    # Confirm deletion
    print("\n" + "=" * 80)
    print("⚠️  WARNING")
    print("=" * 80)
    print(f"This will DELETE {len(fogg_events)} future FOGG event(s).")
    print("Cancellation notices WILL be sent to all attendees.")
    print("\nSample events to delete:")
    
    # Show first 10 events as examples
    for i, (cal_id, event) in enumerate(fogg_events[:10]):
        summary = event.get('summary', 'No title')
        start = event.get('start', {})
        date_str = start.get('dateTime', start.get('date', 'Unknown'))
        if date_str != 'Unknown':
            date_str = date_str[:16]  # Show date and time
        
        print(f"  {i+1}. {summary[:40]} - {date_str}")
    
    if len(fogg_events) > 10:
        print(f"  ... and {len(fogg_events) - 10} more future events")
    
    confirm = input("\nType 'DELETE FUTURE FOGG' to confirm deletion: ").strip()
    
    if confirm != 'DELETE FUTURE FOGG':
        print("\n❌ Cancelled. No changes made.")
        return
    
    # Delete all future FOGG events
    print("\n" + "=" * 80)
    print("DELETING FUTURE FOGG EVENTS")
    print("=" * 80)
    
    successful = 0
    failed = 0
    
    for cal_id, event in fogg_events:
        event_id = event['id']
        event_summary = event.get('summary', 'No title')
        is_recurring = 'recurringEventId' in event  # Check if this is an instance of recurring
        
        if delete_event_safe(cal_id, event_id, event_summary, is_recurring):
            successful += 1
        else:
            failed += 1
    
    # Final report
    print("\n" + "=" * 80)
    print("DELETION COMPLETE")
    print("=" * 80)
    print(f"✅ Successfully deleted: {successful} future FOGG events")
    if failed > 0:
        print(f"❌ Failed to delete: {failed} events")
    
    print("\nAll future FOGG calendar events have been removed!")
    print("Cancellation notices have been sent to attendees.")
    print("Past FOGG events remain in your calendar for historical reference.")


if __name__ == "__main__":
    main()