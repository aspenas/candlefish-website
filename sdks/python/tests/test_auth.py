"""
Tests for the auth module.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import requests

from candlefish_claude_config.auth import APIKeyAuth, OAuth2Auth
from candlefish_claude_config.exceptions import AuthenticationError, ConfigurationError


class TestAPIKeyAuth:
    """Tests for APIKeyAuth class."""
    
    def test_valid_api_key_auth(self):
        """Test creating APIKeyAuth with valid parameters."""
        auth = APIKeyAuth("test-api-key", "Pro")
        
        assert auth.api_key == "test-api-key"
        assert auth.tier == "Pro"
    
    def test_default_tier(self):
        """Test that default tier is Pro."""
        auth = APIKeyAuth("test-api-key")
        assert auth.tier == "Pro"
    
    def test_empty_api_key(self):
        """Test that empty API key raises error."""
        with pytest.raises(ConfigurationError) as exc_info:
            APIKeyAuth("")
        
        assert "must be a non-empty string" in str(exc_info.value)
    
    def test_none_api_key(self):
        """Test that None API key raises error."""
        with pytest.raises(ConfigurationError) as exc_info:
            APIKeyAuth(None)
        
        assert "must be a non-empty string" in str(exc_info.value)
    
    def test_invalid_tier(self):
        """Test that invalid tier raises error."""
        with pytest.raises(ConfigurationError) as exc_info:
            APIKeyAuth("test-key", "InvalidTier")
        
        assert "must be one of: Free, Pro, Enterprise" in str(exc_info.value)
    
    def test_valid_tiers(self):
        """Test all valid tier values."""
        valid_tiers = ["Free", "Pro", "Enterprise"]
        
        for tier in valid_tiers:
            auth = APIKeyAuth("test-key", tier)
            assert auth.tier == tier
    
    def test_get_headers(self):
        """Test getting authentication headers."""
        auth = APIKeyAuth("test-api-key", "Enterprise")
        headers = auth.get_headers()
        
        expected_headers = {
            "X-API-Key": "test-api-key",
            "X-Tier": "Enterprise",
            "Content-Type": "application/json"
        }
        
        assert headers == expected_headers
    
    def test_is_valid(self):
        """Test that API key auth is always valid."""
        auth = APIKeyAuth("test-key")
        assert auth.is_valid() is True


class TestOAuth2Auth:
    """Tests for OAuth2Auth class."""
    
    def test_valid_oauth2_auth(self):
        """Test creating OAuth2Auth with valid parameters."""
        auth = OAuth2Auth("client-id", "client-secret")
        
        assert auth.client_id == "client-id"
        assert auth.client_secret == "client-secret"
        assert auth.base_url == "https://auth.candlefish.ai"
        assert auth.scopes == ["read:config", "write:config"]
    
    def test_custom_base_url(self):
        """Test OAuth2Auth with custom base URL."""
        auth = OAuth2Auth("client-id", "client-secret", 
                         base_url="https://custom-auth.example.com/")
        
        # Should strip trailing slash
        assert auth.base_url == "https://custom-auth.example.com"
    
    def test_custom_scopes(self):
        """Test OAuth2Auth with custom scopes."""
        scopes = ["read:config", "admin:config"]
        auth = OAuth2Auth("client-id", "client-secret", scopes=scopes)
        
        assert auth.scopes == scopes
    
    def test_empty_client_id(self):
        """Test that empty client ID raises error."""
        with pytest.raises(ConfigurationError) as exc_info:
            OAuth2Auth("", "client-secret")
        
        assert "client ID and secret are required" in str(exc_info.value)
    
    def test_empty_client_secret(self):
        """Test that empty client secret raises error."""
        with pytest.raises(ConfigurationError) as exc_info:
            OAuth2Auth("client-id", "")
        
        assert "client ID and secret are required" in str(exc_info.value)
    
    def test_get_authorization_url(self):
        """Test generating authorization URL."""
        auth = OAuth2Auth("client-id", "client-secret")
        
        url = auth.get_authorization_url(
            redirect_uri="https://example.com/callback",
            state="random-state"
        )
        
        expected_params = [
            "client_id=client-id",
            "redirect_uri=https://example.com/callback",
            "scope=read:config write:config",
            "response_type=code",
            "state=random-state"
        ]
        
        for param in expected_params:
            assert param in url
        
        assert url.startswith("https://auth.candlefish.ai/oauth/authorize?")
    
    def test_get_authorization_url_no_state(self):
        """Test generating authorization URL without state."""
        auth = OAuth2Auth("client-id", "client-secret")
        
        url = auth.get_authorization_url("https://example.com/callback")
        
        assert "state=" not in url
        assert "client_id=client-id" in url
        assert "redirect_uri=https://example.com/callback" in url
    
    @patch('candlefish_claude_config.auth.requests.post')
    def test_exchange_code_for_token_success(self, mock_post):
        """Test successful code exchange for token."""
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "expires_in": 3600
        }
        mock_post.return_value = mock_response
        
        auth = OAuth2Auth("client-id", "client-secret")
        
        auth.exchange_code_for_token(
            code="auth-code",
            redirect_uri="https://example.com/callback"
        )
        
        assert auth.access_token == "access-token"
        assert auth.refresh_token == "refresh-token"
        assert auth.token_expires_at is not None
        
        # Verify request was made correctly
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == "https://auth.candlefish.ai/oauth/token"
        assert call_args[1]["data"]["grant_type"] == "authorization_code"
        assert call_args[1]["data"]["code"] == "auth-code"
    
    @patch('candlefish_claude_config.auth.requests.post')
    def test_exchange_code_for_token_network_error(self, mock_post):
        """Test code exchange with network error."""
        mock_post.side_effect = requests.RequestException("Network error")
        
        auth = OAuth2Auth("client-id", "client-secret")
        
        with pytest.raises(AuthenticationError) as exc_info:
            auth.exchange_code_for_token("auth-code", "https://example.com/callback")
        
        assert "Failed to exchange code for token" in str(exc_info.value)
    
    @patch('candlefish_claude_config.auth.requests.post')
    def test_exchange_code_for_token_invalid_response(self, mock_post):
        """Test code exchange with invalid response."""
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"invalid": "response"}  # Missing access_token
        mock_post.return_value = mock_response
        
        auth = OAuth2Auth("client-id", "client-secret")
        
        with pytest.raises(AuthenticationError) as exc_info:
            auth.exchange_code_for_token("auth-code", "https://example.com/callback")
        
        assert "Invalid token response" in str(exc_info.value)
    
    @patch('candlefish_claude_config.auth.requests.post')
    def test_refresh_access_token_success(self, mock_post):
        """Test successful token refresh."""
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
            "expires_in": 3600
        }
        mock_post.return_value = mock_response
        
        auth = OAuth2Auth("client-id", "client-secret")
        auth.refresh_token = "old-refresh-token"
        
        auth.refresh_access_token()
        
        assert auth.access_token == "new-access-token"
        assert auth.refresh_token == "new-refresh-token"
        assert auth.token_expires_at is not None
    
    def test_refresh_access_token_no_refresh_token(self):
        """Test token refresh without refresh token."""
        auth = OAuth2Auth("client-id", "client-secret")
        
        with pytest.raises(AuthenticationError) as exc_info:
            auth.refresh_access_token()
        
        assert "No refresh token available" in str(exc_info.value)
    
    def test_get_headers_no_token(self):
        """Test getting headers without access token."""
        auth = OAuth2Auth("client-id", "client-secret")
        
        with pytest.raises(AuthenticationError) as exc_info:
            auth.get_headers()
        
        assert "No access token available" in str(exc_info.value)
    
    @patch('candlefish_claude_config.auth.OAuth2Auth.refresh_access_token')
    def test_get_headers_with_token(self, mock_refresh):
        """Test getting headers with valid access token."""
        auth = OAuth2Auth("client-id", "client-secret")
        auth.access_token = "access-token"
        auth.token_expires_at = datetime.now() + timedelta(hours=1)  # Valid for 1 hour
        
        headers = auth.get_headers()
        
        expected_headers = {
            "Authorization": "Bearer access-token",
            "Content-Type": "application/json"
        }
        
        assert headers == expected_headers
        mock_refresh.assert_not_called()  # Should not refresh if token is valid
    
    @patch('candlefish_claude_config.auth.OAuth2Auth.refresh_access_token')
    def test_get_headers_expired_token_auto_refresh(self, mock_refresh):
        """Test that expired tokens are automatically refreshed."""
        auth = OAuth2Auth("client-id", "client-secret")
        auth.access_token = "old-access-token"
        auth.refresh_token = "refresh-token"
        auth.token_expires_at = datetime.now() - timedelta(hours=1)  # Expired
        
        # Mock refresh to set new token
        def mock_refresh_func():
            auth.access_token = "new-access-token"
            auth.token_expires_at = datetime.now() + timedelta(hours=1)
        
        mock_refresh.side_effect = mock_refresh_func
        
        headers = auth.get_headers()
        
        expected_headers = {
            "Authorization": "Bearer new-access-token",
            "Content-Type": "application/json"
        }
        
        assert headers == expected_headers
        mock_refresh.assert_called_once()
    
    def test_is_valid_no_token(self):
        """Test is_valid with no access token."""
        auth = OAuth2Auth("client-id", "client-secret")
        assert auth.is_valid() is False
    
    def test_is_valid_with_token_no_expiry(self):
        """Test is_valid with token but no expiry info."""
        auth = OAuth2Auth("client-id", "client-secret")
        auth.access_token = "access-token"
        
        assert auth.is_valid() is True
    
    def test_is_valid_token_not_expired(self):
        """Test is_valid with non-expired token."""
        auth = OAuth2Auth("client-id", "client-secret")
        auth.access_token = "access-token"
        auth.token_expires_at = datetime.now() + timedelta(hours=1)
        
        assert auth.is_valid() is True
    
    def test_is_valid_token_expired(self):
        """Test is_valid with expired token."""
        auth = OAuth2Auth("client-id", "client-secret")
        auth.access_token = "access-token"
        auth.token_expires_at = datetime.now() - timedelta(hours=1)
        
        assert auth.is_valid() is False
    
    def test_is_valid_token_expires_soon(self):
        """Test is_valid with token expiring within buffer time."""
        auth = OAuth2Auth("client-id", "client-secret")
        auth.access_token = "access-token"
        auth.token_expires_at = datetime.now() + timedelta(minutes=2)  # Within 5-minute buffer
        
        assert auth.is_valid() is False
    
    def test_set_tokens(self):
        """Test manually setting tokens."""
        auth = OAuth2Auth("client-id", "client-secret")
        
        auth.set_tokens(
            access_token="manual-access-token",
            refresh_token="manual-refresh-token",
            expires_in=3600
        )
        
        assert auth.access_token == "manual-access-token"
        assert auth.refresh_token == "manual-refresh-token"
        assert auth.token_expires_at is not None
    
    def test_set_tokens_no_expiry(self):
        """Test setting tokens without expiry."""
        auth = OAuth2Auth("client-id", "client-secret")
        
        auth.set_tokens(
            access_token="manual-access-token",
            refresh_token="manual-refresh-token"
        )
        
        assert auth.access_token == "manual-access-token"
        assert auth.refresh_token == "manual-refresh-token"
        assert auth.token_expires_at is None