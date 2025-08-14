"""Calendar management module for creating and syncing events"""

from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from googleapiclient.errors import HttpError

from src.auth import build_calendar_service
from src.utils.api_client import execute_google_api_call


def create_calendar(name: str, description: str = "", time_zone: str = "UTC") -> str:
    """Create a new calendar.

    Args:
        name: Calendar name
        description: Calendar description
        time_zone: Time zone for the calendar

    Returns:
        str: Calendar ID
    """
    service = build_calendar_service()

    calendar = {
        "summary": name,
        "description": description,
        "timeZone": time_zone,
    }

    try:
        created_calendar = execute_google_api_call(
            lambda: service.calendars().insert(body=calendar).execute(), f"create_calendar({name})"
        )
        print(f"Created calendar: {created_calendar['id']}")
        return created_calendar["id"]
    except HttpError as error:
        print(f"Error creating calendar: {error}")
        raise


def share_calendar_with_group(calendar_id: str, group_email: str, role: str = "writer") -> bool:
    """Share a calendar with a Google Group.

    Args:
        calendar_id: Calendar ID to share
        group_email: Email of the Google Group
        role: Access role (reader, writer, owner)

    Returns:
        bool: True if successful
    """
    service = build_calendar_service()

    rule = {
        "scope": {
            "type": "group",
            "value": group_email,
        },
        "role": role,
    }

    try:
        execute_google_api_call(
            lambda: service.acl().insert(calendarId=calendar_id, body=rule).execute(),
            f"share_calendar({calendar_id}, {group_email})",
        )
        print(f"Shared calendar {calendar_id} with group {group_email} as {role}")
        return True
    except HttpError as error:
        print(f"Error sharing calendar: {error}")
        return False


def create_recurring_event(
    calendar_id: str,
    summary: str,
    description: str,
    start_date: datetime,
    duration_minutes: int,
    attendee_emails: list[str],
    recurrence_rule: str = "RRULE:FREQ=MONTHLY;BYDAY=1TH",
) -> str:
    """Create a recurring event.

    Args:
        calendar_id: Calendar ID
        summary: Event summary
        description: Event description
        start_date: First occurrence start time
        duration_minutes: Duration in minutes
        attendee_emails: List of attendee emails
        recurrence_rule: RFC5545 recurrence rule

    Returns:
        str: Event ID
    """
    service = build_calendar_service()

    end_date = start_date + timedelta(minutes=duration_minutes)

    event = {
        "summary": summary,
        "description": description,
        "start": {
            "dateTime": start_date.isoformat(),
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": end_date.isoformat(),
            "timeZone": "UTC",
        },
        "recurrence": [recurrence_rule],
        # Note: Service accounts can't invite attendees without domain delegation
        # Comment out attendees for now or use OAuth flow instead
        # "attendees": [{"email": email} for email in attendee_emails],
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 24 * 60},  # 1 day before
                {"method": "popup", "minutes": 10},  # 10 minutes before
            ],
        },
        "guestsCanModify": False,
        "guestsCanInviteOthers": True,
        "guestsCanSeeOtherGuests": True,
    }

    try:
        created_event = execute_google_api_call(
            lambda: service.events()
            .insert(calendarId=calendar_id, body=event, sendUpdates="all")
            .execute(),
            f"create_recurring_event({calendar_id}, {summary})",
        )
        print(f"Created recurring event: {created_event['id']}")
        return created_event["id"]
    except HttpError as error:
        print(f"Error creating event: {error}")
        raise


def update_event_attendees(calendar_id: str, event_id: str, attendee_emails: list[str]) -> bool:
    """Update attendees for an existing event.

    Args:
        calendar_id: Calendar ID
        event_id: Event ID
        attendee_emails: New list of attendee emails

    Returns:
        bool: True if successful
    """
    service = build_calendar_service()

    try:
        # Get existing event
        event = execute_google_api_call(
            lambda: service.events().get(calendarId=calendar_id, eventId=event_id).execute(),
            f"get_event({calendar_id}, {event_id})",
        )

        # Update attendees
        event["attendees"] = [{"email": email} for email in attendee_emails]

        # Update event
        execute_google_api_call(
            lambda: service.events()
            .update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event,
                sendUpdates="all",
            )
            .execute(),
            f"update_event_attendees({calendar_id}, {event_id})",
        )

        print(f"Updated attendees for event {event_id}")
        return True
    except HttpError as error:
        print(f"Error updating event: {error}")
        return False


def find_recurring_event(calendar_id: str, summary_keyword: str) -> str | None:
    """Find a recurring event by summary keyword.

    Args:
        calendar_id: Calendar ID to search
        summary_keyword: Keyword to search in event summaries

    Returns:
        Optional[str]: Event ID if found
    """
    service = build_calendar_service()

    try:
        # Search for events in the next year
        time_min = datetime.utcnow()
        time_max = time_min + relativedelta(years=1)

        events_result = execute_google_api_call(
            lambda: service.events()
            .list(
                calendarId=calendar_id,
                timeMin=time_min.isoformat() + "Z",
                timeMax=time_max.isoformat() + "Z",
                singleEvents=False,  # Include recurring events
                q=summary_keyword,
            )
            .execute(),
            f"find_recurring_event({calendar_id}, {summary_keyword})",
        )

        events = events_result.get("items", [])

        # Find the recurring event (not an instance)
        for event in events:
            if (
                "recurrence" in event
                and summary_keyword.lower() in event.get("summary", "").lower()
            ):
                return event["id"]

    except HttpError as error:
        print(f"Error searching events: {error}")

    return None


def get_or_create_fogg_calendar() -> str:
    """Get or create the FOGG monthly meeting calendar.

    Returns:
        str: Calendar ID
    """
    service = build_calendar_service()

    # Search for existing FOGG calendar
    try:
        calendar_list = execute_google_api_call(
            lambda: service.calendarList().list().execute(), "get_or_create_fogg_calendar"
        )

        for calendar in calendar_list.get("items", []):
            if "fogg monthly" in calendar.get("summary", "").lower():
                print(f"Found existing FOGG calendar: {calendar['id']}")
                return calendar["id"]

        # Create new calendar if not found
        return create_calendar(
            name="FOGG Monthly Meetings",
            description="Monthly meetings for FOGG leadership team",
            time_zone="America/Los_Angeles",
        )

    except HttpError as error:
        print(f"Error accessing calendars: {error}")
        raise
