# Core NANDA Infrastructure - Simplified for Initial Deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "candlefish-nanda-tf-state-1755830988"
    key    = "nanda-platform/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# S3 Buckets for artifacts and backups
resource "aws_s3_bucket" "nanda_artifacts" {
  bucket = "nanda-index-artifacts-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "nanda-index-artifacts"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

resource "aws_s3_bucket" "nanda_backups" {
  bucket = "nanda-index-backups-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "nanda-index-backups"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# DynamoDB Tables
resource "aws_dynamodb_table" "agents" {
  name         = "nanda-index-agents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "agent_id"
  
  attribute {
    name = "agent_id"
    type = "S"
  }
  
  attribute {
    name = "platform"
    type = "S"
  }
  
  global_secondary_index {
    name            = "platform-index"
    hash_key        = "platform"
    projection_type = "ALL"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  tags = {
    Name        = "nanda-index-agents-table"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

resource "aws_dynamodb_table" "agent_facts" {
  name         = "nanda-index-agent-facts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "agent_id"
  range_key    = "fact_id"
  
  attribute {
    name = "agent_id"
    type = "S"
  }
  
  attribute {
    name = "fact_id"
    type = "S"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  tags = {
    Name        = "nanda-index-agent-facts-table"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

# ECR Repositories
resource "aws_ecr_repository" "nanda_api" {
  name                 = "nanda-index/nanda-api"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = {
    Name        = "nanda-index-nanda-api-repo"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

resource "aws_ecr_repository" "nanda_dashboard" {
  name                 = "nanda-index/nanda-dashboard"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = {
    Name        = "nanda-index-nanda-dashboard-repo"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "nanda_api_logs" {
  name              = "/aws/ecs/nanda-index/nanda-api"
  retention_in_days = 30
  
  tags = {
    Name        = "nanda-index-nanda-api-logs"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

resource "aws_cloudwatch_log_group" "nanda_dashboard_logs" {
  name              = "/aws/ecs/nanda-index/nanda-dashboard"
  retention_in_days = 30
  
  tags = {
    Name        = "nanda-index-nanda-dashboard-logs"
    Environment = "production"
    Project     = "NANDA-Index"
  }
}

# Outputs
output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "ecr_api_repository_url" {
  description = "ECR repository URL for NANDA API"
  value       = aws_ecr_repository.nanda_api.repository_url
}

output "ecr_dashboard_repository_url" {
  description = "ECR repository URL for NANDA Dashboard"
  value       = aws_ecr_repository.nanda_dashboard.repository_url
}

output "dynamodb_agents_table_name" {
  description = "DynamoDB agents table name"
  value       = aws_dynamodb_table.agents.name
}

output "dynamodb_agent_facts_table_name" {
  description = "DynamoDB agent facts table name"
  value       = aws_dynamodb_table.agent_facts.name
}

output "s3_artifacts_bucket_name" {
  description = "S3 artifacts bucket name"
  value       = aws_s3_bucket.nanda_artifacts.bucket
}

output "s3_backups_bucket_name" {
  description = "S3 backups bucket name"
  value       = aws_s3_bucket.nanda_backups.bucket
}

output "deployment_summary" {
  description = "Core deployment summary"
  value = {
    project_name     = "nanda-index"
    environment      = "production"
    region          = "us-east-1"
    deployed_at     = timestamp()
    core_resources  = "ECR, DynamoDB, S3, CloudWatch"
  }
}