#!/usr/bin/env python3
"""Script to list and optionally remove ALL calendar invites ever sent."""

import json
import sys
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from googleapiclient.errors import HttpError

# Import directly from the files to avoid package confusion
import sys
import os
import importlib.util

# Get the directory paths
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
build_directory_service = auth_module.build_directory_service


def get_all_calendars() -> List[Dict[str, Any]]:
    """Get all calendars accessible to the service account.
    
    Returns:
        List of calendar dictionaries
    """
    service = build_calendar_service()
    calendars = []
    
    try:
        page_token = None
        while True:
            calendar_list = execute_google_api_call(
                lambda: service.calendarList().list(pageToken=page_token).execute(),
                "list_calendars"
            )
            
            calendars.extend(calendar_list.get('items', []))
            
            page_token = calendar_list.get('nextPageToken')
            if not page_token:
                break
                
    except HttpError as error:
        print(f"Error listing calendars: {error}")
        
    return calendars


def get_all_events_for_calendar(calendar_id: str) -> List[Dict[str, Any]]:
    """Get ALL events from a calendar (including past events).
    
    Args:
        calendar_id: Calendar ID to fetch events from
        
    Returns:
        List of all events
    """
    service = build_calendar_service()
    events = []
    
    try:
        page_token = None
        
        # Get events from the beginning of time
        # Google Calendar API limits how far back you can query (around 2000)
        while True:
            events_result = execute_google_api_call(
                lambda: service.events().list(
                    calendarId=calendar_id,
                    pageToken=page_token,
                    maxResults=250,  # Maximum allowed
                    singleEvents=False,  # Include recurring events as single entries
                    showDeleted=True,    # Include deleted events
                    showHiddenInvitations=True
                ).execute(),
                f"list_events({calendar_id})"
            )
            
            events.extend(events_result.get('items', []))
            
            page_token = events_result.get('nextPageToken')
            if not page_token:
                break
                
    except HttpError as error:
        print(f"Error listing events for calendar {calendar_id}: {error}")
        
    return events


def analyze_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze an event and extract key information.
    
    Args:
        event: Event dictionary from Google Calendar API
        
    Returns:
        Dictionary with analyzed event information
    """
    analysis = {
        'id': event.get('id'),
        'summary': event.get('summary', 'No title'),
        'status': event.get('status'),
        'created': event.get('created'),
        'updated': event.get('updated'),
        'creator': event.get('creator', {}).get('email'),
        'organizer': event.get('organizer', {}).get('email'),
        'start': None,
        'end': None,
        'recurring': 'recurrence' in event,
        'recurrence_rule': event.get('recurrence'),
        'attendees': [],
        'attendee_count': 0,
        'has_invites': False,
        'description': event.get('description', '')[:100]  # First 100 chars
    }
    
    # Parse start/end times
    if 'start' in event:
        if 'dateTime' in event['start']:
            analysis['start'] = event['start']['dateTime']
        elif 'date' in event['start']:
            analysis['start'] = event['start']['date']
            
    if 'end' in event:
        if 'dateTime' in event['end']:
            analysis['end'] = event['end']['dateTime']
        elif 'date' in event['end']:
            analysis['end'] = event['end']['date']
    
    # Analyze attendees
    if 'attendees' in event:
        attendees = event['attendees']
        analysis['attendees'] = [
            {
                'email': att.get('email'),
                'response': att.get('responseStatus', 'unknown'),
                'optional': att.get('optional', False)
            }
            for att in attendees
        ]
        analysis['attendee_count'] = len(attendees)
        analysis['has_invites'] = len(attendees) > 0
        
    return analysis


def delete_event(calendar_id: str, event_id: str, send_updates: bool = False) -> bool:
    """Delete a single event.
    
    Args:
        calendar_id: Calendar ID
        event_id: Event ID to delete
        send_updates: Whether to send cancellation notices to attendees
        
    Returns:
        True if successful
    """
    service = build_calendar_service()
    
    try:
        execute_google_api_call(
            lambda: service.events().delete(
                calendarId=calendar_id,
                eventId=event_id,
                sendUpdates='all' if send_updates else 'none'
            ).execute(),
            f"delete_event({calendar_id}, {event_id})"
        )
        return True
    except Exception as e:
        # Handle both HttpError wrapped in RetryError and direct HttpError
        error_msg = str(e)
        if "410" in error_msg or "404" in error_msg or "deleted" in error_msg.lower() or "not found" in error_msg.lower():
            print(f"Event {event_id} already deleted or not found")
            return True
        print(f"Error deleting event {event_id}: {e}")
        return False


def delete_calendar(calendar_id: str) -> bool:
    """Delete an entire calendar.
    
    Args:
        calendar_id: Calendar ID to delete
        
    Returns:
        True if successful
    """
    service = build_calendar_service()
    
    try:
        execute_google_api_call(
            lambda: service.calendars().delete(calendarId=calendar_id).execute(),
            f"delete_calendar({calendar_id})"
        )
        return True
    except HttpError as error:
        print(f"Error deleting calendar {calendar_id}: {error}")
        return False


def main():
    """Main function to list and optionally remove all calendar invites."""
    
    print("=" * 80)
    print("CALENDAR INVITE ANALYZER AND REMOVER")
    print("=" * 80)
    print("\nThis script will help you identify and optionally remove calendar invites.\n")
    
    # Get all calendars
    print("Fetching all calendars...")
    calendars = get_all_calendars()
    
    if not calendars:
        print("No calendars found!")
        return
        
    print(f"\nFound {len(calendars)} calendar(s):\n")
    
    all_events = []
    calendar_events = {}
    
    # Analyze each calendar
    for cal in calendars:
        cal_id = cal['id']
        cal_name = cal.get('summary', 'Unnamed')
        cal_primary = cal.get('primary', False)
        
        print(f"\nCalendar: {cal_name}")
        print(f"  ID: {cal_id}")
        print(f"  Primary: {cal_primary}")
        print(f"  Access Role: {cal.get('accessRole', 'unknown')}")
        
        # Get all events for this calendar
        events = get_all_events_for_calendar(cal_id)
        calendar_events[cal_id] = events
        
        if events:
            print(f"  Total Events: {len(events)}")
            
            # Analyze events
            events_with_invites = 0
            total_invites_sent = 0
            recurring_events = 0
            
            analyzed_events = []
            for event in events:
                analysis = analyze_event(event)
                analyzed_events.append(analysis)
                
                if analysis['has_invites']:
                    events_with_invites += 1
                    total_invites_sent += analysis['attendee_count']
                    
                if analysis['recurring']:
                    recurring_events += 1
            
            print(f"  Events with invites: {events_with_invites}")
            print(f"  Total invites sent: {total_invites_sent}")
            print(f"  Recurring events: {recurring_events}")
            
            all_events.extend(analyzed_events)
            
            # Show sample of events with invites
            invite_events = [e for e in analyzed_events if e['has_invites']]
            if invite_events:
                print(f"\n  Sample events with invites (showing first 5):")
                for evt in invite_events[:5]:
                    print(f"    - {evt['summary']} ({evt['start']}) - {evt['attendee_count']} attendee(s)")
                    for att in evt['attendees'][:3]:  # Show first 3 attendees
                        print(f"      * {att['email']} ({att['response']})")
        else:
            print("  No events found")
    
    # Save detailed report
    report = {
        'scan_time': datetime.now(timezone.utc).isoformat(),
        'calendars_found': len(calendars),
        'total_events': len(all_events),
        'events_with_invites': sum(1 for e in all_events if e['has_invites']),
        'total_invites_sent': sum(e['attendee_count'] for e in all_events),
        'calendars': [
            {
                'id': cal['id'],
                'name': cal.get('summary', 'Unnamed'),
                'primary': cal.get('primary', False),
                'event_count': len(calendar_events.get(cal['id'], []))
            }
            for cal in calendars
        ],
        'events': all_events
    }
    
    report_file = f"calendar_invite_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n\nDetailed report saved to: {report_file}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total calendars: {report['calendars_found']}")
    print(f"Total events: {report['total_events']}")
    print(f"Events with invites: {report['events_with_invites']}")
    print(f"Total invites sent: {report['total_invites_sent']}")
    
    # Ask user what to do
    print("\n" + "=" * 80)
    print("OPTIONS")
    print("=" * 80)
    print("\nWhat would you like to do?")
    print("1. Exit without making changes (recommended - review report first)")
    print("2. Delete all events with invites (keeps calendars)")
    print("3. Delete all events in specific calendar")
    print("4. Delete entire calendar(s)")
    print("5. Delete ALL events in ALL calendars (DANGEROUS)")
    print("6. Custom deletion (interactive)")
    
    choice = input("\nEnter your choice (1-6): ").strip()
    
    if choice == '1':
        print("\nNo changes made. Review the report file for details.")
        return
        
    elif choice == '2':
        print("\n⚠️  WARNING: This will delete all events that have attendees/invites.")
        confirm = input("Are you SURE? Type 'DELETE ALL INVITES' to confirm: ").strip()
        
        if confirm == 'DELETE ALL INVITES':
            deleted_count = 0
            for cal_id, events in calendar_events.items():
                for event in events:
                    if 'attendees' in event and len(event['attendees']) > 0:
                        if delete_event(cal_id, event['id']):
                            deleted_count += 1
                            print(f"Deleted: {event.get('summary', 'No title')} ({event['id']})")
            
            print(f"\n✅ Deleted {deleted_count} events with invites")
        else:
            print("Cancelled.")
            
    elif choice == '3':
        print("\nAvailable calendars:")
        for i, cal in enumerate(calendars):
            print(f"{i+1}. {cal.get('summary', 'Unnamed')} ({cal['id']})")
            
        cal_num = input("\nEnter calendar number: ").strip()
        try:
            cal_idx = int(cal_num) - 1
            if 0 <= cal_idx < len(calendars):
                cal_id = calendars[cal_idx]['id']
                cal_name = calendars[cal_idx].get('summary', 'Unnamed')
                
                confirm = input(f"Delete all events in '{cal_name}'? (yes/no): ").strip().lower()
                if confirm == 'yes':
                    events = calendar_events.get(cal_id, [])
                    deleted_count = 0
                    for event in events:
                        if delete_event(cal_id, event['id']):
                            deleted_count += 1
                    print(f"\n✅ Deleted {deleted_count} events from {cal_name}")
                else:
                    print("Cancelled.")
            else:
                print("Invalid selection.")
        except ValueError:
            print("Invalid input.")
            
    elif choice == '4':
        print("\n⚠️  WARNING: This will delete entire calendar(s) and ALL their events.")
        print("\nAvailable calendars:")
        for i, cal in enumerate(calendars):
            print(f"{i+1}. {cal.get('summary', 'Unnamed')} ({cal['id']})")
            
        cal_nums = input("\nEnter calendar number(s) separated by commas: ").strip()
        
        try:
            indices = [int(x.strip()) - 1 for x in cal_nums.split(',')]
            cals_to_delete = [calendars[i] for i in indices if 0 <= i < len(calendars)]
            
            if cals_to_delete:
                print("\nCalendars to delete:")
                for cal in cals_to_delete:
                    print(f"  - {cal.get('summary', 'Unnamed')}")
                    
                confirm = input("\nType 'DELETE CALENDARS' to confirm: ").strip()
                if confirm == 'DELETE CALENDARS':
                    for cal in cals_to_delete:
                        if cal.get('primary', False):
                            print(f"⚠️  Skipping primary calendar: {cal.get('summary')}")
                            continue
                        
                        if delete_calendar(cal['id']):
                            print(f"✅ Deleted calendar: {cal.get('summary', 'Unnamed')}")
                        else:
                            print(f"❌ Failed to delete: {cal.get('summary', 'Unnamed')}")
                else:
                    print("Cancelled.")
            else:
                print("No valid calendars selected.")
        except ValueError:
            print("Invalid input.")
            
    elif choice == '5':
        print("\n🚨 DANGER: This will delete ALL events in ALL calendars!")
        confirm = input("Type 'DELETE EVERYTHING' to confirm: ").strip()
        
        if confirm == 'DELETE EVERYTHING':
            total_deleted = 0
            for cal_id, events in calendar_events.items():
                for event in events:
                    if delete_event(cal_id, event['id']):
                        total_deleted += 1
                        
            print(f"\n✅ Deleted {total_deleted} total events")
        else:
            print("Cancelled.")
            
    elif choice == '6':
        print("\nCustom deletion - you can review each event")
        
        events_to_review = []
        for cal_id, events in calendar_events.items():
            for event in events:
                if 'attendees' in event and len(event['attendees']) > 0:
                    events_to_review.append((cal_id, event))
                    
        print(f"\nFound {len(events_to_review)} events with invites to review")
        
        deleted_count = 0
        skipped_count = 0
        
        for cal_id, event in events_to_review:
            print(f"\n" + "-" * 40)
            print(f"Event: {event.get('summary', 'No title')}")
            print(f"Start: {event.get('start', {}).get('dateTime', 'Unknown')}")
            print(f"Attendees: {len(event.get('attendees', []))}")
            for att in event.get('attendees', [])[:5]:
                print(f"  - {att.get('email')} ({att.get('responseStatus', 'unknown')})")
                
            action = input("\nDelete this event? (y/n/quit): ").strip().lower()
            
            if action == 'y':
                if delete_event(cal_id, event['id']):
                    deleted_count += 1
                    print("✅ Deleted")
            elif action == 'quit':
                break
            else:
                skipped_count += 1
                print("⏭️  Skipped")
                
        print(f"\n\nDeleted: {deleted_count}, Skipped: {skipped_count}")
        
    else:
        print("Invalid choice. No changes made.")
    
    print("\n" + "=" * 80)
    print("COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()