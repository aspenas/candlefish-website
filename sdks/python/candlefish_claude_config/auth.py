"""
Authentication mechanisms for the Candlefish Claude Configuration System SDK.

Supports both API Key and OAuth2 authentication methods as specified
in the OpenAPI specification.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import requests
from urllib.parse import urljoin

from .exceptions import AuthenticationError, ConfigurationError


class BaseAuth(ABC):
    """
    Abstract base class for authentication mechanisms.
    
    All authentication methods must implement the get_headers method
    to provide appropriate authentication headers for API requests.
    """
    
    @abstractmethod
    def get_headers(self) -> Dict[str, str]:
        """
        Get authentication headers for API requests.
        
        Returns:
            Dictionary of HTTP headers for authentication
        """
        pass
    
    @abstractmethod
    def is_valid(self) -> bool:
        """
        Check if the authentication is currently valid.
        
        Returns:
            True if authentication is valid, False otherwise
        """
        pass


class APIKeyAuth(BaseAuth):
    """
    API Key authentication implementation.
    
    Uses the X-API-Key header for authentication as specified
    in the OpenAPI security schemes.
    """
    
    def __init__(self, api_key: str, tier: str = "Pro"):
        """
        Initialize API Key authentication.
        
        Args:
            api_key: Enterprise API key from Candlefish
            tier: Service tier (Free, Pro, Enterprise)
        """
        if not api_key or not isinstance(api_key, str):
            raise ConfigurationError("API key must be a non-empty string")
        
        if tier not in ["Free", "Pro", "Enterprise"]:
            raise ConfigurationError("Tier must be one of: Free, Pro, Enterprise")
        
        self.api_key = api_key
        self.tier = tier
    
    def get_headers(self) -> Dict[str, str]:
        """
        Get API key authentication headers.
        
        Returns:
            Dictionary containing X-API-Key and X-Tier headers
        """
        return {
            "X-API-Key": self.api_key,
            "X-Tier": self.tier,
            "Content-Type": "application/json"
        }
    
    def is_valid(self) -> bool:
        """
        Check if API key is valid (always True for API keys).
        
        Returns:
            Always True (API keys don't expire)
        """
        return True


class OAuth2Auth(BaseAuth):
    """
    OAuth2 authentication implementation.
    
    Supports the authorization code flow as specified in the OpenAPI
    security schemes with automatic token refresh.
    """
    
    def __init__(self, client_id: str, client_secret: str, 
                 base_url: str = "https://auth.candlefish.ai",
                 scopes: Optional[list] = None):
        """
        Initialize OAuth2 authentication.
        
        Args:
            client_id: OAuth2 client ID
            client_secret: OAuth2 client secret
            base_url: Base URL for authentication server
            scopes: List of requested scopes
        """
        if not client_id or not client_secret:
            raise ConfigurationError("OAuth2 client ID and secret are required")
        
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url.rstrip('/')
        self.scopes = scopes or ["read:config", "write:config"]
        
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
    
    def get_authorization_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """
        Get the authorization URL for the OAuth2 flow.
        
        Args:
            redirect_uri: URI to redirect to after authorization
            state: Optional state parameter for CSRF protection
        
        Returns:
            Authorization URL
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "response_type": "code"
        }
        
        if state:
            params["state"] = state
        
        auth_url = urljoin(self.base_url, "/oauth/authorize")
        query_params = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{auth_url}?{query_params}"
    
    def exchange_code_for_token(self, code: str, redirect_uri: str) -> None:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code from the callback
            redirect_uri: The same redirect URI used in authorization
        """
        token_url = urljoin(self.base_url, "/oauth/token")
        
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": redirect_uri
        }
        
        try:
            response = requests.post(token_url, data=data, timeout=30)
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data["access_token"]
            self.refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)  # Default 1 hour
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            
        except requests.RequestException as e:
            raise AuthenticationError(f"Failed to exchange code for token: {e}")
        except KeyError as e:
            raise AuthenticationError(f"Invalid token response: missing {e}")
    
    def refresh_access_token(self) -> None:
        """
        Refresh the access token using the refresh token.
        """
        if not self.refresh_token:
            raise AuthenticationError("No refresh token available")
        
        token_url = urljoin(self.base_url, "/oauth/token")
        
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token
        }
        
        try:
            response = requests.post(token_url, data=data, timeout=30)
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data["access_token"]
            # Refresh token might be rotated
            if "refresh_token" in token_data:
                self.refresh_token = token_data["refresh_token"]
            
            expires_in = token_data.get("expires_in", 3600)
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            
        except requests.RequestException as e:
            raise AuthenticationError(f"Failed to refresh token: {e}")
        except KeyError as e:
            raise AuthenticationError(f"Invalid token response: missing {e}")
    
    def get_headers(self) -> Dict[str, str]:
        """
        Get OAuth2 authentication headers.
        
        Returns:
            Dictionary containing Authorization header with Bearer token
        """
        if not self.access_token:
            raise AuthenticationError("No access token available. Complete OAuth2 flow first.")
        
        # Auto-refresh token if it's expired
        if not self.is_valid() and self.refresh_token:
            self.refresh_access_token()
        
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def is_valid(self) -> bool:
        """
        Check if the access token is valid and not expired.
        
        Returns:
            True if token is valid, False otherwise
        """
        if not self.access_token:
            return False
        
        if not self.token_expires_at:
            return True  # No expiration info, assume valid
        
        # Add 5-minute buffer to account for network delays
        buffer = timedelta(minutes=5)
        return datetime.now() + buffer < self.token_expires_at
    
    def set_tokens(self, access_token: str, refresh_token: Optional[str] = None,
                   expires_in: Optional[int] = None) -> None:
        """
        Manually set tokens (useful for stored tokens).
        
        Args:
            access_token: OAuth2 access token
            refresh_token: OAuth2 refresh token (optional)
            expires_in: Token expiration time in seconds (optional)
        """
        self.access_token = access_token
        self.refresh_token = refresh_token
        
        if expires_in:
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)


# Export authentication classes
__all__ = [
    "BaseAuth",
    "APIKeyAuth", 
    "OAuth2Auth"
]