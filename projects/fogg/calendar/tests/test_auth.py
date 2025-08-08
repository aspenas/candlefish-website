"""Tests for authentication module"""

import os
from unittest.mock import MagicMock, patch

from src.auth import (
    SCOPES,
    build_calendar_service,
    build_directory_service,
    get_credentials,
    verify_scopes,
)


def test_scopes_defined():
    """Test that required scopes are defined."""
    assert len(SCOPES) == 2
    assert "https://www.googleapis.com/auth/calendar" in SCOPES
    assert "https://www.googleapis.com/auth/admin.directory.group.readonly" in SCOPES


@patch("os.environ.get")
@patch("os.path.exists")
@patch("google.auth.default")
def test_get_credentials_with_adc(mock_default, mock_exists, mock_env_get):
    """Test credential retrieval with ADC."""
    mock_env_get.return_value = None  # No service account env var
    mock_exists.return_value = False  # No credentials.json
    mock_creds = MagicMock()
    mock_default.return_value = (mock_creds, "test-project")

    creds = get_credentials()

    assert creds == mock_creds
    mock_default.assert_called_once_with(scopes=SCOPES)


@patch("os.path.exists")
@patch("src.auth.ServiceAccountCredentials.from_service_account_file")
def test_get_credentials_with_service_account(mock_from_file, mock_exists):
    """Test credential retrieval with service account."""
    mock_exists.return_value = True
    mock_creds = MagicMock()
    mock_from_file.return_value = mock_creds

    with patch.dict(os.environ, {"GOOGLE_APPLICATION_CREDENTIALS": "/path/to/sa.json"}):
        creds = get_credentials()

    assert creds == mock_creds
    mock_from_file.assert_called_once_with("/path/to/sa.json", scopes=SCOPES)


def test_verify_scopes_with_scopes_attribute():
    """Test scope verification with credentials that have scopes attribute."""
    mock_creds = MagicMock()
    mock_creds.scopes = SCOPES

    assert verify_scopes(mock_creds) is True


def test_verify_scopes_without_scopes_attribute():
    """Test scope verification with service account credentials."""
    mock_creds = MagicMock()
    delattr(mock_creds, "scopes")

    assert verify_scopes(mock_creds) is True


@patch("src.auth.get_credentials")
@patch("src.auth.build")
def test_build_calendar_service(mock_build, mock_get_creds):
    """Test calendar service builder."""
    mock_creds = MagicMock()
    mock_get_creds.return_value = mock_creds
    mock_service = MagicMock()
    mock_build.return_value = mock_service

    service = build_calendar_service()

    assert service == mock_service
    mock_build.assert_called_once_with("calendar", "v3", credentials=mock_creds)


@patch("src.auth.get_credentials")
@patch("src.auth.build")
def test_build_directory_service(mock_build, mock_get_creds):
    """Test directory service builder."""
    mock_creds = MagicMock()
    mock_get_creds.return_value = mock_creds
    mock_service = MagicMock()
    mock_build.return_value = mock_service

    service = build_directory_service()

    assert service == mock_service
    mock_build.assert_called_once_with("admin", "directory_v1", credentials=mock_creds)
