# Simplified Dockerfile for Candlefish Slack Workspace Manager
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libssl-dev \
    libffi-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -r slackbot && useradd -r -g slackbot slackbot && \
    chown -R slackbot:slackbot /app

# Switch to non-root user
USER slackbot

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')" || exit 1

# Start the bot
CMD ["python", "workspace_manager.py"]
