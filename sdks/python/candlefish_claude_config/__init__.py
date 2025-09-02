"""
Candlefish Claude Configuration System Python SDK v2.0.0

A comprehensive Python client for managing Claude Code configurations,
integrating AI-powered development workflows across enterprise environments.

Visit https://candlefish.ai for more information.
"""

__version__ = "2.0.0"
__author__ = "Candlefish AI"
__email__ = "devops@candlefish.ai"
__homepage__ = "https://candlefish.ai"
__repository__ = "https://github.com/candlefish/claude-config-python"

from .client import CandlefishClaudeConfigClient
from .models import ConfigProfile, ConfigValidationError, WebSocketEvent
from .auth import APIKeyAuth, OAuth2Auth
from .exceptions import (
    CandlefishConfigException,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
)

__all__ = [
    "CandlefishClaudeConfigClient",
    "ConfigProfile", 
    "ConfigValidationError",
    "WebSocketEvent",
    "APIKeyAuth",
    "OAuth2Auth",
    "CandlefishConfigException",
    "AuthenticationError",
    "ValidationError", 
    "NotFoundError",
    "RateLimitError",
]