# CLOS (Candlefish Localhost Orchestration System) Makefile

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=clos
BINARY_UNIX=$(BINARY_NAME)_unix
MAIN_PATH=./cmd/clos

# Build targets
.PHONY: build clean test coverage deps install help run dev

build: ## Build the binary
	$(GOBUILD) -o $(BINARY_NAME) -v $(MAIN_PATH)

build-linux: ## Build for Linux
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v $(MAIN_PATH)

clean: ## Clean build artifacts
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

test: ## Run tests
	$(GOTEST) -v ./...

coverage: ## Run tests with coverage
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

deps: ## Download dependencies
	$(GOMOD) download
	$(GOMOD) tidy

install: build ## Install the binary to GOPATH/bin
	cp $(BINARY_NAME) $(shell go env GOPATH)/bin/

run: build ## Build and run CLOS
	./$(BINARY_NAME)

dev: ## Run in development mode
	$(GOCMD) run $(MAIN_PATH)/main.go $(MAIN_PATH)/commands.go

# Development targets
init-dev: ## Initialize development environment
	./$(BINARY_NAME) init
	./$(BINARY_NAME) config

setup-templates: ## Copy example templates
	mkdir -p ~/.clos/templates
	cp templates/*.yml ~/.clos/templates/

# Docker targets
docker-build: ## Build Docker image
	docker build -t clos:latest .

docker-run: docker-build ## Build and run Docker container
	docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock clos:latest

# Testing targets
test-unit: ## Run unit tests
	$(GOTEST) -short ./...

test-integration: ## Run integration tests
	$(GOTEST) -tags integration ./...

benchmark: ## Run benchmarks
	$(GOTEST) -bench=. -benchmem ./...

# Linting targets
lint: ## Run linter
	golangci-lint run

fmt: ## Format code
	$(GOCMD) fmt ./...

vet: ## Run go vet
	$(GOCMD) vet ./...

# Database targets
db-reset: ## Reset the CLOS database
	rm -f ~/.clos/registry.db
	./$(BINARY_NAME) init

# Release targets
release: clean ## Build release binaries
	CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 $(GOBUILD) -ldflags "-s -w" -o releases/$(BINARY_NAME)-darwin-amd64 $(MAIN_PATH)
	CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 $(GOBUILD) -ldflags "-s -w" -o releases/$(BINARY_NAME)-darwin-arm64 $(MAIN_PATH)
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 $(GOBUILD) -ldflags "-s -w" -o releases/$(BINARY_NAME)-linux-amd64 $(MAIN_PATH)
	CGO_ENABLED=1 GOOS=windows GOARCH=amd64 $(GOBUILD) -ldflags "-s -w" -o releases/$(BINARY_NAME)-windows-amd64.exe $(MAIN_PATH)

# Documentation targets
docs: ## Generate documentation
	$(GOCMD) doc -all > docs/api.md

# Utility targets
version: ## Show version information
	@echo "CLOS Version: $(shell git describe --tags --always --dirty 2>/dev/null || echo 'dev')"
	@echo "Go Version: $(shell $(GOCMD) version)"
	@echo "Git Commit: $(shell git rev-parse HEAD 2>/dev/null || echo 'unknown')"

status: build ## Show CLOS status
	./$(BINARY_NAME) status

check-deps: ## Check for required dependencies
	@command -v docker >/dev/null 2>&1 || { echo >&2 "Docker is required but not installed. Aborting."; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo >&2 "Docker Compose is required but not installed. Aborting."; exit 1; }
	@echo "All required dependencies are installed."

# Demo targets
demo-setup: build setup-templates ## Set up demo environment
	./$(BINARY_NAME) init
	@echo "Demo environment setup complete!"
	@echo "Try running: make demo-start"

demo-start: build ## Start demo services
	./$(BINARY_NAME) start security-dashboard

demo-stop: build ## Stop demo services
	./$(BINARY_NAME) stop security-dashboard

demo-status: build ## Show demo status
	./$(BINARY_NAME) status

demo-resolve: build ## Resolve demo conflicts
	./$(BINARY_NAME) resolve

help: ## Show this help message
	@echo 'Usage: make <target>'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)