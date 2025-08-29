# Calendar Invite Removal Tools

## Overview
This directory contains tools to manage and remove calendar invites sent via Google Calendar API.

## Authentication
The scripts use Google Calendar API with service account authentication configured in:
- `src/auth/gcp_credentials.py` - Manages credentials with ADC and Workload Identity Federation
- Required scopes: Calendar and Admin Directory access

## Available Scripts

### 1. `list_and_remove_all_invites.py`
Comprehensive tool to analyze and remove ALL calendar events and invites.

**Features:**
- Lists all calendars accessible to the service account
- Analyzes all events across all calendars
- Identifies events with attendees/invites
- Generates detailed JSON report
- Multiple removal options:
  - Delete events with invites only
  - Delete all events in specific calendar
  - Delete entire calendars
  - Interactive review mode

**Usage:**
```bash
python list_and_remove_all_invites.py
```

**Report Output:**
- Saves detailed JSON report with timestamp
- Includes all events, attendees, and calendar metadata
- Review report before taking action

### 2. `cancel_all_recurring_events.py`
Specialized tool for managing recurring calendar events.

**Features:**
- Finds all recurring events across calendars
- Shows future instances count
- Cancellation vs deletion options
- Sends proper cancellation notices to attendees
- Calendar-specific operations

**Usage:**
```bash
python cancel_all_recurring_events.py
```

**Options:**
- Cancel with notifications (attendees receive emails)
- Delete immediately (no notifications)
- Interactive mode for selective cancellation

## Safety Features

1. **Review Before Action**: Both scripts show detailed summaries before any destructive action
2. **Confirmation Required**: Destructive operations require explicit confirmation phrases
3. **Report Generation**: Detailed JSON reports saved before any changes
4. **Primary Calendar Protection**: Primary calendar protected from accidental deletion
5. **Granular Control**: Multiple options from single event to bulk operations

## Current Configuration

From analysis of your codebase:
- **Service**: Google Calendar API v3
- **Group Email**: fogg-leadership@patrick.smith.com
- **Calendar Name**: FOGG Monthly Meetings
- **Recurring Event**: FOGG Monthly Sync (First Thursday monthly)
- **Current Attendees**: patrick.smith@gmail.com

## Recommendations

1. **Start with Reports**: Run scripts in report-only mode first (option 1)
2. **Review JSON Output**: Check generated reports for unexpected events
3. **Test on Single Calendar**: Try operations on test calendar first
4. **Use Cancel vs Delete**: 
   - Cancel: Notifies attendees properly
   - Delete: Immediate removal, no notifications

## Important Notes

⚠️ **Service Account Limitations**:
- Service accounts cannot send invites without domain delegation
- Current code comments out attendee additions in some places
- May need OAuth flow for full attendee management

⚠️ **Irreversible Actions**:
- Calendar deletion cannot be undone
- Event deletion is permanent
- Always backup important calendar data first

## Troubleshooting

If you encounter permission errors:
1. Check service account has Calendar API access
2. Verify calendar sharing permissions
3. Ensure proper scopes in authentication
4. Check if domain-wide delegation is needed

## Next Steps

After removing unwanted invites:
1. Review calendar sharing settings
2. Update recurring event configurations
3. Consider implementing invite approval workflow
4. Set up proper calendar permissions