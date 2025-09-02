# S3 Buckets Configuration

# S3 Bucket for Application Assets
resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets-${random_id.suffix.hex}"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-assets"
    }
  )
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://*.${var.domain_name}"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# S3 Bucket for Backups
resource "aws_s3_bucket" "backups" {
  bucket = "${local.name_prefix}-backups-${random_id.suffix.hex}"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backups"
    }
  )
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backup.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "transition-old-backups"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555  # 7 years
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "backups" {
  count = var.enable_cross_region_backup ? 1 : 0

  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backups_replica[0].arn
      storage_class = "GLACIER"
    }
  }

  depends_on = [aws_s3_bucket_versioning.backups]
}

# S3 Bucket for Cross-Region Backup Replication
resource "aws_s3_bucket" "backups_replica" {
  count    = var.enable_cross_region_backup ? 1 : 0
  provider = aws.replica

  bucket = "${local.name_prefix}-backups-replica-${random_id.suffix.hex}"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backups-replica"
    }
  )
}

# KMS Key for Backup Encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = var.kms_deletion_window
  enable_key_rotation     = true

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-backup-kms"
    }
  )
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${local.name_prefix}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# IAM Role for S3 Replication
resource "aws_iam_role" "replication" {
  count = var.enable_cross_region_backup ? 1 : 0

  name = "${local.name_prefix}-s3-replication-role"

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

  name = "${local.name_prefix}-s3-replication-policy"
  role = aws_iam_role.replication[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.backups.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.backups_replica[0].arn}/*"
      }
    ]
  })
}

# AWS Backup Configuration
resource "aws_backup_vault" "main" {
  count = var.enable_aws_backup ? 1 : 0

  name        = var.backup_vault_name
  kms_key_arn = aws_kms_key.backup.arn

  tags = merge(
    local.common_tags,
    {
      Name = var.backup_vault_name
    }
  )
}

resource "aws_backup_plan" "main" {
  count = var.enable_aws_backup ? 1 : 0

  name = "${local.name_prefix}-backup-plan"

  rule {
    rule_name         = "daily-backups"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 5 ? * * *)"  # Daily at 5 AM UTC
    start_window      = 60
    completion_window = 120

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }

    recovery_point_tags = local.common_tags
  }

  rule {
    rule_name         = "weekly-backups"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 5 ? * 1 *)"  # Weekly on Monday at 5 AM UTC
    start_window      = 60
    completion_window = 180

    lifecycle {
      cold_storage_after = 90
      delete_after       = 2555  # 7 years
    }

    recovery_point_tags = local.common_tags
  }

  advanced_backup_setting {
    backup_options = {
      WindowsVSS = "enabled"
    }
    resource_type = "EC2"
  }

  tags = local.common_tags
}

resource "aws_backup_selection" "main" {
  count = var.enable_aws_backup ? 1 : 0

  iam_role_arn = aws_iam_role.backup[0].arn
  name         = "${local.name_prefix}-backup-selection"
  plan_id      = aws_backup_plan.main[0].id

  resources = [
    aws_db_instance.postgres.arn,
    aws_elasticache_replication_group.main.arn,
    aws_s3_bucket.assets.arn,
    aws_s3_bucket.backups.arn
  ]

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Environment"
    value = var.environment
  }
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup" {
  count = var.enable_aws_backup ? 1 : 0

  name = "${local.name_prefix}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  count = var.enable_aws_backup ? 1 : 0

  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  count = var.enable_aws_backup ? 1 : 0

  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}