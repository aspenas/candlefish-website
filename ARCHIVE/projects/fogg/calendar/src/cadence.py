"""Cadence analysis module for optimizing meeting times"""

from collections import defaultdict
from datetime import datetime

from dateutil import parser
from googleapiclient.errors import HttpError

from src.auth import build_calendar_service
from src.models import CadenceAnalysis, Event
from src.utils.api_client import execute_google_api_call


def get_events_for_calendar(
    calendar_id: str, time_min: datetime, time_max: datetime
) -> list[Event]:
    """Get events from a calendar within a time range.

    Args:
        calendar_id: Calendar ID to query
        time_min: Start of time range
        time_max: End of time range

    Returns:
        List[Event]: List of events
    """
    service = build_calendar_service()
    events = []

    try:
        events_result = execute_google_api_call(
            lambda: service.events()
            .list(
                calendarId=calendar_id,
                timeMin=time_min.isoformat() + "Z",
                timeMax=time_max.isoformat() + "Z",
                singleEvents=True,
                orderBy="startTime",
            )
            .execute(),
            f"get_events_for_calendar({calendar_id})",
        )

        for event in events_result.get("items", []):
            # Skip all-day events
            if "dateTime" not in event.get("start", {}):
                continue

            events.append(
                Event(
                    id=event.get("id"),
                    summary=event.get("summary", ""),
                    description=event.get("description"),
                    start=parser.parse(event["start"]["dateTime"]),
                    end=parser.parse(event["end"]["dateTime"]),
                    attendees=[
                        {
                            "email": att.get("email"),
                            "response_status": att.get("responseStatus", "needsAction"),
                        }
                        for att in event.get("attendees", [])
                    ],
                    recurring_event_id=event.get("recurringEventId"),
                    status=event.get("status", "confirmed"),
                )
            )

    except HttpError as error:
        print(f"Error fetching events: {error}")

    return events


def analyze_meeting_patterns(
    events: list[Event], target_attendees: list[str] | None = None
) -> CadenceAnalysis:
    """Analyze meeting patterns to find optimal times.

    Args:
        events: List of events to analyze
        target_attendees: List of attendee emails to track attendance for

    Returns:
        CadenceAnalysis: Analysis results
    """
    attendance_by_day = defaultdict(list)
    attendance_by_hour = defaultdict(list)
    durations = []

    for event in events:
        # Skip cancelled events
        if event.status != "confirmed":
            continue

        # Calculate attendance rate
        if event.attendees:
            total_attendees = len(event.attendees)
            accepted = sum(1 for att in event.attendees if att.get("response_status") == "accepted")
            attendance_rate = accepted / total_attendees if total_attendees > 0 else 0

            # If we have target attendees, calculate their attendance
            if target_attendees:
                target_accepted = sum(
                    1
                    for att in event.attendees
                    if att.get("email") in target_attendees
                    and att.get("response_status") == "accepted"
                )
                target_total = sum(
                    1 for att in event.attendees if att.get("email") in target_attendees
                )
                if target_total > 0:
                    attendance_rate = target_accepted / target_total
        else:
            attendance_rate = 0

        # Track by day of week
        day_name = event.start.strftime("%A")
        attendance_by_day[day_name].append(attendance_rate)

        # Track by hour
        hour = event.start.hour
        attendance_by_hour[hour].append(attendance_rate)

        # Track duration
        duration = (event.end - event.start).total_seconds() / 60
        durations.append(duration)

    # Calculate averages
    avg_by_day = {
        day: sum(rates) / len(rates) if rates else 0 for day, rates in attendance_by_day.items()
    }
    avg_by_hour = {
        hour: sum(rates) / len(rates) if rates else 0 for hour, rates in attendance_by_hour.items()
    }

    # Find best day and time
    best_day = max(avg_by_day.items(), key=lambda x: x[1])[0] if avg_by_day else "Thursday"
    best_hour = max(avg_by_hour.items(), key=lambda x: x[1])[0] if avg_by_hour else 10

    # Calculate average attendance and duration
    all_attendance = []
    for rates in attendance_by_day.values():
        all_attendance.extend(rates)
    avg_attendance = sum(all_attendance) / len(all_attendance) if all_attendance else 0

    avg_duration = sum(durations) / len(durations) if durations else 60

    return CadenceAnalysis(
        total_events=len(events),
        average_attendance=avg_attendance,
        best_day=best_day,
        best_time=f"{best_hour:02d}:00",
        recommended_duration_minutes=int(avg_duration),
        attendance_by_day=avg_by_day,
        attendance_by_hour=dict(avg_by_hour.items()),
    )


def propose_meeting_time(analysis: CadenceAnalysis) -> tuple[str, str, int]:
    """Propose optimal meeting time based on analysis.

    Args:
        analysis: Cadence analysis results

    Returns:
        Tuple of (day, time, duration_minutes)
    """
    # If we have good data, use it
    if analysis.total_events > 5 and analysis.average_attendance > 0.5:
        return (
            analysis.best_day,
            analysis.best_time,
            analysis.recommended_duration_minutes,
        )

    # Otherwise, use defaults
    return ("Thursday", "10:00", 60)
