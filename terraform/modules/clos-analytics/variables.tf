# CLOS Analytics Terraform Module Variables

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ============================================
# Network Configuration
# ============================================
variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
  default     = ""
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
  default     = []
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
  default     = []
}

# ============================================
# RDS PostgreSQL Configuration
# ============================================
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16.1"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
  
  validation {
    condition = can(regex("^db\\.(t3|t4g|m5|m6i|r5|r6i)\\.", var.db_instance_class))
    error_message = "DB instance class must be a valid RDS instance type."
  }
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS instance (GB)"
  type        = number
  default     = 20
  
  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "DB allocated storage must be between 20 and 65536 GB."
  }
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance (GB)"
  type        = number
  default     = 100
  
  validation {
    condition     = var.db_max_allocated_storage >= 20
    error_message = "DB max allocated storage must be at least 20 GB."
  }
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "clos_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# ============================================
# Redis Configuration
# ============================================
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
  
  validation {
    condition = can(regex("^cache\\.(t3|t4g|m5|m6i|r5|r6i)\\.", var.redis_node_type))
    error_message = "Redis node type must be a valid ElastiCache instance type."
  }
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 2
  
  validation {
    condition     = var.redis_num_cache_nodes >= 1 && var.redis_num_cache_nodes <= 6
    error_message = "Redis cache nodes must be between 1 and 6."
  }
}

variable "redis_auth_token" {
  description = "Auth token for Redis cluster"
  type        = string
  sensitive   = true
}

# ============================================
# Load Balancer Configuration
# ============================================
variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = ""
}

variable "access_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = ""
}

# ============================================
# Monitoring Configuration
# ============================================
variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
  
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period."
  }
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS"
  type        = bool
  default     = false
}

variable "sns_alerts_email" {
  description = "Email address for SNS alerts"
  type        = string
  default     = ""
}

variable "sns_alerts_slack_webhook" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

# ============================================
# Scaling Configuration
# ============================================
variable "min_capacity" {
  description = "Minimum number of application instances"
  type        = number
  default     = 1
  
  validation {
    condition     = var.min_capacity >= 1
    error_message = "Minimum capacity must be at least 1."
  }
}

variable "max_capacity" {
  description = "Maximum number of application instances"
  type        = number
  default     = 10
  
  validation {
    condition     = var.max_capacity >= 1
    error_message = "Maximum capacity must be at least 1."
  }
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
  
  validation {
    condition     = var.target_cpu_utilization >= 1 && var.target_cpu_utilization <= 100
    error_message = "Target CPU utilization must be between 1 and 100."
  }
}

# ============================================
# Security Configuration
# ============================================
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_waf" {
  description = "Enable AWS WAF for the load balancer"
  type        = bool
  default     = false
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

# ============================================
# Cost Optimization
# ============================================
variable "use_spot_instances" {
  description = "Use spot instances for non-production environments"
  type        = bool
  default     = false
}

variable "enable_cost_optimization" {
  description = "Enable cost optimization features (scheduled scaling, etc.)"
  type        = bool
  default     = true
}

variable "cost_center" {
  description = "Cost center tag for billing"
  type        = string
  default     = "engineering"
}

variable "project_budget" {
  description = "Monthly budget for this project (USD)"
  type        = number
  default     = 500
}

# ============================================
# Feature Flags
# ============================================
variable "enable_analytics_export" {
  description = "Enable analytics data export to S3"
  type        = bool
  default     = false
}

variable "enable_real_time_processing" {
  description = "Enable real-time analytics processing"
  type        = bool
  default     = true
}

variable "enable_data_retention_policy" {
  description = "Enable automatic data retention policies"
  type        = bool
  default     = true
}

variable "data_retention_days" {
  description = "Number of days to retain analytics data"
  type        = number
  default     = 90
  
  validation {
    condition     = var.data_retention_days >= 1
    error_message = "Data retention days must be at least 1."
  }
}