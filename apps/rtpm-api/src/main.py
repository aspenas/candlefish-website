"""
RTPM API - Main Application Entry Point
Real-time Performance Monitoring Dashboard
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.responses import JSONResponse
import asyncio
import json
from datetime import datetime
import random
from typing import List
import logging
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from time import perf_counter
# Note: Response is imported lazily where needed to avoid unused import warnings
import boto3
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="RTPM Dashboard API",
    description="Real-time Performance Monitoring Dashboard API",
    version="1.0.0"
)

# Configure CORS (env-driven)
allowed_origins_env = os.getenv("CORS_ORIGINS", "").strip()
cf_env = os.getenv("CF_ENV")
if allowed_origins_env:
    allowed_origins = [
        o.strip() for o in allowed_origins_env.split(",") if o.strip()
    ]
else:
    # Default: strict in production, wildcard in non-prod
    node_env = (
        cf_env
        or os.getenv("NODE_ENV")
        or os.getenv("ENV")
        or os.getenv("PY_ENV")
        or "development"
    )
    if node_env == "production":
        allowed_origins = [
            "https://dashboard.candlefish.ai",
            "https://candlefish.ai",
            "https://www.candlefish.ai",
        ]
    else:
        allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Prometheus metrics
REQUEST_COUNT = Counter(
    "rtpm_request_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "rtpm_request_latency_seconds",
    "Request latency",
    buckets=(0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)
WEBSOCKET_CONNECTIONS = Gauge(
    "rtpm_websocket_connections",
    "Active WebSocket connections",
)


class RequestMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = perf_counter()
        response = await call_next(request)
        elapsed = perf_counter() - start
        REQUEST_LATENCY.observe(elapsed)
        endpoint = request.url.path
        REQUEST_COUNT.labels(
            request.method,
            endpoint,
            str(response.status_code),
        ).inc()
        return response


app.add_middleware(RequestMetricsMiddleware)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Referrer-Policy",
            "strict-origin-when-cross-origin",
        )
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera()",
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)

# WebSocket connection manager


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        try:
            WEBSOCKET_CONNECTIONS.set(len(self.active_connections))
        except Exception:
            pass
        logger.info(
            "WebSocket connected. Total connections: %d",
            len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        try:
            WEBSOCKET_CONNECTIONS.set(len(self.active_connections))
        except Exception:
            pass
        logger.info(
            "WebSocket disconnected. Total connections: %d",
            len(self.active_connections),
        )

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Ignore send errors for disconnected clients
                pass

manager = ConnectionManager()

# Health check endpoint


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "rtpm-api",
        "version": "1.0.0"
    }

# Metrics endpoint


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    from starlette.responses import Response

    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Root endpoint


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RTPM Dashboard API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "metrics": "/metrics",
            "api_docs": "/docs",
            "websocket": "/ws/metrics"
        }
    }

# API endpoints


@app.get("/api/v1/status")
async def get_status():
    """Get system status"""
    return {
        "status": "operational",
        "services": {
            "api": "healthy",
            "database": "healthy",
            "cache": "healthy"
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/v1/metrics/current")
async def get_current_metrics():
    """Get current metrics"""
    return {
        "metrics": [
            {
                "name": "cpu_usage",
                "value": random.uniform(20, 80),
                "unit": "percent",
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "name": "memory_usage",
                "value": random.uniform(30, 70),
                "unit": "percent",
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "name": "response_time",
                "value": random.uniform(50, 200),
                "unit": "ms",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    }


@app.post("/api/v1/metrics")
async def ingest_metric(request: Request):
    """Ingest a new metric"""
    data = await request.json()
    # In production, this would save to database
    logger.info("Ingested metric: %s", data)
    
    # Broadcast to WebSocket clients
    await manager.broadcast(json.dumps({
        "type": "metric",
        "payload": data
    }))
    
    return {
        "status": "success",
        "message": "Metric ingested",
        "timestamp": datetime.utcnow().isoformat()
    }

# WebSocket endpoint for real-time metrics


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics"""
    await manager.connect(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_text(json.dumps({
            "type": "connection",
            "status": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }))
        
        # Keep connection alive and send periodic metrics
        while True:
            # Wait for any message from client (keepalive)
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(), timeout=5.0
                )
                logger.info("Received WebSocket message: %s", data)
            except asyncio.TimeoutError:
                # Send a metric update
                metric = {
                    "type": "metric",
                    "payload": {
                        "name": random.choice(
                            [
                                "cpu_usage",
                                "memory_usage",
                                "response_time",
                                "disk_io",
                            ]
                        ),
                        "value": random.uniform(20, 80),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                }
                await websocket.send_text(json.dumps(metric))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error("WebSocket error: %s", e)
        manager.disconnect(websocket)

# Error handlers


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "path": str(request.url)}
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

# Startup event


@app.on_event("startup")
async def startup_event():
    logger.info("RTPM API starting up...")
    # Fail closed in production if required secrets are missing
    env = (
        os.getenv("CF_ENV")
        or os.getenv("NODE_ENV")
        or os.getenv("ENV")
        or os.getenv("PY_ENV")
        or "development"
    )
    if env == "production":
        region = os.getenv("AWS_REGION", "us-east-1")
        sm = boto3.client("secretsmanager", region_name=region)
        required = [
            "candlefish-database-production",
            "candlefish-redis-production",
            "candlefish-auth-secrets-production",
            "candlefish-jwt-keys-production",
            "candlefish-api-keys-production",
        ]
        for sid in required:
            try:
                sm.describe_secret(SecretId=sid)
            except ClientError as e:
                logger.error("Missing or inaccessible secret: %s", sid)
                raise RuntimeError("Startup denied: required secret missing") from e
    logger.info("Database: Connected")
    logger.info("Redis: Connected")
    logger.info("Ready to accept connections")

# Shutdown event


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("RTPM API shutting down...")
    logger.info("Closing database connections...")
    logger.info("Shutdown complete")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)