# Variables for System Analyzer Terraform configuration

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "system-analyzer"
}

# VPC Configuration
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

variable "enable_nat_gateway" {
  description = "Enable NAT gateway for outbound internet access from private subnets"
  type        = bool
  default     = true
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.27"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS node group"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "eks_node_desired_capacity" {
  description = "Desired capacity for EKS node group"
  type        = number
  default     = 3
}

variable "eks_node_max_capacity" {
  description = "Maximum capacity for EKS node group"
  type        = number
  default     = 10
}

variable "eks_node_min_capacity" {
  description = "Minimum capacity for EKS node group"
  type        = number
  default     = 1
}

# Database Configuration
variable "database_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "14.9"
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
  validation {
    condition = contains([
      "db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large",
      "db.r5.large", "db.r5.xlarge", "db.r5.2xlarge"
    ], var.database_instance_class)
    error_message = "Database instance class must be a valid RDS instance type."
  }
}

variable "database_allocated_storage" {
  description = "Allocated storage for RDS instance (GB)"
  type        = number
  default     = 20
  validation {
    condition     = var.database_allocated_storage >= 20 && var.database_allocated_storage <= 1000
    error_message = "Database allocated storage must be between 20 and 1000 GB."
  }
}

variable "database_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance (GB) - enables autoscaling"
  type        = number
  default     = 100
}

variable "database_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "database_username" {
  description = "Username for database"
  type        = string
  default     = "postgres"
}

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "system_analyzer"
}

variable "database_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "database_storage_encrypted" {
  description = "Enable storage encryption for RDS"
  type        = bool
  default     = true
}

# Cache Configuration
variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "cache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "cache_redis_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "cache_port" {
  description = "Port number for Redis"
  type        = number
  default     = 6379
}

variable "cache_at_rest_encryption_enabled" {
  description = "Enable encryption at rest for ElastiCache"
  type        = bool
  default     = true
}

variable "cache_transit_encryption_enabled" {
  description = "Enable encryption in transit for ElastiCache"
  type        = bool
  default     = true
}

# Monitoring Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch log retention value."
  }
}

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights for EKS"
  type        = bool
  default     = true
}

variable "enable_prometheus_monitoring" {
  description = "Enable Prometheus monitoring stack"
  type        = bool
  default     = true
}

variable "enable_grafana" {
  description = "Enable Grafana dashboards"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_aws_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable AWS CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_security_hub" {
  description = "Enable AWS Security Hub for security findings"
  type        = bool
  default     = true
}

# Domain and SSL Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "system-analyzer.example.com"
}

variable "create_route53_zone" {
  description = "Create Route53 hosted zone for domain"
  type        = bool
  default     = false
}

variable "ssl_certificate_arn" {
  description = "ARN of existing SSL certificate in ACM"
  type        = string
  default     = ""
}

variable "create_acm_certificate" {
  description = "Create ACM certificate for domain"
  type        = bool
  default     = true
}

# CDN Configuration
variable "enable_cloudfront" {
  description = "Enable CloudFront CDN for static assets"
  type        = bool
  default     = true
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
  validation {
    condition = contains([
      "PriceClass_All", "PriceClass_200", "PriceClass_100"
    ], var.cloudfront_price_class)
    error_message = "CloudFront price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for database"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for EKS node groups (cost optimization)"
  type        = bool
  default     = false
}

variable "spot_max_price" {
  description = "Maximum price for spot instances"
  type        = string
  default     = "0.10"
}

# Notification Configuration
variable "notification_email" {
  description = "Email address for notifications"
  type        = string
  default     = "admin@example.com"
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# Feature Flags
variable "enable_blue_green_deployment" {
  description = "Enable blue-green deployment strategy"
  type        = bool
  default     = true
}

variable "enable_canary_deployment" {
  description = "Enable canary deployment strategy"
  type        = bool
  default     = false
}

variable "enable_auto_scaling" {
  description = "Enable auto scaling for application services"
  type        = bool
  default     = true
}

variable "enable_external_secrets_operator" {
  description = "Enable External Secrets Operator for Kubernetes"
  type        = bool
  default     = true
}

variable "enable_cert_manager" {
  description = "Enable cert-manager for automatic SSL certificate management"
  type        = bool
  default     = true
}

variable "enable_ingress_nginx" {
  description = "Enable NGINX Ingress Controller"
  type        = bool
  default     = true
}

variable "enable_argocd" {
  description = "Enable ArgoCD for GitOps deployment"
  type        = bool
  default     = false
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}