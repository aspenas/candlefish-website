"""
Tests for the main client class.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import requests

from candlefish_claude_config.client import CandlefishClaudeConfigClient
from candlefish_claude_config.auth import APIKeyAuth
from candlefish_claude_config.models import ConfigProfile, APIResponse
from candlefish_claude_config.exceptions import (
    CandlefishConfigException,
    ConfigurationError,
    NotFoundError,
    ValidationError,
    NetworkError
)


class TestCandlefishClaudeConfigClient:
    """Tests for CandlefishClaudeConfigClient class."""
    
    def test_init_with_api_key(self):
        """Test client initialization with API key."""
        client = CandlefishClaudeConfigClient(api_key="test-key")
        
        assert isinstance(client.auth, APIKeyAuth)
        assert client.auth.api_key == "test-key"
        assert client.auth.tier == "Pro"  # Default tier
        assert client.base_url == "https://api.candlefish.ai/v2.0"
        assert client.timeout == 30.0
    
    def test_init_with_api_key_and_tier(self):
        """Test client initialization with API key and custom tier."""
        client = CandlefishClaudeConfigClient(api_key="test-key", tier="Enterprise")
        
        assert client.auth.tier == "Enterprise"
    
    def test_init_with_auth_object(self):
        """Test client initialization with auth object."""
        auth = APIKeyAuth("test-key", "Pro")
        client = CandlefishClaudeConfigClient(auth=auth)
        
        assert client.auth is auth
    
    def test_init_with_custom_base_url(self):
        """Test client initialization with custom base URL."""
        client = CandlefishClaudeConfigClient(
            api_key="test-key",
            base_url="https://staging.example.com/v2.0/"
        )
        
        # Should strip trailing slash
        assert client.base_url == "https://staging.example.com/v2.0"
    
    def test_init_with_custom_timeout(self):
        """Test client initialization with custom timeout."""
        client = CandlefishClaudeConfigClient(api_key="test-key", timeout=60.0)
        
        assert client.timeout == 60.0
    
    def test_init_no_auth(self):
        """Test that missing authentication raises error."""
        with pytest.raises(ConfigurationError) as exc_info:
            CandlefishClaudeConfigClient()
        
        assert "Either 'auth' or 'api_key' parameter is required" in str(exc_info.value)
    
    @patch('candlefish_claude_config.client.requests.Session.request')
    def test_make_request_success(self, mock_request):
        """Test successful API request."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b'{"key": "value"}'
        mock_response.json.return_value = {"key": "value"}
        mock_response.headers = {"Content-Type": "application/json"}
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        response = client._make_request("GET", "/test")
        
        assert response.status_code == 200
        assert response.data == {"key": "value"}
        assert response.error is None
        assert response.is_success is True
        
        # Verify request was made correctly
        mock_request.assert_called_once()
        call_kwargs = mock_request.call_args[1]
        assert call_kwargs["method"] == "GET"
        assert call_kwargs["url"] == "https://api.candlefish.ai/v2.0/test"
        assert "X-API-Key" in call_kwargs["headers"]
    
    @patch('candlefish_claude_config.client.requests.Session.request')
    def test_make_request_client_error(self, mock_request):
        """Test API request with client error."""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.content = b'{"message": "Bad request"}'
        mock_response.json.return_value = {"message": "Bad request"}
        mock_response.headers = {}
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        
        with pytest.raises(ValidationError) as exc_info:
            client._make_request("POST", "/test")
        
        assert exc_info.value.status_code == 400
        assert "Bad request" in str(exc_info.value)
    
    @patch('candlefish_claude_config.client.requests.Session.request')
    def test_make_request_network_error(self, mock_request):
        """Test API request with network error."""
        mock_request.side_effect = requests.RequestException("Connection failed")
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        
        with pytest.raises(NetworkError) as exc_info:
            client._make_request("GET", "/test")
        
        assert "Network error" in str(exc_info.value)
        assert "Connection failed" in str(exc_info.value)
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_list_profiles(self, mock_request):
        """Test listing configuration profiles."""
        mock_response = APIResponse(
            status_code=200,
            data=[
                {"profile_id": "prof_1", "name": "Profile 1", "version": "1.0.0"},
                {"profile_id": "prof_2", "name": "Profile 2", "version": "2.0.0"}
            ]
        )
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        profiles = client.list_profiles()
        
        assert len(profiles) == 2
        assert all(isinstance(p, ConfigProfile) for p in profiles)
        assert profiles[0].profile_id == "prof_1"
        assert profiles[1].name == "Profile 2"
        
        mock_request.assert_called_once_with("GET", "/config/profiles")
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_list_profiles_invalid_response(self, mock_request):
        """Test list profiles with invalid response format."""
        mock_response = APIResponse(
            status_code=200,
            data="invalid-format"  # Should be a list
        )
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        
        with pytest.raises(CandlefishConfigException) as exc_info:
            client.list_profiles()
        
        assert "Invalid response format" in str(exc_info.value)
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_get_profile(self, mock_request):
        """Test getting a specific profile."""
        profile_data = {
            "profile_id": "prof_123",
            "name": "Test Profile",
            "version": "1.0.0",
            "description": "Test description"
        }
        mock_response = APIResponse(status_code=200, data=profile_data)
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        profile = client.get_profile("prof_123")
        
        assert isinstance(profile, ConfigProfile)
        assert profile.profile_id == "prof_123"
        assert profile.name == "Test Profile"
        assert profile.version == "1.0.0"
        assert profile.description == "Test description"
        
        mock_request.assert_called_once_with("GET", "/config/profiles/prof_123")
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_create_profile(self, mock_request):
        """Test creating a new profile."""
        input_profile = ConfigProfile(
            name="New Profile",
            description="New description",
            settings={"key": "value"}
        )
        
        created_profile_data = {
            "profile_id": "prof_new",
            "name": "New Profile",
            "version": "2.0.0",
            "description": "New description",
            "settings": {"key": "value"}
        }
        mock_response = APIResponse(status_code=201, data=created_profile_data)
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        created_profile = client.create_profile(input_profile)
        
        assert isinstance(created_profile, ConfigProfile)
        assert created_profile.profile_id == "prof_new"
        assert created_profile.name == "New Profile"
        
        # Verify request was made with correct data
        mock_request.assert_called_once_with(
            "POST", "/config/profiles", data=input_profile.to_dict()
        )
    
    def test_create_profile_with_id(self):
        """Test that creating profile with ID raises error."""
        profile_with_id = ConfigProfile(
            profile_id="existing_id",
            name="Profile"
        )
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        
        with pytest.raises(ValueError) as exc_info:
            client.create_profile(profile_with_id)
        
        assert "Profile ID should be None for new profiles" in str(exc_info.value)
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_update_profile(self, mock_request):
        """Test updating an existing profile."""
        update_profile = ConfigProfile(
            profile_id="prof_123",
            name="Updated Profile",
            version="1.1.0"
        )
        
        updated_profile_data = {
            "profile_id": "prof_123",
            "name": "Updated Profile",
            "version": "1.1.0"
        }
        mock_response = APIResponse(status_code=200, data=updated_profile_data)
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        updated_profile = client.update_profile(update_profile)
        
        assert isinstance(updated_profile, ConfigProfile)
        assert updated_profile.profile_id == "prof_123"
        assert updated_profile.name == "Updated Profile"
        
        mock_request.assert_called_once_with(
            "PUT", "/config/profiles/prof_123", data=update_profile.to_dict()
        )
    
    def test_update_profile_without_id(self):
        """Test that updating profile without ID raises error."""
        profile_without_id = ConfigProfile(name="Profile")
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        
        with pytest.raises(ValueError) as exc_info:
            client.update_profile(profile_without_id)
        
        assert "Profile must have a profile_id for updates" in str(exc_info.value)
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_delete_profile(self, mock_request):
        """Test deleting a profile."""
        mock_response = APIResponse(status_code=204)
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        result = client.delete_profile("prof_123")
        
        assert result is True
        mock_request.assert_called_once_with("DELETE", "/config/profiles/prof_123")
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_get_analytics(self, mock_request):
        """Test getting analytics data."""
        analytics_data = {
            "total_requests": 1000,
            "top_profile": "prof_popular",
            "usage_by_date": {}
        }
        mock_response = APIResponse(status_code=200, data=analytics_data)
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        analytics = client.get_analytics(
            profile_id="prof_123",
            start_date="2024-01-01",
            end_date="2024-01-31"
        )
        
        assert analytics == analytics_data
        
        # Verify request was made with correct parameters
        mock_request.assert_called_once()
        call_args = mock_request.call_args
        assert call_args[0] == ("GET", "/analytics/config-usage")
        expected_params = {
            "profile_id": "prof_123",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        assert call_args[1]["params"] == expected_params
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_health_check_success(self, mock_request):
        """Test successful health check."""
        mock_response = APIResponse(status_code=200, data={"status": "healthy"})
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        result = client.health_check()
        
        assert result is True
        mock_request.assert_called_once_with("GET", "/health")
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_health_check_failure(self, mock_request):
        """Test health check failure."""
        mock_request.side_effect = NetworkError("Connection failed")
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        result = client.health_check()
        
        assert result is False
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_get_api_version(self, mock_request):
        """Test getting API version information."""
        version_data = {
            "version": "2.0.0",
            "features": ["websockets", "analytics"]
        }
        mock_response = APIResponse(status_code=200, data=version_data)
        mock_request.return_value = mock_response
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        version = client.get_api_version()
        
        assert version == version_data
        mock_request.assert_called_once_with("GET", "/version")
    
    @patch('candlefish_claude_config.client.CandlefishClaudeConfigClient._make_request')
    def test_get_api_version_error(self, mock_request):
        """Test API version request with error."""
        mock_request.side_effect = NetworkError("Failed")
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        version = client.get_api_version()
        
        # Should return default values on error
        assert version == {"version": "unknown", "features": []}
    
    @patch('candlefish_claude_config.client.WebSocketClient')
    def test_get_websocket_client(self, mock_websocket_class):
        """Test getting WebSocket client."""
        mock_websocket_instance = Mock()
        mock_websocket_class.return_value = mock_websocket_instance
        
        client = CandlefishClaudeConfigClient(api_key="test-key")
        ws_client = client.get_websocket_client()
        
        # Should return the same instance on subsequent calls
        ws_client2 = client.get_websocket_client()
        assert ws_client is ws_client2
        
        # Verify WebSocket client was created correctly
        mock_websocket_class.assert_called_once_with(
            client.auth, "wss://api.candlefish.ai/v2.0"
        )
    
    def test_repr(self):
        """Test string representation of client."""
        client = CandlefishClaudeConfigClient(api_key="test-key")
        repr_str = repr(client)
        
        assert "CandlefishClaudeConfigClient" in repr_str
        assert "APIKeyAuth" in repr_str
        assert "https://api.candlefish.ai/v2.0" in repr_str