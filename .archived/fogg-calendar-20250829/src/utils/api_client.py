"""Centralized API client with retry logic for Google APIs."""

from collections.abc import Callable
from typing import TypeVar

from googleapiclient.errors import HttpError
from structlog import get_logger
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = get_logger()

# Type variable for generic return types
T = TypeVar("T")

# Retry configuration
RETRY_CONFIG = {
    "wait": wait_exponential(multiplier=1, min=4, max=60),
    "stop": stop_after_attempt(5),
    "retry": retry_if_exception_type((HttpError, ConnectionError, TimeoutError)),
}


def is_retryable_error(error: HttpError) -> bool:
    """Check if an HTTP error is retryable.

    Args:
        error: The HTTP error to check

    Returns:
        True if the error should be retried
    """
    if not isinstance(error, HttpError):
        return True  # Retry non-HTTP errors

    # Get status code
    status = error.resp.status if error.resp else 500

    # Retry on server errors (5xx) and rate limit errors (429)
    retryable_statuses = {429, 500, 502, 503, 504}
    return status in retryable_statuses


class RetryableAPIClient:
    """Base class for API clients with automatic retry logic."""

    def __init__(self, service_name: str):
        """Initialize API client.

        Args:
            service_name: Name of the service for logging
        """
        self.service_name = service_name
        self.logger = logger.bind(service=service_name)

    @retry(**RETRY_CONFIG)
    def execute_with_retry(self, func: Callable[[], T], operation: str) -> T:
        """Execute an API call with retry logic.

        Args:
            func: The function to execute
            operation: Description of the operation for logging

        Returns:
            The result of the function call

        Raises:
            HttpError: If all retries are exhausted
        """
        try:
            self.logger.debug("Executing API call", operation=operation)
            result = func()
            self.logger.debug("API call successful", operation=operation)
            return result
        except HttpError as e:
            if not is_retryable_error(e):
                self.logger.error(
                    "Non-retryable API error",
                    operation=operation,
                    status=e.resp.status if e.resp else None,
                    error=str(e),
                )
                raise

            self.logger.warning(
                "Retryable API error, will retry",
                operation=operation,
                status=e.resp.status if e.resp else None,
                error=str(e),
            )
            raise
        except Exception as e:
            self.logger.error(
                "Unexpected error in API call",
                operation=operation,
                error=str(e),
                error_type=type(e).__name__,
            )
            raise


# Decorator version for convenience
def with_google_api_retry(operation: str):
    """Decorator to add retry logic to Google API calls.

    Args:
        operation: Description of the operation

    Returns:
        Decorated function with retry logic
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @retry(**RETRY_CONFIG)
        def wrapper(*args, **kwargs) -> T:
            try:
                logger.debug("Executing API call", operation=operation)
                result = func(*args, **kwargs)
                logger.debug("API call successful", operation=operation)
                return result
            except HttpError as e:
                if not is_retryable_error(e):
                    logger.error(
                        "Non-retryable API error",
                        operation=operation,
                        status=e.resp.status if e.resp else None,
                        error=str(e),
                    )
                    raise

                logger.warning(
                    "Retryable API error, will retry",
                    operation=operation,
                    status=e.resp.status if e.resp else None,
                    error=str(e),
                )
                raise
            except Exception as e:
                logger.error(
                    "Unexpected error in API call",
                    operation=operation,
                    error=str(e),
                    error_type=type(e).__name__,
                )
                raise

        return wrapper

    return decorator


# Convenience function for one-off calls
@retry(**RETRY_CONFIG)
def execute_google_api_call(func: Callable[[], T], operation: str) -> T:
    """Execute a Google API call with retry logic.

    Args:
        func: The function to execute
        operation: Description of the operation

    Returns:
        The result of the function call

    Raises:
        HttpError: If all retries are exhausted
    """
    try:
        logger.debug("Executing API call", operation=operation)
        result = func()
        logger.debug("API call successful", operation=operation)
        return result
    except HttpError as e:
        if not is_retryable_error(e):
            logger.error(
                "Non-retryable API error",
                operation=operation,
                status=e.resp.status if e.resp else None,
                error=str(e),
            )
            raise

        logger.warning(
            "Retryable API error, will retry",
            operation=operation,
            status=e.resp.status if e.resp else None,
            error=str(e),
        )
        raise
    except Exception as e:
        logger.error(
            "Unexpected error in API call",
            operation=operation,
            error=str(e),
            error_type=type(e).__name__,
        )
        raise
