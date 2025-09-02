# Claude Configuration System - Infrastructure Makefile
# Provides common Terraform operations with proper validation

.PHONY: help init plan apply destroy validate fmt clean check-tools install-tools outputs cost

# Default target
.DEFAULT_GOAL := help

# Variables
PROJECT_NAME := claude-config
TERRAFORM_DIR := .
PLAN_FILE := terraform.plan
STATE_FILE := terraform.tfstate
TFVARS_FILE := terraform.tfvars

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Check if terraform.tfvars exists
check-tfvars:
	@if [ ! -f $(TFVARS_FILE) ]; then \
		echo "$(RED)Error: $(TFVARS_FILE) not found!$(NC)"; \
		echo "Please create it from the example:"; \
		echo "  cp terraform.tfvars.example $(TFVARS_FILE)"; \
		echo "  # Edit $(TFVARS_FILE) with your actual values"; \
		exit 1; \
	fi

# Check if required tools are installed
check-tools:
	@echo "$(CYAN)Checking required tools...$(NC)"
	@command -v terraform >/dev/null 2>&1 || { echo "$(RED)terraform is required but not installed$(NC)"; exit 1; }
	@command -v aws >/dev/null 2>&1 || { echo "$(RED)aws CLI is required but not installed$(NC)"; exit 1; }
	@command -v jq >/dev/null 2>&1 || { echo "$(RED)jq is required but not installed$(NC)"; exit 1; }
	@echo "$(GREEN)All required tools are installed$(NC)"

# Install tools (macOS with Homebrew)
install-tools:
	@echo "$(CYAN)Installing required tools...$(NC)"
	@if command -v brew >/dev/null 2>&1; then \
		brew install terraform awscli jq; \
	else \
		echo "$(YELLOW)Homebrew not found. Please install tools manually:$(NC)"; \
		echo "- Terraform: https://www.terraform.io/downloads.html"; \
		echo "- AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"; \
		echo "- jq: https://stedolan.github.io/jq/download/"; \
	fi

# Initialize Terraform
init: check-tools check-tfvars
	@echo "$(CYAN)Initializing Terraform...$(NC)"
	terraform init -upgrade
	@echo "$(GREEN)Terraform initialization completed$(NC)"

# Validate Terraform configuration
validate: check-tools
	@echo "$(CYAN)Validating Terraform configuration...$(NC)"
	terraform validate
	terraform fmt -check -diff
	@echo "$(GREEN)Terraform validation passed$(NC)"

# Format Terraform files
fmt:
	@echo "$(CYAN)Formatting Terraform files...$(NC)"
	terraform fmt -recursive
	@echo "$(GREEN)Terraform formatting completed$(NC)"

# Create Terraform plan
plan: check-tools check-tfvars init validate
	@echo "$(CYAN)Creating Terraform plan...$(NC)"
	terraform plan -out=$(PLAN_FILE) -detailed-exitcode
	@echo "$(GREEN)Terraform plan created$(NC)"

# Apply Terraform plan
apply: check-tools check-tfvars
	@echo "$(CYAN)Applying Terraform changes...$(NC)"
	@if [ ! -f $(PLAN_FILE) ]; then \
		echo "$(YELLOW)Plan file not found. Creating plan first...$(NC)"; \
		$(MAKE) plan; \
	fi
	@echo "$(YELLOW)This will apply changes to your AWS infrastructure.$(NC)"
	@read -p "Are you sure you want to continue? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	terraform apply $(PLAN_FILE)
	@rm -f $(PLAN_FILE)
	@echo "$(GREEN)Terraform apply completed$(NC)"
	@$(MAKE) outputs

# Show Terraform outputs
outputs: check-tools
	@echo "$(CYAN)Terraform Outputs:$(NC)"
	@terraform output -json > outputs.json
	@terraform output
	@echo ""
	@echo "$(GREEN)Outputs saved to outputs.json$(NC)"

# Show deployment cost estimate
cost:
	@echo "$(CYAN)Estimated Monthly Costs:$(NC)"
	@echo "Development:  \$$200-400/month"
	@echo "Staging:      \$$300-500/month"
	@echo "Production:   \$$500-1000/month"
	@echo ""
	@echo "Major components:"
	@echo "- ECS Fargate:     \$$100-400"
	@echo "- RDS PostgreSQL:  \$$50-200"
	@echo "- NAT Gateways:    \$$90"
	@echo "- ElastiCache:     \$$30-150"
	@echo "- Data Transfer:   \$$20-100"
	@echo "- Other services:  \$$50-100"
	@echo ""
	@echo "$(YELLOW)Use AWS Cost Calculator for detailed estimates:$(NC)"
	@echo "https://calculator.aws/"

# Destroy infrastructure (with safety checks)
destroy: check-tools check-tfvars
	@echo "$(RED)WARNING: This will destroy all infrastructure!$(NC)"
	@echo "$(RED)This action cannot be undone!$(NC)"
	@echo ""
	@terraform plan -destroy
	@echo ""
	@echo "$(RED)Are you ABSOLUTELY sure you want to destroy everything?$(NC)"
	@read -p "Type 'destroy' to confirm: " confirm && [ "$$confirm" = "destroy" ] || exit 1
	terraform destroy
	@echo "$(GREEN)Infrastructure destroyed$(NC)"

# Clean up temporary files
clean:
	@echo "$(CYAN)Cleaning up temporary files...$(NC)"
	rm -f $(PLAN_FILE)
	rm -f terraform.tfplan
	rm -f .terraform.lock.hcl
	rm -rf .terraform/
	rm -f outputs.json
	rm -f deploy-*.log
	@echo "$(GREEN)Cleanup completed$(NC)"

# Show infrastructure status
status: check-tools
	@echo "$(CYAN)Infrastructure Status:$(NC)"
	@if [ -f $(STATE_FILE) ] || terraform state list >/dev/null 2>&1; then \
		echo "$(GREEN)Infrastructure is deployed$(NC)"; \
		terraform state list | wc -l | xargs printf "Resources: %d\n"; \
	else \
		echo "$(YELLOW)Infrastructure not deployed$(NC)"; \
	fi

# Refresh Terraform state
refresh: check-tools check-tfvars init
	@echo "$(CYAN)Refreshing Terraform state...$(NC)"
	terraform refresh
	@echo "$(GREEN)State refresh completed$(NC)"

# Import existing resource (usage: make import RESOURCE=aws_instance.example ID=i-1234567890abcdef0)
import: check-tools check-tfvars init
	@if [ -z "$(RESOURCE)" ] || [ -z "$(ID)" ]; then \
		echo "$(RED)Usage: make import RESOURCE=resource_name ID=resource_id$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Importing $(RESOURCE) with ID $(ID)...$(NC)"
	terraform import $(RESOURCE) $(ID)
	@echo "$(GREEN)Resource imported successfully$(NC)"

# Show Terraform workspace
workspace:
	@echo "$(CYAN)Current Terraform workspace:$(NC)"
	@terraform workspace show

# Create development copy of tfvars
tfvars-dev:
	@if [ -f terraform.tfvars ]; then \
		cp terraform.tfvars terraform.tfvars.dev; \
		echo "$(GREEN)Created terraform.tfvars.dev$(NC)"; \
	else \
		cp terraform.tfvars.example terraform.tfvars.dev; \
		echo "$(GREEN)Created terraform.tfvars.dev from example$(NC)"; \
		echo "$(YELLOW)Please edit terraform.tfvars.dev with development values$(NC)"; \
	fi

# Validate AWS credentials
check-aws:
	@echo "$(CYAN)Checking AWS credentials...$(NC)"
	@aws sts get-caller-identity >/dev/null 2>&1 && \
		echo "$(GREEN)AWS credentials are valid$(NC)" || \
		{ echo "$(RED)AWS credentials not configured$(NC)"; exit 1; }

# Security scan (requires tfsec)
security-scan:
	@echo "$(CYAN)Running security scan...$(NC)"
	@if command -v tfsec >/dev/null 2>&1; then \
		tfsec .; \
	else \
		echo "$(YELLOW)tfsec not installed. Install with:$(NC)"; \
		echo "  brew install tfsec"; \
		echo "  # or"; \
		echo "  go install github.com/aquasecurity/tfsec/cmd/tfsec@latest"; \
	fi

# Compliance check (requires checkov)
compliance-check:
	@echo "$(CYAN)Running compliance check...$(NC)"
	@if command -v checkov >/dev/null 2>&1; then \
		checkov -d .; \
	else \
		echo "$(YELLOW)checkov not installed. Install with:$(NC)"; \
		echo "  pip3 install checkov"; \
	fi

# Generate documentation (requires terraform-docs)
docs:
	@echo "$(CYAN)Generating documentation...$(NC)"
	@if command -v terraform-docs >/dev/null 2>&1; then \
		terraform-docs markdown table . > README.generated.md; \
		echo "$(GREEN)Documentation generated in README.generated.md$(NC)"; \
	else \
		echo "$(YELLOW)terraform-docs not installed. Install with:$(NC)"; \
		echo "  brew install terraform-docs"; \
	fi

# Run all checks
check: check-tools check-aws validate security-scan
	@echo "$(GREEN)All checks passed$(NC)"

# Quick deployment (for development)
dev-deploy: check-tools check-aws
	@echo "$(CYAN)Quick development deployment...$(NC)"
	@$(MAKE) init
	@$(MAKE) plan
	@$(MAKE) apply

# Production deployment (with extra checks)
prod-deploy: check-tools check-aws security-scan
	@echo "$(CYAN)Production deployment with extra safety checks...$(NC)"
	@$(MAKE) init
	@$(MAKE) validate
	@$(MAKE) plan
	@echo "$(YELLOW)Please review the plan carefully before proceeding$(NC)"
	@$(MAKE) apply

# Show help
help:
	@echo "$(CYAN)Claude Configuration System - Infrastructure Management$(NC)"
	@echo ""
	@echo "$(GREEN)Common Commands:$(NC)"
	@echo "  make init          - Initialize Terraform"
	@echo "  make plan          - Create execution plan"
	@echo "  make apply         - Apply infrastructure changes"
	@echo "  make destroy       - Destroy infrastructure"
	@echo "  make outputs       - Show Terraform outputs"
	@echo "  make status        - Show infrastructure status"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev-deploy    - Quick development deployment"
	@echo "  make tfvars-dev    - Create development tfvars file"
	@echo "  make check         - Run all validation checks"
	@echo ""
	@echo "$(GREEN)Production:$(NC)"
	@echo "  make prod-deploy   - Production deployment with safety checks"
	@echo "  make security-scan - Run security analysis"
	@echo "  make compliance-check - Run compliance checks"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make validate      - Validate Terraform files"
	@echo "  make fmt           - Format Terraform files"
	@echo "  make refresh       - Refresh Terraform state"
	@echo "  make clean         - Clean temporary files"
	@echo ""
	@echo "$(GREEN)Tools:$(NC)"
	@echo "  make install-tools - Install required tools (macOS)"
	@echo "  make check-tools   - Check if tools are installed"
	@echo "  make check-aws     - Validate AWS credentials"
	@echo "  make cost          - Show cost estimates"
	@echo "  make docs          - Generate documentation"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make init plan apply    # Full deployment"
	@echo "  make dev-deploy         # Quick dev deployment"
	@echo "  make import RESOURCE=aws_instance.web ID=i-123"
	@echo ""
	@echo "$(YELLOW)Prerequisites:$(NC)"
	@echo "  1. Copy terraform.tfvars.example to terraform.tfvars"
	@echo "  2. Edit terraform.tfvars with your configuration"
	@echo "  3. Configure AWS credentials (aws configure)"
	@echo "  4. Run 'make check' to verify setup"