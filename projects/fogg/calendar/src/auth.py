"""Google API Authentication Module - Legacy wrapper for backward compatibility."""

from google.auth import credentials as auth_credentials
from googleapiclient.discovery import Resource, build

from src.auth.gcp_credentials import GCPCredentialsManager

# Required scopes for calendar and group management
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/admin.directory.group.readonly",
]

# Global credentials manager
_credentials_manager: GCPCredentialsManager | None = None


def get_credentials(impersonate_email: str | None = None) -> auth_credentials.Credentials:
    """Get Google API credentials from environment or ADC.

    Args:
        impersonate_email: Optional service account email to impersonate for domain-wide delegation

    Returns:
        Credentials: Authenticated Google credentials
    """
    global _credentials_manager
    if _credentials_manager is None or _credentials_manager.impersonate_email != impersonate_email:
        _credentials_manager = GCPCredentialsManager(
            scopes=SCOPES, impersonate_email=impersonate_email
        )
    return _credentials_manager.get_credentials()


def verify_scopes(creds: auth_credentials.Credentials) -> bool:
    """Verify that credentials have required scopes.

    Args:
        creds: Google credentials to verify

    Returns:
        bool: True if all required scopes are present
    """
    if hasattr(creds, "scopes"):
        return all(scope in creds.scopes for scope in SCOPES)
    return True  # Service accounts don't expose scopes attribute


def build_calendar_service() -> Resource:
    """Build Google Calendar API service.

    Returns:
        Resource: Calendar API service instance
    """
    creds = get_credentials()
    return build("calendar", "v3", credentials=creds)


def build_directory_service() -> Resource:
    """Build Google Directory API service.

    Returns:
        Resource: Directory API service instance
    """
    creds = get_credentials()
    return build("admin", "directory_v1", credentials=creds)
