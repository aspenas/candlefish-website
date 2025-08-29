# Fogg Calendar Project - Archive Documentation

## Archive Information
- **Archive Date**: August 29, 2025
- **Archive Reason**: Project completed and no longer actively maintained
- **Original Location**: `projects/fogg/calendar/`
- **Archived by**: Claude Code (Automated archival process)

## What This Project Was

The Fogg Calendar project was a calendar management system designed for the FOGG (Financial Owners Growth Group) organization. This was a Python-based application that managed calendar invitations, events, and member communications for the FOGG business group.

### Key Components
- **Calendar Management**: Python scripts for managing Google Calendar events
- **Member Management**: JSON files containing FOGG member information
- **Email/Calendar Integration**: iCalendar (.ics) files for event cancellations
- **Deployment Infrastructure**: Docker containers, Cloud Build configuration, and deployment scripts

### Files Archived
- Python application source code (`src/` directory)
- Configuration files (Docker, Makefile, requirements)
- Calendar event data and member lists
- iCalendar cancellation files (ical_cancellations_20250826_111022/)
- Deployment and infrastructure code
- Documentation and README files

## Dependencies and Credentials

### Google Cloud Platform
- Service accounts for calendar access (`fogg-calendar-ro`, `fogg-calendar-rw`)
- Google Calendar API integration
- Cloud Build deployment pipeline

### Secrets and Credentials
The following credentials were used by this project and should be reviewed for revocation:

1. **Google Service Accounts**:
   - `fogg-calendar-ro@project.iam.gserviceaccount.com` 
   - `fogg-calendar-rw@project.iam.gserviceaccount.com`

2. **API Keys**:
   - Google Calendar API credentials
   - Gmail API credentials (for email sending)

3. **Infrastructure**:
   - GCP project: Check terraform configurations for project references
   - Domain: `fogg.candlefish.ai` (removed from Terraform configuration)

### Infrastructure Cleanup Completed
- ✅ Removed `cffogg` project definition from `/terraform/main.tf`
- ✅ Domain `fogg.candlefish.ai` no longer configured in infrastructure
- ✅ ECS/Fargate services configuration removed

## Archive Contents

This archive contains the complete Fogg Calendar project as it existed on August 29, 2025, including:

- All source code and configuration files
- Event data and member information
- Deployment and infrastructure code
- Generated cancellation emails and iCalendar files
- Build artifacts and logs

## Recovery Instructions

If this project needs to be restored:

1. Copy files back from `.archived/fogg-calendar-20250829/` to `projects/fogg/calendar/`
2. Restore Terraform configuration for infrastructure
3. Verify GCP service accounts and permissions
4. Update dependencies in `pyproject.toml`
5. Test deployment pipeline configuration

## Security Notes

- This archive contains member email addresses and calendar information
- Google Cloud credentials may still be embedded in configuration files
- Review and rotate any active credentials if restoring the project
- Member data should be handled according to privacy requirements

---
*This archive was created automatically as part of the Candlefish.ai codebase cleanup initiative.*