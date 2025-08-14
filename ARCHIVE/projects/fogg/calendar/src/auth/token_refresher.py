"""Background token refresher for GCP credentials."""

import asyncio
import threading
from datetime import UTC, datetime, timedelta

from google.auth.transport.requests import Request
from structlog import get_logger

from src.auth.gcp_credentials import GCPCredentialsManager

logger = get_logger()


class TokenRefresher:
    """Background thread that refreshes tokens before expiry."""

    def __init__(
        self,
        credentials_manager: GCPCredentialsManager,
        check_interval_seconds: int = 60,
        refresh_buffer_minutes: int = 5,
    ):
        """Initialize token refresher.

        Args:
            credentials_manager: Credentials manager instance
            check_interval_seconds: How often to check for refresh
            refresh_buffer_minutes: Minutes before expiry to trigger refresh
        """
        self.credentials_manager = credentials_manager
        self.check_interval_seconds = check_interval_seconds
        self.refresh_buffer_minutes = refresh_buffer_minutes
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self):
        """Start the background refresh thread."""
        if self._thread and self._thread.is_alive():
            logger.warning("Token refresher already running")
            return

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._refresh_loop, daemon=True)
        self._thread.start()
        logger.info("Token refresher started")

    def stop(self):
        """Stop the background refresh thread."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("Token refresher stopped")

    def _refresh_loop(self):
        """Main refresh loop running in background thread."""
        while not self._stop_event.is_set():
            try:
                self._check_and_refresh()
            except Exception as e:
                logger.error("Error in token refresh loop", error=str(e))

            # Wait for next check
            self._stop_event.wait(self.check_interval_seconds)

    def _check_and_refresh(self):
        """Check if credentials need refresh and refresh if needed."""
        try:
            creds = self.credentials_manager.get_credentials()

            if not hasattr(creds, "expiry") or not creds.expiry:
                return  # No expiry, no need to refresh

            # Calculate time until expiry
            now = datetime.now(UTC)
            time_until_expiry = creds.expiry - now

            # Log status
            logger.debug(
                "Token status",
                expires_in_minutes=time_until_expiry.total_seconds() / 60,
                refresh_buffer_minutes=self.refresh_buffer_minutes,
            )

            # Check if we need to refresh
            buffer = timedelta(minutes=self.refresh_buffer_minutes)
            if time_until_expiry <= buffer:
                logger.info("Refreshing token proactively", expires_in=time_until_expiry)
                creds.refresh(Request())
                logger.info("Token refreshed successfully", new_expiry=creds.expiry)

        except Exception as e:
            logger.error("Failed to refresh token", error=str(e))
            raise


class AsyncTokenRefresher:
    """Async version of token refresher for asyncio applications."""

    def __init__(
        self,
        credentials_manager: GCPCredentialsManager,
        check_interval_seconds: int = 60,
        refresh_buffer_minutes: int = 5,
    ):
        """Initialize async token refresher.

        Args:
            credentials_manager: Credentials manager instance
            check_interval_seconds: How often to check for refresh
            refresh_buffer_minutes: Minutes before expiry to trigger refresh
        """
        self.credentials_manager = credentials_manager
        self.check_interval_seconds = check_interval_seconds
        self.refresh_buffer_minutes = refresh_buffer_minutes
        self._task: asyncio.Task | None = None

    async def start(self):
        """Start the background refresh task."""
        if self._task and not self._task.done():
            logger.warning("Async token refresher already running")
            return

        self._task = asyncio.create_task(self._refresh_loop())
        logger.info("Async token refresher started")

    async def stop(self):
        """Stop the background refresh task."""
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Async token refresher stopped")

    async def _refresh_loop(self):
        """Main refresh loop running as async task."""
        while True:
            try:
                await self._check_and_refresh()
            except Exception as e:
                logger.error("Error in async token refresh loop", error=str(e))

            # Wait for next check
            await asyncio.sleep(self.check_interval_seconds)

    async def _check_and_refresh(self):
        """Check if credentials need refresh and refresh if needed."""
        # Run the synchronous refresh in executor to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._sync_check_and_refresh)

    def _sync_check_and_refresh(self):
        """Synchronous refresh logic for executor."""
        try:
            creds = self.credentials_manager.get_credentials()

            if not hasattr(creds, "expiry") or not creds.expiry:
                return

            now = datetime.now(UTC)
            time_until_expiry = creds.expiry - now

            buffer = timedelta(minutes=self.refresh_buffer_minutes)
            if time_until_expiry <= buffer:
                logger.info("Async refreshing token", expires_in=time_until_expiry)
                creds.refresh(Request())
                logger.info("Token refreshed successfully", new_expiry=creds.expiry)

        except Exception as e:
            logger.error("Failed to refresh token in async", error=str(e))
            raise
