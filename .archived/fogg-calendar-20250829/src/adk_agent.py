"""ADK Agent that uses FOGG Calendar MCP tools"""

import asyncio
import json
from typing import Any

from anthropic import AsyncAnthropicVertex
from mcp import Client

# Initialize Anthropic client for Vertex AI
client = AsyncAnthropicVertex(region="us-central1", project_id="your-project-id")


class FOGGCalendarAgent:
    """Agent for managing FOGG calendar operations."""

    def __init__(self):
        self.mcp_client = None

    async def connect_mcp(self):
        """Connect to MCP server."""
        self.mcp_client = Client()
        # In production, this would connect to the running MCP server
        # For now, we'll use stdio_client for local testing

    async def list_calendars(self) -> list[dict[str, Any]]:
        """List all available calendars."""
        if not self.mcp_client:
            await self.connect_mcp()

        result = await self.mcp_client.call_tool("list_calendars", {})
        return json.loads(result[0].text)

    async def optimize_meeting_schedule(self, calendar_id: str) -> dict[str, Any]:
        """Analyze and optimize meeting schedule using AI."""
        # First, get the cadence analysis
        analysis_result = await self.mcp_client.call_tool(
            "optimize_cadence", {"calendar_id": calendar_id, "months_to_analyze": 12}
        )
        analysis = json.loads(analysis_result[0].text)

        # Use Claude to interpret the analysis and make recommendations
        prompt = f"""
        Based on the following meeting analysis for the FOGG leadership team:

        {json.dumps(analysis, indent=2)}

        Please provide:
        1. A summary of the current meeting patterns
        2. Recommendations for improving attendance
        3. Suggested optimal meeting time and cadence

        Format your response as JSON with keys: summary, recommendations, optimal_schedule
        """

        response = await client.messages.create(
            model="claude-opus-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract JSON from response
        import re

        json_match = re.search(r"\{.*\}", response.content[0].text, re.DOTALL)
        if json_match:
            recommendations = json.loads(json_match.group())
        else:
            recommendations = {
                "summary": "Unable to parse analysis",
                "recommendations": [],
                "optimal_schedule": {},
            }

        return {
            "analysis": analysis,
            "ai_recommendations": recommendations,
        }

    async def create_optimized_recurring_meeting(self, calendar_id: str, group_email: str) -> str:
        """Create an optimized recurring meeting based on analysis."""
        # First sync with group
        sync_result = await self.mcp_client.call_tool(
            "sync_group", {"calendar_id": calendar_id, "group_email": group_email}
        )
        sync_data = json.loads(sync_result[0].text)

        # Get optimization recommendations
        optimization = await self.optimize_meeting_schedule(calendar_id)

        # Create the meeting based on recommendations
        optimal_schedule = optimization["ai_recommendations"].get("optimal_schedule", {})

        # Default to Thursday 10 AM if no recommendation
        day = optimal_schedule.get("day", "Thursday")
        time = optimal_schedule.get("time", "10:00")
        duration = optimal_schedule.get("duration_minutes", 60)

        # Calculate next occurrence
        from datetime import datetime, timedelta

        # Simple implementation - would be more sophisticated in production
        next_thursday = datetime.utcnow()
        while next_thursday.strftime("%A") != day:
            next_thursday += timedelta(days=1)

        hour, minute = map(int, time.split(":"))
        start_time = next_thursday.replace(hour=hour, minute=minute, second=0, microsecond=0)

        # Create the event
        event_result = await self.mcp_client.call_tool(
            "create_event",
            {
                "calendar_id": calendar_id,
                "summary": "FOGG Monthly Leadership Sync",
                "description": (
                    "Monthly sync meeting for FOGG leadership team. "
                    "Optimized for maximum attendance."
                ),
                "start_time": start_time.isoformat(),
                "duration_minutes": duration,
                "attendee_emails": sync_data["members"],
                "recurrence_rule": "RRULE:FREQ=MONTHLY;BYDAY=1TH",
            },
        )

        return event_result[0].text


async def demo():
    """Demo the FOGG Calendar Agent."""
    agent = FOGGCalendarAgent()

    print("=== FOGG Calendar Agent Demo ===\n")

    # List calendars
    print("1. Listing calendars...")
    calendars = await agent.list_calendars()
    print(f"Found {len(calendars)} calendars")

    # Find FOGG calendar
    fogg_calendar = next((cal for cal in calendars if "fogg" in cal["name"].lower()), None)

    if fogg_calendar:
        print(f"\n2. Found FOGG calendar: {fogg_calendar['name']}")

        # Optimize schedule
        print("\n3. Analyzing and optimizing meeting schedule...")
        optimization = await agent.optimize_meeting_schedule(fogg_calendar["id"])
        print("Optimization complete!")
        print(f"AI Recommendations: {json.dumps(optimization['ai_recommendations'], indent=2)}")

        # Create optimized meeting
        print("\n4. Creating optimized recurring meeting...")
        result = await agent.create_optimized_recurring_meeting(
            fogg_calendar["id"], "fogg-leadership@patrick.smith.com"
        )
        print(f"Result: {result}")
    else:
        print("\nNo FOGG calendar found. Please create one first.")


if __name__ == "__main__":
    asyncio.run(demo())
