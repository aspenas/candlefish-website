"""Free/busy calendar operations."""

from datetime import datetime

from src.auth import build_calendar_service
from src.utils.api_client import execute_google_api_call


def get_free_busy(
    calendar_id: str,
    emails: list[str],
    time_min: datetime,
    time_max: datetime,
) -> dict[str, list[dict]]:
    """Get free/busy information for calendars.

    Args:
        calendar_id: Primary calendar ID
        emails: List of email addresses to check
        time_min: Start time for the query
        time_max: End time for the query

    Returns:
        Dictionary mapping email to list of busy periods
    """
    service = build_calendar_service()

    # Build the request body
    body = {
        "timeMin": time_min.isoformat() + "Z",
        "timeMax": time_max.isoformat() + "Z",
        "items": [{"id": email} for email in [calendar_id] + emails],
    }

    try:
        freebusy_result = execute_google_api_call(
            lambda: service.freebusy().query(body=body).execute(),
            f"get_free_busy({len(emails)} emails)",
        )

        # Process results
        result = {}
        calendars = freebusy_result.get("calendars", {})

        for email, calendar_data in calendars.items():
            busy_periods = []
            for busy in calendar_data.get("busy", []):
                busy_periods.append(
                    {
                        "start": busy["start"],
                        "end": busy["end"],
                    }
                )
            result[email] = busy_periods

        return result

    except Exception as e:
        print(f"Error getting free/busy info: {e}")
        raise
