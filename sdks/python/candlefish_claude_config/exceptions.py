"""
Exception classes for the Candlefish Claude Configuration System SDK.

Provides a hierarchy of custom exceptions for different error conditions
that can occur when interacting with the API.
"""

from typing import Optional, Dict, Any


class CandlefishConfigException(Exception):
    """
    Base exception class for all Candlefish Claude Config SDK errors.
    
    All other exceptions in this SDK inherit from this base class,
    making it easy to catch all SDK-related errors.
    """
    
    def __init__(self, message: str, status_code: Optional[int] = None, 
                 response_data: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}
    
    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(CandlefishConfigException):
    """
    Raised when authentication fails.
    
    This can occur when:
    - API key is invalid or expired
    - OAuth2 token is invalid or expired
    - Insufficient permissions for the requested operation
    """
    
    def __init__(self, message: str = "Authentication failed", 
                 status_code: Optional[int] = 401,
                 response_data: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code, response_data)


class AuthorizationError(CandlefishConfigException):
    """
    Raised when the user lacks sufficient permissions.
    
    This occurs when the authenticated user doesn't have
    the required scopes or permissions for the requested operation.
    """
    
    def __init__(self, message: str = "Insufficient permissions", 
                 status_code: Optional[int] = 403,
                 response_data: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code, response_data)


class ValidationError(CandlefishConfigException):
    """
    Raised when request data fails validation.
    
    This occurs when the provided configuration data doesn't
    meet the API's validation requirements.
    """
    
    def __init__(self, message: str = "Validation failed", 
                 status_code: Optional[int] = 400,
                 response_data: Optional[Dict[str, Any]] = None,
                 validation_errors: Optional[list] = None):
        super().__init__(message, status_code, response_data)
        self.validation_errors = validation_errors or []
    
    def __str__(self) -> str:
        base_msg = super().__str__()
        if self.validation_errors:
            base_msg += f"\nValidation errors: {', '.join(self.validation_errors)}"
        return base_msg


class NotFoundError(CandlefishConfigException):
    """
    Raised when a requested resource is not found.
    
    This occurs when trying to access a configuration profile
    or other resource that doesn't exist.
    """
    
    def __init__(self, message: str = "Resource not found", 
                 status_code: Optional[int] = 404,
                 response_data: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code, response_data)


class RateLimitError(CandlefishConfigException):
    """
    Raised when API rate limits are exceeded.
    
    This occurs when the client has made too many requests
    within the allowed time window for their tier.
    """
    
    def __init__(self, message: str = "Rate limit exceeded", 
                 status_code: Optional[int] = 429,
                 response_data: Optional[Dict[str, Any]] = None,
                 retry_after: Optional[int] = None):
        super().__init__(message, status_code, response_data)
        self.retry_after = retry_after
    
    def __str__(self) -> str:
        base_msg = super().__str__()
        if self.retry_after:
            base_msg += f" (retry after {self.retry_after} seconds)"
        return base_msg


class ServerError(CandlefishConfigException):
    """
    Raised when the server encounters an internal error.
    
    This indicates a problem on the server side that should
    typically be reported to Candlefish support.
    """
    
    def __init__(self, message: str = "Internal server error", 
                 status_code: Optional[int] = 500,
                 response_data: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code, response_data)


class NetworkError(CandlefishConfigException):
    """
    Raised when network connectivity issues occur.
    
    This can occur due to:
    - Connection timeouts
    - DNS resolution failures
    - Network connectivity issues
    """
    
    def __init__(self, message: str = "Network error occurred", 
                 original_error: Optional[Exception] = None):
        super().__init__(message)
        self.original_error = original_error
    
    def __str__(self) -> str:
        base_msg = self.message
        if self.original_error:
            base_msg += f" (caused by: {self.original_error})"
        return base_msg


class WebSocketError(CandlefishConfigException):
    """
    Raised when WebSocket connection or communication fails.
    
    This can occur during:
    - WebSocket connection establishment
    - Message sending/receiving
    - Connection drops or protocol errors
    """
    
    def __init__(self, message: str = "WebSocket error occurred",
                 original_error: Optional[Exception] = None):
        super().__init__(message)
        self.original_error = original_error


class ConfigurationError(CandlefishConfigException):
    """
    Raised when SDK configuration is invalid or incomplete.
    
    This occurs when the SDK is not properly configured,
    such as missing API keys or invalid base URLs.
    """
    
    def __init__(self, message: str = "SDK configuration error"):
        super().__init__(message)


# Map HTTP status codes to exception classes
STATUS_CODE_EXCEPTIONS = {
    400: ValidationError,
    401: AuthenticationError,
    403: AuthorizationError,
    404: NotFoundError,
    429: RateLimitError,
    500: ServerError,
    502: ServerError,
    503: ServerError,
    504: ServerError,
}


def exception_from_response(status_code: int, message: str, 
                          response_data: Optional[Dict[str, Any]] = None) -> CandlefishConfigException:
    """
    Create an appropriate exception based on HTTP status code.
    
    Args:
        status_code: HTTP status code from the response
        message: Error message
        response_data: Additional response data
    
    Returns:
        Appropriate exception instance
    """
    exception_class = STATUS_CODE_EXCEPTIONS.get(status_code, CandlefishConfigException)
    
    # Handle special cases
    if status_code == 429 and response_data:
        retry_after = response_data.get('retry_after')
        return RateLimitError(message, status_code, response_data, retry_after)
    
    if status_code == 400 and response_data:
        validation_errors = response_data.get('details', [])
        return ValidationError(message, status_code, response_data, validation_errors)
    
    return exception_class(message, status_code, response_data)


# Export all exceptions
__all__ = [
    "CandlefishConfigException",
    "AuthenticationError",
    "AuthorizationError", 
    "ValidationError",
    "NotFoundError",
    "RateLimitError",
    "ServerError",
    "NetworkError",
    "WebSocketError",
    "ConfigurationError",
    "exception_from_response",
]