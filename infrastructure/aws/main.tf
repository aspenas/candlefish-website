# Claude Configuration System - Main Terraform Configuration
# Infrastructure for AWS ECS deployment

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
    key            = "claude-config/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "candlefish-terraform-locks"
    encrypt        = true
  }
}

# Configure AWS Provider
provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  
  default_tags {
    tags = {
      Project     = "Claude Configuration System"
      Environment = var.environment
      Owner       = "Candlefish AI"
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Random password for RDS
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Random suffix for unique naming
resource "random_id" "suffix" {
  byte_length = 4
}