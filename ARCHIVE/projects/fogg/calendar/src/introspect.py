"""Introspection module for FOGG calendars and groups"""

from googleapiclient.errors import HttpError

from src.auth import build_calendar_service, build_directory_service
from src.models import CalendarInfo, GroupMember
from src.utils.api_client import execute_google_api_call


def list_fogg_calendars() -> list[CalendarInfo]:
    """List all calendars accessible to the authenticated user.

    Returns:
        List[CalendarInfo]: List of calendar information
    """
    service = build_calendar_service()
    calendars = []

    try:
        calendar_list = execute_google_api_call(
            lambda: service.calendarList().list().execute(), "list_fogg_calendars"
        )

        for calendar in calendar_list.get("items", []):
            # Filter for FOGG-related calendars
            summary = calendar.get("summary", "")
            if "fogg" in summary.lower():
                calendars.append(
                    CalendarInfo(
                        id=calendar["id"],
                        summary=summary,
                        description=calendar.get("description"),
                        time_zone=calendar.get("timeZone"),
                        access_role=calendar.get("accessRole", "unknown"),
                    )
                )

        print(f"Found {len(calendars)} FOGG-related calendars")
        return calendars

    except HttpError as error:
        print(f"An error occurred listing calendars: {error}")
        return []


def list_all_calendars() -> list[CalendarInfo]:
    """List all calendars accessible to the authenticated user.

    Returns:
        List[CalendarInfo]: List of calendar information
    """
    service = build_calendar_service()
    calendars = []

    try:
        calendar_list = execute_google_api_call(
            lambda: service.calendarList().list().execute(), "list_all_calendars"
        )

        for calendar in calendar_list.get("items", []):
            calendars.append(
                CalendarInfo(
                    id=calendar["id"],
                    summary=calendar.get("summary", ""),
                    description=calendar.get("description"),
                    time_zone=calendar.get("timeZone"),
                    access_role=calendar.get("accessRole", "unknown"),
                )
            )

        print(f"Found {len(calendars)} total calendars")
        return calendars

    except HttpError as error:
        print(f"An error occurred listing calendars: {error}")
        return []


def list_group_members(group_email: str) -> list[GroupMember]:
    """List members of a Google Group.

    Args:
        group_email: Email address of the Google Group

    Returns:
        List[GroupMember]: List of group members
    """
    service = build_directory_service()
    members = []

    try:
        result = execute_google_api_call(
            lambda: service.members().list(groupKey=group_email).execute(),
            f"list_group_members({group_email})",
        )

        for member in result.get("members", []):
            members.append(
                GroupMember(
                    email=member["email"],
                    role=member["role"],
                    type=member["type"],
                    status=member.get("status"),
                    id=member.get("id"),
                )
            )

        # Handle pagination
        while "nextPageToken" in result:
            result = execute_google_api_call(
                lambda: service.members()
                .list(groupKey=group_email, pageToken=result["nextPageToken"])
                .execute(),
                f"list_group_members_page({group_email})",
            )
            for member in result.get("members", []):
                members.append(
                    GroupMember(
                        email=member["email"],
                        role=member["role"],
                        type=member["type"],
                        status=member.get("status"),
                        id=member.get("id"),
                    )
                )

        print(f"Found {len(members)} members in group {group_email}")
        return members

    except HttpError as error:
        print(f"An error occurred listing group members: {error}")
        return []


def get_calendar_by_name(calendar_name: str) -> CalendarInfo | None:
    """Get a specific calendar by name.

    Args:
        calendar_name: Name to search for in calendar summaries

    Returns:
        Optional[CalendarInfo]: Calendar info if found, None otherwise
    """
    calendars = list_all_calendars()

    for calendar in calendars:
        if calendar_name.lower() in calendar.summary.lower():
            return calendar

    return None
