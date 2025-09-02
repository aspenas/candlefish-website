# Variables for Claude Configuration System ECS Infrastructure

# AWS Configuration
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "aws_access_key" {
  description = "AWS Access Key"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS Secret Key"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name (production, staging, dev)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "claude-config"
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
  default     = "claude-config-cluster"
}

# Domain Configuration
variable "domain_name" {
  description = "Base domain name"
  type        = string
  default     = "candlefish.ai"
}

variable "create_dns_zone" {
  description = "Whether to create Route53 hosted zone"
  type        = bool
  default     = false
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.large"
}

variable "db_read_replica_instance_class" {
  description = "RDS read replica instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS in GB"
  type        = number
  default     = 500
}

variable "db_storage_encrypted" {
  description = "Enable storage encryption for RDS"
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days"
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

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = true
}

variable "db_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "database_maintenance_ips" {
  description = "IP addresses allowed for database maintenance"
  type        = list(string)
  default     = []
}

# ElastiCache Configuration
variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r7g.large"
}

variable "elasticache_num_nodes" {
  description = "Number of ElastiCache nodes"
  type        = number
  default     = 3
}

variable "elasticache_automatic_failover" {
  description = "Enable automatic failover for ElastiCache"
  type        = bool
  default     = true
}

variable "elasticache_multi_az" {
  description = "Enable Multi-AZ for ElastiCache"
  type        = bool
  default     = true
}

variable "elasticache_snapshot_retention" {
  description = "Snapshot retention period in days"
  type        = number
  default     = 7
}

variable "elasticache_snapshot_window" {
  description = "Preferred snapshot window"
  type        = string
  default     = "03:00-05:00"
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7.0"
}

# ECS Configuration
variable "ecs_enable_container_insights" {
  description = "Enable Container Insights for ECS"
  type        = bool
  default     = true
}

variable "ecs_capacity_providers" {
  description = "ECS capacity providers"
  type        = list(string)
  default     = ["FARGATE", "FARGATE_SPOT"]
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

variable "autoscaling_target_requests" {
  description = "Target requests per target for auto scaling"
  type        = number
  default     = 1000
}

variable "autoscaling_scale_in_cooldown" {
  description = "Scale in cooldown period in seconds"
  type        = number
  default     = 300
}

variable "autoscaling_scale_out_cooldown" {
  description = "Scale out cooldown period in seconds"
  type        = number
  default     = 60
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling"
  type        = bool
  default     = true
}

variable "enable_predictive_scaling" {
  description = "Enable predictive scaling"
  type        = bool
  default     = false
}

variable "enable_rds_autoscaling" {
  description = "Enable RDS read replica auto scaling"
  type        = bool
  default     = false
}

variable "rds_min_read_replicas" {
  description = "Minimum number of RDS read replicas"
  type        = number
  default     = 1
}

variable "rds_max_read_replicas" {
  description = "Maximum number of RDS read replicas"
  type        = number
  default     = 3
}

# ALB Configuration
variable "alb_enable_deletion_protection" {
  description = "Enable deletion protection for ALB"
  type        = bool
  default     = true
}

variable "alb_enable_http2" {
  description = "Enable HTTP/2 for ALB"
  type        = bool
  default     = true
}

variable "alb_idle_timeout" {
  description = "ALB idle timeout in seconds"
  type        = number
  default     = 60
}

variable "alb_access_logs_enabled" {
  description = "Enable access logs for ALB"
  type        = bool
  default     = true
}

# WAF Configuration
variable "waf_enabled" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "WAF rate limit per 5-minute window"
  type        = number
  default     = 2000
}

variable "waf_allowed_ips" {
  description = "IP addresses allowed by WAF"
  type        = list(string)
  default     = []
}

variable "waf_blocked_countries" {
  description = "Country codes to block via WAF"
  type        = list(string)
  default     = []
}

# Monitoring Configuration
variable "cloudwatch_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 90
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = true
}

variable "enable_enhanced_monitoring" {
  description = "Enable Enhanced Monitoring for RDS"
  type        = bool
  default     = true
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "alerts@candlefish.ai"
}

# Cost Optimization
variable "use_spot_instances" {
  description = "Use Fargate Spot for non-critical services"
  type        = bool
  default     = true
}

variable "spot_weight" {
  description = "Weight for Fargate Spot instances"
  type        = number
  default     = 3
}

# Backup Configuration
variable "enable_aws_backup" {
  description = "Enable AWS Backup for disaster recovery"
  type        = bool
  default     = true
}

variable "backup_vault_name" {
  description = "AWS Backup vault name"
  type        = string
  default     = "claude-config-backup-vault"
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

# Secret Management
variable "rotate_secrets" {
  description = "Enable automatic secret rotation"
  type        = bool
  default     = true
}

variable "secret_rotation_days" {
  description = "Secret rotation period in days"
  type        = number
  default     = 30
}

variable "secret_recovery_window" {
  description = "Secret recovery window in days"
  type        = number
  default     = 7
}

variable "kms_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 7
}

# API Keys and Secrets
variable "anthropic_api_key" {
  description = "Anthropic API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_bedrock_key" {
  description = "AWS Bedrock Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "github_token" {
  description = "GitHub Token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""
}

# OAuth Configuration
variable "google_oauth_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "google_oauth_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "github_oauth_client_id" {
  description = "GitHub OAuth Client ID"
  type        = string
  default     = ""
}

variable "github_oauth_client_secret" {
  description = "GitHub OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

# CloudFront Configuration
variable "enable_cloudfront" {
  description = "Enable CloudFront distribution"
  type        = bool
  default     = true
}

variable "cloudfront_geo_restrictions" {
  description = "Country codes for CloudFront geo restrictions"
  type        = list(string)
  default     = []
}

# Bastion Configuration
variable "enable_bastion" {
  description = "Enable bastion host"
  type        = bool
  default     = false
}

variable "bastion_allowed_ips" {
  description = "IP addresses allowed to connect to bastion"
  type        = list(string)
  default     = []
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}