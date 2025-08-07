# Real-time Performance Monitoring API Dockerfile
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash rtpm
USER rtpm
WORKDIR /home/rtpm

# Copy requirements first for better caching
COPY --chown=rtpm:rtpm requirements-simplified.txt requirements.txt
RUN pip install --user -r requirements.txt

# Copy application code
COPY --chown=rtpm:rtpm src/ ./src/

# Add user local bin to PATH
ENV PATH="/home/rtpm/.local/bin:${PATH}"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Default command
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]


# Production stage
FROM base as production

ENV ENVIRONMENT=production
ENV PYTHONPATH=/home/rtpm/src

# Additional production optimizations
RUN pip install --user gunicorn

# Production command with Gunicorn
CMD ["python", "-m", "gunicorn", "src.main:app", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--access-logfile", "-", "--error-logfile", "-", "--log-level", "info"]


# Development stage
FROM base as development

ENV ENVIRONMENT=development
ENV PYTHONPATH=/home/rtpm/src

# Install development dependencies
RUN pip install --user pytest pytest-asyncio pytest-mock black flake8 mypy

# Development command with auto-reload
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# Worker stage for Celery
FROM base as worker

ENV ENVIRONMENT=production
ENV PYTHONPATH=/home/rtpm/src

# Command for Celery worker
CMD ["python", "-m", "celery", "worker", "-A", "src.workers.aggregation.celery_app", "--loglevel=info", "--concurrency=2"]


# Beat scheduler stage
FROM base as scheduler

ENV ENVIRONMENT=production
ENV PYTHONPATH=/home/rtpm/src

# Command for Celery beat scheduler
CMD ["python", "-m", "celery", "beat", "-A", "src.workers.aggregation.celery_app", "--loglevel=info"]


# Flower monitoring stage
FROM base as flower

ENV ENVIRONMENT=production
ENV PYTHONPATH=/home/rtpm/src

RUN pip install --user flower

# Expose flower port
EXPOSE 5555

# Command for Celery flower
CMD ["python", "-m", "celery", "flower", "-A", "src.workers.aggregation.celery_app", "--port=5555", "--broker=${CELERY_BROKER_URL}"]