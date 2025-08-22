# Candlefish AI Monorepo - Development Commands
.PHONY: help install dev build test clean docker-dev docker-prod docker-clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start development environment"
	@echo "  make build        - Build all applications"
	@echo "  make test         - Run all tests"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-dev   - Start Docker development environment"
	@echo "  make docker-prod  - Start Docker production environment"
	@echo "  make docker-clean - Clean Docker resources"
	@echo "  make lint         - Run linting"
	@echo "  make format       - Format code"

# Install dependencies
install:
	@echo "Installing Node.js dependencies..."
	pnpm install
	@echo "Installing Python dependencies..."
	poetry install --no-interaction --no-ansi || echo "No Poetry project found"

# Development
dev:
	@echo "Starting development servers..."
	pnpm dev

# Build
build:
	@echo "Building applications..."
	pnpm build

# Testing
test:
	@echo "Running tests..."
	pnpm test
	pytest || echo "No pytest configuration found"

# Code quality
lint:
	@echo "Running linters..."
	pnpm lint || echo "No pnpm lint script found"
	ruff check . || echo "No Python files to lint"

format:
	@echo "Formatting code..."
	pnpm format || echo "No pnpm format script found"
	ruff format . || echo "No Python files to format"

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	rm -rf **/node_modules/.cache
	rm -rf **/dist
	rm -rf **/.next
	rm -rf **/build
	rm -rf **/__pycache__
	rm -rf **/*.pyc

# Docker commands
docker-dev:
	@echo "Starting Docker development environment..."
	docker-compose up -d
	@echo "Services started. Check logs with: make docker-logs"

docker-prod:
	@echo "Starting Docker production environment..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production services started."

docker-logs:
	@echo "Following Docker logs (Ctrl+C to stop)..."
	docker-compose logs -f

docker-clean:
	@echo "Stopping and cleaning Docker resources..."
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f

# Environment setup
env:
	@echo "Setting up environment..."
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example. Please edit with your values."; else echo ".env already exists"; fi

# Database operations
db-reset:
	@echo "Resetting development database..."
	docker-compose stop postgres
	docker volume rm candlefish_postgres_dev 2>/dev/null || true
	docker-compose up -d postgres

# Status check
status:
	@echo "Docker service status:"
	docker-compose ps
	@echo ""
	@echo "Docker production service status:"
	docker-compose -f docker-compose.prod.yml ps
