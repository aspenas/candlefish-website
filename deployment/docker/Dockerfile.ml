# Multi-stage Docker build for ML Recommendation Engine
# Optimized for production deployment with GPU support optional

# Build stage
FROM python:3.11-slim AS builder

# Build arguments
ARG PYTHON_VERSION=3.11
ARG BUILD_DATE
ARG VCS_REF

# Add build metadata
LABEL build.date=$BUILD_DATE \
      build.vcs-ref=$VCS_REF \
      build.version="1.0.0"

# Install system dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r mluser && useradd -r -g mluser mluser

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY backend/ml-engine/requirements.txt ./
COPY backend/ml-engine/requirements-dev.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/ml-engine/src ./src
COPY backend/ml-engine/models ./models
COPY backend/ml-engine/config ./config

# Production stage
FROM python:3.11-slim AS production

# Security updates and runtime dependencies
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r mluser && useradd -r -g mluser mluser

# Set working directory
WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --from=builder --chown=mluser:mluser /app/src ./src
COPY --from=builder --chown=mluser:mluser /app/models ./models
COPY --from=builder --chown=mluser:mluser /app/config ./config

# Create required directories
RUN mkdir -p /app/logs /app/data /app/cache && \
    chown -R mluser:mluser /app

# Switch to non-root user
USER mluser

# Environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MODEL_PATH=/app/models \
    DATA_PATH=/app/data \
    CACHE_PATH=/app/cache \
    LOG_LEVEL=info \
    WORKERS=2 \
    PORT=8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Expose port
EXPOSE 8001

# Start application with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8001", "--workers", "${WORKERS}", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "src.main:app"]

# Security metadata
LABEL org.opencontainers.image.title="ML Recommendation Engine" \
      org.opencontainers.image.description="Machine learning service for Netlify extension recommendations and optimization" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="Candlefish Enterprise" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/candlefish-enterprise/candlefish-ai" \
      org.opencontainers.image.documentation="https://docs.candlefish.ai/netlify-extension" \
      org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.revision=$VCS_REF
