"""
Tests for the models module.
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from candlefish_claude_config.models import (
    ConfigProfile,
    ConfigValidationError,
    WebSocketEvent,
    APIResponse,
    RateLimit
)


class TestConfigProfile:
    """Tests for ConfigProfile model."""
    
    def test_valid_profile_creation(self):
        """Test creating a valid configuration profile."""
        profile = ConfigProfile(
            profile_id="prof_123",
            name="Test Profile",
            version="2.0.0",
            description="Test description",
            settings={"key": "value"},
            metadata={"created_by": "test"}
        )
        
        assert profile.profile_id == "prof_123"
        assert profile.name == "Test Profile"
        assert profile.version == "2.0.0"
        assert profile.description == "Test description"
        assert profile.settings == {"key": "value"}
        assert profile.metadata == {"created_by": "test"}
    
    def test_minimal_profile_creation(self):
        """Test creating a profile with minimal required fields."""
        profile = ConfigProfile(name="Minimal Profile")
        
        assert profile.profile_id is None
        assert profile.name == "Minimal Profile"
        assert profile.version == "2.0.0"  # Default version
        assert profile.description is None
        assert profile.settings == {}  # Default empty dict
        assert profile.metadata == {}  # Default empty dict
    
    def test_empty_name_validation(self):
        """Test that empty names are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ConfigProfile(name="")
        
        error = exc_info.value.errors()[0]
        assert error["loc"] == ("name",)
        assert "cannot be empty" in error["msg"]
    
    def test_whitespace_name_validation(self):
        """Test that whitespace-only names are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ConfigProfile(name="   ")
        
        error = exc_info.value.errors()[0]
        assert error["loc"] == ("name",)
        assert "cannot be empty" in error["msg"]
    
    def test_long_name_validation(self):
        """Test that overly long names are rejected."""
        long_name = "x" * 101
        with pytest.raises(ValidationError) as exc_info:
            ConfigProfile(name=long_name)
        
        error = exc_info.value.errors()[0]
        assert error["loc"] == ("name",)
        assert "cannot exceed 100 characters" in error["msg"]
    
    def test_invalid_version_validation(self):
        """Test that invalid semantic versions are rejected."""
        invalid_versions = ["1.0", "1.0.0.1", "invalid", "1.0.0-", "1.0.0+"]
        
        for version in invalid_versions:
            with pytest.raises(ValidationError) as exc_info:
                ConfigProfile(name="Test", version=version)
            
            error = exc_info.value.errors()[0]
            assert error["loc"] == ("version",)
            assert "semantic versioning format" in error["msg"]
    
    def test_valid_version_formats(self):
        """Test that valid semantic versions are accepted."""
        valid_versions = [
            "1.0.0",
            "2.1.3", 
            "1.0.0-alpha",
            "1.0.0-beta.1",
            "1.0.0+build.1",
            "1.0.0-alpha.1+build.2"
        ]
        
        for version in valid_versions:
            profile = ConfigProfile(name="Test", version=version)
            assert profile.version == version
    
    def test_name_trimming(self):
        """Test that names are properly trimmed."""
        profile = ConfigProfile(name="  Test Profile  ")
        assert profile.name == "Test Profile"
    
    def test_to_dict(self):
        """Test converting profile to dictionary."""
        profile = ConfigProfile(
            name="Test",
            description="Test desc",
            settings={"key": "value"}
        )
        
        profile_dict = profile.to_dict()
        
        # Should not include None values
        assert "profile_id" not in profile_dict
        assert profile_dict["name"] == "Test"
        assert profile_dict["version"] == "2.0.0"
        assert profile_dict["description"] == "Test desc"
        assert profile_dict["settings"] == {"key": "value"}
        assert profile_dict["metadata"] == {}
    
    def test_to_json(self):
        """Test converting profile to JSON."""
        profile = ConfigProfile(
            name="Test",
            settings={"nested": {"key": "value"}}
        )
        
        json_str = profile.to_json()
        assert '"name": "Test"' in json_str
        assert '"profile_id"' not in json_str  # Should exclude None
    
    def test_from_dict(self):
        """Test creating profile from dictionary."""
        data = {
            "profile_id": "prof_123",
            "name": "Test Profile",
            "version": "1.0.0",
            "settings": {"key": "value"}
        }
        
        profile = ConfigProfile.from_dict(data)
        assert profile.profile_id == "prof_123"
        assert profile.name == "Test Profile"
        assert profile.version == "1.0.0"
        assert profile.settings == {"key": "value"}
    
    def test_from_json(self):
        """Test creating profile from JSON string."""
        json_str = '{"name": "Test Profile", "version": "1.0.0"}'
        
        profile = ConfigProfile.from_json(json_str)
        assert profile.name == "Test Profile"
        assert profile.version == "1.0.0"


class TestConfigValidationError:
    """Tests for ConfigValidationError model."""
    
    def test_basic_error_creation(self):
        """Test creating a basic validation error."""
        error = ConfigValidationError(
            code="INVALID_NAME",
            message="Profile name is invalid"
        )
        
        assert error.code == "INVALID_NAME"
        assert error.message == "Profile name is invalid"
        assert error.details == []
    
    def test_error_with_details(self):
        """Test creating an error with details."""
        error = ConfigValidationError(
            code="VALIDATION_ERROR",
            message="Multiple validation errors",
            details=["Name is required", "Version format invalid"]
        )
        
        assert error.code == "VALIDATION_ERROR"
        assert error.message == "Multiple validation errors"
        assert len(error.details) == 2
        assert "Name is required" in error.details
        assert "Version format invalid" in error.details
    
    def test_error_string_representation(self):
        """Test string representation of error."""
        error = ConfigValidationError(
            code="TEST_ERROR",
            message="Test message"
        )
        
        error_str = str(error)
        assert "[TEST_ERROR]" in error_str
        assert "Test message" in error_str
    
    def test_error_string_with_details(self):
        """Test string representation with details."""
        error = ConfigValidationError(
            code="TEST_ERROR",
            message="Test message",
            details=["Detail 1", "Detail 2"]
        )
        
        error_str = str(error)
        assert "[TEST_ERROR]" in error_str
        assert "Test message" in error_str
        assert "Details:" in error_str
        assert "Detail 1, Detail 2" in error_str


class TestWebSocketEvent:
    """Tests for WebSocketEvent model."""
    
    def test_basic_event_creation(self):
        """Test creating a basic WebSocket event."""
        event = WebSocketEvent(
            event_type="config.created",
            payload={"profile_id": "prof_123"},
            timestamp=datetime(2024, 1, 1, 12, 0, 0)
        )
        
        assert event.event_type == "config.created"
        assert event.payload == {"profile_id": "prof_123"}
        assert event.timestamp == datetime(2024, 1, 1, 12, 0, 0)
    
    def test_event_without_timestamp(self):
        """Test creating an event without timestamp."""
        event = WebSocketEvent(
            event_type="config.updated",
            payload={"key": "value"}
        )
        
        assert event.event_type == "config.updated"
        assert event.payload == {"key": "value"}
        assert event.timestamp is None
    
    def test_valid_event_types(self):
        """Test that valid event types are accepted."""
        valid_types = [
            "config.created",
            "config.updated",
            "config.deleted",
            "config.validated",
            "config.error",
            "system.maintenance",
            "auth.token_refresh"
        ]
        
        for event_type in valid_types:
            event = WebSocketEvent(event_type=event_type)
            assert event.event_type == event_type
    
    def test_invalid_event_type(self):
        """Test that invalid event types are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            WebSocketEvent(event_type="invalid.type")
        
        error = exc_info.value.errors()[0]
        assert error["loc"] == ("event_type",)
        assert "Invalid event type" in error["msg"]
    
    def test_empty_payload_default(self):
        """Test that payload defaults to empty dict."""
        event = WebSocketEvent(event_type="config.created")
        assert event.payload == {}


class TestAPIResponse:
    """Tests for APIResponse model."""
    
    def test_success_response(self):
        """Test successful API response."""
        response = APIResponse(
            status_code=200,
            data={"key": "value"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        assert response.data == {"key": "value"}
        assert response.error is None
        assert response.headers == {"Content-Type": "application/json"}
        assert response.is_success is True
        assert response.is_client_error is False
        assert response.is_server_error is False
    
    def test_client_error_response(self):
        """Test client error response."""
        error = ConfigValidationError(code="BAD_REQUEST", message="Invalid data")
        response = APIResponse(
            status_code=400,
            error=error
        )
        
        assert response.status_code == 400
        assert response.data is None
        assert response.error == error
        assert response.is_success is False
        assert response.is_client_error is True
        assert response.is_server_error is False
    
    def test_server_error_response(self):
        """Test server error response."""
        response = APIResponse(status_code=500)
        
        assert response.status_code == 500
        assert response.is_success is False
        assert response.is_client_error is False
        assert response.is_server_error is True
    
    def test_status_code_boundaries(self):
        """Test status code boundary conditions."""
        # Success boundaries
        assert APIResponse(status_code=200).is_success
        assert APIResponse(status_code=299).is_success
        assert not APIResponse(status_code=199).is_success
        assert not APIResponse(status_code=300).is_success
        
        # Client error boundaries
        assert APIResponse(status_code=400).is_client_error
        assert APIResponse(status_code=499).is_client_error
        assert not APIResponse(status_code=399).is_client_error
        assert not APIResponse(status_code=500).is_client_error
        
        # Server error boundaries
        assert APIResponse(status_code=500).is_server_error
        assert APIResponse(status_code=599).is_server_error
        assert not APIResponse(status_code=499).is_server_error
        assert not APIResponse(status_code=600).is_server_error


class TestRateLimit:
    """Tests for RateLimit model."""
    
    def test_rate_limit_creation(self):
        """Test creating a RateLimit instance."""
        rate_limit = RateLimit(
            tier="Pro",
            requests_per_minute=100,
            remaining=75,
            max_profiles=25
        )
        
        assert rate_limit.tier == "Pro"
        assert rate_limit.requests_per_minute == 100
        assert rate_limit.remaining == 75
        assert rate_limit.max_profiles == 25
        assert rate_limit.reset_time is None
    
    def test_from_headers(self):
        """Test creating RateLimit from headers."""
        headers = {
            "X-Rate-Limit-Tier": "Enterprise",
            "X-Rate-Limit-Limit": "1000",
            "X-Rate-Limit-Remaining": "750",
            "X-Rate-Limit-Max-Profiles": "250",
            "X-Rate-Limit-Reset": "2024-01-01T12:00:00"
        }
        
        rate_limit = RateLimit.from_headers(headers)
        
        assert rate_limit.tier == "Enterprise"
        assert rate_limit.requests_per_minute == 1000
        assert rate_limit.remaining == 750
        assert rate_limit.max_profiles == 250
        assert rate_limit.reset_time == datetime(2024, 1, 1, 12, 0, 0)
    
    def test_from_headers_minimal(self):
        """Test creating RateLimit from minimal headers."""
        headers = {
            "X-Rate-Limit-Limit": "100",
            "X-Rate-Limit-Remaining": "50"
        }
        
        rate_limit = RateLimit.from_headers(headers)
        
        assert rate_limit.tier == "unknown"
        assert rate_limit.requests_per_minute == 100
        assert rate_limit.remaining == 50
        assert rate_limit.max_profiles is None
        assert rate_limit.reset_time is None
    
    def test_from_headers_missing_values(self):
        """Test creating RateLimit with missing header values."""
        headers = {}
        
        rate_limit = RateLimit.from_headers(headers)
        
        assert rate_limit.tier == "unknown"
        assert rate_limit.requests_per_minute == 0
        assert rate_limit.remaining == 0
        assert rate_limit.max_profiles is None
        assert rate_limit.reset_time is None