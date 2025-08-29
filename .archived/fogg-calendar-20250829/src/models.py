"""Data models for FOGG Calendar Automation"""

from datetime import datetime

from pydantic import BaseModel, Field


class CalendarInfo(BaseModel):
    """Calendar information model."""

    id: str
    summary: str
    description: str | None = None
    time_zone: str | None = None
    access_role: str


class GroupMember(BaseModel):
    """Google Group member model."""

    email: str
    role: str
    type: str
    status: str | None = None
    id: str | None = None


class EventAttendee(BaseModel):
    """Event attendee model."""

    email: str
    display_name: str | None = None
    response_status: str | None = "needsAction"
    comment: str | None = None
    optional: bool = False


class RecurrenceRule(BaseModel):
    """Event recurrence rule model."""

    frequency: str = "MONTHLY"
    by_day: str | None = "1TH"  # First Thursday
    interval: int = 1
    count: int | None = None
    until: datetime | None = None


class Event(BaseModel):
    """Calendar event model."""

    id: str | None = None
    summary: str
    description: str | None = None
    start: datetime
    end: datetime
    attendees: list[EventAttendee] = Field(default_factory=list)
    recurrence: list[str] | None = None
    recurring_event_id: str | None = None
    status: str = "confirmed"
    visibility: str = "default"
    transparency: str = "opaque"
    reminders: dict = Field(
        default_factory=lambda: {
            "useDefault": False,
            "overrides": [{"method": "email", "minutes": 1440}],
        }
    )


class CadenceAnalysis(BaseModel):
    """Meeting cadence analysis results."""

    total_events: int
    average_attendance: float
    best_day: str
    best_time: str
    recommended_duration_minutes: int
    attendance_by_day: dict[str, float]
    attendance_by_hour: dict[int, float]
