# Storage Module - S3, DynamoDB, ElastiCache, Aurora
# Comprehensive data layer for Candlefish.ai operational atelier

terraform {
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
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Random suffix for globally unique resources
resource "random_id" "suffix" {
  byte_length = 4
}

# ============================================
# KMS Key for Encryption
# ============================================
resource "aws_kms_key" "storage" {
  count = var.kms_key_arn == null ? 1 : 0
  
  description             = "KMS key for ${var.project_name} ${var.environment} storage encryption"
  deletion_window_in_days = 7

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-storage-key"
    Environment = var.environment
    Purpose     = "Storage Encryption"
  })
}

resource "aws_kms_alias" "storage" {
  count = var.kms_key_arn == null ? 1 : 0
  
  name          = "alias/${var.project_name}-${var.environment}-storage"
  target_key_id = aws_kms_key.storage[0].key_id
}

locals {
  kms_key_arn = var.kms_key_arn != null ? var.kms_key_arn : aws_kms_key.storage[0].arn
}

# ============================================
# S3 Buckets
# ============================================
resource "aws_s3_bucket" "main" {
  for_each = var.s3_buckets

  bucket = "${var.project_name}-${var.environment}-${each.key}-${random_id.suffix.hex}"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-${each.key}"
    Environment = var.environment
    Purpose     = each.value.purpose
  })
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id
  
  versioning_configuration {
    status = each.value.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# S3 Bucket Server-side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = local.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "main" {
  for_each = var.s3_buckets

  bucket = aws_s3_bucket.main[each.key].id

  block_public_acls       = each.value.public_access_block
  block_public_policy     = each.value.public_access_block
  ignore_public_acls      = each.value.public_access_block
  restrict_public_buckets = each.value.public_access_block
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  for_each = { for k, v in var.s3_buckets : k => v if v.lifecycle_rules_enabled }

  bucket = aws_s3_bucket.main[each.key].id
  depends_on = [aws_s3_bucket_versioning.main]

  rule {
    id     = "lifecycle_rule"
    status = "Enabled"

    # Current version transitions
    dynamic "transition" {
      for_each = each.value.lifecycle_rules != null ? [
        {
          days          = each.value.lifecycle_rules.transition_to_ia_days
          storage_class = "STANDARD_IA"
        },
        {
          days          = each.value.lifecycle_rules.transition_to_glacier_days
          storage_class = "GLACIER"
        },
        {
          days          = each.value.lifecycle_rules.transition_to_deep_archive_days
          storage_class = "DEEP_ARCHIVE"
        }
      ] : []
      
      content {
        days          = transition.value.days
        storage_class = transition.value.storage_class
      }
    }

    # Current version expiration
    dynamic "expiration" {
      for_each = each.value.lifecycle_rules != null && each.value.lifecycle_rules.expiration_days > 0 ? [1] : []
      
      content {
        days = each.value.lifecycle_rules.expiration_days
      }
    }

    # Non-current version expiration
    dynamic "noncurrent_version_expiration" {
      for_each = each.value.lifecycle_rules != null ? [1] : []
      
      content {
        noncurrent_days = each.value.lifecycle_rules.noncurrent_version_expiration_days
      }
    }

    # Incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = each.value.lifecycle_rules != null ? each.value.lifecycle_rules.incomplete_multipart_upload_days : 1
    }
  }
}

# S3 Bucket CORS Configuration
resource "aws_s3_bucket_cors_configuration" "main" {
  for_each = { for k, v in var.s3_buckets : k => v if v.cors_enabled }

  bucket = aws_s3_bucket.main[each.key].id

  dynamic "cors_rule" {
    for_each = each.value.cors_rules != null ? each.value.cors_rules : [
      {
        allowed_headers = ["*"]
        allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
        allowed_origins = ["*"]
        expose_headers  = ["ETag"]
        max_age_seconds = 3000
      }
    ]
    
    content {
      allowed_headers = cors_rule.value.allowed_headers
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = cors_rule.value.expose_headers
      max_age_seconds = cors_rule.value.max_age_seconds
    }
  }
}

# S3 Bucket Website Configuration
resource "aws_s3_bucket_website_configuration" "main" {
  for_each = { for k, v in var.s3_buckets : k => v if v.website_hosting }

  bucket = aws_s3_bucket.main[each.key].id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }

  # SPA routing support
  routing_rule {
    condition {
      http_error_code_returned_equals = 404
    }
    redirect {
      replace_key_with = "index.html"
    }
  }
}

# S3 Bucket Notifications
resource "aws_s3_bucket_notification" "main" {
  for_each = { for k, v in var.s3_buckets : k => v if v.notifications != null }

  bucket = aws_s3_bucket.main[each.key].id

  dynamic "lambda_function" {
    for_each = each.value.notifications.lambda_configurations
    
    content {
      lambda_function_arn = lambda_function.value.lambda_function_arn
      events              = lambda_function.value.events
      filter_prefix       = lambda_function.value.filter_prefix
      filter_suffix       = lambda_function.value.filter_suffix
    }
  }

  dynamic "queue" {
    for_each = each.value.notifications.sqs_configurations
    
    content {
      queue_arn     = queue.value.queue_arn
      events        = queue.value.events
      filter_prefix = queue.value.filter_prefix
      filter_suffix = queue.value.filter_suffix
    }
  }
}

# Cross-region replication configuration
resource "aws_s3_bucket_replication_configuration" "main" {
  for_each = var.enable_cross_region_replication ? { for k, v in var.s3_buckets : k => v if v.purpose == "Application Data" || v.purpose == "Database Backups" } : {}

  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.main[each.key].id

  rule {
    id     = "replicate-to-${var.backup_region}"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica[each.key].arn
      storage_class = "STANDARD_IA"
      
      encryption_configuration {
        replica_kms_key_id = local.kms_key_arn
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.main]
}

# Replica buckets for cross-region replication
resource "aws_s3_bucket" "replica" {
  for_each = var.enable_cross_region_replication ? { for k, v in var.s3_buckets : k => v if v.purpose == "Application Data" || v.purpose == "Database Backups" } : {}

  provider = aws.backup_region
  bucket   = "${var.project_name}-${var.environment}-${each.key}-replica-${random_id.suffix.hex}"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-${each.key}-replica"
    Environment = var.environment
    Purpose     = "Cross-Region Replica"
  })
}

# IAM role for S3 replication
resource "aws_iam_role" "replication" {
  count = var.enable_cross_region_replication ? 1 : 0
  name  = "${var.project_name}-${var.environment}-s3-replication"

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

resource "aws_iam_role_policy" "replication" {
  count = var.enable_cross_region_replication ? 1 : 0
  name  = "${var.project_name}-${var.environment}-s3-replication"
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
        Resource = [for k, v in var.s3_buckets : "${aws_s3_bucket.main[k].arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [for k, v in var.s3_buckets : aws_s3_bucket.main[k].arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = [for k, v in aws_s3_bucket.replica : "${v.arn}/*"]
      }
    ]
  })
}

# ============================================
# DynamoDB Tables
# ============================================
resource "aws_dynamodb_table" "main" {
  for_each = var.dynamodb_tables

  name           = "${var.project_name}-${var.environment}-${each.key}"
  billing_mode   = each.value.billing_mode
  hash_key       = each.value.hash_key
  range_key      = each.value.range_key
  read_capacity  = each.value.billing_mode == "PROVISIONED" ? each.value.read_capacity : null
  write_capacity = each.value.billing_mode == "PROVISIONED" ? each.value.write_capacity : null

  dynamic "attribute" {
    for_each = each.value.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  dynamic "global_secondary_index" {
    for_each = each.value.global_secondary_indexes != null ? each.value.global_secondary_indexes : []
    content {
      name            = global_secondary_index.value.name
      hash_key        = global_secondary_index.value.hash_key
      range_key       = global_secondary_index.value.range_key
      projection_type = global_secondary_index.value.projection_type
      non_key_attributes = global_secondary_index.value.non_key_attributes
      read_capacity   = each.value.billing_mode == "PROVISIONED" ? global_secondary_index.value.read_capacity : null
      write_capacity  = each.value.billing_mode == "PROVISIONED" ? global_secondary_index.value.write_capacity : null
    }
  }

  dynamic "local_secondary_index" {
    for_each = each.value.local_secondary_indexes != null ? each.value.local_secondary_indexes : []
    content {
      name            = local_secondary_index.value.name
      range_key       = local_secondary_index.value.range_key
      projection_type = local_secondary_index.value.projection_type
      non_key_attributes = local_secondary_index.value.non_key_attributes
    }
  }

  # TTL configuration
  dynamic "ttl" {
    for_each = each.value.ttl_enabled ? [1] : []
    content {
      attribute_name = each.value.ttl_attribute
      enabled        = each.value.ttl_enabled
    }
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = each.value.point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = each.value.server_side_encryption
    kms_key_arn = each.value.kms_key_arn != null ? each.value.kms_key_arn : local.kms_key_arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-${each.key}"
    Environment = var.environment
    Purpose     = "DynamoDB Table"
  })
}

# DynamoDB Auto Scaling
resource "aws_appautoscaling_target" "dynamodb_read" {
  for_each = { for k, v in var.dynamodb_tables : k => v if v.billing_mode == "PROVISIONED" && v.autoscaling != null }

  max_capacity       = each.value.autoscaling.read_capacity.max_capacity
  min_capacity       = each.value.autoscaling.read_capacity.min_capacity
  resource_id        = "table/${aws_dynamodb_table.main[each.key].name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_read" {
  for_each = { for k, v in var.dynamodb_tables : k => v if v.billing_mode == "PROVISIONED" && v.autoscaling != null }

  name               = "${var.project_name}-${var.environment}-${each.key}-read-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_read[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_read[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_read[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = each.value.autoscaling.read_capacity.target_value
  }
}

resource "aws_appautoscaling_target" "dynamodb_write" {
  for_each = { for k, v in var.dynamodb_tables : k => v if v.billing_mode == "PROVISIONED" && v.autoscaling != null }

  max_capacity       = each.value.autoscaling.write_capacity.max_capacity
  min_capacity       = each.value.autoscaling.write_capacity.min_capacity
  resource_id        = "table/${aws_dynamodb_table.main[each.key].name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_write" {
  for_each = { for k, v in var.dynamodb_tables : k => v if v.billing_mode == "PROVISIONED" && v.autoscaling != null }

  name               = "${var.project_name}-${var.environment}-${each.key}-write-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_write[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_write[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_write[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = each.value.autoscaling.write_capacity.target_value
  }
}

# ============================================
# ElastiCache Redis
# ============================================
resource "aws_elasticache_subnet_group" "main" {
  count = var.elasticache_config.enabled ? 1 : 0
  
  name       = "${var.project_name}-${var.environment}-cache-subnet"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cache-subnet"
    Environment = var.environment
  })
}

resource "aws_elasticache_parameter_group" "main" {
  count = var.elasticache_config.enabled ? 1 : 0
  
  family = var.elasticache_config.parameter_group_family
  name   = "${var.project_name}-${var.environment}-cache-params"

  # Optimized parameters for operational telemetry
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = var.tags
}

resource "aws_security_group" "elasticache" {
  count = var.elasticache_config.enabled ? 1 : 0
  
  name_prefix = "${var.project_name}-${var.environment}-cache"
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis port"
    from_port   = var.elasticache_config.port
    to_port     = var.elasticache_config.port
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"] # Adjust to your VPC CIDR
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cache-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "main" {
  count = var.elasticache_config.enabled ? 1 : 0
  
  replication_group_id         = "${var.project_name}-${var.environment}-redis"
  description                  = "Redis cluster for ${var.project_name} ${var.environment}"
  
  port                        = var.elasticache_config.port
  parameter_group_name        = aws_elasticache_parameter_group.main[0].name
  node_type                   = var.elasticache_config.node_type
  num_cache_clusters          = var.elasticache_config.num_cache_nodes
  
  engine_version              = var.elasticache_config.engine_version
  subnet_group_name           = aws_elasticache_subnet_group.main[0].name
  security_group_ids          = concat([aws_security_group.elasticache[0].id], var.elasticache_config.security_group_ids != null ? var.elasticache_config.security_group_ids : [])
  
  # Backup configuration
  snapshot_retention_limit    = var.elasticache_config.backup_retention_period
  snapshot_window            = var.elasticache_config.backup_window
  maintenance_window         = var.elasticache_config.maintenance_window
  
  # High availability
  automatic_failover_enabled  = var.elasticache_config.automatic_failover_enabled
  multi_az_enabled           = var.elasticache_config.multi_az_enabled
  
  # Encryption
  at_rest_encryption_enabled  = var.elasticache_config.at_rest_encryption_enabled
  transit_encryption_enabled  = var.elasticache_config.transit_encryption_enabled
  auth_token                 = var.elasticache_config.auth_token
  
  # Maintenance
  auto_minor_version_upgrade  = var.elasticache_config.auto_minor_version_upgrade
  
  # Notifications
  notification_topic_arn      = var.elasticache_config.notification_topic_arn

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-redis"
    Environment = var.environment
    Purpose     = "Redis Cache"
  })
}

# ============================================
# RDS Aurora Serverless
# ============================================
resource "aws_db_subnet_group" "aurora" {
  count = var.aurora_config.enabled ? 1 : 0
  
  name       = "${var.project_name}-${var.environment}-aurora-subnet"
  subnet_ids = length(var.database_subnet_ids) > 0 ? var.database_subnet_ids : var.private_subnet_ids

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-aurora-subnet"
    Environment = var.environment
  })
}

resource "aws_security_group" "aurora" {
  count = var.aurora_config.enabled ? 1 : 0
  
  name_prefix = "${var.project_name}-${var.environment}-aurora"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL port"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"] # Adjust to your VPC CIDR
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-aurora-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Generate random password for Aurora
resource "random_password" "aurora_password" {
  count = var.aurora_config.enabled ? 1 : 0
  
  length  = 32
  special = true
}

# Store Aurora password in Secrets Manager
resource "aws_secretsmanager_secret" "aurora_password" {
  count = var.aurora_config.enabled ? 1 : 0
  
  name                    = "${var.project_name}-${var.environment}-aurora-password"
  description             = "Aurora database password for ${var.project_name} ${var.environment}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-aurora-password"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "aurora_password" {
  count = var.aurora_config.enabled ? 1 : 0
  
  secret_id     = aws_secretsmanager_secret.aurora_password[0].id
  secret_string = jsonencode({
    username = var.aurora_config.master_username
    password = random_password.aurora_password[0].result
    host     = aws_rds_cluster.aurora[0].endpoint
    port     = 5432
    database = var.aurora_config.database_name
  })
}

# Aurora Cluster Parameter Group
resource "aws_rds_cluster_parameter_group" "aurora" {
  count = var.aurora_config.enabled ? 1 : 0
  
  family      = var.aurora_config.db_cluster_parameter_group_family
  name        = "${var.project_name}-${var.environment}-aurora-cluster"
  description = "Aurora cluster parameter group for ${var.project_name} ${var.environment}"

  # Optimized parameters for operational workloads
  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log slow queries > 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = var.tags
}

# Aurora Serverless v2 Cluster
resource "aws_rds_cluster" "aurora" {
  count = var.aurora_config.enabled ? 1 : 0
  
  cluster_identifier        = "${var.project_name}-${var.environment}-aurora"
  engine                   = var.aurora_config.engine
  engine_version           = var.aurora_config.engine_version
  database_name            = var.aurora_config.database_name
  master_username          = var.aurora_config.master_username
  master_password          = random_password.aurora_password[0].result
  
  # Serverless v2 scaling
  serverlessv2_scaling_configuration {
    max_capacity = var.aurora_config.serverlessv2_scaling_configuration.max_capacity
    min_capacity = var.aurora_config.serverlessv2_scaling_configuration.min_capacity
  }
  
  # Backup configuration
  backup_retention_period = var.aurora_config.backup_retention_period
  preferred_backup_window = var.aurora_config.backup_window
  preferred_maintenance_window = var.aurora_config.maintenance_window
  
  # Network configuration
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora[0].name
  db_subnet_group_name           = aws_db_subnet_group.aurora[0].name
  vpc_security_group_ids         = concat([aws_security_group.aurora[0].id], var.aurora_config.vpc_security_group_ids != null ? var.aurora_config.vpc_security_group_ids : [])
  
  # Security
  storage_encrypted               = var.aurora_config.storage_encrypted
  kms_key_id                     = var.aurora_config.kms_key_id != null ? var.aurora_config.kms_key_id : local.kms_key_arn
  iam_database_authentication_enabled = var.aurora_config.iam_database_authentication_enabled
  
  # Monitoring
  enabled_cloudwatch_logs_exports = var.aurora_config.enabled_cloudwatch_logs_exports
  
  # Deletion protection
  deletion_protection       = var.aurora_config.deletion_protection
  skip_final_snapshot      = var.aurora_config.skip_final_snapshot
  final_snapshot_identifier = var.aurora_config.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Global cluster
  global_cluster_identifier = var.aurora_config.global_cluster_identifier

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-aurora"
    Environment = var.environment
    Purpose     = "Aurora PostgreSQL Cluster"
  })

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
      master_password
    ]
  }
}

# Aurora Cluster Instances
resource "aws_rds_cluster_instance" "aurora" {
  count = var.aurora_config.enabled ? 1 : 0
  
  cluster_identifier   = aws_rds_cluster.aurora[0].id
  instance_class       = "db.serverless"
  engine              = aws_rds_cluster.aurora[0].engine
  engine_version      = aws_rds_cluster.aurora[0].engine_version
  
  performance_insights_enabled          = var.aurora_config.performance_insights_enabled
  performance_insights_retention_period = var.aurora_config.performance_insights_retention_period
  monitoring_interval                   = var.aurora_config.monitoring_interval
  monitoring_role_arn                   = var.aurora_config.monitoring_role_arn
  
  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-aurora-instance"
    Environment = var.environment
  })
}

# ============================================
# AWS Provider for Backup Region
# ============================================
provider "aws" {
  alias  = "backup_region"
  region = var.backup_region
}