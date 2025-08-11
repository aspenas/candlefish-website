# Variables for Candlefish Collaboration System Infrastructure

# General
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "candlefish-collaboration"
}

variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "admin_access_cidrs" {
  description = "CIDR blocks allowed for admin access"
  type        = list(string)
  default     = ["10.0.0.0/8"]  # Restrict to VPC by default
}

# EKS Configuration
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "candlefish-collaboration"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "ec2_key_pair_name" {
  description = "Name of the EC2 key pair for node access"
  type        = string
  default     = null
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"

  validation {
    condition = can(regex("^db\\.", var.db_instance_class))
    error_message = "Database instance class must start with 'db.'."
  }
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS instance (GB)"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance (GB)"
  type        = number
  default     = 1000
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "collaboration_db"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "collaboration_user"
}

variable "db_read_replicas_count" {
  description = "Number of read replicas to create"
  type        = number
  default     = 2
}

variable "db_replica_instance_class" {
  description = "RDS read replica instance class"
  type        = string
  default     = "db.r6g.large"
}

# Redis Configuration
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7.0"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r7g.large"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 3
}

variable "redis_cluster_mode_enabled" {
  description = "Enable Redis cluster mode for higher scalability"
  type        = bool
  default     = false
}

variable "redis_cluster_node_type" {
  description = "ElastiCache Redis cluster node type"
  type        = string
  default     = "cache.r7g.xlarge"
}

variable "redis_num_node_groups" {
  description = "Number of node groups (shards) for Redis cluster mode"
  type        = number
  default     = 3
}

variable "redis_replicas_per_node_group" {
  description = "Number of replica nodes per node group in cluster mode"
  type        = number
  default     = 2
}

# S3 Configuration
variable "s3_document_bucket_name" {
  description = "Name of S3 bucket for document storage"
  type        = string
  default     = null  # Will be generated if not provided
}

variable "s3_enable_versioning" {
  description = "Enable versioning for S3 bucket"
  type        = bool
  default     = true
}

variable "s3_transition_to_ia_days" {
  description = "Days before transitioning objects to IA storage class"
  type        = number
  default     = 30
}

variable "s3_transition_to_glacier_days" {
  description = "Days before transitioning objects to Glacier"
  type        = number
  default     = 90
}

variable "s3_expiration_days" {
  description = "Days before objects expire (0 to disable)"
  type        = number
  default     = 0
}

# CloudFront Configuration
variable "cloudfront_enabled" {
  description = "Enable CloudFront for static asset distribution"
  type        = bool
  default     = true
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.cloudfront_price_class)
    error_message = "Price class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }
}

# WAF Configuration
variable "waf_enabled" {
  description = "Enable AWS WAF for web application protection"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5 minutes)"
  type        = number
  default     = 10000
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch logs retention period (days)"
  type        = number
  default     = 30
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = "alerts@candlefish.ai"
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_schedule" {
  description = "Cron expression for backup schedule"
  type        = string
  default     = "cron(0 3 * * ? *)"  # Daily at 3 AM UTC
}

# Security Configuration
variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest for all resources"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict in production
}

# Application Configuration
variable "app_domain" {
  description = "Domain name for the application"
  type        = string
  default     = "candlefish.ai"
}

variable "app_subdomain" {
  description = "Subdomain for the collaboration editor"
  type        = string
  default     = "editor"
}

variable "api_subdomain" {
  description = "Subdomain for the API"
  type        = string
  default     = "api"
}

variable "ws_subdomain" {
  description = "Subdomain for WebSocket connections"
  type        = string
  default     = "ws"
}

variable "cdn_subdomain" {
  description = "Subdomain for CDN/static assets"
  type        = string
  default     = "cdn"
}

# Feature Flags
variable "enable_auto_scaling" {
  description = "Enable auto scaling for EKS node groups"
  type        = bool
  default     = true
}

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for production"
  type        = bool
  default     = null  # Will be set based on environment
}

# Cost Optimization
variable "enable_cost_optimization" {
  description = "Enable cost optimization features (spot instances, scheduled scaling)"
  type        = bool
  default     = false
}

variable "dev_environment_shutdown_schedule" {
  description = "Cron expression for shutting down dev environment (empty to disable)"
  type        = string
  default     = ""
}

variable "dev_environment_startup_schedule" {
  description = "Cron expression for starting up dev environment (empty to disable)"
  type        = string
  default     = ""
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# External Secrets
variable "external_secrets_enabled" {
  description = "Enable External Secrets Operator for secret management"
  type        = bool
  default     = true
}

variable "vault_endpoint" {
  description = "HashiCorp Vault endpoint (if using Vault for secrets)"
  type        = string
  default     = ""
}

# Disaster Recovery
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "Secondary region for cross-region backups"
  type        = string
  default     = "us-west-2"
}

# Performance Configuration
variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = true
}

variable "performance_insights_retention" {
  description = "Performance Insights retention period (days)"
  type        = number
  default     = 7
}

# Development Configuration
variable "enable_debug_mode" {
  description = "Enable debug mode for development environments"
  type        = bool
  default     = false
}

variable "enable_public_access" {
  description = "Enable public access for development (DISABLE in production)"
  type        = bool
  default     = false
}
