.PHONY: help install dev test lint format clean deploy run-mcp run-sync

# Default target
help:
	@echo "FOGG Calendar Automation - Available Commands:"
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Run local MCP server for development"
	@echo "  make test       - Run all tests"
	@echo "  make lint       - Run linting checks"
	@echo "  make format     - Format code with ruff"
	@echo "  make run-sync   - Run calendar sync script"
	@echo "  make deploy     - Deploy to Cloud Functions/Run"
	@echo "  make clean      - Clean up generated files"

# Install dependencies
install:
	uv sync
	uv run pre-commit install

# Run MCP server locally
dev:
	@echo "Starting MCP server locally..."
	uv run python -m src.mcp_server

# Run tests
test:
	uv run pytest -v

# Run linting
lint:
	uv run ruff check .

# Format code
format:
	uv run ruff format .
	uv run ruff check --fix .

# Run calendar sync
run-sync:
	uv run python run_sync.py

# Deploy to cloud
deploy:
	@echo "Deploying to Google Cloud..."
	@echo "Note: Ensure you have authenticated with gcloud and set the project"
	gcloud builds submit --config cloudbuild.yaml

# Clean up
clean:
	rm -rf .pytest_cache
	rm -rf .ruff_cache
	rm -rf __pycache__
	rm -rf src/__pycache__
	rm -rf tests/__pycache__
	find . -type f -name "*.pyc" -delete
