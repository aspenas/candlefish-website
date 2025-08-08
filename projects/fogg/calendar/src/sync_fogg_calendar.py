"""Main script to sync FOGG calendar with Google Group"""

import json
import os
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta

from src.cadence import analyze_meeting_patterns, get_events_for_calendar, propose_meeting_time
from src.calendar_manager import (
    create_recurring_event,
    find_recurring_event,
    get_or_create_fogg_calendar,
    share_calendar_with_group,
    update_event_attendees,
)
from src.introspect import list_group_members

# Constants
FOGG_GROUP_EMAIL = "fogg-leadership@patrick.smith.com"
DEFAULT_ATTENDEES_FILE = "fogg_members.json"


def load_attendees() -> list[str]:
    """Load attendee list from file or use defaults.

    Returns:
        List[str]: List of attendee emails
    """
    # Try to load from file first
    if os.path.exists(DEFAULT_ATTENDEES_FILE):
        with open(DEFAULT_ATTENDEES_FILE) as f:
            return json.load(f)

    # Try to get from group
    try:
        members = list_group_members(FOGG_GROUP_EMAIL)
        if members:
            return [m.email for m in members]
    except Exception as e:
        print(f"Could not fetch group members: {e}")

    # Return empty list if all else fails
    print("Warning: No attendees found. Please provide attendee list.")
    return []


def main():
    """Main sync function."""
    print("=== FOGG Calendar Sync ===\n")

    # Step 1: Get or create calendar
    print("1. Setting up FOGG calendar...")
    calendar_id = get_or_create_fogg_calendar()

    # Step 2: Share with group
    print(f"\n2. Sharing calendar with {FOGG_GROUP_EMAIL}...")
    share_calendar_with_group(calendar_id, FOGG_GROUP_EMAIL, "writer")

    # Step 3: Analyze existing patterns (if any)
    print("\n3. Analyzing meeting patterns...")
    time_min = datetime.utcnow() - relativedelta(months=12)
    time_max = datetime.utcnow()
    events = get_events_for_calendar(calendar_id, time_min, time_max)

    if events:
        print(f"Found {len(events)} events in the last 12 months")
        attendees = load_attendees()
        analysis = analyze_meeting_patterns(events, attendees)

        print("\nAnalysis Results:")
        print(f"  Average attendance: {analysis.average_attendance:.1%}")
        print(f"  Best day: {analysis.best_day}")
        print(f"  Best time: {analysis.best_time}")
        print(f"  Recommended duration: {analysis.recommended_duration_minutes} minutes")

        _, time, duration = propose_meeting_time(analysis)
    else:
        print("No historical events found. Using defaults.")
        time = "18:00"  # 6 PM UTC = 10 AM PST / 1 PM EST
        duration = 60

    # Step 4: Check for existing recurring event
    print("\n4. Checking for existing recurring event...")
    existing_event_id = find_recurring_event(calendar_id, "FOGG Monthly")

    attendees = load_attendees()
    if not attendees:
        print("\n❓ cadence_review needs approval")
        print("No attendees found. Would you like to:")
        print("1. Manually add attendees to fogg_members.json")
        print("2. Continue without attendees")
        print("3. Exit")
        return

    if existing_event_id:
        print(f"Found existing recurring event: {existing_event_id}")
        print("Updating attendees...")
        update_event_attendees(calendar_id, existing_event_id, attendees)
    else:
        print("No existing recurring event found. Creating new one...")

        # Calculate next occurrence
        now = datetime.utcnow()
        hour = int(time.split(":")[0])
        minute = int(time.split(":")[1])

        # Find next first Thursday
        next_month = now.replace(day=1) + relativedelta(months=1)
        first_thursday = next_month + timedelta(days=(3 - next_month.weekday()) % 7)

        if first_thursday.day > 7:  # Not the first Thursday
            first_thursday -= timedelta(days=7)

        start_date = first_thursday.replace(hour=hour, minute=minute, second=0, microsecond=0)

        event_id = create_recurring_event(
            calendar_id=calendar_id,
            summary="FOGG Monthly Sync",
            description="Monthly sync meeting for FOGG leadership team",
            start_date=start_date,
            duration_minutes=duration,
            attendee_emails=attendees,
            recurrence_rule="RRULE:FREQ=MONTHLY;BYDAY=1TH",
        )

        print(f"Created recurring event: {event_id}")

    print("\n✅ create_or_sync_recurring complete")
    print("✅ sharing complete")
    print("✅ invites complete")


if __name__ == "__main__":
    main()
