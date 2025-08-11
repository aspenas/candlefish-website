# RTPM API - FastAPI Production Dockerfile for Fly.io
FROM python:3.11-slim as base

# Set environment variables for Python optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app/src

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash --uid 1001 rtpm

# Set working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements-simplified.txt ./
RUN pip install --no-cache-dir -r requirements-simplified.txt

# Copy application source code
COPY src/ ./src/

# Change ownership to non-root user
RUN chown -R rtpm:rtpm /app
USER rtpm

# Health check - updated for FastAPI on port 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose FastAPI port
EXPOSE 8000

# Production command using Gunicorn with Uvicorn workers
CMD ["gunicorn", "src.main:app", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--worker-connections", "1000", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--preload", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
