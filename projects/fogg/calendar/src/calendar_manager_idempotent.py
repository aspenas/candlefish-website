"""Idempotent calendar management operations."""

from datetime import datetime, timedelta

from googleapiclient.errors import HttpError

from src.auth import build_calendar_service
from src.utils.api_client import execute_google_api_call


def find_event_by_external_id(
    calendar_id: str,
    external_id: str,
) -> str | None:
    """Find an event by external ID in extended properties.

    Args:
        calendar_id: Calendar ID to search
        external_id: External ID to search for

    Returns:
        Event ID if found, None otherwise
    """
    service = build_calendar_service()

    try:
        # Search for events with the external ID
        # Note: We can't directly query by extended properties,
        # so we need to fetch events and filter
        events_result = execute_google_api_call(
            lambda: service.events()
            .list(
                calendarId=calendar_id,
                privateExtendedProperty=f"externalId={external_id}",
                showDeleted=False,
            )
            .execute(),
            f"find_event_by_external_id({calendar_id}, {external_id})",
        )

        events = events_result.get("items", [])
        if events:
            return events[0]["id"]

    except HttpError as error:
        # 404 is expected if not found
        if error.resp.status != 404:
            print(f"Error searching for event: {error}")

    return None


def create_event_idempotent(
    calendar_id: str,
    summary: str,
    description: str,
    start_date: datetime,
    duration_minutes: int,
    external_id: str,
    attendee_emails: list[str] = None,
    recurrence_rule: str | None = None,
) -> tuple[str, bool]:
    """Create an event idempotently using external ID.

    Args:
        calendar_id: Calendar ID
        summary: Event summary
        description: Event description
        start_date: Start time
        duration_minutes: Duration in minutes
        external_id: External ID for idempotency
        attendee_emails: Optional list of attendee emails
        recurrence_rule: Optional recurrence rule

    Returns:
        Tuple of (event_id, was_created) - was_created is False if event already existed
    """
    # First check if event already exists
    existing_event_id = find_event_by_external_id(calendar_id, external_id)
    if existing_event_id:
        print(f"Event already exists with external ID {external_id}: {existing_event_id}")
        return existing_event_id, False

    # Create new event
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
        "extendedProperties": {
            "private": {
                "externalId": external_id,
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 24 * 60},  # 1 day before
                {"method": "popup", "minutes": 10},  # 10 minutes before
            ],
        },
    }

    if recurrence_rule:
        event["recurrence"] = [recurrence_rule]

    # Note: Service accounts can't invite attendees without domain delegation
    # So we store them in extended properties for reference
    if attendee_emails:
        event["extendedProperties"]["private"]["attendeeEmails"] = ",".join(attendee_emails)

    try:
        created_event = execute_google_api_call(
            lambda: service.events().insert(calendarId=calendar_id, body=event).execute(),
            f"create_event_idempotent({calendar_id}, {summary})",
        )
        print(f"Created event: {created_event['id']} with external ID: {external_id}")
        return created_event["id"], True

    except HttpError as error:
        print(f"Error creating event: {error}")
        raise


def update_event_idempotent(
    calendar_id: str,
    external_id: str,
    updates: dict,
) -> bool:
    """Update an event by external ID.

    Args:
        calendar_id: Calendar ID
        external_id: External ID of the event
        updates: Dictionary of fields to update

    Returns:
        True if updated, False if not found
    """
    # Find event by external ID
    event_id = find_event_by_external_id(calendar_id, external_id)
    if not event_id:
        print(f"Event not found with external ID: {external_id}")
        return False

    service = build_calendar_service()

    try:
        # Get existing event
        event = execute_google_api_call(
            lambda: service.events().get(calendarId=calendar_id, eventId=event_id).execute(),
            f"get_event_for_update({calendar_id}, {event_id})",
        )

        # Apply updates
        for key, value in updates.items():
            if key in event:
                event[key] = value

        # Update event
        execute_google_api_call(
            lambda: service.events()
            .update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event,
            )
            .execute(),
            f"update_event_idempotent({calendar_id}, {external_id})",
        )

        print(f"Updated event {event_id} with external ID {external_id}")
        return True

    except HttpError as error:
        print(f"Error updating event: {error}")
        return False


def delete_event_by_external_id(
    calendar_id: str,
    external_id: str,
) -> bool:
    """Delete an event by external ID.

    Args:
        calendar_id: Calendar ID
        external_id: External ID of the event

    Returns:
        True if deleted, False if not found
    """
    # Find event by external ID
    event_id = find_event_by_external_id(calendar_id, external_id)
    if not event_id:
        print(f"Event not found with external ID: {external_id}")
        return False

    service = build_calendar_service()

    try:
        execute_google_api_call(
            lambda: service.events()
            .delete(
                calendarId=calendar_id,
                eventId=event_id,
            )
            .execute(),
            f"delete_event_by_external_id({calendar_id}, {external_id})",
        )

        print(f"Deleted event {event_id} with external ID {external_id}")
        return True

    except HttpError as error:
        if error.resp.status == 404:
            # Already deleted
            return True
        print(f"Error deleting event: {error}")
        return False
