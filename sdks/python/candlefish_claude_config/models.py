"""
Data models for the Candlefish Claude Configuration System.

These models correspond to the OpenAPI schema definitions and provide
type-safe Python representations of API data structures.
"""

from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from dataclasses import dataclass, asdict, field
from pydantic import BaseModel, Field, validator
import json


class ConfigProfile(BaseModel):
    """
    Configuration Profile model based on OpenAPI schema.
    
    Represents a complete configuration profile with settings,
    metadata, and version information.
    """
    
    profile_id: Optional[str] = Field(None, description="Unique identifier for the configuration profile")
    name: str = Field(..., description="Human-readable name of the configuration profile")
    version: str = Field(default="2.0.0", description="Semantic version of the configuration")
    description: Optional[str] = Field(None, description="Optional description of the profile")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Nested configuration settings")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata about the profile")
    
    class Config:
        """Pydantic model configuration."""
        extra = "forbid"
        validate_assignment = True
        
    @validator('name')
    def validate_name(cls, v):
        """Validate profile name."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Profile name cannot be empty")
        if len(v) > 100:
            raise ValueError("Profile name cannot exceed 100 characters")
        return v.strip()
    
    @validator('version')
    def validate_version(cls, v):
        """Validate semantic version format."""
        import re
        if not re.match(r'^\d+\.\d+\.\d+(-[\w\.-]+)?(\+[\w\.-]+)?$', v):
            raise ValueError("Version must follow semantic versioning format (e.g., 2.0.0)")
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values."""
        return {k: v for k, v in self.dict().items() if v is not None}
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return self.json(exclude_none=True, indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConfigProfile":
        """Create ConfigProfile from dictionary."""
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str: str) -> "ConfigProfile":
        """Create ConfigProfile from JSON string."""
        return cls.parse_raw(json_str)


class ConfigValidationError(BaseModel):
    """
    Configuration validation error model.
    
    Represents validation errors returned by the API when
    configuration data is invalid or malformed.
    """
    
    code: str = Field(..., description="Error code identifier")
    message: str = Field(..., description="Human-readable error message")
    details: List[str] = Field(default_factory=list, description="Additional error details")
    
    class Config:
        """Pydantic model configuration."""
        extra = "forbid"
        
    def __str__(self) -> str:
        """String representation of the error."""
        base_msg = f"[{self.code}] {self.message}"
        if self.details:
            base_msg += f"\nDetails: {', '.join(self.details)}"
        return base_msg


class WebSocketEvent(BaseModel):
    """
    WebSocket event model for real-time configuration updates.
    
    Represents events broadcast over the WebSocket connection
    when configuration changes occur.
    """
    
    event_type: str = Field(..., description="Type of the event")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event payload data")
    timestamp: Optional[datetime] = Field(None, description="Event timestamp")
    
    class Config:
        """Pydantic model configuration."""
        extra = "forbid"
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    @validator('event_type')
    def validate_event_type(cls, v):
        """Validate event type."""
        valid_types = [
            'config.created',
            'config.updated', 
            'config.deleted',
            'config.validated',
            'config.error',
            'system.maintenance',
            'auth.token_refresh'
        ]
        if v not in valid_types:
            raise ValueError(f"Invalid event type: {v}. Must be one of {valid_types}")
        return v


@dataclass
class APIResponse:
    """
    Generic API response wrapper.
    
    Provides a consistent structure for API responses with
    status information and data payload.
    """
    
    status_code: int
    data: Optional[Union[Dict[str, Any], List[Any]]] = None
    error: Optional[ConfigValidationError] = None
    headers: Dict[str, str] = field(default_factory=dict)
    
    @property
    def is_success(self) -> bool:
        """Check if the response indicates success."""
        return 200 <= self.status_code < 300
    
    @property
    def is_client_error(self) -> bool:
        """Check if the response indicates a client error."""
        return 400 <= self.status_code < 500
    
    @property
    def is_server_error(self) -> bool:
        """Check if the response indicates a server error."""
        return 500 <= self.status_code < 600


@dataclass 
class RateLimit:
    """
    Rate limiting information.
    
    Contains rate limit status and tier information
    from API response headers.
    """
    
    tier: str
    requests_per_minute: int
    remaining: int
    reset_time: Optional[datetime] = None
    max_profiles: Optional[int] = None
    
    @classmethod
    def from_headers(cls, headers: Dict[str, str]) -> "RateLimit":
        """Create RateLimit from response headers."""
        return cls(
            tier=headers.get("X-Rate-Limit-Tier", "unknown"),
            requests_per_minute=int(headers.get("X-Rate-Limit-Limit", "0")),
            remaining=int(headers.get("X-Rate-Limit-Remaining", "0")),
            reset_time=datetime.fromisoformat(headers["X-Rate-Limit-Reset"]) if "X-Rate-Limit-Reset" in headers else None,
            max_profiles=int(headers["X-Rate-Limit-Max-Profiles"]) if "X-Rate-Limit-Max-Profiles" in headers else None,
        )


# Export all models for easier imports
__all__ = [
    "ConfigProfile",
    "ConfigValidationError", 
    "WebSocketEvent",
    "APIResponse",
    "RateLimit"
]