"""
Main client for the Candlefish Claude Configuration System SDK.

Provides a comprehensive Python interface for managing configuration profiles
and interacting with the Claude Configuration System API v2.0.
"""

import logging
from typing import List, Optional, Dict, Any, Union
from urllib.parse import urljoin
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

from .models import ConfigProfile, ConfigValidationError, APIResponse, RateLimit
from .auth import BaseAuth, APIKeyAuth
from .exceptions import (
    CandlefishConfigException,
    exception_from_response,
    NetworkError,
    ConfigurationError
)
from .websocket import WebSocketClient


logger = logging.getLogger(__name__)


class CandlefishClaudeConfigClient:
    """
    Python SDK client for Candlefish Claude Configuration System v2.0.
    
    Provides a comprehensive interface for managing configuration profiles,
    authentication, model routing, analytics, and WebSocket events.
    
    For more information, visit: https://candlefish.ai
    """
    
    DEFAULT_BASE_URL = "https://api.candlefish.ai/v2.0"
    DEFAULT_TIMEOUT = 30.0
    
    def __init__(self, 
                 auth: Optional[BaseAuth] = None,
                 api_key: Optional[str] = None,
                 tier: str = "Pro",
                 base_url: Optional[str] = None,
                 timeout: float = DEFAULT_TIMEOUT,
                 max_retries: int = 3):
        """
        Initialize the Candlefish Claude Configuration client.
        
        Args:
            auth: Authentication instance (APIKeyAuth or OAuth2Auth)
            api_key: Enterprise API key (alternative to auth parameter)
            tier: Service tier (Free, Pro, Enterprise) - used with api_key
            base_url: Base URL for the API (defaults to production)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts for failed requests
            
        Examples:
            # Using API key
            client = CandlefishClaudeConfigClient(api_key="your-api-key")
            
            # Using explicit authentication
            auth = APIKeyAuth("your-api-key", "Enterprise")
            client = CandlefishClaudeConfigClient(auth=auth)
        """
        # Set up authentication
        if auth:
            self.auth = auth
        elif api_key:
            self.auth = APIKeyAuth(api_key, tier)
        else:
            raise ConfigurationError("Either 'auth' or 'api_key' parameter is required")
        
        # Configure client settings
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip('/')
        self.timeout = timeout
        
        # Set up HTTP session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE"],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Rate limiting info
        self.rate_limit: Optional[RateLimit] = None
        
        # WebSocket client (created on demand)
        self._websocket_client: Optional[WebSocketClient] = None
    
    def _make_request(self, method: str, endpoint: str, 
                     data: Optional[Dict[str, Any]] = None,
                     params: Optional[Dict[str, Any]] = None) -> APIResponse:
        """
        Make an HTTP request to the API.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (relative to base_url)
            data: Request body data (for POST/PUT requests)
            params: URL query parameters
            
        Returns:
            APIResponse with status, data, and error information
            
        Raises:
            CandlefishConfigException: For API errors
            NetworkError: For network connectivity issues
        """
        url = urljoin(self.base_url, endpoint.lstrip('/'))
        
        try:
            # Get authentication headers
            headers = self.auth.get_headers()
            
            # Make request
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=self.timeout
            )
            
            # Update rate limiting info
            if 'X-Rate-Limit-Tier' in response.headers:
                self.rate_limit = RateLimit.from_headers(response.headers)
            
            # Create API response
            api_response = APIResponse(
                status_code=response.status_code,
                headers=dict(response.headers)
            )
            
            # Parse response data
            if response.content:
                try:
                    api_response.data = response.json()
                except ValueError:
                    api_response.data = response.text
            
            # Handle errors
            if not api_response.is_success:
                error_message = "API request failed"
                error_data = None
                
                if isinstance(api_response.data, dict):
                    error_message = api_response.data.get('message', error_message)
                    error_data = api_response.data
                elif isinstance(api_response.data, str):
                    error_message = api_response.data
                
                # Create and set error object
                if response.status_code == 400 and error_data:
                    api_response.error = ConfigValidationError(**error_data)
                
                # Raise appropriate exception
                raise exception_from_response(
                    response.status_code, 
                    error_message, 
                    error_data
                )
            
            return api_response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error during {method} {url}: {e}")
            raise NetworkError(f"Network error: {e}", e)
    
    # Configuration Profile Management
    
    def list_profiles(self) -> List[ConfigProfile]:
        """
        Retrieve all available configuration profiles.
        
        Returns:
            List of ConfigProfile instances
            
        Raises:
            CandlefishConfigException: If the request fails
            
        Example:
            profiles = client.list_profiles()
            for profile in profiles:
                print(f"Profile: {profile.name} (v{profile.version})")
        """
        response = self._make_request("GET", "/config/profiles")
        
        if not isinstance(response.data, list):
            raise CandlefishConfigException("Invalid response format: expected list of profiles")
        
        return [ConfigProfile(**profile_data) for profile_data in response.data]
    
    def get_profile(self, profile_id: str) -> ConfigProfile:
        """
        Retrieve a specific configuration profile by ID.
        
        Args:
            profile_id: Unique identifier for the configuration profile
            
        Returns:
            ConfigProfile instance
            
        Raises:
            NotFoundError: If the profile doesn't exist
            CandlefishConfigException: If the request fails
            
        Example:
            profile = client.get_profile("prof_123456")
            print(f"Retrieved profile: {profile.name}")
        """
        response = self._make_request("GET", f"/config/profiles/{profile_id}")
        
        if not isinstance(response.data, dict):
            raise CandlefishConfigException("Invalid response format: expected profile object")
        
        return ConfigProfile(**response.data)
    
    def create_profile(self, profile: ConfigProfile) -> ConfigProfile:
        """
        Create a new configuration profile.
        
        Args:
            profile: ConfigProfile instance to create (profile_id should be None)
            
        Returns:
            Created ConfigProfile with assigned profile_id
            
        Raises:
            ValidationError: If the profile data is invalid
            CandlefishConfigException: If the request fails
            
        Example:
            profile = ConfigProfile(
                name="My Dev Config",
                description="Development environment configuration",
                settings={"language": "python", "framework": "fastapi"}
            )
            created = client.create_profile(profile)
            print(f"Created profile with ID: {created.profile_id}")
        """
        if profile.profile_id is not None:
            raise ValueError("Profile ID should be None for new profiles")
        
        response = self._make_request("POST", "/config/profiles", data=profile.to_dict())
        
        if not isinstance(response.data, dict):
            raise CandlefishConfigException("Invalid response format: expected profile object")
        
        return ConfigProfile(**response.data)
    
    def update_profile(self, profile: ConfigProfile) -> ConfigProfile:
        """
        Update an existing configuration profile.
        
        Args:
            profile: ConfigProfile instance with updates (must have profile_id)
            
        Returns:
            Updated ConfigProfile instance
            
        Raises:
            ValidationError: If the profile data is invalid
            NotFoundError: If the profile doesn't exist
            CandlefishConfigException: If the request fails
            
        Example:
            profile = client.get_profile("prof_123456")
            profile.description = "Updated description"
            updated = client.update_profile(profile)
        """
        if not profile.profile_id:
            raise ValueError("Profile must have a profile_id for updates")
        
        response = self._make_request(
            "PUT", 
            f"/config/profiles/{profile.profile_id}", 
            data=profile.to_dict()
        )
        
        if not isinstance(response.data, dict):
            raise CandlefishConfigException("Invalid response format: expected profile object")
        
        return ConfigProfile(**response.data)
    
    def delete_profile(self, profile_id: str) -> bool:
        """
        Delete a configuration profile.
        
        Args:
            profile_id: Unique identifier for the profile to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            NotFoundError: If the profile doesn't exist
            AuthorizationError: If insufficient permissions
            CandlefishConfigException: If the request fails
            
        Example:
            success = client.delete_profile("prof_123456")
            if success:
                print("Profile deleted successfully")
        """
        self._make_request("DELETE", f"/config/profiles/{profile_id}")
        return True
    
    # Analytics and Monitoring
    
    def get_analytics(self, profile_id: Optional[str] = None,
                     start_date: Optional[str] = None,
                     end_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieve analytics data for configuration usage.
        
        Args:
            profile_id: Optional specific profile ID to analyze
            start_date: Optional start date (ISO format)
            end_date: Optional end date (ISO format)
            
        Returns:
            Dictionary containing analytics data
        """
        params = {}
        if profile_id:
            params['profile_id'] = profile_id
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date
        
        response = self._make_request("GET", "/analytics/config-usage", params=params)
        return response.data or {}
    
    def get_rate_limit_status(self) -> Optional[RateLimit]:
        """
        Get current rate limiting status.
        
        Returns:
            RateLimit instance with current status, or None if not available
        """
        return self.rate_limit
    
    # WebSocket Support
    
    def get_websocket_client(self) -> WebSocketClient:
        """
        Get WebSocket client for real-time configuration events.
        
        Returns:
            WebSocketClient instance configured with current authentication
            
        Example:
            ws_client = client.get_websocket_client()
            
            async def handle_config_update(event):
                print(f"Config updated: {event.payload}")
            
            ws_client.on_event("config.updated", handle_config_update)
            
            async with ws_client:
                async for event in ws_client.listen_for_events():
                    print(f"Received event: {event.event_type}")
        """
        if not self._websocket_client:
            ws_base_url = self.base_url.replace("https://", "wss://").replace("http://", "ws://")
            self._websocket_client = WebSocketClient(self.auth, ws_base_url)
        
        return self._websocket_client
    
    # Utility Methods
    
    def health_check(self) -> bool:
        """
        Perform a health check on the API.
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            response = self._make_request("GET", "/health")
            return response.is_success
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            return False
    
    def get_api_version(self) -> Dict[str, Any]:
        """
        Get API version information.
        
        Returns:
            Dictionary with version and feature information
        """
        try:
            response = self._make_request("GET", "/version")
            return response.data or {}
        except Exception:
            return {"version": "unknown", "features": []}
    
    def __repr__(self) -> str:
        """String representation of the client."""
        auth_type = type(self.auth).__name__
        return f"CandlefishClaudeConfigClient(auth={auth_type}, base_url={self.base_url})"


# Export the main client class
__all__ = ["CandlefishClaudeConfigClient"]