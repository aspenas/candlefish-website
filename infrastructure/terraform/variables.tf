# Terraform Variables for Candlefish AI Infrastructure

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "development"

  validation {
    condition = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

#============================================================================
# Network Configuration
#============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.7.0/24", "10.0.8.0/24", "10.0.9.0/24"]
}

#============================================================================
# EKS Configuration
#============================================================================

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "enable_fargate" {
  description = "Enable Fargate profiles for serverless workloads"
  type        = bool
  default     = false
}

variable "node_group_instance_types" {
  description = "Instance types for EKS node groups"
  type        = map(list(string))
  default = {
    development = ["t3.small", "t3.medium"]
    staging     = ["t3.medium", "t3.large"]
    production  = ["t3.large", "t3.xlarge", "c5.large"]
  }
}

variable "node_group_capacity_type" {
  description = "Capacity type for node groups (ON_DEMAND, SPOT, or MIXED)"
  type        = map(string)
  default = {
    development = "SPOT"
    staging     = "SPOT"
    production  = "ON_DEMAND"
  }
}

variable "node_group_scaling_config" {
  description = "Scaling configuration for node groups"
  type = map(object({
    min_size     = number
    max_size     = number
    desired_size = number
  }))
  default = {
    development = {
      min_size     = 1
      max_size     = 5
      desired_size = 2
    }
    staging = {
      min_size     = 2
      max_size     = 10
      desired_size = 3
    }
    production = {
      min_size     = 3
      max_size     = 20
      desired_size = 6
    }
  }
}

#============================================================================
# Database Configuration
#============================================================================

variable "db_instance_class_dev" {
  description = "RDS instance class for development/staging"
  type        = string
  default     = "db.t3.micro"
}

variable "db_instance_class_prod" {
  description = "RDS instance class for production"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS"
  type        = map(number)
  default = {
    development = 20
    staging     = 50
    production  = 100
  }
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS auto scaling"
  type        = map(number)
  default = {
    development = 100
    staging     = 500
    production  = 1000
  }
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days"
  type        = map(number)
  default = {
    development = 1
    staging     = 3
    production  = 7
  }
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = map(bool)
  default = {
    development = false
    staging     = false
    production  = true
  }
}

#============================================================================
# Cache Configuration
#============================================================================

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = map(string)
  default = {
    development = "cache.t3.micro"
    staging     = "cache.t3.small"
    production  = "cache.t3.medium"
  }
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters for Redis replication group"
  type        = map(number)
  default = {
    development = 1
    staging     = 1
    production  = 2
  }
}

variable "redis_snapshot_retention_limit" {
  description = "Redis snapshot retention limit"
  type        = map(number)
  default = {
    development = 1
    staging     = 3
    production  = 5
  }
}

#============================================================================
# Monitoring Configuration
#============================================================================

variable "cloudwatch_log_retention" {
  description = "CloudWatch log retention in days"
  type        = map(number)
  default = {
    development = 7
    staging     = 14
    production  = 30
  }
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring for resources"
  type        = map(bool)
  default = {
    development = false
    staging     = false
    production  = true
  }
}

variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = map(bool)
  default = {
    development = false
    staging     = false
    production  = true
  }
}

#============================================================================
# Security Configuration
#============================================================================

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = map(bool)
  default = {
    development = false
    staging     = false
    production  = true
  }
}

variable "kms_key_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 7
}

#============================================================================
# Cost Optimization Configuration
#============================================================================

variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "use_spot_instances" {
  description = "Use spot instances for non-production workloads"
  type        = map(bool)
  default = {
    development = true
    staging     = true
    production  = false
  }
}

variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules for cost optimization"
  type = object({
    transition_to_ia_days      = number
    transition_to_glacier_days = number
    transition_to_deep_archive_days = number
    noncurrent_version_expiration_days = number
  })
  default = {
    transition_to_ia_days      = 30
    transition_to_glacier_days = 90
    transition_to_deep_archive_days = 365
    noncurrent_version_expiration_days = 90
  }
}

#============================================================================
# Application Configuration
#============================================================================

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "candlefish.ai"
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate in ACM"
  type        = string
  default     = ""
}

variable "enable_waf" {
  description = "Enable AWS WAF for application load balancer"
  type        = bool
  default     = true
}

#============================================================================
# Backup Configuration
#============================================================================

variable "enable_automated_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_schedule" {
  description = "Backup schedule in cron format"
  type        = string
  default     = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = map(number)
  default = {
    development = 7
    staging     = 14
    production  = 30
  }
}

#============================================================================
# Notification Configuration
#============================================================================

variable "alert_email" {
  description = "Email address for alerts and notifications"
  type        = string
  default     = "alerts@candlefish.ai"
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

#============================================================================
# Feature Flags
#============================================================================

variable "enable_blue_green_deployment" {
  description = "Enable blue-green deployment strategy"
  type        = bool
  default     = true
}

variable "enable_canary_deployment" {
  description = "Enable canary deployment strategy"
  type        = bool
  default     = true
}

variable "enable_auto_scaling" {
  description = "Enable auto scaling for EKS node groups"
  type        = bool
  default     = true
}

variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

variable "enable_horizontal_pod_autoscaler" {
  description = "Enable horizontal pod autoscaler"
  type        = bool
  default     = true
}

variable "enable_vertical_pod_autoscaler" {
  description = "Enable vertical pod autoscaler"
  type        = bool
  default     = false
}

#============================================================================
# Development Configuration
#============================================================================

variable "enable_dev_tools" {
  description = "Enable development tools and debugging features"
  type        = bool
  default     = false
}

variable "allow_ssh_access" {
  description = "Allow SSH access to worker nodes (development only)"
  type        = bool
  default     = false
}

variable "enable_kubectl_access" {
  description = "Enable kubectl access from local machine"
  type        = bool
  default     = true
}
