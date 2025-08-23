.PHONY: help install start-services dev-backend dev-frontend stop clean import-data

help:
	@echo "Available commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make start-services - Start database and supporting services"
	@echo "  make dev-backend    - Run backend in development mode"
	@echo "  make dev-frontend   - Run frontend in development mode"
	@echo "  make stop          - Stop all services"
	@echo "  make clean         - Clean up containers and volumes"
	@echo "  make import-data   - Import Excel data to database"

install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing backend dependencies..."
	cd backend && go mod tidy
	@echo "Installing Python dependencies for data import..."
	pip3 install pandas psycopg2-binary python-dotenv openpyxl

start-services:
	@echo "Starting database and supporting services..."
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Services are running:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis: localhost:6379"
	@echo "  n8n: http://localhost:5678"

dev-backend:
	@echo "Starting backend in development mode..."
	cd backend && go run main.go

dev-frontend:
	@echo "Starting frontend in development mode..."
	cd frontend && npm run dev

stop:
	@echo "Stopping all services..."
	docker-compose down

clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v
	rm -rf frontend/node_modules frontend/dist backend/vendor

import-data:
	@echo "Importing Excel data..."
	python3 scripts/import-excel-data.py