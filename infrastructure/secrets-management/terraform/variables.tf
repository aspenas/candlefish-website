# Candlefish AI Secrets Management - Variable Definitions
# Operational Design Atelier

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for Secrets Management VPC"
  type        = string
  default     = "10.100.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for high availability"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.100.1.0/24", "10.100.2.0/24", "10.100.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (NAT gateways)"
  type        = list(string)
  default     = ["10.100.101.0/24", "10.100.102.0/24", "10.100.103.0/24"]
}

# Vault Configuration
variable "vault_version" {
  description = "HashiCorp Vault version"
  type        = string
  default     = "1.15.4"
}

variable "vault_cluster_size" {
  description = "Number of Vault nodes in cluster"
  type        = number
  default     = 3
  
  validation {
    condition     = var.vault_cluster_size >= 3 && var.vault_cluster_size % 2 == 1
    error_message = "Vault cluster size must be odd and at least 3 for HA."
  }
}

variable "vault_instance_type" {
  description = "EC2 instance type for Vault nodes"
  type        = string
  default     = "t3.medium"
}

# Sealed Secrets Configuration
variable "sealed_secrets_version" {
  description = "Sealed Secrets controller version"
  type        = string
  default     = "0.24.5"
}

# HSM Configuration
variable "enable_hsm" {
  description = "Enable CloudHSM for critical key management"
  type        = bool
  default     = false
}

# Initial Secrets Configuration
variable "initial_secrets" {
  description = "Initial secrets to create in AWS Secrets Manager"
  type = map(object({
    description    = string
    type          = string
    owner         = string
    rotation_days = number
  }))
  default = {
    "database/primary" = {
      description    = "Primary database credentials"
      type          = "database"
      owner         = "platform-team"
      rotation_days = 30
    }
    "api/stripe" = {
      description    = "Stripe API keys"
      type          = "api"
      owner         = "payments-team"
      rotation_days = 90
    }
    "api/github" = {
      description    = "GitHub OAuth and API tokens"
      type          = "api"
      owner         = "platform-team"
      rotation_days = 60
    }
    "certificates/wildcard" = {
      description    = "Wildcard SSL certificate"
      type          = "certificate"
      owner         = "infrastructure-team"
      rotation_days = 30
    }
  }
}

# Monitoring and Alerting
variable "alert_email" {
  description = "Email address for security alerts"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key for critical alerts"
  type        = string
  sensitive   = true
  default     = ""
}

# Compliance and Audit
variable "compliance_standards" {
  description = "Compliance standards to enforce"
  type        = list(string)
  default     = ["SOC2", "ISO27001", "GDPR"]
}

variable "audit_retention_days" {
  description = "Number of days to retain audit logs"
  type        = number
  default     = 2555  # 7 years
}

variable "enable_compliance_reporting" {
  description = "Enable automated compliance reporting"
  type        = bool
  default     = true
}

# Cost Optimization
variable "use_spot_instances" {
  description = "Use spot instances for non-critical Vault nodes"
  type        = bool
  default     = false
}

variable "enable_auto_scaling" {
  description = "Enable auto-scaling for Vault cluster"
  type        = bool
  default     = true
}

variable "min_cluster_size" {
  description = "Minimum cluster size for auto-scaling"
  type        = number
  default     = 3
}

variable "max_cluster_size" {
  description = "Maximum cluster size for auto-scaling"
  type        = number
  default     = 7
}

# Tags
variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default = {
    CostCenter  = "Engineering"
    Compliance  = "Required"
    Criticality = "High"
  }
}

# Backup Configuration
variable "backup_schedule" {
  description = "Cron expression for backup schedule"
  type        = string
  default     = "0 2 * * *"  # Daily at 2 AM
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 90
}

# Network Security
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access Vault"
  type        = list(string)
  default     = []
}

variable "enable_private_link" {
  description = "Enable AWS PrivateLink for Secrets Manager"
  type        = bool
  default     = true
}

# Developer Experience
variable "enable_dev_mode" {
  description = "Enable developer mode with relaxed security (non-production only)"
  type        = bool
  default     = false
}

variable "dev_secret_prefix" {
  description = "Prefix for developer-specific secrets"
  type        = string
  default     = "dev/"
}

# Emergency Access
variable "break_glass_users" {
  description = "IAM users with break-glass access"
  type        = list(string)
  default     = []
}

variable "break_glass_mfa_required" {
  description = "Require MFA for break-glass access"
  type        = bool
  default     = true
}

# Locals for computed values
locals {
  full_environment = "${var.environment}-${var.aws_region}"
  
  vault_domain = var.environment == "production" ? "vault.candlefish.ai" : "vault-${var.environment}.candlefish.ai"
  
  is_production = var.environment == "production"
  
  enable_enhanced_monitoring = var.environment == "production" || var.enable_compliance_reporting
  
  secret_categories = [
    "api",
    "database",
    "certificate",
    "encryption",
    "authentication",
    "infrastructure"
  ]
}