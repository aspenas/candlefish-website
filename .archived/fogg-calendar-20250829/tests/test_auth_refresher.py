"""Tests for authentication token refresher."""

import time
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

import pytest

from src.auth.gcp_credentials import GCPCredentialsManager
from src.auth.token_refresher import AsyncTokenRefresher, TokenRefresher


class MockCredentials:
    """Mock credentials for testing."""

    def __init__(self, expiry: datetime):
        self.expiry = expiry
        self.refresh_called = False

    def refresh(self, request):
        """Mock refresh method."""
        self.refresh_called = True
        # Extend expiry by 1 hour
        self.expiry = datetime.now(UTC) + timedelta(hours=1)


def test_token_refresher_starts_and_stops():
    """Test that token refresher can start and stop."""
    manager = MagicMock(spec=GCPCredentialsManager)
    refresher = TokenRefresher(manager, check_interval_seconds=0.1)

    refresher.start()
    assert refresher._thread is not None
    assert refresher._thread.is_alive()

    refresher.stop()
    assert refresher._stop_event.is_set()
    # Give thread time to stop
    time.sleep(0.2)
    assert not refresher._thread.is_alive()


def test_token_refresher_refreshes_expiring_token():
    """Test that refresher refreshes tokens before expiry."""
    # Create mock credentials expiring in 4 minutes
    expiry = datetime.now(UTC) + timedelta(minutes=4)
    mock_creds = MockCredentials(expiry)

    manager = MagicMock(spec=GCPCredentialsManager)
    manager.get_credentials.return_value = mock_creds

    refresher = TokenRefresher(
        manager,
        check_interval_seconds=0.1,
        refresh_buffer_minutes=5,  # Refresh 5 min before expiry
    )

    # Run one check
    refresher._check_and_refresh()

    # Should have refreshed since token expires in 4 min < 5 min buffer
    assert mock_creds.refresh_called


def test_token_refresher_skips_non_expiring_token():
    """Test that refresher skips tokens with plenty of time left."""
    # Create mock credentials expiring in 10 minutes
    expiry = datetime.now(UTC) + timedelta(minutes=10)
    mock_creds = MockCredentials(expiry)

    manager = MagicMock(spec=GCPCredentialsManager)
    manager.get_credentials.return_value = mock_creds

    refresher = TokenRefresher(manager, check_interval_seconds=0.1, refresh_buffer_minutes=5)

    # Run one check
    refresher._check_and_refresh()

    # Should NOT have refreshed since token expires in 10 min > 5 min buffer
    assert not mock_creds.refresh_called


def test_token_refresher_handles_no_expiry():
    """Test that refresher handles credentials without expiry."""
    mock_creds = Mock()
    mock_creds.expiry = None

    manager = MagicMock(spec=GCPCredentialsManager)
    manager.get_credentials.return_value = mock_creds

    refresher = TokenRefresher(manager)

    # Should not raise
    refresher._check_and_refresh()


def test_token_refresher_handles_refresh_error():
    """Test that refresher handles errors during refresh."""
    expiry = datetime.now(UTC) + timedelta(minutes=4)
    mock_creds = Mock()
    mock_creds.expiry = expiry
    mock_creds.refresh.side_effect = Exception("Refresh failed")

    manager = MagicMock(spec=GCPCredentialsManager)
    manager.get_credentials.return_value = mock_creds

    refresher = TokenRefresher(manager, refresh_buffer_minutes=5)

    # Should raise the exception
    with pytest.raises(Exception, match="Refresh failed"):
        refresher._check_and_refresh()


@pytest.mark.asyncio
async def test_async_token_refresher_starts_and_stops():
    """Test that async token refresher can start and stop."""
    manager = MagicMock(spec=GCPCredentialsManager)
    refresher = AsyncTokenRefresher(manager, check_interval_seconds=0.1)

    await refresher.start()
    assert refresher._task is not None
    assert not refresher._task.done()

    await refresher.stop()
    assert refresher._task.cancelled()


@pytest.mark.asyncio
async def test_async_token_refresher_refreshes():
    """Test that async refresher refreshes expiring tokens."""
    # Create mock credentials expiring in 4 minutes
    expiry = datetime.now(UTC) + timedelta(minutes=4)
    mock_creds = MockCredentials(expiry)

    manager = MagicMock(spec=GCPCredentialsManager)
    manager.get_credentials.return_value = mock_creds

    refresher = AsyncTokenRefresher(manager, check_interval_seconds=0.1, refresh_buffer_minutes=5)

    # Run one check
    await refresher._check_and_refresh()

    # Should have refreshed
    assert mock_creds.refresh_called


def test_gcp_credentials_manager_initialization():
    """Test GCPCredentialsManager initialization."""
    manager = GCPCredentialsManager(
        scopes=["scope1", "scope2"], impersonate_email="test@example.com", refresh_buffer_minutes=10
    )

    assert manager.scopes == ["scope1", "scope2"]
    assert manager.impersonate_email == "test@example.com"
    assert manager.refresh_buffer_minutes == 10


@patch("google.auth.default")
def test_gcp_credentials_manager_adc(mock_default):
    """Test loading credentials via ADC."""
    mock_creds = Mock()
    mock_default.return_value = (mock_creds, "test-project")

    manager = GCPCredentialsManager()
    creds = manager.get_credentials()

    assert creds == mock_creds
    mock_default.assert_called_once_with(scopes=manager.scopes)
