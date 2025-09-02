# Main Terraform Configuration for Claude Configuration System on ECS
# Production-ready deployment with full AWS infrastructure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  
  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "claude-config/ecs/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  
  default_tags {
    tags = local.common_tags
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Random suffix for unique naming
resource "random_id" "suffix" {
  byte_length = 4
}

# Locals
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  cluster_name = var.cluster_name
  
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
  
  vpc_cidr = "10.0.0.0/16"
  
  private_subnets = [
    "10.0.1.0/24",
    "10.0.2.0/24",
    "10.0.3.0/24"
  ]
  
  public_subnets = [
    "10.0.101.0/24",
    "10.0.102.0/24",
    "10.0.103.0/24"
  ]
  
  database_subnets = [
    "10.0.201.0/24",
    "10.0.202.0/24",
    "10.0.203.0/24"
  ]
  
  elasticache_subnets = [
    "10.0.211.0/24",
    "10.0.212.0/24",
    "10.0.213.0/24"
  ]
  
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Owner       = "candlefish-ai"
    CostCenter  = "engineering"
    Terraform   = "true"
  }
  
  services = {
    main_api = {
      name          = "main-api"
      port          = 8000
      cpu           = 2048
      memory        = 4096
      desired_count = 3
      min_capacity  = 2
      max_capacity  = 10
      domain        = "api.${var.domain_name}"
      health_check  = "/health"
      priority      = 100
    }
    analytics_engine = {
      name          = "analytics-engine"
      port          = 8001
      cpu           = 1024
      memory        = 2048
      desired_count = 2
      min_capacity  = 1
      max_capacity  = 5
      domain        = "analytics.${var.domain_name}"
      health_check  = "/health"
      priority      = 200
    }
    model_router = {
      name          = "model-router"
      port          = 8002
      cpu           = 1024
      memory        = 2048
      desired_count = 2
      min_capacity  = 1
      max_capacity  = 5
      domain        = "router.${var.domain_name}"
      health_check  = "/health"
      priority      = 300
    }
    error_monitor = {
      name          = "error-monitor"
      port          = 8003
      cpu           = 512
      memory        = 1024
      desired_count = 1
      min_capacity  = 1
      max_capacity  = 3
      domain        = "monitor.${var.domain_name}"
      health_check  = "/health"
      priority      = 400
    }
  }
}