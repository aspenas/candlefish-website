# Security Dashboard Infrastructure Variables
# Comprehensive variable definitions for production and staging environments

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "security-dashboard"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.aws_region))
    error_message = "AWS region must be a valid region identifier."
  }
}

# ============================================================================
# Network Configuration
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnets are required for high availability."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnets are required for high availability."
  }
}

variable "intra_subnet_cidrs" {
  description = "CIDR blocks for intra (database) subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  validation {
    condition     = length(var.intra_subnet_cidrs) >= 2
    error_message = "At least 2 intra subnets are required for database high availability."
  }
}

# ============================================================================
# Security Configuration
# ============================================================================

variable "production_cidrs" {
  description = "Allowed CIDR blocks for production environment"
  type        = list(string)
  default = [
    "10.0.0.0/16",      # VPC internal
    "172.16.0.0/12",    # Private networks
    "192.168.0.0/16",   # Private networks
    "0.0.0.0/0"         # TODO: Restrict to specific office/VPN IPs in production
  ]

  validation {
    condition = alltrue([
      for cidr in var.production_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All CIDR blocks must be valid IPv4 CIDR notation."
  }
}

variable "staging_cidrs" {
  description = "Allowed CIDR blocks for staging environment"
  type        = list(string)
  default = [
    "10.0.0.0/16",
    "0.0.0.0/0"
  ]
}

# ============================================================================
# Database Configuration
# ============================================================================

variable "database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "security_dashboard"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "database_username" {
  description = "Username for database access"
  type        = string
  default     = "dashboard_admin"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_username))
    error_message = "Database username must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "database_backup_retention_period" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30

  validation {
    condition     = var.database_backup_retention_period >= 7 && var.database_backup_retention_period <= 35
    error_message = "Backup retention period must be between 7 and 35 days."
  }
}

variable "database_performance_insights_retention_period" {
  description = "Number of days to retain Performance Insights data"
  type        = number
  default     = 7

  validation {
    condition     = contains([7, 731], var.database_performance_insights_retention_period)
    error_message = "Performance Insights retention period must be either 7 or 731 days."
  }
}

# ============================================================================
# EKS Configuration
# ============================================================================

variable "cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.cluster_version))
    error_message = "Cluster version must be in format 'x.y' (e.g., '1.28')."
  }
}

variable "node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    min_size      = number
    max_size      = number
    desired_size  = number
    disk_size     = number
    labels        = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  
  default = {
    system = {
      instance_types = ["c6i.large"]
      capacity_type  = "ON_DEMAND"
      min_size      = 2
      max_size      = 5
      desired_size  = 3
      disk_size     = 50
      labels = {
        role = "system"
      }
      taints = [
        {
          key    = "system"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
    
    application = {
      instance_types = ["c6i.xlarge", "c6i.2xlarge"]
      capacity_type  = "SPOT"
      min_size      = 3
      max_size      = 20
      desired_size  = 5
      disk_size     = 100
      labels = {
        role = "application"
      }
      taints = []
    }
    
    data = {
      instance_types = ["r6i.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size      = 1
      max_size      = 5
      desired_size  = 2
      disk_size     = 200
      labels = {
        role = "data"
      }
      taints = []
    }
  }

  validation {
    condition = alltrue([
      for k, v in var.node_groups : v.min_size <= v.desired_size && v.desired_size <= v.max_size
    ])
    error_message = "For each node group: min_size <= desired_size <= max_size"
  }
}

# ============================================================================
# Monitoring and Logging Configuration
# ============================================================================

variable "cloudwatch_log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.cloudwatch_log_retention_days)
    error_message = "CloudWatch log retention must be a valid retention period."
  }
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs for security monitoring"
  type        = bool
  default     = true
}

variable "enable_eks_logging" {
  description = "Enable EKS control plane logging"
  type        = bool
  default     = true
}

variable "eks_log_types" {
  description = "EKS log types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  validation {
    condition = alltrue([
      for log_type in var.eks_log_types : 
      contains(["api", "audit", "authenticator", "controllerManager", "scheduler"], log_type)
    ])
    error_message = "EKS log types must be one of: api, audit, authenticator, controllerManager, scheduler"
  }
}

# ============================================================================
# Cost Management
# ============================================================================

variable "enable_cost_monitoring" {
  description = "Enable cost monitoring and budget alerts"
  type        = bool
  default     = true
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 1000

  validation {
    condition     = var.monthly_budget_limit > 0
    error_message = "Monthly budget limit must be greater than 0."
  }
}

variable "budget_alert_threshold" {
  description = "Budget alert threshold percentage (80 = 80% of budget)"
  type        = number
  default     = 80

  validation {
    condition     = var.budget_alert_threshold > 0 && var.budget_alert_threshold <= 100
    error_message = "Budget alert threshold must be between 0 and 100."
  }
}

# ============================================================================
# Application Configuration
# ============================================================================

variable "domain_name" {
  description = "Primary domain name for the security dashboard"
  type        = string
  default     = "security.candlefish.ai"

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-\\.]*[a-zA-Z0-9]$", var.domain_name))
    error_message = "Domain name must be a valid domain."
  }
}

variable "api_domain_name" {
  description = "API domain name"
  type        = string
  default     = "api.security.candlefish.ai"

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-\\.]*[a-zA-Z0-9]$", var.api_domain_name))
    error_message = "API domain name must be a valid domain."
  }
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS (optional, will create if not provided)"
  type        = string
  default     = ""
}

# ============================================================================
# Feature Flags
# ============================================================================

variable "enable_waf" {
  description = "Enable AWS WAF for web application firewall protection"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false
}

variable "enable_backup" {
  description = "Enable AWS Backup for automated backups"
  type        = bool
  default     = true
}

variable "enable_secrets_rotation" {
  description = "Enable automatic rotation of secrets"
  type        = bool
  default     = true
}

variable "enable_multi_az" {
  description = "Enable multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

# ============================================================================
# Tagging
# ============================================================================

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for k, v in var.additional_tags : can(regex("^[a-zA-Z0-9\\s\\+\\-\\=\\.\\_\\:\\/@]+$", k)) && can(regex("^[a-zA-Z0-9\\s\\+\\-\\=\\.\\_\\:\\/@]+$", v))
    ])
    error_message = "Tag keys and values must contain only letters, numbers, spaces, and the characters: + - = . _ : / @"
  }
}

# ============================================================================
# Contact Information
# ============================================================================

variable "owner_email" {
  description = "Email address of the system owner"
  type        = string
  default     = "security-team@candlefish.ai"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.owner_email))
    error_message = "Owner email must be a valid email address."
  }
}

variable "team_name" {
  description = "Name of the team responsible for this infrastructure"
  type        = string
  default     = "Security Team"
}

variable "cost_center" {
  description = "Cost center for billing and resource allocation"
  type        = string
  default     = "security-operations"
}

# ============================================================================
# Notification Configuration
# ============================================================================

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "pagerduty_routing_key" {
  description = "PagerDuty routing key for critical alerts (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "notification_emails" {
  description = "List of email addresses for infrastructure notifications"
  type        = list(string)
  default     = ["security-team@candlefish.ai"]

  validation {
    condition = alltrue([
      for email in var.notification_emails : can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", email))
    ])
    error_message = "All notification emails must be valid email addresses."
  }
}

# ============================================================================
# Development and Testing
# ============================================================================

variable "enable_debug_logging" {
  description = "Enable debug logging for troubleshooting"
  type        = bool
  default     = false
}

variable "create_test_data" {
  description = "Create test data and mock services for development"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when destroying database (for non-production)"
  type        = bool
  default     = false
}