# Terraform Variables for Candlefish Website Infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for the website"
  type        = string
  default     = "candlefish.ai"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domain"
  type        = string
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "eks_node_desired_capacity" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
}

variable "eks_node_min_capacity" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 2
}

variable "eks_node_max_capacity" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10
}

# RDS Configuration
variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage in GB for auto-scaling"
  type        = number
  default     = 100
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 1
}

# Cost optimization tags
variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

variable "project_code" {
  description = "Project code for cost tracking"
  type        = string
  default     = "CNDL-WEB-001"
}

# Auto-scaling parameters
variable "target_cpu_utilization" {
  description = "Target CPU utilization for auto-scaling"
  type        = number
  default     = 70
}

variable "target_memory_utilization" {
  description = "Target memory utilization for auto-scaling"
  type        = number
  default     = 80
}

# Monitoring configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
}

# Security configuration
variable "enable_waf" {
  description = "Enable AWS WAF for CloudFront"
  type        = bool
  default     = true
}

variable "enable_shield_advanced" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false
}

# Backup configuration
variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for RDS"
  type        = bool
  default     = true
}

# Performance configuration
variable "cloudfront_price_class" {
  description = "CloudFront price class for edge locations"
  type        = string
  default     = "PriceClass_100"
  
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200", 
      "PriceClass_100"
    ], var.cloudfront_price_class)
    error_message = "CloudFront price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

variable "enable_compression" {
  description = "Enable compression for CloudFront"
  type        = bool
  default     = true
}
# WAF Configuration
variable "enable_bot_control" {
  description = "Enable AWS Managed Bot Control ruleset (additional charges apply)"
  type        = bool
  default     = false
}

variable "blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

variable "allowed_ips" {
  description = "List of IP addresses to always allow"
  type        = list(string)
  default     = []
}

variable "blocked_ips" {
  description = "List of IP addresses to block"
  type        = list(string)
  default     = []
}

# Route 53 Configuration
variable "stable_weight" {
  description = "Weight for stable deployment in canary routing"
  type        = number
  default     = 90
}

variable "canary_weight" {
  description = "Weight for canary deployment in canary routing"
  type        = number
  default     = 10
}

variable "domain_verification" {
  description = "Domain verification TXT record value"
  type        = string
  default     = ""
}

# API Gateway Configuration
variable "api_gateway_us_ip" {
  description = "IP address for US API Gateway endpoint"
  type        = string
  default     = ""
}

variable "api_gateway_eu_ip" {
  description = "IP address for EU API Gateway endpoint"
  type        = string
  default     = ""
}

variable "api_gateway_ap_ip" {
  description = "IP address for Asia-Pacific API Gateway endpoint"
  type        = string
  default     = ""
}

# WebSocket Configuration
variable "websocket_us_east_ip" {
  description = "IP address for US East WebSocket endpoint"
  type        = string
  default     = ""
}

variable "websocket_us_west_ip" {
  description = "IP address for US West WebSocket endpoint"
  type        = string
  default     = ""
}

variable "websocket_eu_ip" {
  description = "IP address for EU WebSocket endpoint"
  type        = string
  default     = ""
}

# CloudFront Configuration
variable "origin_verify_header" {
  description = "Secret header for origin verification"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cdn_secret" {
  description = "Secret for CDN authentication"
  type        = string
  sensitive   = true
  default     = ""
}

# S3 Configuration
variable "enable_s3_transfer_acceleration" {
  description = "Enable S3 Transfer Acceleration for faster uploads"
  type        = bool
  default     = true
}

variable "enable_intelligent_tiering" {
  description = "Enable S3 Intelligent-Tiering for cost optimization"
  type        = bool
  default     = true
}

variable "enable_cross_region_replication" {
  description = "Enable cross-region replication for disaster recovery"
  type        = bool
  default     = false
}

# Lambda Configuration
variable "lambda_memory_size" {
  description = "Memory size for Lambda functions in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "reserved_concurrent_executions" {
  description = "Reserved concurrent executions for Lambda functions"
  type        = number
  default     = 100
}

# Monitoring and Alerting
variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
  default     = ""
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing"
  type        = bool
  default     = true
}

# Performance Targets
variable "target_latency_ms" {
  description = "Target latency in milliseconds"
  type        = number
  default     = 100
}

variable "target_concurrent_users" {
  description = "Target number of concurrent users"
  type        = number
  default     = 1000
}

variable "target_fps" {
  description = "Target frames per second for WebGL"
  type        = number
  default     = 60
}

# Cost Optimization Flags
variable "use_spot_instances" {
  description = "Use spot instances for non-critical workloads"
  type        = bool
  default     = false
}

variable "enable_auto_scaling" {
  description = "Enable auto-scaling for compute resources"
  type        = bool
  default     = true
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for predictable traffic patterns"
  type        = bool
  default     = false
}
