# Variables for RTPM Infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "rtpm"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "rtpm.candlefish.ai"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for ALB"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
  default     = ""
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "Configuration for EKS node groups"
  type = object({
    general = object({
      instance_types = list(string)
      capacity_type  = string
      min_size      = number
      max_size      = number
      desired_size  = number
    })
    database = object({
      instance_types = list(string)
      capacity_type  = string
      min_size      = number
      max_size      = number
      desired_size  = number
    })
    workers = object({
      instance_types = list(string)
      capacity_type  = string
      min_size      = number
      max_size      = number
      desired_size  = number
    })
  })
  default = {
    general = {
      instance_types = ["t3.large", "t3a.large"]
      capacity_type  = "SPOT"
      min_size      = 3
      max_size      = 20
      desired_size  = 6
    }
    database = {
      instance_types = ["r5.xlarge", "r5a.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size      = 2
      max_size      = 6
      desired_size  = 3
    }
    workers = {
      instance_types = ["c5.large", "c5a.large"]
      capacity_type  = "SPOT"
      min_size      = 2
      max_size      = 20
      desired_size  = 4
    }
  }
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = ""
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage for RDS"
  type        = number
  default     = 0
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for RDS"
  type        = number
  default     = 0
}

variable "rds_backup_retention_period" {
  description = "Backup retention period for RDS"
  type        = number
  default     = 0
}

variable "rds_performance_insights_retention_period" {
  description = "Performance Insights retention period"
  type        = number
  default     = 0
}

# ElastiCache Configuration
variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = ""
}

variable "elasticache_num_cache_clusters" {
  description = "Number of cache clusters"
  type        = number
  default     = 0
}

variable "elasticache_snapshot_retention_limit" {
  description = "Snapshot retention limit for ElastiCache"
  type        = number
  default     = 0
}

# CloudFront Configuration
variable "cloudfront_price_class" {
  description = "Price class for CloudFront distribution"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.cloudfront_price_class)
    error_message = "CloudFront price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

variable "cloudfront_minimum_protocol_version" {
  description = "Minimum TLS protocol version for CloudFront"
  type        = string
  default     = "TLSv1.2_2021"
}

# WAF Configuration
variable "enable_waf" {
  description = "Enable AWS WAF for additional security"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5 minutes)"
  type        = number
  default     = 2000
}

# Monitoring Configuration
variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "enable_container_insights" {
  description = "Enable Container Insights for EKS"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_schedule" {
  description = "Backup schedule expression"
  type        = string
  default     = "cron(0 2 ? * SUN *)"  # Weekly on Sunday at 2 AM UTC
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

# Security Configuration
variable "enable_guardduty" {
  description = "Enable GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for API logging"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_cost_anomaly_detection" {
  description = "Enable cost anomaly detection"
  type        = bool
  default     = true
}

variable "cost_anomaly_threshold" {
  description = "Cost anomaly detection threshold in USD"
  type        = number
  default     = 100
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Secrets
variable "secrets" {
  description = "Application secrets"
  type = object({
    jwt_secret_key = string
    app_secret_key = string
    flower_basic_auth = string
  })
  default = {
    jwt_secret_key    = ""
    app_secret_key    = ""
    flower_basic_auth = ""
  }
  sensitive = true
}

# Feature Flags
variable "enable_spot_instances" {
  description = "Enable spot instances for cost savings"
  type        = bool
  default     = true
}

variable "enable_multi_az" {
  description = "Enable multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest for all data stores"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3

  validation {
    condition     = var.availability_zones >= 2 && var.availability_zones <= 6
    error_message = "Number of availability zones must be between 2 and 6."
  }
}

# Auto Scaling
variable "enable_predictive_scaling" {
  description = "Enable predictive scaling for EKS node groups"
  type        = bool
  default     = true
}

variable "scale_up_cooldown" {
  description = "Scale up cooldown period in seconds"
  type        = number
  default     = 300
}

variable "scale_down_cooldown" {
  description = "Scale down cooldown period in seconds"
  type        = number
  default     = 300
}

# Performance
variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS and ElastiCache"
  type        = bool
  default     = true
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = true
}

# Disaster Recovery
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup"
  type        = bool
  default     = false
}

variable "backup_destination_region" {
  description = "Destination region for cross-region backups"
  type        = string
  default     = "us-west-2"
}
