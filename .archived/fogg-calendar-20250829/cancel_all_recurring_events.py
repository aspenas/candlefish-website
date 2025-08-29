#!/usr/bin/env python3
"""Script to safely cancel all recurring calendar events and their instances."""

import json
import sys
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Set

from googleapiclient.errors import HttpError
from src.auth import build_calendar_service
from src.utils.api_client import execute_google_api_call


def get_all_recurring_events(calendar_id: str) -> List[Dict[str, Any]]:
    """Get all recurring events (parent events only) from a calendar.
    
    Args:
        calendar_id: Calendar ID to fetch events from
        
    Returns:
        List of recurring parent events
    """
    service = build_calendar_service()
    recurring_events = []
    
    try:
        page_token = None
        
        while True:
            # Fetch all events
            events_result = execute_google_api_call(
                lambda: service.events().list(
                    calendarId=calendar_id,
                    pageToken=page_token,
                    maxResults=250,
                    singleEvents=False,  # Important: Get recurring events as single entries
                    showDeleted=False
                ).execute(),
                f"list_recurring_events({calendar_id})"
            )
            
            # Filter for recurring events only
            for event in events_result.get('items', []):
                if 'recurrence' in event:
                    recurring_events.append(event)
            
            page_token = events_result.get('nextPageToken')
            if not page_token:
                break
                
    except HttpError as error:
        print(f"Error listing recurring events: {error}")
        
    return recurring_events


def get_event_instances(calendar_id: str, recurring_event_id: str) -> List[Dict[str, Any]]:
    """Get all instances of a recurring event.
    
    Args:
        calendar_id: Calendar ID
        recurring_event_id: ID of the recurring event
        
    Returns:
        List of event instances
    """
    service = build_calendar_service()
    instances = []
    
    try:
        page_token = None
        
        while True:
            instances_result = execute_google_api_call(
                lambda: service.events().instances(
                    calendarId=calendar_id,
                    eventId=recurring_event_id,
                    pageToken=page_token,
                    maxResults=250
                ).execute(),
                f"get_instances({recurring_event_id})"
            )
            
            instances.extend(instances_result.get('items', []))
            
            page_token = instances_result.get('nextPageToken')
            if not page_token:
                break
                
    except HttpError as error:
        print(f"Error getting instances: {error}")
        
    return instances


def cancel_event(calendar_id: str, event_id: str, is_recurring_parent: bool = False) -> bool:
    """Cancel an event by setting its status to 'cancelled'.
    
    Args:
        calendar_id: Calendar ID
        event_id: Event ID to cancel
        is_recurring_parent: Whether this is a recurring parent event
        
    Returns:
        True if successful
    """
    service = build_calendar_service()
    
    try:
        # Get the event first
        event = execute_google_api_call(
            lambda: service.events().get(calendarId=calendar_id, eventId=event_id).execute(),
            f"get_event({event_id})"
        )
        
        # Set status to cancelled
        event['status'] = 'cancelled'
        
        # Update the event with cancellation
        execute_google_api_call(
            lambda: service.events().update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event,
                sendUpdates='all'  # Send cancellation notices to all attendees
            ).execute(),
            f"cancel_event({event_id})"
        )
        
        return True
        
    except HttpError as error:
        if error.resp.status == 404:
            print(f"Event {event_id} not found")
            return False
        print(f"Error cancelling event {event_id}: {error}")
        return False


def delete_recurring_event_completely(calendar_id: str, event_id: str) -> bool:
    """Completely delete a recurring event and all its instances.
    
    Args:
        calendar_id: Calendar ID
        event_id: Recurring event ID to delete
        
    Returns:
        True if successful
    """
    service = build_calendar_service()
    
    try:
        # Delete the recurring event (this deletes all instances too)
        execute_google_api_call(
            lambda: service.events().delete(
                calendarId=calendar_id,
                eventId=event_id,
                sendUpdates='all'  # Send cancellation to all attendees
            ).execute(),
            f"delete_recurring_event({event_id})"
        )
        
        print(f"✅ Deleted recurring event and all instances: {event_id}")
        return True
        
    except HttpError as error:
        if error.resp.status == 404:
            print(f"Event {event_id} not found (may be already deleted)")
            return True
        print(f"Error deleting recurring event {event_id}: {error}")
        return False


def analyze_recurring_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze a recurring event and extract key information.
    
    Args:
        event: Event dictionary from Google Calendar API
        
    Returns:
        Dictionary with analyzed event information
    """
    return {
        'id': event.get('id'),
        'summary': event.get('summary', 'No title'),
        'description': (event.get('description', ''))[:200],
        'created': event.get('created'),
        'creator': event.get('creator', {}).get('email'),
        'organizer': event.get('organizer', {}).get('email'),
        'recurrence_rule': event.get('recurrence', []),
        'attendees': [
            att.get('email') for att in event.get('attendees', [])
        ],
        'attendee_count': len(event.get('attendees', [])),
        'status': event.get('status'),
        'start': event.get('start', {}),
        'end': event.get('end', {})
    }


def main():
    """Main function to cancel all recurring events."""
    
    print("=" * 80)
    print("RECURRING EVENT CANCELLATION TOOL")
    print("=" * 80)
    print("\nThis tool will help you cancel all recurring calendar events.\n")
    
    # Get calendar service
    service = build_calendar_service()
    
    # Get all calendars
    print("Fetching calendars...")
    try:
        calendar_list = execute_google_api_call(
            lambda: service.calendarList().list().execute(),
            "list_calendars"
        )
        calendars = calendar_list.get('items', [])
    except HttpError as error:
        print(f"Error accessing calendars: {error}")
        return
    
    if not calendars:
        print("No calendars found!")
        return
    
    print(f"\nFound {len(calendars)} calendar(s):\n")
    
    all_recurring_events = []
    calendar_recurring_events = {}
    
    # Analyze each calendar
    for cal in calendars:
        cal_id = cal['id']
        cal_name = cal.get('summary', 'Unnamed')
        cal_primary = cal.get('primary', False)
        
        print(f"\n📅 Calendar: {cal_name}")
        print(f"   ID: {cal_id}")
        print(f"   Primary: {cal_primary}")
        
        # Get recurring events for this calendar
        recurring_events = get_all_recurring_events(cal_id)
        
        if recurring_events:
            calendar_recurring_events[cal_id] = recurring_events
            print(f"   Found {len(recurring_events)} recurring event(s):")
            
            for event in recurring_events:
                analysis = analyze_recurring_event(event)
                all_recurring_events.append({
                    'calendar_id': cal_id,
                    'calendar_name': cal_name,
                    **analysis
                })
                
                print(f"\n   📌 {analysis['summary']}")
                print(f"      ID: {analysis['id']}")
                print(f"      Organizer: {analysis['organizer']}")
                print(f"      Attendees: {analysis['attendee_count']}")
                print(f"      Recurrence: {analysis['recurrence_rule'][0] if analysis['recurrence_rule'] else 'None'}")
                
                # Get instance count
                instances = get_event_instances(cal_id, event['id'])
                future_instances = [
                    i for i in instances 
                    if i.get('start', {}).get('dateTime', '') > datetime.now(timezone.utc).isoformat()
                ]
                print(f"      Future instances: {len(future_instances)}")
                
                if analysis['attendees']:
                    print(f"      Sample attendees: {', '.join(analysis['attendees'][:3])}")
        else:
            print("   No recurring events found")
    
    if not all_recurring_events:
        print("\n✅ No recurring events found in any calendar!")
        return
    
    # Save report
    report = {
        'scan_time': datetime.now(timezone.utc).isoformat(),
        'total_recurring_events': len(all_recurring_events),
        'calendars_checked': len(calendars),
        'recurring_events': all_recurring_events
    }
    
    report_file = f"recurring_events_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: {report_file}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total recurring events found: {len(all_recurring_events)}")
    print(f"Total attendees affected: {sum(e['attendee_count'] for e in all_recurring_events)}")
    
    # Options
    print("\n" + "=" * 80)
    print("CANCELLATION OPTIONS")
    print("=" * 80)
    print("\n⚠️  WARNING: Cancellation will notify all attendees")
    print("\nWhat would you like to do?")
    print("1. Exit without making changes (review report first)")
    print("2. Cancel ALL recurring events (sends cancellation notices)")
    print("3. Delete ALL recurring events (immediate removal)")
    print("4. Cancel specific events (interactive)")
    print("5. Cancel events in specific calendar only")
    
    choice = input("\nEnter your choice (1-5): ").strip()
    
    if choice == '1':
        print("\n✅ No changes made. Review the report file for details.")
        return
        
    elif choice == '2':
        print("\n⚠️  This will CANCEL all recurring events and notify all attendees!")
        print("Attendees will receive cancellation emails.")
        confirm = input("\nType 'CANCEL ALL RECURRING' to confirm: ").strip()
        
        if confirm == 'CANCEL ALL RECURRING':
            cancelled_count = 0
            failed_count = 0
            
            for cal_id, events in calendar_recurring_events.items():
                for event in events:
                    print(f"Cancelling: {event.get('summary', 'No title')}...")
                    if cancel_event(cal_id, event['id'], is_recurring_parent=True):
                        cancelled_count += 1
                    else:
                        failed_count += 1
            
            print(f"\n✅ Successfully cancelled {cancelled_count} recurring event(s)")
            if failed_count > 0:
                print(f"❌ Failed to cancel {failed_count} event(s)")
        else:
            print("❌ Cancelled - no changes made.")
            
    elif choice == '3':
        print("\n⚠️  This will DELETE all recurring events immediately!")
        print("This action cannot be undone.")
        confirm = input("\nType 'DELETE ALL RECURRING' to confirm: ").strip()
        
        if confirm == 'DELETE ALL RECURRING':
            deleted_count = 0
            failed_count = 0
            
            for cal_id, events in calendar_recurring_events.items():
                for event in events:
                    print(f"Deleting: {event.get('summary', 'No title')}...")
                    if delete_recurring_event_completely(cal_id, event['id']):
                        deleted_count += 1
                    else:
                        failed_count += 1
            
            print(f"\n✅ Successfully deleted {deleted_count} recurring event(s)")
            if failed_count > 0:
                print(f"❌ Failed to delete {failed_count} event(s)")
        else:
            print("❌ Cancelled - no changes made.")
            
    elif choice == '4':
        print("\n📋 Interactive cancellation mode")
        
        for event_info in all_recurring_events:
            print(f"\n" + "-" * 40)
            print(f"Event: {event_info['summary']}")
            print(f"Calendar: {event_info['calendar_name']}")
            print(f"Organizer: {event_info['organizer']}")
            print(f"Attendees: {event_info['attendee_count']}")
            if event_info['recurrence_rule']:
                print(f"Recurrence: {event_info['recurrence_rule'][0]}")
            
            action = input("\n[C]ancel / [D]elete / [S]kip / [Q]uit: ").strip().lower()
            
            if action == 'c':
                if cancel_event(event_info['calendar_id'], event_info['id'], True):
                    print("✅ Cancelled (notifications sent)")
            elif action == 'd':
                if delete_recurring_event_completely(event_info['calendar_id'], event_info['id']):
                    print("✅ Deleted")
            elif action == 'q':
                print("Exiting interactive mode.")
                break
            else:
                print("⏭️  Skipped")
                
    elif choice == '5':
        print("\n📅 Select calendar:")
        for i, cal in enumerate(calendars):
            print(f"{i+1}. {cal.get('summary', 'Unnamed')}")
            
        cal_choice = input("\nEnter calendar number: ").strip()
        
        try:
            cal_idx = int(cal_choice) - 1
            if 0 <= cal_idx < len(calendars):
                selected_cal_id = calendars[cal_idx]['id']
                selected_cal_name = calendars[cal_idx].get('summary', 'Unnamed')
                
                events = calendar_recurring_events.get(selected_cal_id, [])
                if not events:
                    print(f"\nNo recurring events in {selected_cal_name}")
                else:
                    print(f"\nFound {len(events)} recurring event(s) in {selected_cal_name}")
                    confirm = input("Cancel all? (yes/no): ").strip().lower()
                    
                    if confirm == 'yes':
                        for event in events:
                            print(f"Cancelling: {event.get('summary', 'No title')}...")
                            cancel_event(selected_cal_id, event['id'], True)
                        print("✅ Done")
                    else:
                        print("❌ Cancelled")
            else:
                print("Invalid selection")
        except ValueError:
            print("Invalid input")
    
    else:
        print("❌ Invalid choice. No changes made.")
    
    print("\n" + "=" * 80)
    print("COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()