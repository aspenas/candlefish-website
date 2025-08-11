# Optimized DynamoDB Schema for GraphQL Performance
# Designed for 1000+ concurrent users with efficient indexing

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (prod, dev, staging)"
  type        = string
  default     = "prod"
}

variable "service_name" {
  description = "Service name for resource naming"
  type        = string
  default     = "tyler-setup"
}

# Locals for consistent naming
locals {
  prefix = "${var.service_name}-${var.environment}"

  common_tags = {
    Environment = var.environment
    Service     = var.service_name
    ManagedBy   = "terraform"
    Purpose     = "graphql-backend"
  }
}

# ===================================
# Main Entity Table (Single-Table Design)
# ===================================

resource "aws_dynamodb_table" "entities" {
  name                        = "${local.prefix}-entities"
  billing_mode               = "ON_DEMAND"
  stream_enabled             = true
  stream_view_type           = "NEW_AND_OLD_IMAGES"
  deletion_protection_enabled = var.environment == "prod" ? true : false

  hash_key  = "PK"    # Partition Key
  range_key = "SK"    # Sort Key

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1: Entity type and timestamp queries
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # GSI2: Search and status filtering
  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  # GSI3: Relationship navigation
  attribute {
    name = "GSI3PK"
    type = "S"
  }

  attribute {
    name = "GSI3SK"
    type = "S"
  }

  # GSI4: Time-series and analytics
  attribute {
    name = "GSI4PK"
    type = "S"
  }

  attribute {
    name = "GSI4SK"
    type = "N"
  }

  # Global Secondary Index 1: Entity Listing
  global_secondary_index {
    name     = "GSI1"
    hash_key = "GSI1PK"
    range_key = "GSI1SK"
    projection_type = "ALL"
  }

  # Global Secondary Index 2: Search and Filtering
  global_secondary_index {
    name     = "GSI2"
    hash_key = "GSI2PK"
    range_key = "GSI2SK"
    projection_type = "ALL"
  }

  # Global Secondary Index 3: Relationships
  global_secondary_index {
    name     = "GSI3"
    hash_key = "GSI3PK"
    range_key = "GSI3SK"
    projection_type = "KEYS_ONLY"
  }

  # Global Secondary Index 4: Time-series
  global_secondary_index {
    name     = "GSI4"
    hash_key = "GSI4PK"
    range_key = "GSI4SK"
    projection_type = "INCLUDE"
    non_key_attributes = ["entityType", "id", "status", "updatedAt"]
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_id  = aws_kms_key.dynamodb_key.arn
  }

  # TTL for automatic cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-entities"
    Type = "primary-table"
  })
}

# ===================================
# Events Table (Event Sourcing)
# ===================================

resource "aws_dynamodb_table" "events" {
  name             = "${local.prefix}-events"
  billing_mode     = "ON_DEMAND"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  hash_key  = "PK"    # Entity ID
  range_key = "SK"    # Event sequence

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1: Event type queries
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "N"
  }

  # GSI2: User activity queries
  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "N"
  }

  global_secondary_index {
    name            = "EventTypeIndex"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "UserActivityIndex"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "INCLUDE"
    non_key_attributes = ["eventType", "entityType", "timestamp", "userId"]
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-events"
    Type = "event-sourcing"
  })
}

# ===================================
# Cache Table (Query Result Caching)
# ===================================

resource "aws_dynamodb_table" "cache" {
  name         = "${local.prefix}-cache"
  billing_mode = "ON_DEMAND"

  hash_key  = "PK"    # Cache key
  range_key = "SK"    # Cache type

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # TTL for automatic cache expiration
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-cache"
    Type = "cache-layer"
  })
}

# ===================================
# Connections Table (WebSocket/Subscriptions)
# ===================================

resource "aws_dynamodb_table" "connections" {
  name         = "${local.prefix}-connections"
  billing_mode = "ON_DEMAND"

  hash_key = "PK"    # Connection ID

  attribute {
    name = "PK"
    type = "S"
  }

  # GSI for user connections
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "N"
  }

  global_secondary_index {
    name            = "UserConnectionsIndex"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-connections"
    Type = "websocket-connections"
  })
}

# ===================================
# Rate Limits Table (Rate Limiting)
# ===================================

resource "aws_dynamodb_table" "rate_limits" {
  name         = "${local.prefix}-rate-limits"
  billing_mode = "ON_DEMAND"

  hash_key  = "PK"    # Rate limit key
  range_key = "SK"    # Window timestamp

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "N"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled    = true
    kms_key_id = aws_kms_key.dynamodb_key.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-rate-limits"
    Type = "rate-limiting"
  })
}

# ===================================
# KMS Key for Encryption
# ===================================

resource "aws_kms_key" "dynamodb_key" {
  description             = "KMS key for ${local.prefix} DynamoDB encryption"
  deletion_window_in_days = 7

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-dynamodb-key"
  })
}

resource "aws_kms_alias" "dynamodb_key" {
  name          = "alias/${local.prefix}-dynamodb"
  target_key_id = aws_kms_key.dynamodb_key.key_id
}

# ===================================
# DAX Cluster for Microsecond Caching
# ===================================

resource "aws_dax_subnet_group" "main" {
  name       = "${local.prefix}-dax-subnet-group"
  subnet_ids = data.aws_subnets.private.ids
}

resource "aws_dax_cluster" "main" {
  cluster_name       = "${local.prefix}-dax"
  iam_role_arn      = aws_iam_role.dax_role.arn
  node_type         = "dax.t3.small"
  replication_factor = var.environment == "prod" ? 3 : 1

  subnet_group_name   = aws_dax_subnet_group.main.name
  security_group_ids  = [aws_security_group.dax.id]

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-dax-cluster"
  })
}

# ===================================
# Security Group for DAX
# ===================================

resource "aws_security_group" "dax" {
  name_prefix = "${local.prefix}-dax-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 8111
    to_port     = 8111
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.prefix}-dax-sg"
  })
}

# ===================================
# IAM Role for DAX
# ===================================

resource "aws_iam_role" "dax_role" {
  name = "${local.prefix}-dax-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "dax.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "dax_access" {
  role       = aws_iam_role.dax_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# ===================================
# Data Sources
# ===================================

data "aws_vpc" "main" {
  default = true
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
}

# ===================================
# CloudWatch Alarms for Monitoring
# ===================================

resource "aws_cloudwatch_metric_alarm" "entities_throttles" {
  alarm_name          = "${local.prefix}-entities-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors DynamoDB throttles"

  dimensions = {
    TableName = aws_dynamodb_table.entities.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "entities_latency" {
  alarm_name          = "${local.prefix}-entities-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "SuccessfulRequestLatency"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"  # 100ms
  alarm_description   = "This metric monitors DynamoDB latency"

  dimensions = {
    TableName = aws_dynamodb_table.entities.name
    Operation = "Query"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# ===================================
# SNS Topic for Alerts
# ===================================

resource "aws_sns_topic" "alerts" {
  name = "${local.prefix}-alerts"

  tags = local.common_tags
}

# ===================================
# Outputs
# ===================================

output "table_names" {
  description = "Names of created DynamoDB tables"
  value = {
    entities    = aws_dynamodb_table.entities.name
    events      = aws_dynamodb_table.events.name
    cache       = aws_dynamodb_table.cache.name
    connections = aws_dynamodb_table.connections.name
    rate_limits = aws_dynamodb_table.rate_limits.name
  }
}

output "table_arns" {
  description = "ARNs of created DynamoDB tables"
  value = {
    entities    = aws_dynamodb_table.entities.arn
    events      = aws_dynamodb_table.events.arn
    cache       = aws_dynamodb_table.cache.arn
    connections = aws_dynamodb_table.connections.arn
    rate_limits = aws_dynamodb_table.rate_limits.arn
  }
}

output "dax_cluster_endpoint" {
  description = "DAX cluster endpoint for caching"
  value       = aws_dax_cluster.main.cluster_address
}

output "kms_key_id" {
  description = "KMS key ID for encryption"
  value       = aws_kms_key.dynamodb_key.key_id
}

output "stream_arns" {
  description = "DynamoDB stream ARNs for real-time processing"
  value = {
    entities = aws_dynamodb_table.entities.stream_arn
    events   = aws_dynamodb_table.events.stream_arn
  }
}

# ===================================
# Performance Optimization Notes
# ===================================

# Query Patterns Supported:
# 1. Get User by ID: PK = "USER#<id>", SK = "METADATA"
# 2. List Users: GSI1PK = "USER", GSI1SK begins_with "2024-"
# 3. Search Users by Email: GSI2PK = "<email>", GSI2SK = "ACTIVE"
# 4. User's Audit Logs: GSI3PK = "USER_AUDIT_RELATION", GSI3SK begins_with "<userId>#"
# 5. Time-based Queries: GSI4PK = "AUDIT", GSI4SK between timestamps
#
# Index Usage Guidelines:
# - GSI1: Entity type listings and time-based sorting
# - GSI2: Search and status filtering
# - GSI3: Relationship navigation (N:M patterns)
# - GSI4: Time-series analytics and reporting
#
# Performance Optimizations:
# - ON_DEMAND billing prevents over/under provisioning
# - DAX provides microsecond read latency
# - Point-in-time recovery for data protection
# - KMS encryption for security compliance
# - TTL for automatic data lifecycle management
# - CloudWatch alarms for proactive monitoring
