# Claude Configuration System - Terraform Variables

# AWS Configuration
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_access_key" {
  description = "AWS access key"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret key"
  type        = string
  sensitive   = true
}

# Environment Configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "claude-config"
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "candlefish.ai"
}

variable "subdomain" {
  description = "Subdomain for the API"
  type        = string
  default     = "api"
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
  
  validation {
    condition     = var.availability_zones_count >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }
}

# ECS Configuration
variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "claude-config-cluster"
}

variable "ecs_services" {
  description = "ECS services configuration"
  type = map(object({
    name           = string
    port           = number
    cpu            = number
    memory         = number
    desired_count  = number
    min_capacity   = number
    max_capacity   = number
    health_check_path = string
  }))
  
  default = {
    api = {
      name           = "claude-config-api"
      port           = 8000
      cpu            = 512
      memory         = 1024
      desired_count  = 2
      min_capacity   = 1
      max_capacity   = 10
      health_check_path = "/health"
    }
    analytics = {
      name           = "claude-config-analytics"
      port           = 8001
      cpu            = 256
      memory         = 512
      desired_count  = 1
      min_capacity   = 1
      max_capacity   = 5
      health_check_path = "/health"
    }
    router = {
      name           = "claude-config-router"
      port           = 8002
      cpu            = 256
      memory         = 512
      desired_count  = 2
      min_capacity   = 1
      max_capacity   = 5
      health_check_path = "/health"
    }
    monitor = {
      name           = "claude-config-monitor"
      port           = 8003
      cpu            = 256
      memory         = 512
      desired_count  = 1
      min_capacity   = 1
      max_capacity   = 3
      health_check_path = "/health"
    }
  }
}

# RDS Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "RDS max allocated storage in GB"
  type        = number
  default     = 1000
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "claude_config"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "claude_admin"
}

variable "db_backup_retention_period" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30
}

variable "db_backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

variable "redis_parameter_group_name" {
  description = "Parameter group for Redis"
  type        = string
  default     = "default.redis7"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

# Load Balancer Configuration
variable "alb_idle_timeout" {
  description = "ALB idle timeout in seconds"
  type        = number
  default     = 60
}

variable "alb_enable_deletion_protection" {
  description = "Enable deletion protection for ALB"
  type        = bool
  default     = true
}

# Auto Scaling Configuration
variable "autoscaling_target_cpu" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "autoscaling_target_memory" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80
}

variable "autoscaling_scale_in_cooldown" {
  description = "Scale in cooldown in seconds"
  type        = number
  default     = 300
}

variable "autoscaling_scale_out_cooldown" {
  description = "Scale out cooldown in seconds"
  type        = number
  default     = 300
}

# CloudWatch Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# S3 Configuration
variable "s3_bucket_prefix" {
  description = "Prefix for S3 bucket names"
  type        = string
  default     = "candlefish-claude-config"
}

variable "s3_force_destroy" {
  description = "Force destroy S3 buckets on terraform destroy"
  type        = bool
  default     = false
}

# CloudFront Configuration
variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
  
  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.cloudfront_price_class)
    error_message = "CloudFront price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

variable "cloudfront_default_ttl" {
  description = "Default TTL for CloudFront cache"
  type        = number
  default     = 86400
}

variable "cloudfront_max_ttl" {
  description = "Maximum TTL for CloudFront cache"
  type        = number
  default     = 31536000
}

# WAF Configuration
variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5-minute period)"
  type        = number
  default     = 2000
}

variable "waf_blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

# Secret Management
variable "secrets" {
  description = "Secrets to store in AWS Secrets Manager"
  type = map(object({
    description = string
    value       = string
  }))
  
  default = {
    claude_api_key = {
      description = "Claude API key for AI services"
      value       = ""
    }
    jwt_secret = {
      description = "JWT secret for authentication"
      value       = ""
    }
    encryption_key = {
      description = "Encryption key for sensitive data"
      value       = ""
    }
  }
  
  sensitive = true
}

# Monitoring and Alerting
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "alerts@candlefish.ai"
}

# Resource Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}