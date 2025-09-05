# Candlefish AI Secrets Management - Production Configuration
# AWS Secrets Manager Deployment
# Generated: 2025-09-05

environment = "production"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr             = "10.100.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnet_cidrs = ["10.100.1.0/24", "10.100.2.0/24", "10.100.3.0/24"]
public_subnet_cidrs  = ["10.100.101.0/24", "10.100.102.0/24", "10.100.103.0/24"]

# Vault Configuration
vault_version       = "1.15.4"
vault_cluster_size  = 3
vault_instance_type = "t3.medium"

# Sealed Secrets
sealed_secrets_version = "0.24.5"

# HSM (disabled for initial deployment)
enable_hsm = false

# Initial Secrets Configuration with actual values
initial_secrets = {
  "mongodb/credentials" = {
    description   = "MongoDB Atlas production credentials"
    type         = "database"
    owner        = "platform-team"
    rotation_days = 30
  }
  "api/smithery" = {
    description   = "Smithery API integration key"
    type         = "api"
    owner        = "platform-team"
    rotation_days = 90
  }
  "api/google" = {
    description   = "Google Cloud Platform API key"
    type         = "api"
    owner        = "platform-team"
    rotation_days = 90
  }
  "security/jwt" = {
    description   = "JWT signing secret for authentication"
    type         = "security"
    owner        = "security-team"
    rotation_days = 30
  }
  "security/encryption" = {
    description   = "AES-256 application encryption key"
    type         = "security"
    owner        = "security-team"
    rotation_days = 30
  }
  "database/postgres" = {
    description   = "PostgreSQL RDS credentials"
    type         = "database"
    owner        = "platform-team"
    rotation_days = 30
  }
  "database/redis" = {
    description   = "Redis ElastiCache credentials"
    type         = "cache"
    owner        = "platform-team"
    rotation_days = 60
  }
}

# Monitoring and Alerting
alert_email               = "devops@candlefish.ai"
slack_webhook_url        = ""  # To be configured
pagerduty_integration_key = ""  # To be configured

# Compliance
compliance_standards      = ["SOC2", "ISO27001", "GDPR", "HIPAA"]
audit_retention_days      = 2555  # 7 years
enable_compliance_reporting = true

# Cost Optimization
use_spot_instances   = false  # Use on-demand for production
enable_auto_scaling  = true
min_cluster_size     = 3
max_cluster_size     = 7

# Backup Configuration
backup_schedule       = "0 2 * * *"  # Daily at 2 AM UTC
backup_retention_days = 90

# Network Security
allowed_cidr_blocks = [
  "10.0.0.0/8",     # Internal VPC ranges
  "172.16.0.0/12",  # Docker networks
]

enable_private_link = true

# Developer Access (production = restricted)
enable_dev_mode   = false
dev_secret_prefix = "dev/"

# Emergency Access
break_glass_users = [
  "patrick.smith",
  "emergency-admin"
]
break_glass_mfa_required = true

# Resource Tags
tags = {
  Project      = "Candlefish-AI"
  Environment  = "Production"
  ManagedBy    = "Terraform"
  CostCenter   = "Engineering"
  Compliance   = "Required"
  Criticality  = "High"
  Owner        = "Platform-Team"
  BackupPolicy = "Daily"
  DataClass    = "Confidential"
}