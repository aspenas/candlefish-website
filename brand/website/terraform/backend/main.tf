# Terraform Backend Infrastructure
# Creates S3 bucket and DynamoDB table for remote state management

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  # Bootstrap - this configuration doesn't use remote state initially
  # After creation, you can migrate to use the created backend
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Candlefish"
      Purpose     = "Terraform Backend"
      ManagedBy   = "Terraform"
      CostCenter  = "Infrastructure"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  bucket_name = var.s3_bucket_name != "" ? var.s3_bucket_name : "candlefish-terraform-state-${random_id.bucket_suffix.hex}"
  
  common_tags = {
    Project     = "Candlefish"
    Purpose     = "Terraform Backend"
    ManagedBy   = "Terraform"
    Environment = "backend"
  }
}

# Random suffix for S3 bucket (globally unique)
resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# ============================================
# S3 Bucket for Terraform State
# ============================================
resource "aws_s3_bucket" "terraform_state" {
  bucket = local.bucket_name

  tags = merge(local.common_tags, {
    Name = local.bucket_name
  })

  lifecycle {
    prevent_destroy = true
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_state.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  depends_on = [aws_s3_bucket_versioning.terraform_state]
  bucket     = aws_s3_bucket.terraform_state.id

  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"

    # Keep current versions
    expiration {
      days = 0  # Never expire current versions
    }

    # Clean up old versions
    noncurrent_version_expiration {
      noncurrent_days = var.state_version_retention_days
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# S3 Bucket Notification for state changes (optional)
resource "aws_s3_bucket_notification" "terraform_state" {
  count  = var.enable_state_notifications ? 1 : 0
  bucket = aws_s3_bucket.terraform_state.id

  topic {
    topic_arn = aws_sns_topic.state_notifications[0].arn
    events    = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    filter_prefix = "environments/"
  }

  depends_on = [aws_sns_topic_policy.state_notifications]
}

# ============================================
# DynamoDB Table for State Locking
# ============================================
resource "aws_dynamodb_table" "terraform_locks" {
  name           = var.dynamodb_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.terraform_state.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = var.dynamodb_table_name
  })

  lifecycle {
    prevent_destroy = true
  }
}

# ============================================
# KMS Key for Encryption
# ============================================
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = var.kms_deletion_window
  enable_key_rotation     = true

  policy = jsonencode({
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
        Sid    = "Allow Terraform access"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/github-actions-deploy-dev",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/github-actions-deploy-staging",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/github-actions-deploy-production"
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow S3 service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "terraform-state-encryption"
  })
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state-${random_id.bucket_suffix.hex}"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# ============================================
# SNS Topic for State Change Notifications
# ============================================
resource "aws_sns_topic" "state_notifications" {
  count = var.enable_state_notifications ? 1 : 0

  name              = "terraform-state-notifications"
  kms_master_key_id = aws_kms_key.terraform_state.arn

  tags = merge(local.common_tags, {
    Name = "terraform-state-notifications"
  })
}

resource "aws_sns_topic_policy" "state_notifications" {
  count = var.enable_state_notifications ? 1 : 0
  arn   = aws_sns_topic.state_notifications[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sns:Publish"
        Resource = aws_sns_topic.state_notifications[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceArn" = aws_s3_bucket.terraform_state.arn
          }
        }
      }
    ]
  })
}

# Email subscription for notifications
resource "aws_sns_topic_subscription" "email_notifications" {
  count     = var.enable_state_notifications && length(var.notification_email_addresses) > 0 ? length(var.notification_email_addresses) : 0
  
  topic_arn = aws_sns_topic.state_notifications[0].arn
  protocol  = "email"
  endpoint  = var.notification_email_addresses[count.index]
}

# ============================================
# IAM Policies for Terraform Backend Access
# ============================================
# Policy for accessing the Terraform backend
resource "aws_iam_policy" "terraform_backend_access" {
  name        = "TerraformBackendAccess"
  description = "Policy for accessing Terraform backend resources"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketVersioning",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:ListBucketVersions"
        ]
        Resource = aws_s3_bucket.terraform_state.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.terraform_state.arn
      }
    ]
  })

  tags = local.common_tags
}

# ============================================
# CloudWatch Alarms for Monitoring
# ============================================
# Alarm for excessive DynamoDB read capacity
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttles" {
  alarm_name          = "terraform-locks-read-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadThrottledEvents"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors DynamoDB read throttles for Terraform locks"
  alarm_actions       = var.enable_state_notifications ? [aws_sns_topic.state_notifications[0].arn] : []

  dimensions = {
    TableName = aws_dynamodb_table.terraform_locks.name
  }

  tags = local.common_tags
}

# Alarm for excessive DynamoDB write capacity
resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttles" {
  alarm_name          = "terraform-locks-write-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WriteThrottledEvents"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors DynamoDB write throttles for Terraform locks"
  alarm_actions       = var.enable_state_notifications ? [aws_sns_topic.state_notifications[0].arn] : []

  dimensions = {
    TableName = aws_dynamodb_table.terraform_locks.name
  }

  tags = local.common_tags
}

# ============================================
# Backup Configuration
# ============================================
# Cross-region backup bucket (optional)
resource "aws_s3_bucket" "terraform_state_backup" {
  count    = var.enable_cross_region_backup ? 1 : 0
  provider = aws.backup_region
  
  bucket = "${local.bucket_name}-backup"

  tags = merge(local.common_tags, {
    Name    = "${local.bucket_name}-backup"
    Purpose = "Cross-region backup"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# Cross-region replication configuration
resource "aws_s3_bucket_replication_configuration" "terraform_state_backup" {
  count      = var.enable_cross_region_backup ? 1 : 0
  depends_on = [aws_s3_bucket_versioning.terraform_state]

  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "backup-replication"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.terraform_state_backup[0].arn
      storage_class = "STANDARD_IA"
      
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.terraform_state.arn
      }
    }
  }
}

# IAM role for cross-region replication
resource "aws_iam_role" "replication" {
  count = var.enable_cross_region_backup ? 1 : 0
  name  = "terraform-state-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "replication" {
  count = var.enable_cross_region_backup ? 1 : 0
  name  = "terraform-state-replication-policy"
  role  = aws_iam_role.replication[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.terraform_state.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.terraform_state_backup[0].arn}/*"
      }
    ]
  })
}

# AWS provider for backup region
provider "aws" {
  alias  = "backup_region"
  region = var.backup_region
}