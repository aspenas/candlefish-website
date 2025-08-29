#!/usr/bin/env python3
"""Fast batch deletion of all calendar events with invites."""

import json
import sys
import os
import importlib.util
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
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


def get_all_events_with_invites() -> List[Tuple[str, Dict[str, Any]]]:
    """Get all events that have invites/attendees.
    
    Returns:
        List of tuples (calendar_id, event)
    """
    service = build_calendar_service()
    events_with_invites = []
    
    print("Fetching calendars...")
    try:
        calendar_list = execute_google_api_call(
            lambda: service.calendarList().list().execute(),
            "list_calendars"
        )
        
        calendars = calendar_list.get('items', [])
        print(f"Found {len(calendars)} calendars")
        
        for cal in calendars:
            cal_id = cal['id']
            cal_name = cal.get('summary', 'Unnamed')
            print(f"\nScanning calendar: {cal_name}")
            
            page_token = None
            events_count = 0
            invite_count = 0
            
            while True:
                events_result = execute_google_api_call(
                    lambda: service.events().list(
                        calendarId=cal_id,
                        pageToken=page_token,
                        maxResults=250,
                        singleEvents=False,
                        showDeleted=False
                    ).execute(),
                    f"list_events({cal_id})"
                )
                
                for event in events_result.get('items', []):
                    events_count += 1
                    if 'attendees' in event and len(event['attendees']) > 0:
                        events_with_invites.append((cal_id, event))
                        invite_count += 1
                
                page_token = events_result.get('nextPageToken')
                if not page_token:
                    break
            
            print(f"  - Total events: {events_count}")
            print(f"  - Events with invites: {invite_count}")
            
    except HttpError as error:
        print(f"Error: {error}")
        
    return events_with_invites


def delete_event_safe(calendar_id: str, event_id: str) -> bool:
    """Safely delete an event, handling already-deleted cases.
    
    Returns:
        True if deleted or already deleted
    """
    service = build_calendar_service()
    
    try:
        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id,
            sendUpdates='none'  # Don't send cancellation emails for speed
        ).execute()
        return True
    except HttpError as error:
        if error.resp.status in [404, 410]:
            # Already deleted
            return True
        return False
    except Exception:
        return False


def delete_events_batch(events_to_delete: List[Tuple[str, Dict[str, Any]]]) -> Tuple[int, int]:
    """Delete events in parallel batches.
    
    Returns:
        Tuple of (successful_deletes, failed_deletes)
    """
    successful = 0
    failed = 0
    
    # Use thread pool for parallel deletion
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all deletion tasks
        future_to_event = {}
        
        for cal_id, event in events_to_delete:
            event_id = event['id']
            event_summary = event.get('summary', 'No title')
            
            future = executor.submit(delete_event_safe, cal_id, event_id)
            future_to_event[future] = (event_id, event_summary)
        
        # Process completed deletions
        total = len(future_to_event)
        completed = 0
        
        for future in as_completed(future_to_event):
            event_id, event_summary = future_to_event[future]
            completed += 1
            
            try:
                if future.result():
                    successful += 1
                    print(f"[{completed}/{total}] ✓ Deleted: {event_summary[:50]}")
                else:
                    failed += 1
                    print(f"[{completed}/{total}] ✗ Failed: {event_summary[:50]}")
            except Exception as exc:
                failed += 1
                print(f"[{completed}/{total}] ✗ Error: {event_summary[:50]} - {exc}")
            
            # Progress update every 100 events
            if completed % 100 == 0:
                print(f"\nProgress: {completed}/{total} events processed")
                print(f"  Successful: {successful}, Failed: {failed}\n")
    
    return successful, failed


def main():
    """Main function for batch deletion."""
    
    print("=" * 80)
    print("BATCH CALENDAR INVITE DELETION")
    print("=" * 80)
    
    # Get all events with invites
    print("\nPhase 1: Scanning for events with invites...")
    events_with_invites = get_all_events_with_invites()
    
    if not events_with_invites:
        print("\n✅ No events with invites found!")
        return
    
    total_events = len(events_with_invites)
    total_attendees = sum(len(event.get('attendees', [])) for _, event in events_with_invites)
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total events with invites: {total_events}")
    print(f"Total attendees affected: {total_attendees}")
    
    # Save backup
    backup_file = f"events_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(backup_file, 'w') as f:
        json.dump([
            {
                'calendar_id': cal_id,
                'event': event
            }
            for cal_id, event in events_with_invites
        ], f, indent=2)
    print(f"\n📄 Backup saved to: {backup_file}")
    
    # Confirm deletion
    print("\n⚠️  WARNING: This will delete ALL events with invites!")
    print("Cancellation emails will NOT be sent (for speed).")
    confirm = input("\nType 'DELETE ALL' to confirm: ").strip()
    
    if confirm != 'DELETE ALL':
        print("❌ Cancelled. No changes made.")
        return
    
    # Delete events
    print("\n" + "=" * 80)
    print("Phase 2: Deleting events...")
    print("=" * 80)
    
    start_time = datetime.now()
    successful, failed = delete_events_batch(events_with_invites)
    end_time = datetime.now()
    
    duration = (end_time - start_time).total_seconds()
    
    # Final report
    print("\n" + "=" * 80)
    print("DELETION COMPLETE")
    print("=" * 80)
    print(f"✅ Successfully deleted: {successful} events")
    if failed > 0:
        print(f"❌ Failed to delete: {failed} events")
    print(f"⏱️  Time taken: {duration:.1f} seconds")
    print(f"📊 Deletion rate: {successful/duration:.1f} events/second")
    
    print("\nYour calendar invites have been removed!")


if __name__ == "__main__":
    main()