# Fly.io Infrastructure as Code for Paintbox
# This file manages all Fly.io resources using Terraform

terraform {
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.1"
    }
  }
}

provider "fly" {
  # Uses FLY_API_TOKEN environment variable
}

# Variables for Fly.io resources
variable "fly_org" {
  description = "Fly.io organization"
  type        = string
  default     = "personal"
}

variable "primary_region" {
  description = "Primary region for deployment"
  type        = string
  default     = "sjc"
}

variable "secondary_region" {
  description = "Secondary region for multi-region deployment"
  type        = string
  default     = "ord"
}

variable "app_name" {
  description = "Name of the Fly.io application"
  type        = string
  default     = "paintbox-app"
}

variable "db_name" {
  description = "Name of the Fly.io PostgreSQL database"
  type        = string
  default     = "paintbox-prod-db"
}

variable "redis_name" {
  description = "Name of the Fly.io Redis instance"
  type        = string
  default     = "paintbox-redis"
}

# Main application
resource "fly_app" "main" {
  name = var.app_name
  org  = var.fly_org
}

# PostgreSQL database
resource "fly_app" "postgres" {
  name = var.db_name
  org  = var.fly_org
}

resource "fly_volume" "postgres_data" {
  app    = fly_app.postgres.name
  name   = "postgres_data"
  size   = 10
  region = var.primary_region
}

# Redis cache
resource "fly_app" "redis" {
  name = var.redis_name
  org  = var.fly_org
}

resource "fly_volume" "redis_data" {
  app    = fly_app.redis.name
  name   = "redis_data"
  size   = 1
  region = var.primary_region
}

# Application secrets (references AWS Secrets Manager)
resource "fly_secret" "aws_region" {
  app   = fly_app.main.name
  name  = "AWS_REGION"
  value = "us-east-1"
}

resource "fly_secret" "aws_secrets_name" {
  app   = fly_app.main.name
  name  = "AWS_SECRETS_MANAGER_SECRET_NAME"
  value = "paintbox/production/secrets"
}

resource "fly_secret" "skip_aws_secrets" {
  app   = fly_app.main.name
  name  = "SKIP_AWS_SECRETS"
  value = "false"
}

# Multi-region scaling configuration
resource "fly_machine" "app_primary" {
  app    = fly_app.main.name
  region = var.primary_region
  name   = "${var.app_name}-primary"

  services = [
    {
      ports = [
        {
          port     = 443
          handlers = ["tls", "http"]
        },
        {
          port     = 80
          handlers = ["http"]
        }
      ]
      protocol      = "tcp"
      internal_port = 8080
    }
  ]

  env = {
    NODE_ENV                        = "production"
    PORT                           = "8080"
    NEXT_TELEMETRY_DISABLED        = "1"
    NEXT_PUBLIC_APP_VERSION        = "1.0.0"
    NEXT_PUBLIC_API_URL           = "https://${var.app_name}.fly.dev"
    NEXT_PUBLIC_WEBSOCKET_URL     = "wss://${var.app_name}.fly.dev"
    ENABLE_WEBSOCKETS             = "true"
    ENABLE_REAL_TIME_CALCULATIONS = "true"
    ENABLE_SALESFORCE_SYNC        = "true"
    ENABLE_COMPANYCAM_INTEGRATION = "true"
    ENABLE_OFFLINE_MODE           = "true"
    ENABLE_PERFORMANCE_MONITORING = "true"
    ENABLE_EXCEL_FORMULA_VALIDATION = "true"
  }

  image = "registry.fly.io/${var.app_name}:latest"

  vm_size = "shared-cpu-2x"
  vm_memory = 2048

  restart_policy = "always"

  checks = [
    {
      type     = "http"
      interval = "30s"
      timeout  = "5s"
      path     = "/api/health"
      method   = "GET"
      headers = {
        "X-Health-Check" = "fly-terraform"
      }
    }
  ]
}

resource "fly_machine" "app_secondary" {
  app    = fly_app.main.name
  region = var.secondary_region
  name   = "${var.app_name}-secondary"

  services = [
    {
      ports = [
        {
          port     = 443
          handlers = ["tls", "http"]
        },
        {
          port     = 80
          handlers = ["http"]
        }
      ]
      protocol      = "tcp"
      internal_port = 8080
    }
  ]

  env = {
    NODE_ENV                        = "production"
    PORT                           = "8080"
    NEXT_TELEMETRY_DISABLED        = "1"
    NEXT_PUBLIC_APP_VERSION        = "1.0.0"
    NEXT_PUBLIC_API_URL           = "https://${var.app_name}.fly.dev"
    NEXT_PUBLIC_WEBSOCKET_URL     = "wss://${var.app_name}.fly.dev"
    ENABLE_WEBSOCKETS             = "true"
    ENABLE_REAL_TIME_CALCULATIONS = "true"
    ENABLE_SALESFORCE_SYNC        = "true"
    ENABLE_COMPANYCAM_INTEGRATION = "true"
    ENABLE_OFFLINE_MODE           = "true"
    ENABLE_PERFORMANCE_MONITORING = "true"
    ENABLE_EXCEL_FORMULA_VALIDATION = "true"
  }

  image = "registry.fly.io/${var.app_name}:latest"

  vm_size = "shared-cpu-2x"
  vm_memory = 2048

  restart_policy = "always"

  checks = [
    {
      type     = "http"
      interval = "30s"
      timeout  = "5s"
      path     = "/api/health"
      method   = "GET"
      headers = {
        "X-Health-Check" = "fly-terraform"
      }
    }
  ]
}

# PostgreSQL machine with backup configuration
resource "fly_machine" "postgres" {
  app    = fly_app.postgres.name
  region = var.primary_region
  name   = "${var.db_name}-primary"

  image = "postgres:15-alpine"

  env = {
    POSTGRES_DB       = "paintbox"
    POSTGRES_USER     = "postgres"
    PGDATA           = "/var/lib/postgresql/data/pgdata"
  }

  mounts = [
    {
      volume = fly_volume.postgres_data.id
      path   = "/var/lib/postgresql/data"
    }
  ]

  vm_size = "shared-cpu-2x"
  vm_memory = 2048

  restart_policy = "always"

  services = [
    {
      ports = [
        {
          port = 5432
        }
      ]
      protocol      = "tcp"
      internal_port = 5432
    }
  ]

  checks = [
    {
      type     = "tcp"
      interval = "15s"
      timeout  = "2s"
      port     = 5432
    }
  ]
}

# Redis machine
resource "fly_machine" "redis" {
  app    = fly_app.redis.name
  region = var.primary_region
  name   = "${var.redis_name}-primary"

  image = "redis:7-alpine"

  mounts = [
    {
      volume = fly_volume.redis_data.id
      path   = "/data"
    }
  ]

  vm_size = "shared-cpu-1x"
  vm_memory = 512

  restart_policy = "always"

  services = [
    {
      ports = [
        {
          port = 6379
        }
      ]
      protocol      = "tcp"
      internal_port = 6379
    }
  ]

  checks = [
    {
      type     = "tcp"
      interval = "15s"
      timeout  = "2s"
      port     = 6379
    }
  ]
}

# Outputs
output "app_name" {
  description = "Name of the main application"
  value       = fly_app.main.name
}

output "app_hostname" {
  description = "Hostname of the main application"
  value       = "${fly_app.main.name}.fly.dev"
}

output "postgres_app_name" {
  description = "Name of the PostgreSQL application"
  value       = fly_app.postgres.name
}

output "redis_app_name" {
  description = "Name of the Redis application"
  value       = fly_app.redis.name
}

output "primary_region" {
  description = "Primary deployment region"
  value       = var.primary_region
}

output "secondary_region" {
  description = "Secondary deployment region"
  value       = var.secondary_region
}
