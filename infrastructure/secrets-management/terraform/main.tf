# Candlefish AI Secrets Management Infrastructure
# Operational Design Atelier - Security as Craft

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.20"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
  
  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "secrets-management/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/terraform-state"
    dynamodb_table = "terraform-state-lock"
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Candlefish-AI"
      Component   = "Secrets-Management"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Philosophy  = "Operational-Design-Atelier"
    }
  }
}

# Create dedicated VPC for secrets infrastructure
module "secrets_vpc" {
  source = "./modules/vpc"
  
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
  enable_nat_gateway   = true
  enable_vpn_gateway   = true
  enable_flow_logs     = true
  
  tags = {
    Name = "candlefish-secrets-vpc"
  }
}

# KMS Keys for encryption
module "kms" {
  source = "./modules/kms"
  
  key_alias_prefix = "candlefish-secrets"
  key_rotation     = true
  
  key_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Vault to use the key"
        Effect = "Allow"
        Principal = {
          AWS = module.vault.vault_role_arn
        }
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })
}

# HashiCorp Vault Cluster
module "vault" {
  source = "./modules/vault"
  
  vpc_id              = module.secrets_vpc.vpc_id
  private_subnet_ids  = module.secrets_vpc.private_subnet_ids
  vault_version       = var.vault_version
  cluster_size        = var.vault_cluster_size
  instance_type       = var.vault_instance_type
  kms_key_id          = module.kms.key_id
  
  auto_unseal = true
  
  audit_storage = {
    type   = "s3"
    bucket = aws_s3_bucket.vault_audit.id
    path   = "audit-logs/"
  }
  
  telemetry = {
    prometheus_retention_time = "24h"
    disable_hostname          = true
  }
  
  seal_config = {
    type = "awskms"
    kms_key_id = module.kms.key_id
    region = var.aws_region
  }
}

# AWS Secrets Manager Configuration
resource "aws_secretsmanager_secret" "master_secrets" {
  for_each = var.initial_secrets
  
  name                    = "candlefish/${each.key}"
  description             = each.value.description
  recovery_window_in_days = 7
  kms_key_id              = module.kms.key_id
  
  rotation_rules {
    automatically_after_days = each.value.rotation_days
  }
  
  tags = {
    Type        = each.value.type
    Owner       = each.value.owner
    Environment = var.environment
  }
}

# CloudHSM Cluster for critical operations
module "cloudhsm" {
  source = "./modules/cloudhsm"
  
  count = var.enable_hsm ? 1 : 0
  
  vpc_id     = module.secrets_vpc.vpc_id
  subnet_ids = module.secrets_vpc.private_subnet_ids
  
  hsm_instance_type = "hsm1.medium"
  
  tags = {
    Purpose = "Critical-Key-Management"
  }
}

# Sealed Secrets Controller for Kubernetes
module "sealed_secrets" {
  source = "./modules/sealed-secrets"
  
  kubernetes_namespace = "kube-system"
  controller_version   = var.sealed_secrets_version
  
  private_key_secret = {
    name      = "sealed-secrets-key"
    namespace = "kube-system"
  }
  
  backup_to_s3 = {
    enabled = true
    bucket  = aws_s3_bucket.sealed_secrets_backup.id
    prefix  = "keys/"
  }
}

# S3 Buckets for audit and backup
resource "aws_s3_bucket" "vault_audit" {
  bucket = "candlefish-vault-audit-${var.environment}"
  
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "vault_audit" {
  bucket = aws_s3_bucket.vault_audit.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "vault_audit" {
  bucket = aws_s3_bucket.vault_audit.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = module.kms.key_id
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "vault_audit" {
  bucket = aws_s3_bucket.vault_audit.id
  
  rule {
    id     = "archive-old-audit-logs"
    status = "Enabled"
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    
    expiration {
      days = 2555  # 7 years for compliance
    }
  }
}

resource "aws_s3_bucket" "sealed_secrets_backup" {
  bucket = "candlefish-sealed-secrets-backup-${var.environment}"
  
  lifecycle {
    prevent_destroy = true
  }
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"
  
  vault_cluster_arn        = module.vault.cluster_arn
  secrets_manager_arns     = values(aws_secretsmanager_secret.master_secrets)[*].arn
  kms_key_arn              = module.kms.key_arn
  audit_bucket_arn         = aws_s3_bucket.vault_audit.arn
  backup_bucket_arn        = aws_s3_bucket.sealed_secrets_backup.arn
}

# Monitoring and Alerting
module "monitoring" {
  source = "./modules/monitoring"
  
  vault_cluster_id         = module.vault.cluster_id
  secrets_manager_arns     = values(aws_secretsmanager_secret.master_secrets)[*].arn
  cloudwatch_log_group     = aws_cloudwatch_log_group.secrets_management.name
  
  alert_email              = var.alert_email
  slack_webhook_url        = var.slack_webhook_url
  pagerduty_integration_key = var.pagerduty_integration_key
  
  alert_thresholds = {
    secret_age_days              = 60
    failed_rotation_count        = 3
    unauthorized_access_attempts = 5
    vault_seal_status            = "unsealed"
    audit_log_gap_minutes        = 15
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "secrets_management" {
  name              = "/aws/candlefish/secrets-management"
  retention_in_days = 90
  kms_key_id        = module.kms.key_arn
}

# Outputs
output "vault_endpoint" {
  value       = module.vault.vault_endpoint
  description = "HashiCorp Vault API endpoint"
}

output "vault_ui_endpoint" {
  value       = module.vault.vault_ui_endpoint
  description = "HashiCorp Vault UI endpoint"
}

output "kms_key_id" {
  value       = module.kms.key_id
  description = "KMS key ID for encryption"
}

output "secrets_manager_arns" {
  value       = { for k, v in aws_secretsmanager_secret.master_secrets : k => v.arn }
  description = "ARNs of created secrets in AWS Secrets Manager"
}

output "sealed_secrets_cert" {
  value       = module.sealed_secrets.public_cert
  description = "Public certificate for sealing secrets"
  sensitive   = true
}

data "aws_caller_identity" "current" {}