# Terraform Backend Outputs

output "s3_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "s3_bucket_region" {
  description = "Region of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.region
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for Terraform locks"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for Terraform locks"
  value       = aws_dynamodb_table.terraform_locks.arn
}

output "kms_key_id" {
  description = "ID of the KMS key for state encryption"
  value       = aws_kms_key.terraform_state.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key for state encryption"
  value       = aws_kms_key.terraform_state.arn
}

output "kms_alias_name" {
  description = "Name of the KMS key alias"
  value       = aws_kms_alias.terraform_state.name
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy for backend access"
  value       = aws_iam_policy.terraform_backend_access.arn
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for state notifications"
  value       = var.enable_state_notifications ? aws_sns_topic.state_notifications[0].arn : null
}

output "backup_bucket_name" {
  description = "Name of the backup S3 bucket (if enabled)"
  value       = var.enable_cross_region_backup ? aws_s3_bucket.terraform_state_backup[0].bucket : null
}

output "backup_bucket_arn" {
  description = "ARN of the backup S3 bucket (if enabled)"
  value       = var.enable_cross_region_backup ? aws_s3_bucket.terraform_state_backup[0].arn : null
}

# ============================================
# Backend Configuration Template
# ============================================
output "backend_config" {
  description = "Terraform backend configuration template"
  value = {
    terraform = {
      backend = {
        s3 = {
          bucket         = aws_s3_bucket.terraform_state.bucket
          key            = "path/to/terraform.tfstate"  # Update this for each environment
          region         = aws_s3_bucket.terraform_state.region
          encrypt        = true
          dynamodb_table = aws_dynamodb_table.terraform_locks.name
          kms_key_id     = aws_kms_key.terraform_state.arn
        }
      }
    }
  }
}

output "backend_config_dev" {
  description = "Backend configuration for development environment"
  value = {
    bucket         = aws_s3_bucket.terraform_state.bucket
    key            = "environments/dev/terraform.tfstate"
    region         = aws_s3_bucket.terraform_state.region
    encrypt        = true
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
    kms_key_id     = aws_kms_key.terraform_state.arn
  }
}

output "backend_config_staging" {
  description = "Backend configuration for staging environment"
  value = {
    bucket         = aws_s3_bucket.terraform_state.bucket
    key            = "environments/staging/terraform.tfstate"
    region         = aws_s3_bucket.terraform_state.region
    encrypt        = true
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
    kms_key_id     = aws_kms_key.terraform_state.arn
  }
}

output "backend_config_production" {
  description = "Backend configuration for production environment"
  value = {
    bucket         = aws_s3_bucket.terraform_state.bucket
    key            = "environments/production/terraform.tfstate"
    region         = aws_s3_bucket.terraform_state.region
    encrypt        = true
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
    kms_key_id     = aws_kms_key.terraform_state.arn
  }
}

# ============================================
# Migration Instructions
# ============================================
output "migration_instructions" {
  description = "Instructions for migrating to the remote backend"
  value = {
    step_1 = "Update your terraform block with the backend configuration above"
    step_2 = "Run 'terraform init -migrate-state' to migrate existing state"
    step_3 = "Verify state migration with 'terraform plan' (should show no changes)"
    step_4 = "Delete local terraform.tfstate file after successful migration"
    
    example_backend_block = <<-EOT
      terraform {
        backend "s3" {
          bucket         = "${aws_s3_bucket.terraform_state.bucket}"
          key            = "environments/dev/terraform.tfstate"
          region         = "${aws_s3_bucket.terraform_state.region}"
          encrypt        = true
          dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
          kms_key_id     = "${aws_kms_key.terraform_state.arn}"
        }
      }
    EOT
    
    validation_commands = [
      "terraform init -migrate-state",
      "terraform plan",
      "terraform state list"
    ]
  }
}

# ============================================
# Cost Information
# ============================================
output "cost_information" {
  description = "Estimated monthly costs for the backend infrastructure"
  value = {
    s3_bucket = {
      storage_cost     = "$0.023 per GB per month (Standard)"
      request_cost     = "$0.0004 per 1,000 PUT requests, $0.00004 per 1,000 GET requests"
      versioning_cost  = "Additional storage for versions"
    }
    
    dynamodb_table = {
      read_cost  = "$0.25 per million read request units"
      write_cost = "$1.25 per million write request units"
      storage_cost = "$0.25 per GB per month"
    }
    
    kms_key = {
      key_cost     = "$1.00 per month per key"
      request_cost = "$0.03 per 10,000 requests"
    }
    
    estimated_monthly_total = "$2-5 for typical usage (state operations)"
    
    cost_optimization_notes = [
      "DynamoDB uses pay-per-request pricing",
      "S3 versioning adds minimal cost for small state files",
      "KMS encryption adds $1/month per key",
      "Cross-region replication doubles S3 storage costs"
    ]
  }
}

# ============================================
# Security Information
# ============================================
output "security_configuration" {
  description = "Security features configured for the backend"
  value = {
    encryption = {
      s3_encryption     = "KMS encryption with customer-managed key"
      dynamodb_encryption = "KMS encryption enabled"
      kms_key_rotation   = "Enabled (annual rotation)"
    }
    
    access_control = {
      s3_public_access  = "Blocked (all public access disabled)"
      iam_policies     = "Least privilege access policies"
      kms_key_policy   = "Service and user-specific permissions"
    }
    
    monitoring = {
      cloudwatch_alarms = "DynamoDB throttling alerts"
      sns_notifications = var.enable_state_notifications ? "Enabled" : "Disabled"
      audit_logging    = "S3 access logs (can be enabled separately)"
    }
    
    backup_and_recovery = {
      s3_versioning       = "Enabled"
      cross_region_backup = var.enable_cross_region_backup ? "Enabled" : "Disabled"
      point_in_time_recovery = "Enabled for DynamoDB"
    }
  }
}

# ============================================
# Troubleshooting Guide
# ============================================
output "troubleshooting_guide" {
  description = "Common issues and solutions for the Terraform backend"
  value = {
    common_issues = {
      "State lock timeout" = "Check DynamoDB table for stuck locks, manually delete if needed"
      "Permission denied" = "Ensure IAM user/role has terraform-backend-access policy attached"
      "Bucket not found" = "Verify bucket name and region in backend configuration"
      "KMS access denied" = "Ensure KMS key policy allows decrypt/encrypt for your IAM principal"
    }
    
    useful_commands = {
      "Check locks"      = "aws dynamodb scan --table-name ${aws_dynamodb_table.terraform_locks.name}"
      "Force unlock"     = "terraform force-unlock <LOCK_ID>"
      "List state files" = "aws s3 ls s3://${aws_s3_bucket.terraform_state.bucket}/ --recursive"
      "Download state"   = "aws s3 cp s3://${aws_s3_bucket.terraform_state.bucket}/path/to/terraform.tfstate ."
    }
    
    emergency_procedures = {
      "State corruption" = "Restore from S3 version history or cross-region backup"
      "Lost access"     = "Use root user to update KMS key policy and IAM permissions"
      "Accidental deletion" = "S3 versioning and cross-region backup provide recovery options"
    }
  }
}