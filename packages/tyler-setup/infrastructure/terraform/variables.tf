# Variables for Tyler Setup Platform Infrastructure

# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "tyler-setup"
}

variable "environment" {
  description = "Environment (development, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Application Configuration
variable "app_port" {
  description = "Port on which the application runs"
  type        = number
  default     = 3000
}

variable "app_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 2
}

variable "fargate_cpu" {
  description = "Fargate instance CPU units (1024 = 1 CPU)"
  type        = number
  default     = 1024
}

variable "fargate_memory" {
  description = "Fargate instance memory in MiB"
  type        = number
  default     = 2048
}

# Auto Scaling Configuration
variable "min_capacity" {
  description = "Minimum number of ECS tasks"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum number of ECS tasks"
  type        = number
  default     = 10
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS instance"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "tyler_setup"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "tyler_admin"
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 2
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "setup.candlefish.ai"
}

variable "api_domain_name" {
  description = "API domain name"
  type        = string
  default     = "api.setup.candlefish.ai"
}

# CloudFront Configuration
variable "cloudfront_price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF for the ALB"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict in production
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "enable_backup_encryption" {
  description = "Enable encryption for backups"
  type        = bool
  default     = true
}

# Tags
variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default = {
    Project     = "Tyler Setup Platform"
    Owner       = "Candlefish.ai"
    Environment = "production"
    Terraform   = "true"
  }
}

# Cost Management
variable "enable_cost_alerts" {
  description = "Enable cost alerting"
  type        = bool
  default     = true
}

variable "monthly_cost_threshold" {
  description = "Monthly cost threshold for alerts (USD)"
  type        = number
  default     = 500
}

# Lambda Configuration (for additional functions)
variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

# GraphQL Configuration
variable "enable_graphql_introspection" {
  description = "Enable GraphQL schema introspection"
  type        = bool
  default     = false  # Disabled for production security
}

variable "graphql_max_query_depth" {
  description = "Maximum GraphQL query depth"
  type        = number
  default     = 10
}

# Rate Limiting Configuration
variable "api_rate_limit" {
  description = "API rate limit per minute per IP"
  type        = number
  default     = 1000
}

variable "auth_rate_limit" {
  description = "Authentication rate limit per minute per IP"
  type        = number
  default     = 10
}

# SSL/TLS Configuration
variable "ssl_policy" {
  description = "SSL policy for ALB listeners"
  type        = string
  default     = "ELBSecurityPolicy-TLS-1-2-2017-01"
}

# Log Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_log_encryption" {
  description = "Enable CloudWatch log encryption"
  type        = bool
  default     = true
}

# Health Check Configuration
variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/health"
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "healthy_threshold" {
  description = "Number of consecutive successful health checks"
  type        = number
  default     = 2
}

variable "unhealthy_threshold" {
  description = "Number of consecutive failed health checks"
  type        = number
  default     = 2
}

# Blue-Green Deployment Configuration
variable "enable_blue_green" {
  description = "Enable blue-green deployment strategy"
  type        = bool
  default     = true
}

variable "deployment_timeout" {
  description = "Deployment timeout in minutes"
  type        = number
  default     = 15
}

# Mobile App Configuration
variable "mobile_api_version" {
  description = "Mobile API version"
  type        = string
  default     = "v1"
}

variable "enable_push_notifications" {
  description = "Enable push notification services"
  type        = bool
  default     = true
}

# AI/Claude Configuration
variable "claude_model" {
  description = "Claude model to use"
  type        = string
  default     = "claude-3-5-sonnet-20241022"
}

variable "claude_max_tokens" {
  description = "Maximum tokens per Claude request"
  type        = number
  default     = 4096
}

# Feature Flags
variable "enable_websockets" {
  description = "Enable WebSocket support"
  type        = bool
  default     = true
}

variable "enable_real_time_collaboration" {
  description = "Enable real-time collaboration features"
  type        = bool
  default     = true
}

variable "enable_analytics" {
  description = "Enable analytics and metrics collection"
  type        = bool
  default     = true
}

variable "enable_audit_logging" {
  description = "Enable comprehensive audit logging"
  type        = bool
  default     = true
}

variable "enable_shield_advanced" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false  # Additional cost
}
