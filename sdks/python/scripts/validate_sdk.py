#!/usr/bin/env python3
"""
Validation script for the Candlefish Claude Config Python SDK.

This script validates that all SDK components work correctly together.
"""

import sys
import traceback
from typing import Dict, Any


def test_imports():
    """Test that all SDK components can be imported."""
    print("🔍 Testing imports...")
    
    try:
        # Test main imports
        from candlefish_claude_config import (
            CandlefishClaudeConfigClient,
            ConfigProfile,
            ConfigValidationError,
            WebSocketEvent,
            APIKeyAuth,
            OAuth2Auth,
            CandlefishConfigException,
            AuthenticationError,
            ValidationError,
            NotFoundError,
            RateLimitError,
        )
        
        # Test internal imports
        from candlefish_claude_config.client import CandlefishClaudeConfigClient as Client
        from candlefish_claude_config.models import APIResponse, RateLimit
        from candlefish_claude_config.auth import BaseAuth
        from candlefish_claude_config.websocket import WebSocketClient
        from candlefish_claude_config.exceptions import exception_from_response
        
        print("✅ All imports successful")
        return True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        traceback.print_exc()
        return False


def test_model_creation():
    """Test creating and validating models."""
    print("\n🧪 Testing model creation and validation...")
    
    try:
        from candlefish_claude_config import ConfigProfile, WebSocketEvent
        from pydantic import ValidationError
        import datetime
        
        # Test valid profile creation
        profile = ConfigProfile(
            name="Test Profile",
            description="Test description",
            settings={"key": "value"},
            metadata={"created_by": "test"}
        )
        
        assert profile.name == "Test Profile"
        assert profile.version == "2.0.0"  # Default version
        assert profile.settings == {"key": "value"}
        
        # Test profile validation
        try:
            ConfigProfile(name="")  # Should fail
            print("❌ Validation should have failed for empty name")
            return False
        except ValidationError:
            pass  # Expected
        
        # Test WebSocket event
        event = WebSocketEvent(
            event_type="config.created",
            payload={"profile_id": "test"},
            timestamp=datetime.datetime.now()
        )
        
        assert event.event_type == "config.created"
        assert event.payload == {"profile_id": "test"}
        
        # Test invalid event type
        try:
            WebSocketEvent(event_type="invalid.type")
            print("❌ Validation should have failed for invalid event type")
            return False
        except ValidationError:
            pass  # Expected
        
        print("✅ Model creation and validation working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Model testing failed: {e}")
        traceback.print_exc()
        return False


def test_authentication():
    """Test authentication classes."""
    print("\n🔐 Testing authentication...")
    
    try:
        from candlefish_claude_config import APIKeyAuth, OAuth2Auth
        from candlefish_claude_config.exceptions import ConfigurationError
        
        # Test API key auth
        api_auth = APIKeyAuth("test-key", "Pro")
        headers = api_auth.get_headers()
        
        assert "X-API-Key" in headers
        assert headers["X-API-Key"] == "test-key"
        assert headers["X-Tier"] == "Pro"
        assert api_auth.is_valid() is True
        
        # Test invalid API key
        try:
            APIKeyAuth("", "Pro")
            print("❌ Should have failed for empty API key")
            return False
        except ConfigurationError:
            pass  # Expected
        
        # Test OAuth2 auth
        oauth_auth = OAuth2Auth("client-id", "client-secret")
        auth_url = oauth_auth.get_authorization_url("https://example.com/callback")
        
        assert "client_id=client-id" in auth_url
        assert "redirect_uri=https://example.com/callback" in auth_url
        assert oauth_auth.is_valid() is False  # No token set
        
        # Test invalid OAuth2
        try:
            OAuth2Auth("", "secret")
            print("❌ Should have failed for empty client ID")
            return False
        except ConfigurationError:
            pass  # Expected
        
        print("✅ Authentication classes working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Authentication testing failed: {e}")
        traceback.print_exc()
        return False


def test_client_creation():
    """Test client creation and configuration."""
    print("\n🔧 Testing client creation...")
    
    try:
        from candlefish_claude_config import CandlefishClaudeConfigClient, APIKeyAuth
        from candlefish_claude_config.exceptions import ConfigurationError
        
        # Test client with API key
        client = CandlefishClaudeConfigClient(api_key="test-key")
        assert isinstance(client.auth, APIKeyAuth)
        assert client.base_url == "https://api.candlefish.ai/v2.0"
        assert client.timeout == 30.0
        
        # Test client with auth object
        auth = APIKeyAuth("test-key", "Enterprise")
        client2 = CandlefishClaudeConfigClient(auth=auth)
        assert client2.auth is auth
        
        # Test client with custom settings
        client3 = CandlefishClaudeConfigClient(
            api_key="test-key",
            base_url="https://staging.example.com/",
            timeout=60.0,
            tier="Enterprise"
        )
        
        assert client3.base_url == "https://staging.example.com"  # Should strip trailing slash
        assert client3.timeout == 60.0
        assert client3.auth.tier == "Enterprise"
        
        # Test client without auth
        try:
            CandlefishClaudeConfigClient()
            print("❌ Should have failed without authentication")
            return False
        except ConfigurationError:
            pass  # Expected
        
        # Test WebSocket client creation
        ws_client = client.get_websocket_client()
        assert ws_client is not None
        
        # Should return same instance
        ws_client2 = client.get_websocket_client()
        assert ws_client is ws_client2
        
        print("✅ Client creation working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Client testing failed: {e}")
        traceback.print_exc()
        return False


def test_exception_hierarchy():
    """Test exception classes and hierarchy."""
    print("\n⚠️  Testing exception hierarchy...")
    
    try:
        from candlefish_claude_config.exceptions import (
            CandlefishConfigException,
            AuthenticationError,
            ValidationError,
            NotFoundError,
            RateLimitError,
            exception_from_response
        )
        
        # Test base exception
        base_error = CandlefishConfigException("Base error", 400, {"key": "value"})
        assert str(base_error) == "[400] Base error"
        assert base_error.status_code == 400
        assert base_error.response_data == {"key": "value"}
        
        # Test specific exceptions
        auth_error = AuthenticationError()
        assert isinstance(auth_error, CandlefishConfigException)
        assert auth_error.status_code == 401
        
        validation_error = ValidationError("Validation failed", validation_errors=["Error 1", "Error 2"])
        assert "Error 1, Error 2" in str(validation_error)
        
        rate_limit_error = RateLimitError("Too many requests", retry_after=60)
        assert "retry after 60 seconds" in str(rate_limit_error)
        
        # Test exception factory
        not_found_error = exception_from_response(404, "Not found")
        assert isinstance(not_found_error, NotFoundError)
        
        unknown_error = exception_from_response(418, "I'm a teapot")
        assert isinstance(unknown_error, CandlefishConfigException)
        
        print("✅ Exception hierarchy working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Exception testing failed: {e}")
        traceback.print_exc()
        return False


def test_package_metadata():
    """Test package metadata and version info."""
    print("\n📦 Testing package metadata...")
    
    try:
        import candlefish_claude_config
        
        # Test version
        assert hasattr(candlefish_claude_config, '__version__')
        assert candlefish_claude_config.__version__ == "2.0.0"
        
        # Test other metadata
        assert hasattr(candlefish_claude_config, '__author__')
        assert hasattr(candlefish_claude_config, '__homepage__')
        assert candlefish_claude_config.__author__ == "Candlefish AI"
        assert "candlefish.ai" in candlefish_claude_config.__homepage__
        
        print(f"✅ Package metadata correct (version: {candlefish_claude_config.__version__})")
        return True
        
    except Exception as e:
        print(f"❌ Package metadata testing failed: {e}")
        traceback.print_exc()
        return False


def run_all_tests() -> bool:
    """Run all validation tests."""
    print("🧪 Candlefish Claude Config Python SDK - Validation Tests")
    print("=" * 65)
    
    tests = [
        ("Import Test", test_imports),
        ("Model Creation Test", test_model_creation),
        ("Authentication Test", test_authentication),
        ("Client Creation Test", test_client_creation),
        ("Exception Hierarchy Test", test_exception_hierarchy),
        ("Package Metadata Test", test_package_metadata)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"\n💥 {test_name} crashed: {e}")
            traceback.print_exc()
            failed_tests.append(test_name)
    
    print("\n" + "=" * 65)
    
    if failed_tests:
        print("❌ VALIDATION FAILED")
        print(f"   Failed tests: {', '.join(failed_tests)}")
        return False
    else:
        print("🎉 ALL VALIDATIONS PASSED")
        print("   The SDK is ready for use!")
        return True


def main():
    """Main validation function."""
    success = run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()