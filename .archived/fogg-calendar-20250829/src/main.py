"""Main entry point for Cloud Run with health endpoint."""

import os
import time
from contextlib import asynccontextmanager

import uvicorn
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from src.auth.gcp_credentials import GCPCredentialsManager
from src.auth.token_refresher import AsyncTokenRefresher
from src.logging import get_logger, log_health_check, setup_logging
from src.mcp_server import server as mcp_server
from src.metrics import get_metrics_manager

# Setup logging and metrics
setup_logging()
logger = get_logger()
metrics = get_metrics_manager()

# Global token refresher
token_refresher: AsyncTokenRefresher | None = None


@asynccontextmanager
async def lifespan(app: Starlette):
    """Application lifespan manager."""
    global token_refresher

    logger.info("Starting FOGG Calendar service")

    # Start token refresher
    try:
        credentials_manager = GCPCredentialsManager()
        token_refresher = AsyncTokenRefresher(credentials_manager)
        await token_refresher.start()
        logger.info("Token refresher started")
    except Exception as e:
        logger.error("Failed to start token refresher", error=str(e))

    # Set initial health status
    metrics.set_health_status(True)

    yield

    # Cleanup
    logger.info("Shutting down FOGG Calendar service")

    if token_refresher:
        await token_refresher.stop()

    metrics.set_health_status(False)


async def health_check(request: Request) -> JSONResponse:
    """Health check endpoint for Cloud Run.

    Returns:
        JSON response with health status
    """
    start_time = time.time()

    # Check critical dependencies
    checks = {
        "service": "healthy",
        "auth": "unknown",
        "mcp": "unknown",
    }

    # Check authentication
    try:
        from src.auth import get_credentials

        creds = get_credentials()
        checks["auth"] = "healthy" if creds else "unhealthy"
    except Exception as e:
        logger.error("Health check auth failed", error=str(e))
        checks["auth"] = "unhealthy"

    # Check MCP server
    try:
        # Basic check that MCP server is initialized
        checks["mcp"] = "healthy" if mcp_server else "unhealthy"
    except Exception:
        checks["mcp"] = "unhealthy"

    # Calculate overall health
    is_healthy = all(status == "healthy" for status in checks.values())
    status_code = 200 if is_healthy else 503

    # Calculate latency
    latency_ms = (time.time() - start_time) * 1000

    # Log and record metrics
    log_health_check(
        status="healthy" if is_healthy else "unhealthy",
        latency_ms=latency_ms,
        checks=checks,
    )
    metrics.set_health_status(is_healthy)

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if is_healthy else "unhealthy",
            "service": "fogg-calendar",
            "version": os.getenv("SERVICE_VERSION", "unknown"),
            "checks": checks,
            "latency_ms": round(latency_ms, 2),
        },
    )


async def mcp_handler(request: Request) -> JSONResponse:
    """MCP server endpoint handler.

    Args:
        request: Incoming request

    Returns:
        JSON response from MCP server
    """
    try:
        # Get request body
        await request.body()

        # Process through MCP server
        # Note: This is a simplified handler - in production you'd need
        # proper WebSocket or Server-Sent Events for MCP protocol

        return JSONResponse(
            content={
                "status": "ok",
                "message": "MCP server endpoint - use WebSocket for full protocol",
            }
        )
    except Exception as e:
        logger.error("MCP handler error", error=str(e))
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )


# Define routes
routes = [
    Route("/", endpoint=health_check, methods=["GET"]),
    Route("/healthz", endpoint=health_check, methods=["GET"]),
    Route("/mcp", endpoint=mcp_handler, methods=["POST"]),
]

# Create middleware
middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    ),
]

# Create Starlette app
app = Starlette(
    routes=routes,
    middleware=middleware,
    lifespan=lifespan,
)


def main():
    """Main entry point."""
    port = int(os.getenv("PORT", "8080"))

    logger.info("Starting server", port=port)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_config=None,  # Use our own logging
        access_log=False,  # Disable access logs (we handle them)
    )


if __name__ == "__main__":
    main()
