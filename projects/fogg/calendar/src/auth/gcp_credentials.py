"""GCP Credentials management with ADC and Workload Identity Federation support."""

import os
from datetime import UTC, datetime, timedelta

import google.auth
import google.auth.impersonated_credentials
from google.auth import credentials as auth_credentials
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from structlog import get_logger

logger = get_logger()

# Required scopes for calendar and group management
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/admin.directory.group.readonly",
]


class GCPCredentialsManager:
    """Manages GCP credentials with automatic refresh and impersonation support."""

    def __init__(
        self,
        scopes: list[str] = SCOPES,
        impersonate_email: str | None = None,
        refresh_buffer_minutes: int = 5,
    ):
        """Initialize credentials manager.

        Args:
            scopes: OAuth scopes required
            impersonate_email: Service account email to impersonate (for domain-wide delegation)
            refresh_buffer_minutes: Minutes before expiry to trigger refresh
        """
        self.scopes = scopes
        self.impersonate_email = impersonate_email
        self.refresh_buffer_minutes = refresh_buffer_minutes
        self._credentials: auth_credentials.Credentials | None = None

    def get_credentials(self) -> auth_credentials.Credentials:
        """Get or refresh GCP credentials.

        Returns:
            Valid GCP credentials

        Raises:
            google.auth.exceptions.DefaultCredentialsError: If no credentials found
        """
        if self._credentials is None:
            self._credentials = self._load_credentials()

        # Check if refresh needed
        if self._should_refresh():
            logger.info("Refreshing credentials", expires_in=self._time_until_expiry())
            self._credentials.refresh(Request())

        return self._credentials

    def _load_credentials(self) -> auth_credentials.Credentials:
        """Load credentials using the following precedence:

        1. Workload Identity Federation (for GitHub Actions)
        2. Service Account JSON (if GOOGLE_APPLICATION_CREDENTIALS is set)
        3. Application Default Credentials (ADC)

        Returns:
            Loaded credentials
        """
        # Check for WIF token first (GitHub Actions)
        if os.getenv("ACTIONS_ID_TOKEN_REQUEST_URL") and os.getenv(
            "ACTIONS_ID_TOKEN_REQUEST_TOKEN"
        ):
            logger.info("Detected GitHub Actions environment, using Workload Identity Federation")
            return self._load_wif_credentials()

        # Check for service account JSON
        sa_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path and os.path.exists(sa_path):
            logger.info("Loading service account credentials", path=sa_path)
            creds = service_account.Credentials.from_service_account_file(
                sa_path, scopes=self.scopes
            )
        else:
            # Use ADC
            logger.info("Using Application Default Credentials")
            creds, project = google.auth.default(scopes=self.scopes)

        # Handle impersonation if requested
        if self.impersonate_email:
            logger.info("Setting up service account impersonation", target=self.impersonate_email)
            creds = google.auth.impersonated_credentials.Credentials(
                source_credentials=creds,
                target_principal=self.impersonate_email,
                target_scopes=self.scopes,
                lifetime=3600,  # 1 hour
            )

        return creds

    def _load_wif_credentials(self) -> auth_credentials.Credentials:
        """Load credentials using Workload Identity Federation.

        This is used in GitHub Actions with OIDC token exchange.

        Returns:
            WIF-based credentials
        """
        import json
        import urllib.request

        # Get GitHub OIDC token
        token_url = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
        token_header = {"Authorization": f"Bearer {os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']}"}

        req = urllib.request.Request(token_url, headers=token_header)
        with urllib.request.urlopen(req) as response:
            json.loads(response.read())

        # Exchange for Google credentials
        # This assumes the WIF provider is already configured via Terraform
        from google.auth import external_account

        audience = f"//iam.googleapis.com/{os.environ['WIF_PROVIDER']}"

        return external_account.Credentials(
            audience=audience,
            subject_token_type="urn:ietf:params:oauth:token-type:jwt",
            token_url="https://sts.googleapis.com/v1/token",
            credential_source={
                "format": {"type": "json"},
                "headers": token_header,
                "url": token_url,
            },
            scopes=self.scopes,
        )

    def _should_refresh(self) -> bool:
        """Check if credentials need refresh.

        Returns:
            True if refresh needed
        """
        if not self._credentials:
            return False

        if not hasattr(self._credentials, "expiry") or not self._credentials.expiry:
            return False

        # Refresh if within buffer time of expiry
        buffer = timedelta(minutes=self.refresh_buffer_minutes)
        # Make sure expiry is timezone aware for comparison
        expiry = self._credentials.expiry
        if expiry.tzinfo is None:
            # Assume UTC if no timezone info
            expiry = expiry.replace(tzinfo=UTC)
        return datetime.now(UTC) >= (expiry - buffer)

    def _time_until_expiry(self) -> str | None:
        """Get human-readable time until credential expiry.

        Returns:
            Time string or None if no expiry
        """
        if not self._credentials or not hasattr(self._credentials, "expiry"):
            return None

        if not self._credentials.expiry:
            return None

        expiry = self._credentials.expiry
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=UTC)
        delta = expiry - datetime.now(UTC)
        return f"{delta.total_seconds() / 60:.1f} minutes"


# Global instance for convenience
_default_manager: GCPCredentialsManager | None = None


def get_default_credentials() -> auth_credentials.Credentials:
    """Get default credentials using the global manager.

    Returns:
        Valid GCP credentials
    """
    global _default_manager
    if _default_manager is None:
        _default_manager = GCPCredentialsManager()
    return _default_manager.get_credentials()
