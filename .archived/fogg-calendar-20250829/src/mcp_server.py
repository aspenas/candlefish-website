"""MCP Server for FOGG Calendar tools"""

import asyncio
import json
import time
import uuid
from datetime import datetime
from typing import Any

from mcp import Server, Tool
from mcp.types import TextContent
from pydantic import BaseModel

from src.cadence import analyze_meeting_patterns, get_events_for_calendar
from src.calendar_manager import (
    create_recurring_event,
    share_calendar_with_group,
)
from src.calendar_manager_idempotent import create_event_idempotent
from src.introspect import list_all_calendars, list_group_members
from src.logging import get_logger, log_mcp_tool_invocation
from src.metrics import get_metrics_manager

logger = get_logger()
metrics = get_metrics_manager()


class ListEventsArgs(BaseModel):
    """Arguments for list_events tool."""

    calendar_id: str
    days_back: int = 30
    days_forward: int = 30


class CreateEventArgs(BaseModel):
    """Arguments for create_event tool."""

    calendar_id: str
    summary: str
    description: str
    start_time: str  # ISO format
    duration_minutes: int
    attendee_emails: list[str] = []
    recurrence_rule: str = ""
    external_id: str = ""  # For idempotency


class ShareCalendarArgs(BaseModel):
    """Arguments for share_calendar tool."""

    calendar_id: str
    group_email: str
    role: str = "writer"  # reader, writer, owner


class GetGroupMembersArgs(BaseModel):
    """Arguments for get_group_members tool."""

    group_email: str


class UpdateEventAttendeesArgs(BaseModel):
    """Arguments for update_event_attendees tool."""

    calendar_id: str
    event_id: str
    attendee_emails: list[str]


class OptimizeCadenceArgs(BaseModel):
    """Arguments for optimize_cadence tool."""

    calendar_id: str
    months_to_analyze: int = 12


class GetFreeBusyArgs(BaseModel):
    """Arguments for get_free_busy tool."""

    calendar_id: str
    emails: list[str]
    start_time: str  # ISO format
    end_time: str  # ISO format


# Initialize MCP server
server = Server("fogg-calendar-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available MCP tools."""
    return [
        Tool(
            name="list_calendars",
            description="List all accessible calendars",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="list_events",
            description="List events from a calendar",
            inputSchema={
                "type": "object",
                "properties": {
                    "calendar_id": {"type": "string", "description": "Calendar ID"},
                    "days_back": {
                        "type": "integer",
                        "description": "Days to look back",
                        "default": 30,
                    },
                    "days_forward": {
                        "type": "integer",
                        "description": "Days to look forward",
                        "default": 30,
                    },
                },
                "required": ["calendar_id"],
            },
        ),
        Tool(
            name="create_event",
            description="Create a calendar event",
            inputSchema={
                "type": "object",
                "properties": {
                    "calendar_id": {"type": "string", "description": "Calendar ID"},
                    "summary": {"type": "string", "description": "Event title"},
                    "description": {"type": "string", "description": "Event description"},
                    "start_time": {
                        "type": "string",
                        "description": "Start time in ISO format",
                    },
                    "duration_minutes": {
                        "type": "integer",
                        "description": "Duration in minutes",
                    },
                    "attendee_emails": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of attendee emails",
                        "default": [],
                    },
                    "recurrence_rule": {
                        "type": "string",
                        "description": "RFC5545 recurrence rule",
                        "default": "",
                    },
                },
                "required": ["calendar_id", "summary", "start_time", "duration_minutes"],
            },
        ),
        Tool(
            name="share_calendar",
            description="Share a calendar with a Google Group",
            inputSchema={
                "type": "object",
                "properties": {
                    "calendar_id": {"type": "string", "description": "Calendar ID"},
                    "group_email": {"type": "string", "description": "Google Group email"},
                    "role": {
                        "type": "string",
                        "description": "Access role (reader, writer, owner)",
                        "default": "writer",
                    },
                },
                "required": ["calendar_id", "group_email"],
            },
        ),
        Tool(
            name="get_group_members",
            description="Get members of a Google Group",
            inputSchema={
                "type": "object",
                "properties": {
                    "group_email": {"type": "string", "description": "Google Group email"},
                },
                "required": ["group_email"],
            },
        ),
        Tool(
            name="update_event_attendees",
            description="Update attendees for an existing event",
            inputSchema={
                "type": "object",
                "properties": {
                    "calendar_id": {"type": "string", "description": "Calendar ID"},
                    "event_id": {"type": "string", "description": "Event ID"},
                    "attendee_emails": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of attendee emails",
                    },
                },
                "required": ["calendar_id", "event_id", "attendee_emails"],
            },
        ),
        Tool(
            name="optimize_cadence",
            description="Analyze and optimize meeting cadence",
            inputSchema={
                "type": "object",
                "properties": {
                    "calendar_id": {"type": "string", "description": "Calendar ID"},
                    "months_to_analyze": {
                        "type": "integer",
                        "description": "Number of months to analyze",
                        "default": 12,
                    },
                },
                "required": ["calendar_id"],
            },
        ),
        Tool(
            name="get_free_busy",
            description="Get free/busy information for calendars",
            inputSchema={
                "type": "object",
                "properties": {
                    "calendar_id": {"type": "string", "description": "Calendar ID"},
                    "emails": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of email addresses to check",
                    },
                    "start_time": {
                        "type": "string",
                        "description": "Start time in ISO format",
                    },
                    "end_time": {
                        "type": "string",
                        "description": "End time in ISO format",
                    },
                },
                "required": ["calendar_id", "emails", "start_time", "end_time"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls."""
    start_time = time.time()
    trace_id = str(uuid.uuid4())

    # Log tool invocation
    log_mcp_tool_invocation(name, arguments, trace_id)

    try:
        result = None

        if name == "list_calendars":
            calendars = await asyncio.to_thread(list_all_calendars)
            result = [
                {"id": cal.id, "name": cal.summary, "access_role": cal.access_role}
                for cal in calendars
            ]
            response = [TextContent(type="text", text=json.dumps(result, indent=2))]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        elif name == "list_events":
            args = ListEventsArgs(**arguments)
            from datetime import timedelta

            time_min = datetime.utcnow() - timedelta(days=args.days_back)
            time_max = datetime.utcnow() + timedelta(days=args.days_forward)

            events = await asyncio.to_thread(
                get_events_for_calendar, args.calendar_id, time_min, time_max
            )

            result = [
                {
                    "id": event.id,
                    "summary": event.summary,
                    "start": event.start.isoformat(),
                    "end": event.end.isoformat(),
                    "attendee_count": len(event.attendees),
                }
                for event in events
            ]
            response = [TextContent(type="text", text=json.dumps(result, indent=2))]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        elif name == "create_event":
            args = CreateEventArgs(**arguments)
            from dateutil import parser

            start_date = parser.parse(args.start_time)

            # Use external ID for idempotency
            if args.external_id:
                event_id, was_created = await asyncio.to_thread(
                    create_event_idempotent,
                    args.calendar_id,
                    args.summary,
                    args.description,
                    start_date,
                    args.duration_minutes,
                    args.external_id,
                    args.attendee_emails,
                    args.recurrence_rule,
                )
                status = "created" if was_created else "already_exists"
                response = [TextContent(type="text", text=f"Event {status}: {event_id}")]
            elif args.recurrence_rule:
                # Legacy non-idempotent path
                event_id = await asyncio.to_thread(
                    create_recurring_event,
                    args.calendar_id,
                    args.summary,
                    args.description,
                    start_date,
                    args.duration_minutes,
                    args.attendee_emails,
                    args.recurrence_rule,
                )
                response = [TextContent(type="text", text=f"Created event: {event_id}")]
            else:
                # For non-recurring events, we'd need to implement a separate function
                return [
                    TextContent(
                        type="text",
                        text=(
                            "Non-recurring events not yet implemented. Please use recurrence_rule."
                        ),
                    )
                ]

            response = [TextContent(type="text", text=f"Created event: {event_id}")]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        elif name == "share_calendar":
            args = ShareCalendarArgs(**arguments)

            success = await asyncio.to_thread(
                share_calendar_with_group, args.calendar_id, args.group_email, args.role
            )

            result = {
                "success": success,
                "calendar_id": args.calendar_id,
                "group_email": args.group_email,
                "role": args.role,
            }
            response = [TextContent(type="text", text=json.dumps(result, indent=2))]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        elif name == "get_group_members":
            args = GetGroupMembersArgs(**arguments)

            members = await asyncio.to_thread(list_group_members, args.group_email)
            member_list = [{"email": m.email, "role": m.role, "type": m.type} for m in members]

            result = {
                "group_email": args.group_email,
                "member_count": len(member_list),
                "members": member_list,
            }
            response = [TextContent(type="text", text=json.dumps(result, indent=2))]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        elif name == "update_event_attendees":
            args = UpdateEventAttendeesArgs(**arguments)
            from src.calendar_manager import update_event_attendees

            success = await asyncio.to_thread(
                update_event_attendees,
                args.calendar_id,
                args.event_id,
                args.attendee_emails,
            )

            result = {
                "success": success,
                "calendar_id": args.calendar_id,
                "event_id": args.event_id,
                "attendee_count": len(args.attendee_emails),
            }
            response = [TextContent(type="text", text=json.dumps(result, indent=2))]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        elif name == "optimize_cadence":
            args = OptimizeCadenceArgs(**arguments)
            from dateutil.relativedelta import relativedelta

            time_min = datetime.utcnow() - relativedelta(months=args.months_to_analyze)
            time_max = datetime.utcnow()

            events = await asyncio.to_thread(
                get_events_for_calendar, args.calendar_id, time_min, time_max
            )

            analysis = await asyncio.to_thread(analyze_meeting_patterns, events)

            result = {
                "total_events_analyzed": analysis.total_events,
                "average_attendance": f"{analysis.average_attendance:.1%}",
                "best_day": analysis.best_day,
                "best_time": analysis.best_time,
                "recommended_duration_minutes": analysis.recommended_duration_minutes,
                "attendance_by_day": {
                    day: f"{rate:.1%}" for day, rate in analysis.attendance_by_day.items()
                },
            }
            response = [TextContent(type="text", text=json.dumps(result, indent=2))]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        elif name == "get_free_busy":
            args = GetFreeBusyArgs(**arguments)
            from dateutil import parser

            from src.calendar_free_busy import get_free_busy

            time_min = parser.parse(args.start_time)
            time_max = parser.parse(args.end_time)

            freebusy_data = await asyncio.to_thread(
                get_free_busy,
                args.calendar_id,
                args.emails,
                time_min,
                time_max,
            )

            response = [TextContent(type="text", text=json.dumps(freebusy_data, indent=2))]

            # Record success and return
            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "MCP tool invocation completed",
                tool=name,
                trace_id=trace_id,
                duration_ms=duration_ms,
            )
            metrics.record_mcp_invocation(name, success=True, duration_ms=duration_ms)
            return response

        else:
            logger.warning("Unknown MCP tool invoked", tool=name, trace_id=trace_id)
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            "MCP tool invocation failed",
            tool=name,
            trace_id=trace_id,
            duration_ms=duration_ms,
            error=str(e),
        )
        metrics.record_mcp_invocation(name, success=False, duration_ms=duration_ms)
        return [TextContent(type="text", text=f"Error: {e!s}")]

    # This should never be reached as all branches above return
    # But just in case:
    logger.error("Unreachable code in MCP tool handler", tool=name, trace_id=trace_id)
    return [TextContent(type="text", text="Unexpected error")]


async def main():
    """Run the MCP server."""
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)


if __name__ == "__main__":
    asyncio.run(main())
