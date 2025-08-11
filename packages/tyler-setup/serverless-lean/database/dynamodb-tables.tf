# DynamoDB Tables Configuration for Tyler Setup GraphQL Backend
# Optimized for GraphQL access patterns, real-time subscriptions, and high concurrency

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables for table naming and configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "candlefish-employee-setup-lean"
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for production tables"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Point-in-time recovery retention period"
  type        = number
  default     = 35
}

# Local values for consistent naming
locals {
  table_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Environment   = var.environment
    Project      = var.project_name
    ManagedBy    = "terraform"
    Purpose      = "tyler-setup-graphql-backend"
  }
}

# Entity Table - Main data store using single-table design
resource "aws_dynamodb_table" "entity_table" {
  name           = "${local.table_prefix}-entities"
  billing_mode   = "PAY_PER_REQUEST"  # Auto-scaling for unpredictable workloads
  hash_key       = "PK"
  range_key      = "SK"

  deletion_protection_enabled = var.enable_deletion_protection

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  attribute {
    name = "GSI3PK"
    type = "S"
  }

  attribute {
    name = "GSI3SK"
    type = "S"
  }

  attribute {
    name = "GSI4PK"
    type = "S"
  }

  attribute {
    name = "GSI4SK"
    type = "S"
  }

  # GSI1: Entity Listing and Sorting
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # GSI2: Entity Search and Filtering
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  # GSI3: Relationship Queries
  global_secondary_index {
    name            = "GSI3"
    hash_key        = "GSI3PK"
    range_key       = "GSI3SK"
    projection_type = "ALL"
  }

  # GSI4: Time-based Queries
  global_secondary_index {
    name            = "GSI4"
    hash_key        = "GSI4PK"
    range_key       = "GSI4SK"
    projection_type = "INCLUDE"
    non_key_attributes = ["entityType", "id", "timestamp", "data"]
  }

  # LSI1: Entity Versions (for audit trails)
  local_secondary_index {
    name            = "LSI1-Versions"
    range_key       = "version"
    projection_type = "ALL"
  }

  # Enable streams for real-time subscriptions
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_id  = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    TableType = "primary-entities"
    Purpose   = "main-data-store"
  })
}

# Event Store Table - For real-time subscriptions and event sourcing
resource "aws_dynamodb_table" "event_store" {
  name         = "${local.table_prefix}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  deletion_protection_enabled = var.enable_deletion_protection

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "entityId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  # GSI1: Query events by entity
  global_secondary_index {
    name            = "GSI1-ByEntity"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # LSI1: Query events by timestamp
  local_secondary_index {
    name            = "LSI1-ByTimestamp"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Enable streams for real-time event processing
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    TableType = "event-store"
    Purpose   = "real-time-subscriptions"
  })
}

# Cache Table - For query results and session caching
resource "aws_dynamodb_table" "cache_table" {
  name         = "${local.table_prefix}-cache"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  deletion_protection_enabled = var.enable_deletion_protection

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "cacheType"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }

  # GSI1: Query by cache type
  global_secondary_index {
    name            = "GSI1-ByCacheType"
    hash_key        = "cacheType"
    range_key       = "createdAt"
    projection_type = "KEYS_ONLY"
  }

  # TTL for automatic cache expiration
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    TableType = "cache"
    Purpose   = "query-session-caching"
  })
}

# Connection State Table - For WebSocket connection management
resource "aws_dynamodb_table" "connection_state" {
  name         = "${local.table_prefix}-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  deletion_protection_enabled = var.enable_deletion_protection

  attribute {
    name = "connectionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "connectedAt"
    type = "N"
  }

  # GSI1: Query connections by user
  global_secondary_index {
    name            = "GSI1-ByUser"
    hash_key        = "userId"
    range_key       = "connectedAt"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup of stale connections
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    TableType = "connection-state"
    Purpose   = "websocket-management"
  })
}

# Rate Limiting Table - For API throttling and abuse prevention
resource "aws_dynamodb_table" "rate_limits" {
  name         = "${local.table_prefix}-rate-limits"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "identifier"
  range_key    = "window"

  deletion_protection_enabled = var.enable_deletion_protection

  attribute {
    name = "identifier"
    type = "S"
  }

  attribute {
    name = "window"
    type = "S"
  }

  # TTL for automatic cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    TableType = "rate-limits"
    Purpose   = "api-throttling"
  })
}

# KMS Key for DynamoDB encryption
resource "aws_kms_key" "dynamodb_key" {
  description             = "KMS key for DynamoDB table encryption"
  deletion_window_in_days = 7

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
        Sid    = "Allow DynamoDB Service"
        Effect = "Allow"
        Principal = {
          Service = "dynamodb.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Purpose = "dynamodb-encryption"
  })
}

resource "aws_kms_alias" "dynamodb_key_alias" {
  name          = "alias/${local.table_prefix}-dynamodb"
  target_key_id = aws_kms_key.dynamodb_key.key_id
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# CloudWatch Log Groups for DynamoDB operations
resource "aws_cloudwatch_log_group" "dynamodb_operations" {
  name              = "/aws/dynamodb/${local.table_prefix}"
  retention_in_days = 30

  tags = merge(local.common_tags, {
    Purpose = "dynamodb-logging"
  })
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "entity_table_throttles" {
  alarm_name          = "${local.table_prefix}-entity-table-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors throttling on the entity table"

  dimensions = {
    TableName = aws_dynamodb_table.entity_table.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "entity_table_errors" {
  alarm_name          = "${local.table_prefix}-entity-table-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ConsumedReadCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "This metric monitors high read capacity usage"

  dimensions = {
    TableName = aws_dynamodb_table.entity_table.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "${local.table_prefix}-alerts"

  tags = merge(local.common_tags, {
    Purpose = "monitoring-alerts"
  })
}

# Outputs for use in other configurations
output "entity_table_name" {
  description = "Name of the main entity table"
  value       = aws_dynamodb_table.entity_table.name
}

output "entity_table_arn" {
  description = "ARN of the main entity table"
  value       = aws_dynamodb_table.entity_table.arn
}

output "entity_table_stream_arn" {
  description = "Stream ARN of the main entity table"
  value       = aws_dynamodb_table.entity_table.stream_arn
}

output "event_store_table_name" {
  description = "Name of the event store table"
  value       = aws_dynamodb_table.event_store.name
}

output "event_store_stream_arn" {
  description = "Stream ARN of the event store table"
  value       = aws_dynamodb_table.event_store.stream_arn
}

output "cache_table_name" {
  description = "Name of the cache table"
  value       = aws_dynamodb_table.cache_table.name
}

output "connection_state_table_name" {
  description = "Name of the connection state table"
  value       = aws_dynamodb_table.connection_state.name
}

output "rate_limits_table_name" {
  description = "Name of the rate limits table"
  value       = aws_dynamodb_table.rate_limits.name
}

output "kms_key_id" {
  description = "KMS key ID for DynamoDB encryption"
  value       = aws_kms_key.dynamodb_key.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN for DynamoDB encryption"
  value       = aws_kms_key.dynamodb_key.arn
}
