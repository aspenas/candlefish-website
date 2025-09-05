# Enhanced S3 Module with Intelligent Tiering and Cross-Region Replication
# Optimized for Candlefish Operational Design Atelier

locals {
  bucket_prefix = "${var.environment}-candlefish"
}

# Primary Static Assets Bucket
resource "aws_s3_bucket" "static_assets" {
  bucket = "${local.bucket_prefix}-static-assets"
  
  tags = merge(
    var.tags,
    {
      Name = "${local.bucket_prefix}-static-assets"
      Type = "Static-Content"
    }
  )
}

# Versioning for Static Assets
resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Intelligent Tiering Configuration
resource "aws_s3_bucket_intelligent_tiering_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  name   = "entire-bucket"
  
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
  
  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}

# Lifecycle Configuration for Static Assets
resource "aws_s3_bucket_lifecycle_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  rule {
    id     = "intelligent-tiering"
    status = "Enabled"
    
    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }
    
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
    
    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER_IR"
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 365
    }
    
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
  
  rule {
    id     = "delete-old-logs"
    status = "Enabled"
    
    filter {
      prefix = "logs/"
    }
    
    expiration {
      days = 90
    }
  }
}

# Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# Public Access Block
resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS Configuration for Static Assets
resource "aws_s3_bucket_cors_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://www.${var.domain_name}"
    ]
    expose_headers  = ["ETag", "Content-Length"]
    max_age_seconds = 86400
  }
}

# Optimized Images Bucket
resource "aws_s3_bucket" "optimized_images" {
  bucket = "${local.bucket_prefix}-optimized-images"
  
  tags = merge(
    var.tags,
    {
      Name = "${local.bucket_prefix}-optimized-images"
      Type = "Optimized-Images"
    }
  )
}

# Versioning for Optimized Images
resource "aws_s3_bucket_versioning" "optimized_images" {
  bucket = aws_s3_bucket.optimized_images.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle for Optimized Images
resource "aws_s3_bucket_lifecycle_configuration" "optimized_images" {
  bucket = aws_s3_bucket.optimized_images.id
  
  rule {
    id     = "cleanup-old-optimized"
    status = "Enabled"
    
    expiration {
      days = 30
    }
    
    filter {
      prefix = "cache/"
    }
  }
}

# WebGL/3D Assets Bucket
resource "aws_s3_bucket" "webgl_assets" {
  bucket = "${local.bucket_prefix}-webgl-assets"
  
  tags = merge(
    var.tags,
    {
      Name = "${local.bucket_prefix}-webgl-assets"
      Type = "WebGL-3D-Assets"
    }
  )
}

# Transfer Acceleration for WebGL Assets
resource "aws_s3_bucket_accelerate_configuration" "webgl_assets" {
  bucket = aws_s3_bucket.webgl_assets.id
  status = "Enabled"
}

# Request Payment Configuration (for large assets)
resource "aws_s3_bucket_request_payment_configuration" "webgl_assets" {
  bucket = aws_s3_bucket.webgl_assets.id
  payer  = "BucketOwner"
}

# User-Generated Content Bucket
resource "aws_s3_bucket" "user_content" {
  bucket = "${local.bucket_prefix}-user-content"
  
  tags = merge(
    var.tags,
    {
      Name = "${local.bucket_prefix}-user-content"
      Type = "User-Generated"
    }
  )
}

# Object Lock for Compliance
resource "aws_s3_bucket_object_lock_configuration" "user_content" {
  bucket = aws_s3_bucket.user_content.id
  
  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = 30
    }
  }
}

# Analytics Configuration
resource "aws_s3_bucket_analytics_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  name   = "entire-bucket-analytics"
  
  storage_class_analysis {
    data_export {
      destination {
        s3_bucket_destination {
          bucket_arn = aws_s3_bucket.analytics.arn
          prefix     = "analytics/static-assets/"
        }
      }
      output_schema_version = "V_1"
    }
  }
}

# Analytics Bucket
resource "aws_s3_bucket" "analytics" {
  bucket = "${local.bucket_prefix}-analytics"
  
  tags = merge(
    var.tags,
    {
      Name = "${local.bucket_prefix}-analytics"
      Type = "Analytics"
    }
  )
}

# Inventory Configuration
resource "aws_s3_bucket_inventory" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  name   = "entire-bucket-inventory"
  
  included_object_versions = "All"
  
  schedule {
    frequency = "Weekly"
  }
  
  destination {
    bucket {
      format     = "Parquet"
      bucket_arn = aws_s3_bucket.analytics.arn
      prefix     = "inventory/static-assets/"
      
      encryption {
        sse_kms {
          key_id = aws_kms_key.s3.arn
        }
      }
    }
  }
  
  optional_fields = [
    "Size",
    "LastModifiedDate",
    "StorageClass",
    "ETag",
    "IsMultipartUploaded",
    "ReplicationStatus",
    "EncryptionStatus",
    "IntelligentTieringAccessTier",
    "BucketKeyStatus"
  ]
}

# Metrics Configuration
resource "aws_s3_bucket_metric" "static_assets_requests" {
  bucket = aws_s3_bucket.static_assets.id
  name   = "entire-bucket-requests"
}

# Backup Bucket
resource "aws_s3_bucket" "backups" {
  bucket = "${local.bucket_prefix}-backups"
  
  tags = merge(
    var.tags,
    {
      Name = "${local.bucket_prefix}-backups"
      Type = "Backups"
    }
  )
}

# Cross-Region Replication Role
resource "aws_iam_role" "replication" {
  name = "${var.environment}-s3-replication-role"
  
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
  
  tags = var.tags
}

# Replication Policy
resource "aws_iam_role_policy" "replication" {
  name = "${var.environment}-s3-replication-policy"
  role = aws_iam_role.replication.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.static_assets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.static_assets_replica.arn}/*"
      }
    ]
  })
}

# Replica Bucket (in different region)
resource "aws_s3_bucket" "static_assets_replica" {
  provider = aws.replica
  bucket   = "${local.bucket_prefix}-static-assets-replica"
  
  tags = merge(
    var.tags,
    {
      Name = "${local.bucket_prefix}-static-assets-replica"
      Type = "Replica"
    }
  )
}

resource "aws_s3_bucket_versioning" "static_assets_replica" {
  provider = aws.replica
  bucket   = aws_s3_bucket.static_assets_replica.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Cross-Region Replication Configuration
resource "aws_s3_bucket_replication_configuration" "static_assets" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.static_assets.id
  
  rule {
    id     = "replicate-all"
    status = "Enabled"
    
    priority = 1
    
    delete_marker_replication {
      status = "Enabled"
    }
    
    filter {}
    
    destination {
      bucket        = aws_s3_bucket.static_assets_replica.arn
      storage_class = "STANDARD_IA"
      
      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }
      
      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }
  }
  
  depends_on = [aws_s3_bucket_versioning.static_assets]
}

# KMS Key for S3 Encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
  
  tags = var.tags
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${var.environment}-s3-encryption"
  target_key_id = aws_kms_key.s3.key_id
}

# S3 Bucket Policies
resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      },
      {
        Sid    = "DenyInsecureConnections"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.static_assets.arn,
          "${aws_s3_bucket.static_assets.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "bucket_size" {
  alarm_name          = "${var.environment}-s3-bucket-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "BucketSizeBytes"
  namespace          = "AWS/S3"
  period             = 86400
  statistic          = "Average"
  threshold          = 107374182400  # 100 GB
  alarm_description  = "This metric monitors S3 bucket size"
  alarm_actions      = [var.sns_topic_arn]
  
  dimensions = {
    BucketName = aws_s3_bucket.static_assets.id
    StorageType = "StandardStorage"
  }
  
  tags = var.tags
}

# S3 Event Notifications
resource "aws_s3_bucket_notification" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  lambda_function {
    lambda_function_arn = var.image_processor_lambda_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "images/"
    filter_suffix       = ".jpg"
  }
  
  lambda_function {
    lambda_function_arn = var.image_processor_lambda_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "images/"
    filter_suffix       = ".png"
  }
  
  topic {
    topic_arn = var.sns_topic_arn
    events    = ["s3:ObjectRemoved:*"]
  }
}

# S3 Access Points
resource "aws_s3_access_point" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  name   = "${var.environment}-static-assets-ap"
  
  vpc_configuration {
    vpc_id = var.vpc_id
  }
  
  public_access_block_configuration {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }
}