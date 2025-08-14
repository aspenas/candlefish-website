FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY src/ ./src/

# Create a wrapper script for the MCP server
RUN echo '#!/bin/bash\nexec /app/.venv/bin/python -m src.mcp_server' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Expose port for health checks
EXPOSE 8080

# Run the MCP server
CMD ["/app/entrypoint.sh"]
