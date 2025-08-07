# RTPM Dashboard Test Makefile
# Provides convenient commands for running tests

.PHONY: help install test test-unit test-integration test-e2e test-performance test-all clean coverage lint format typecheck

# Default target
help:
	@echo "RTPM Dashboard Test Commands"
	@echo ""
	@echo "Setup:"
	@echo "  install           Install all dependencies"
	@echo "  install-backend   Install backend dependencies"
	@echo "  install-frontend  Install frontend dependencies"
	@echo "  install-e2e       Install E2E test dependencies"
	@echo ""
	@echo "Testing:"
	@echo "  test              Run unit tests only"
	@echo "  test-unit         Run unit tests (backend + frontend)"
	@echo "  test-integration  Run integration tests"
	@echo "  test-e2e          Run E2E tests"
	@echo "  test-performance  Run performance tests"
	@echo "  test-all          Run all tests except performance"
	@echo "  test-full         Run all tests including performance"
	@echo ""
	@echo "Development:"
	@echo "  lint              Run linting on all code"
	@echo "  format            Format all code"
	@echo "  typecheck         Run type checking"
	@echo "  coverage          Generate coverage reports"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean             Clean test artifacts and coverage reports"
	@echo "  services          Start required services (Docker)"
	@echo "  services-stop     Stop services"

# Variables
BACKEND_DIR = ../apps/rtpm-api
FRONTEND_DIR = .
E2E_DIR = e2e
TEST_RUNNER = ./test-runner.sh

# Installation targets
install: install-backend install-frontend install-e2e

install-backend:
	@echo "Installing backend dependencies..."
	cd $(BACKEND_DIR) && pip install -r requirements.txt
	cd $(BACKEND_DIR) && pip install pytest pytest-cov pytest-asyncio pytest-mock locust

install-frontend:
	@echo "Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && npm install

install-e2e:
	@echo "Installing E2E dependencies..."
	cd $(E2E_DIR) && npm install
	cd $(E2E_DIR) && npx playwright install

# Test targets
test: test-unit

test-unit:
	@echo "Running unit tests..."
	$(TEST_RUNNER) --unit

test-integration:
	@echo "Running integration tests..."
	$(TEST_RUNNER) --integration

test-e2e:
	@echo "Running E2E tests..."
	$(TEST_RUNNER) --e2e

test-performance:
	@echo "Running performance tests..."
	$(TEST_RUNNER) --performance

test-all:
	@echo "Running all tests (except performance)..."
	$(TEST_RUNNER) --all

test-full:
	@echo "Running all tests including performance..."
	$(TEST_RUNNER) --all --performance

# Development targets
lint:
	@echo "Running linting..."
	cd $(BACKEND_DIR) && python -m flake8 app/ tests/
	cd $(FRONTEND_DIR) && npm run lint

format:
	@echo "Formatting code..."
	cd $(BACKEND_DIR) && python -m black app/ tests/
	cd $(BACKEND_DIR) && python -m isort app/ tests/
	cd $(FRONTEND_DIR) && npm run format

typecheck:
	@echo "Running type checking..."
	cd $(BACKEND_DIR) && python -m mypy app/
	cd $(FRONTEND_DIR) && npm run typecheck

coverage:
	@echo "Generating coverage reports..."
	$(TEST_RUNNER) --unit --coverage-threshold 80
	@echo ""
	@echo "Coverage reports generated:"
	@echo "  Backend: coverage/combined/backend-html/index.html"
	@echo "  Frontend: coverage/combined/frontend-html/index.html"
	@echo "  Combined: coverage/combined/index.html"

# Service management
services:
	@echo "Starting services with Docker Compose..."
	@if [ -f docker-compose.test.yml ]; then \
		docker-compose -f docker-compose.test.yml up -d; \
	else \
		echo "docker-compose.test.yml not found, starting individual containers..."; \
		docker run --name rtpm-test-db -d -p 5433:5432 \
			-e POSTGRES_DB=rtpm_test \
			-e POSTGRES_USER=test_user \
			-e POSTGRES_PASSWORD=test_pass \
			timescale/timescaledb:latest-pg14 || true; \
		docker run --name rtpm-test-redis -d -p 6380:6379 \
			redis:7-alpine || true; \
	fi
	@echo "Waiting for services to be ready..."
	@sleep 5

services-stop:
	@echo "Stopping test services..."
	@if [ -f docker-compose.test.yml ]; then \
		docker-compose -f docker-compose.test.yml down; \
	else \
		docker stop rtpm-test-db rtpm-test-redis || true; \
		docker rm rtpm-test-db rtpm-test-redis || true; \
	fi

# Cleanup
clean:
	@echo "Cleaning test artifacts..."
	rm -rf coverage/
	rm -rf test-reports/
	rm -rf $(E2E_DIR)/test-results/
	rm -rf $(E2E_DIR)/playwright-report/
	rm -rf $(BACKEND_DIR)/htmlcov/
	rm -rf $(BACKEND_DIR)/.coverage
	rm -rf $(BACKEND_DIR)/.pytest_cache/
	rm -rf $(FRONTEND_DIR)/.jest-cache/
	find . -name "__pycache__" -type d -exec rm -rf {} + || true
	find . -name "*.pyc" -delete || true

# Continuous Integration targets
ci-install:
	$(MAKE) install

ci-test:
	$(MAKE) test-all

ci-coverage:
	$(MAKE) coverage

# Development workflow
dev-setup: install services
	@echo "Development environment ready!"
	@echo "Run 'make test' to verify everything is working."

dev-teardown: services-stop clean
	@echo "Development environment cleaned up."

# Watch mode for development
watch-tests:
	@echo "Starting test watch mode..."
	cd $(FRONTEND_DIR) && npm run test:watch

# Quick test commands
quick-backend:
	cd $(BACKEND_DIR) && python -m pytest tests/ -v --tb=short

quick-frontend:
	cd $(FRONTEND_DIR) && npm test -- --watchAll=false

# Database operations for tests
db-migrate:
	@echo "Running database migrations for tests..."
	cd $(BACKEND_DIR) && python -c "from app.database import create_tables; create_tables()"

db-seed:
	@echo "Seeding test database..."
	cd $(BACKEND_DIR) && python -c "from tests.conftest import seed_test_data; seed_test_data()"

db-reset: services-stop services db-migrate db-seed
	@echo "Test database reset complete."