"""Centralized logging configuration with structlog and Google Cloud Logging."""

import logging
import os
import sys
from typing import Any

import structlog
from google.cloud import logging as cloud_logging
from google.cloud.logging.handlers import CloudLoggingHandler


def setup_logging(
    service_name: str = "fogg-calendar",
    log_level: str = "INFO",
    use_cloud_logging: bool = True,
) -> None:
    """Configure structured logging for the application.

    Args:
        service_name: Name of the service for log attribution
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        use_cloud_logging: Whether to send logs to Google Cloud Logging
    """
    # Set up Google Cloud Logging if enabled and credentials available
    if use_cloud_logging and os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        try:
            client = cloud_logging.Client()
            handler = CloudLoggingHandler(client, name=service_name)
            handler.setLevel(getattr(logging, log_level))

            # Configure root logger
            root_logger = logging.getLogger()
            root_logger.setLevel(getattr(logging, log_level))
            root_logger.addHandler(handler)
        except Exception as e:
            print(f"Failed to setup Cloud Logging: {e}", file=sys.stderr)
            use_cloud_logging = False

    # Configure structlog
    structlog.configure(
        processors=[
            # Add log level
            structlog.stdlib.add_log_level,
            # Add timestamp
            structlog.processors.TimeStamper(fmt="iso"),
            # Add extra context
            structlog.contextvars.merge_contextvars,
            # Add exception info
            structlog.processors.add_exc_info,
            # Format stack traces
            structlog.processors.format_exc_info,
            # Add service name
            structlog.processors.CallsiteParameterAdder(
                parameters=[structlog.processors.CallsiteParameter.THREAD_NAME]
            ),
            # Ensure all keys are strings
            structlog.processors.KeyValueRenderer(
                key_order=["timestamp", "level", "event", "service"],
                drop_missing=True,
            ),
            # Render as JSON
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Add service name to all logs
    structlog.contextvars.bind_contextvars(service=service_name)


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    """Get a structured logger instance.

    Args:
        name: Optional logger name (defaults to module name)

    Returns:
        Configured structlog logger
    """
    return structlog.get_logger(name)


def log_api_call(
    operation: str,
    calendar_id: str | None = None,
    event_id: str | None = None,
    **kwargs: Any,
) -> None:
    """Log an API call with consistent format.

    Args:
        operation: Description of the API operation
        calendar_id: Optional calendar ID
        event_id: Optional event ID
        **kwargs: Additional context to log
    """
    logger = get_logger()
    context = {
        "operation": operation,
        "api": "google_calendar",
    }

    if calendar_id:
        context["calendar_id"] = calendar_id
    if event_id:
        context["event_id"] = event_id

    context.update(kwargs)

    logger.info("api_call", **context)


def log_mcp_tool_invocation(
    tool_name: str,
    arguments: dict[str, Any],
    trace_id: str | None = None,
    **kwargs: Any,
) -> None:
    """Log an MCP tool invocation with trace ID.

    Args:
        tool_name: Name of the MCP tool
        arguments: Arguments passed to the tool
        trace_id: Optional trace ID for request correlation
        **kwargs: Additional context to log
    """
    logger = get_logger()
    context = {
        "tool": tool_name,
        "arguments": arguments,
        "mcp": True,
    }

    if trace_id:
        context["trace_id"] = trace_id

    context.update(kwargs)

    logger.info("mcp_tool_invocation", **context)


def log_error(
    error: Exception,
    operation: str,
    **kwargs: Any,
) -> None:
    """Log an error with consistent format.

    Args:
        error: The exception that occurred
        operation: Description of the operation that failed
        **kwargs: Additional context to log
    """
    logger = get_logger()
    context = {
        "operation": operation,
        "error_type": type(error).__name__,
        "error_message": str(error),
    }

    context.update(kwargs)

    logger.error("operation_failed", exc_info=error, **context)


# Example usage for Cloud Run health endpoint logging
def log_health_check(
    status: str,
    latency_ms: float,
    **kwargs: Any,
) -> None:
    """Log a health check result.

    Args:
        status: Health check status (healthy, unhealthy)
        latency_ms: Latency in milliseconds
        **kwargs: Additional health metrics
    """
    logger = get_logger()
    context = {
        "health_status": status,
        "latency_ms": latency_ms,
        "endpoint": "/healthz",
    }

    context.update(kwargs)

    logger.info("health_check", **context)
