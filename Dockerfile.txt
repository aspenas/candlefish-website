# Multi-stage Dockerfile for candlefish-ai with full permissions
FROM python:3.12-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Install global tools
RUN pip install --no-cache-dir poetry ruff pytest \
    && npm install -g typescript

# Install AWS CLI (using Python version for compatibility)
RUN pip install --no-cache-dir awscli

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /usr/share/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh

# Install Infisical CLI
RUN curl -fsSL https://dl.cloudsmith.io/public/infisical/infisical-cli/install.deb.sh | bash

# Set working directory
WORKDIR /workspace

# Copy project files
COPY . .

# Install project dependencies if they exist
RUN if [ -f "pyproject.toml" ]; then poetry install --no-interaction --no-ansi; fi
RUN if [ -f "package.json" ]; then pnpm install; fi

# Set environment for full permissions
ENV CLAUDE_PERMISSIONS=full
ENV PYTHONUNBUFFERED=1

# Default command
CMD ["bash"]
