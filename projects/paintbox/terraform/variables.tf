# Terraform Variables for Paintbox Infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "AWS region must be a valid region format."
  }
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "paintbox"
}

# Database Variables
variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "paintbox_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters long."
  }
}

# Redis Variables
variable "redis_auth_token" {
  description = "Redis authentication token"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.redis_auth_token) >= 32
    error_message = "Redis auth token must be at least 32 characters long."
  }
}

# Application Secrets
variable "salesforce_client_id" {
  description = "Salesforce OAuth client ID"
  type        = string
  sensitive   = true
}

variable "salesforce_client_secret" {
  description = "Salesforce OAuth client secret"
  type        = string
  sensitive   = true
}

variable "salesforce_username" {
  description = "Salesforce username"
  type        = string
  sensitive   = true
}

variable "salesforce_password" {
  description = "Salesforce password"
  type        = string
  sensitive   = true
}

variable "salesforce_security_token" {
  description = "Salesforce security token"
  type        = string
  sensitive   = true
}

variable "salesforce_instance_url" {
  description = "Salesforce instance URL"
  type        = string
  default     = "https://kindhomesolutions1--bartsand.sandbox.my.salesforce.com"
}

variable "companycam_api_token" {
  description = "Company Cam API token"
  type        = string
  sensitive   = true
}

variable "companycam_webhook_secret" {
  description = "Company Cam webhook secret"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Application encryption key"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.encryption_key) == 64
    error_message = "Encryption key must be exactly 64 characters long."
  }
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT secret must be at least 32 characters long."
  }
}

variable "nextauth_secret" {
  description = "NextAuth.js secret"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.nextauth_secret) >= 32
    error_message = "NextAuth secret must be at least 32 characters long."
  }
}

# Monitoring Variables
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "alerts@candlefish.ai"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Alert email must be a valid email address."
  }
}

# WAF Variables
variable "enable_waf" {
  description = "Enable AWS WAF for web application firewall"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "WAF rate limit per 5-minute period"
  type        = number
  default     = 2000

  validation {
    condition     = var.waf_rate_limit >= 100 && var.waf_rate_limit <= 20000
    error_message = "WAF rate limit must be between 100 and 20000."
  }
}

# Backup Variables
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 90
    error_message = "Backup retention days must be between 1 and 90."
  }
}

# Auto Scaling Variables
variable "min_capacity" {
  description = "Minimum number of instances"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "desired_capacity" {
  description = "Desired number of instances"
  type        = number
  default     = 2
}

# Instance Variables
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"

  validation {
    condition = contains([
      "t3.micro", "t3.small", "t3.medium", "t3.large",
      "t3a.micro", "t3a.small", "t3a.medium", "t3a.large",
      "m5.large", "m5.xlarge", "m5.2xlarge"
    ], var.instance_type)
    error_message = "Instance type must be a supported type."
  }
}

# Certificate Variables
variable "domain_name" {
  description = "Domain name for SSL certificate"
  type        = string
  default     = ""
}

variable "create_certificate" {
  description = "Create ACM certificate for domain"
  type        = bool
  default     = false
}

# ECS/Fargate Variables
variable "app_image" {
  description = "Docker image for the application"
  type        = string
  default     = "ghcr.io/aspenas/candlefish-ai/paintbox:latest"
}

variable "container_port" {
  description = "Port on which the application runs"
  type        = number
  default     = 3000
}

variable "fargate_cpu" {
  description = "Fargate instance CPU units to provision (1 vCPU = 1024 CPU units)"
  type        = number
  default     = 1024

  validation {
    condition = contains([
      256, 512, 1024, 2048, 4096, 8192, 16384
    ], var.fargate_cpu)
    error_message = "Fargate CPU must be one of: 256, 512, 1024, 2048, 4096, 8192, 16384."
  }
}

variable "fargate_memory" {
  description = "Fargate instance memory to provision (in MiB)"
  type        = number
  default     = 2048

  validation {
    condition = var.fargate_memory >= 512 && var.fargate_memory <= 30720
    error_message = "Fargate memory must be between 512 and 30720 MiB."
  }
}

variable "app_count" {
  description = "Number of Docker containers to run"
  type        = number
  default     = 2

  validation {
    condition     = var.app_count >= 1 && var.app_count <= 100
    error_message = "App count must be between 1 and 100."
  }
}

# Load Balancer Variables
variable "health_check_path" {
  description = "Health check path for the load balancer"
  type        = string
  default     = "/api/health"
}

variable "health_check_matcher" {
  description = "HTTP response codes to use when checking for a healthy responses from a target"
  type        = string
  default     = "200"
}

# Auto Scaling Thresholds
variable "cpu_threshold_high" {
  description = "CPU utilization threshold to trigger scale-out"
  type        = number
  default     = 70

  validation {
    condition     = var.cpu_threshold_high >= 50 && var.cpu_threshold_high <= 95
    error_message = "CPU threshold high must be between 50 and 95."
  }
}

variable "memory_threshold_high" {
  description = "Memory utilization threshold to trigger scale-out"
  type        = number
  default     = 80

  validation {
    condition     = var.memory_threshold_high >= 50 && var.memory_threshold_high <= 95
    error_message = "Memory threshold high must be between 50 and 95."
  }
}

variable "request_count_threshold" {
  description = "Request count per target to trigger scale-out"
  type        = number
  default     = 1000

  validation {
    condition     = var.request_count_threshold >= 100 && var.request_count_threshold <= 10000
    error_message = "Request count threshold must be between 100 and 10000."
  }
}

# Monitoring and Alerting
variable "alert_email_addresses" {
  description = "List of email addresses for CloudWatch alerts"
  type        = list(string)
  default     = ["alerts@candlefish.ai"]

  validation {
    condition = alltrue([
      for email in var.alert_email_addresses : can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", email))
    ])
    error_message = "All email addresses must be valid."
  }
}

variable "enable_container_insights" {
  description = "Enable ECS Container Insights"
  type        = bool
  default     = true
}

variable "enable_service_discovery" {
  description = "Enable ECS service discovery"
  type        = bool
  default     = true
}

# SSL/TLS Configuration
variable "ssl_policy" {
  description = "SSL policy for the ALB listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  validation {
    condition = contains([
      "ELBSecurityPolicy-TLS13-1-2-2021-06",
      "ELBSecurityPolicy-TLS-1-2-2017-01",
      "ELBSecurityPolicy-TLS-1-2-Ext-2018-06"
    ], var.ssl_policy)
    error_message = "SSL policy must be a supported AWS ALB SSL policy."
  }
}

# CloudFront Variables
variable "enable_cdn" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

variable "cdn_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.cdn_price_class)
    error_message = "CDN price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

variable "cache_behaviors" {
  description = "Custom cache behaviors for CloudFront"
  type = map(object({
    path_pattern     = string
    allowed_methods  = list(string)
    cached_methods   = list(string)
    min_ttl         = number
    default_ttl     = number
    max_ttl         = number
    compress        = bool
  }))
  default = {}
}

# Performance Variables
variable "enable_compression" {
  description = "Enable gzip compression in ALB and CloudFront"
  type        = bool
  default     = true
}

variable "static_assets_cache_ttl" {
  description = "Cache TTL for static assets in seconds"
  type        = number
  default     = 31536000 # 1 year

  validation {
    condition     = var.static_assets_cache_ttl >= 300 && var.static_assets_cache_ttl <= 31536000
    error_message = "Static assets cache TTL must be between 300 seconds and 1 year."
  }
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
