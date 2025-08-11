# Paintbox Production Makefile
# Unified deployment and operations commands

.PHONY: help
help: ## Show this help message
	@echo "Paintbox Production Operations"
	@echo "=============================="
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Variables
APP_NAME := paintbox-app
AWS_REGION := us-west-2
SECRET_PREFIX := paintbox/production
DOCKER_REGISTRY := ghcr.io/aspenas/candlefish-ai
IMAGE_NAME := $(DOCKER_REGISTRY)/paintbox
VERSION := $(shell git describe --tags --always --dirty)
TIMESTAMP := $(shell date +%Y%m%d%H%M%S)

# Environment Detection
ifdef FLY_APP_NAME
	ENVIRONMENT := production
else ifdef RAILWAY_ENVIRONMENT
	ENVIRONMENT := railway
else
	ENVIRONMENT := local
endif

# ============================================================================
# DEVELOPMENT
# ============================================================================

.PHONY: dev
dev: ## Start development server
	npm run dev

.PHONY: build
build: ## Build the application
	npm run build

.PHONY: test
test: ## Run all tests
	npm test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	npm run test:watch

.PHONY: lint
lint: ## Run linter
	npm run lint

.PHONY: type-check
type-check: ## Run TypeScript type checking
	npm run type-check

.PHONY: format
format: ## Format code with Prettier
	npm run format

# ============================================================================
# DOCKER
# ============================================================================

.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -f Dockerfile.fly.optimized -t $(IMAGE_NAME):$(VERSION) .
	docker tag $(IMAGE_NAME):$(VERSION) $(IMAGE_NAME):latest

.PHONY: docker-push
docker-push: docker-build ## Push Docker image to registry
	docker push $(IMAGE_NAME):$(VERSION)
	docker push $(IMAGE_NAME):latest

.PHONY: docker-run
docker-run: ## Run Docker container locally
	docker run -p 3000:8080 \
		-e NODE_ENV=development \
		--name $(APP_NAME) \
		$(IMAGE_NAME):latest

.PHONY: docker-clean
docker-clean: ## Clean up Docker resources
	docker stop $(APP_NAME) || true
	docker rm $(APP_NAME) || true
	docker image prune -f

# ============================================================================
# SECRETS MANAGEMENT
# ============================================================================

.PHONY: secrets-setup
secrets-setup: ## Initialize AWS Secrets Manager
	@echo "Setting up secrets in AWS Secrets Manager..."
	@chmod +x scripts/setup-secrets.sh
	@./scripts/setup-secrets.sh

.PHONY: secrets-list
secrets-list: ## List all secrets
	@aws secretsmanager list-secrets \
		--region $(AWS_REGION) \
		--filters Key=name,Values=$(SECRET_PREFIX) \
		--query 'SecretList[].Name' \
		--output table

.PHONY: secrets-get
secrets-get: ## Get a specific secret (usage: make secrets-get NAME=database)
	@aws secretsmanager get-secret-value \
		--secret-id $(SECRET_PREFIX)/$(NAME) \
		--region $(AWS_REGION) \
		--query SecretString \
		--output text | jq .

.PHONY: secrets-update
secrets-update: ## Update a specific secret (usage: make secrets-update NAME=database VALUE='{"key":"value"}')
	@aws secretsmanager update-secret \
		--secret-id $(SECRET_PREFIX)/$(NAME) \
		--secret-string '$(VALUE)' \
		--region $(AWS_REGION)

.PHONY: secrets-rotate
secrets-rotate: ## Rotate all secrets
	@echo "Rotating secrets..."
	@for secret in database redis app; do \
		echo "Rotating $$secret..."; \
		aws secretsmanager rotate-secret \
			--secret-id $(SECRET_PREFIX)/$$secret \
			--region $(AWS_REGION); \
	done

# ============================================================================
# FLY.IO DEPLOYMENT
# ============================================================================

.PHONY: fly-deploy
fly-deploy: ## Deploy to Fly.io production
	@echo "Deploying to Fly.io production..."
	fly deploy -c fly.toml.secure --strategy bluegreen

.PHONY: fly-deploy-staging
fly-deploy-staging: ## Deploy to Fly.io staging
	@echo "Deploying to Fly.io staging..."
	fly deploy -c fly.staging.toml --app paintbox-staging

.PHONY: fly-status
fly-status: ## Check Fly.io application status
	fly status
	fly secrets list

.PHONY: fly-logs
fly-logs: ## Stream Fly.io logs
	fly logs --follow

.PHONY: fly-ssh
fly-ssh: ## SSH into Fly.io instance
	fly ssh console

.PHONY: fly-scale
fly-scale: ## Scale Fly.io instances (usage: make fly-scale COUNT=3)
	fly scale count $(COUNT)

.PHONY: fly-regions
fly-regions: ## List and manage Fly.io regions
	fly regions list
	@echo ""
	@echo "To add a region: fly regions add ord"
	@echo "To remove a region: fly regions remove sjc"

.PHONY: fly-secrets-sync
fly-secrets-sync: ## Sync AWS credentials to Fly.io
	@echo "Syncing AWS credentials to Fly.io..."
	@read -p "Enter AWS Access Key ID: " aws_key; \
	read -sp "Enter AWS Secret Access Key: " aws_secret; \
	echo ""; \
	fly secrets set \
		AWS_ACCESS_KEY_ID=$$aws_key \
		AWS_SECRET_ACCESS_KEY=$$aws_secret \
		AWS_REGION=$(AWS_REGION)

# ============================================================================
# DATABASE OPERATIONS
# ============================================================================

.PHONY: db-backup
db-backup: ## Create database backup
	@echo "Creating database backup..."
	@BACKUP_FILE="backup-$(TIMESTAMP).sql"
	@fly postgres backup create --app paintbox-prod-db
	@echo "Backup created: $$BACKUP_FILE"

.PHONY: db-restore
db-restore: ## Restore database from backup (usage: make db-restore BACKUP_ID=xxx)
	@echo "Restoring database from backup $(BACKUP_ID)..."
	@fly postgres backup restore $(BACKUP_ID) --app paintbox-prod-db

.PHONY: db-list-backups
db-list-backups: ## List available database backups
	fly postgres backup list --app paintbox-prod-db

.PHONY: db-connect
db-connect: ## Connect to production database
	fly postgres connect --app paintbox-prod-db

.PHONY: db-migrate
db-migrate: ## Run database migrations
	fly ssh console -C "npm run db:migrate"

# ============================================================================
# MONITORING & LOGS
# ============================================================================

.PHONY: monitor
monitor: ## Open monitoring dashboard
	@echo "Opening monitoring dashboards..."
	@open https://fly.io/apps/$(APP_NAME)/monitoring
	@open https://fly.io/apps/$(APP_NAME)/metrics

.PHONY: logs-app
logs-app: ## Stream application logs
	fly logs --follow --app $(APP_NAME)

.PHONY: logs-db
logs-db: ## Stream database logs
	fly logs --follow --app paintbox-prod-db

.PHONY: logs-redis
logs-redis: ## Stream Redis logs
	fly logs --follow --app paintbox-redis

.PHONY: health-check
health-check: ## Check application health
	@echo "Checking application health..."
	@curl -f https://$(APP_NAME).fly.dev/api/health || echo "Health check failed"

.PHONY: metrics
metrics: ## Get application metrics
	@curl -s https://$(APP_NAME).fly.dev/metrics | head -20

# ============================================================================
# PERFORMANCE
# ============================================================================

.PHONY: perf-test
perf-test: ## Run performance tests
	npm run test:performance

.PHONY: load-test
load-test: ## Run load tests
	npm run test:load

.PHONY: analyze-bundle
analyze-bundle: ## Analyze bundle size
	npm run analyze

# ============================================================================
# DISASTER RECOVERY
# ============================================================================

.PHONY: dr-backup-all
dr-backup-all: ## Create full backup (database + configs)
	@echo "Creating full disaster recovery backup..."
	@make db-backup
	@make secrets-list > backups/secrets-$(TIMESTAMP).txt
	@fly config save -a $(APP_NAME) > backups/config-$(TIMESTAMP).toml
	@echo "Full backup completed: backups/*-$(TIMESTAMP).*"

.PHONY: dr-test
dr-test: ## Test disaster recovery procedures
	@echo "Testing disaster recovery..."
	@make health-check
	@make db-list-backups
	@echo "DR test completed"

.PHONY: rollback
rollback: ## Rollback to previous deployment
	@echo "Rolling back to previous deployment..."
	fly deploy --image $(IMAGE_NAME):previous --strategy immediate

# ============================================================================
# MAINTENANCE
# ============================================================================

.PHONY: maintenance-on
maintenance-on: ## Enable maintenance mode
	fly secrets set MAINTENANCE_MODE=true

.PHONY: maintenance-off
maintenance-off: ## Disable maintenance mode
	fly secrets unset MAINTENANCE_MODE

.PHONY: restart
restart: ## Restart all instances
	fly apps restart $(APP_NAME)

.PHONY: restart-hard
restart-hard: ## Hard restart (recreate all instances)
	fly scale count 0
	sleep 5
	fly scale count 2

# ============================================================================
# CLEANUP
# ============================================================================

.PHONY: clean
clean: ## Clean build artifacts
	rm -rf .next
	rm -rf node_modules
	rm -rf dist
	rm -rf coverage

.PHONY: clean-all
clean-all: clean docker-clean ## Clean everything
	rm -rf backups/*.sql
	rm -rf logs/*.log

# ============================================================================
# CI/CD
# ============================================================================

.PHONY: ci-test
ci-test: ## Run CI test suite
	npm ci
	npm run lint
	npm run type-check
	npm test
	npm run build

.PHONY: ci-deploy
ci-deploy: ## CI deployment pipeline
	@echo "Running CI deployment..."
	make docker-build
	make docker-push
	make fly-deploy

# ============================================================================
# UTILITIES
# ============================================================================

.PHONY: install
install: ## Install dependencies
	npm ci

.PHONY: update-deps
update-deps: ## Update dependencies
	npm update
	npm audit fix

.PHONY: audit
audit: ## Run security audit
	npm audit
	npm audit fix

.PHONY: version
version: ## Show current version
	@echo "Current version: $(VERSION)"
	@echo "Environment: $(ENVIRONMENT)"

.PHONY: info
info: ## Show deployment information
	@echo "================================"
	@echo "Paintbox Deployment Information"
	@echo "================================"
	@echo "App Name: $(APP_NAME)"
	@echo "Version: $(VERSION)"
	@echo "Environment: $(ENVIRONMENT)"
	@echo "AWS Region: $(AWS_REGION)"
	@echo "Docker Image: $(IMAGE_NAME):$(VERSION)"
	@echo "================================"

# Default target
.DEFAULT_GOAL := help
