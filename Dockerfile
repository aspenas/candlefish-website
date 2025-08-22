# Candlefish AI Monorepo - Multi-stage Docker build
# Base image with all development tools
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    unzip \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Install Python tools
RUN pip3 install --no-cache-dir poetry ruff pytest

# Install AWS CLI
RUN pip3 install --no-cache-dir awscli

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /usr/share/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh

# Install Infisical CLI
RUN curl -fsSL https://dl.cloudsmith.io/public/infisical/infisical-cli/install.deb.sh | bash

# Development stage
FROM base AS development
WORKDIR /workspace
COPY package*.json pnpm-lock.yaml* ./
RUN if [ -f "pnpm-lock.yaml" ]; then pnpm install; fi
COPY . .
ENV NODE_ENV=development
ENV CLAUDE_PERMISSIONS=full
ENV PYTHONUNBUFFERED=1
CMD ["pnpm", "dev"]

# Production stage
FROM base AS production
WORKDIR /workspace

# Copy dependency files
COPY package*.json pnpm-lock.yaml* ./
COPY pyproject.toml poetry.lock* ./

# Install production dependencies
RUN if [ -f "pnpm-lock.yaml" ]; then pnpm install --prod; fi
RUN if [ -f "poetry.lock" ]; then poetry install --no-dev --no-interaction --no-ansi; fi

# Copy application code
COPY . .

# Build applications
RUN if [ -f "pnpm-lock.yaml" ]; then pnpm build; fi

# Set production environment
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}
CMD ["pnpm", "start"]
