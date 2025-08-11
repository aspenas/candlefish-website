# Redis Infrastructure - ElastiCache for Caching and Real-time Updates
# Cost-optimized configuration

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "paintbox" {
  replication_group_id       = "${var.project_name}-redis-${var.environment}"
  replication_group_description = "Redis cache for Paintbox application"

  # Engine Configuration
  engine               = "redis"
  engine_version       = "7.0"
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.paintbox.name

  # Node Configuration - Cost optimized
  node_type            = var.redis_node_type # t3.micro ~$13/month
  number_cache_clusters = var.redis_num_cache_nodes

  # Network Configuration
  subnet_group_name = aws_elasticache_subnet_group.paintbox.name
  security_group_ids = [aws_security_group.redis.id]

  # High Availability - only in production
  automatic_failover_enabled = var.environment == "production" && var.redis_num_cache_nodes > 1
  multi_az_enabled          = var.environment == "production" && var.redis_num_cache_nodes > 1

  # Backup Configuration
  snapshot_retention_limit = var.environment == "production" ? 5 : 1
  snapshot_window         = "03:00-05:00"

  # Maintenance
  maintenance_window = "sun:05:00-sun:07:00"
  notification_topic_arn = var.environment == "production" ? aws_sns_topic.alerts.arn : null

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth_token.result

  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = true

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-redis"
    Type = "Cache"
  })
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "paintbox" {
  name       = "${var.project_name}-cache-subnet-${var.environment}"
  subnet_ids = module.vpc.database_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-cache-subnet-group"
  })
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_service.id]
    description     = "Redis from ECS services"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-redis-sg"
  })
}

# Parameter Group for Redis optimization
resource "aws_elasticache_parameter_group" "paintbox" {
  family = "redis7"
  name   = "${var.project_name}-redis7-${var.environment}"

  # Optimized for caching and real-time updates
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru" # Remove least recently used keys when memory limit is reached
  }

  parameter {
    name  = "timeout"
    value = "300" # Connection timeout in seconds
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex" # Enable keyspace notifications for expired keys
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-redis-params"
  })
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}/redis/slow-log"
  retention_in_days = var.environment == "production" ? 30 : 7
  kms_key_id       = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${var.project_name}/redis/engine-log"
  retention_in_days = var.environment == "production" ? 30 : 7
  kms_key_id       = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

# Random Auth Token for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false # Redis auth tokens don't support special characters
  upper   = true
  lower   = true
  numeric = true
}

# Secrets Manager for Redis Credentials
resource "aws_secretsmanager_secret" "redis_credentials" {
  name = "${var.project_name}/redis/credentials/${var.environment}"
  description = "Redis credentials for Paintbox"
  kms_key_id = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    primary_endpoint = aws_elasticache_replication_group.paintbox.primary_endpoint_address
    reader_endpoint = aws_elasticache_replication_group.paintbox.reader_endpoint_address
    port = 6379
    ssl_enabled = true
  })
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "${var.project_name}-redis-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_description  = "This metric monitors Redis CPU utilization"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.paintbox.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "${var.project_name}-redis-high-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "90"
  alarm_description  = "This metric monitors Redis memory usage"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.paintbox.id
  }

  tags = local.common_tags
}

# Outputs
output "redis_primary_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.paintbox.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint address"
  value       = aws_elasticache_replication_group.paintbox.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.paintbox.port
}
