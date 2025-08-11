# ElastiCache Redis Cluster for Collaboration System

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "collaboration" {
  name       = "${var.project_name}-${var.environment}-cache-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "${var.project_name}-${var.environment}-cache-subnet"
  }
}

# ElastiCache Parameter Group for Redis optimization
resource "aws_elasticache_parameter_group" "collaboration" {
  family = "redis7.x"
  name   = "${var.project_name}-${var.environment}-cache-params"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  # Pub/Sub optimizations for real-time collaboration
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  # Performance optimizations
  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  # Persistence configuration
  parameter {
    name  = "save"
    value = "900 1 300 10 60 10000"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cache-params"
  }
}

# ElastiCache Replication Group (Redis Cluster)
resource "aws_elasticache_replication_group" "collaboration" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  description                = "Redis cluster for Collaboration System"

  # Redis configuration
  engine               = "redis"
  engine_version       = var.redis_version
  node_type           = var.redis_node_type
  port                = 6379
  parameter_group_name = aws_elasticache_parameter_group.collaboration.name

  # Cluster configuration
  num_cache_clusters = var.redis_num_cache_nodes

  # Multi-AZ configuration for production
  multi_az_enabled           = var.environment == "production" ? true : false
  automatic_failover_enabled = var.redis_num_cache_nodes > 1 ? true : false

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.collaboration.name
  security_group_ids = [aws_security_group.elasticache.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_password.result
  kms_key_id                = aws_kms_key.collaboration.arn

  # Backup configuration
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"  # UTC
  maintenance_window      = "sun:05:00-sun:07:00"  # UTC

  # Monitoring
  notification_topic_arn = aws_sns_topic.alerts.arn

  # Log delivery configuration
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }

  # Prevent accidental deletion in production
  lifecycle {
    prevent_destroy = false  # Set to true in production
  }
}

# Redis Cluster Mode (for high scalability requirements)
resource "aws_elasticache_replication_group" "collaboration_cluster" {
  count = var.redis_cluster_mode_enabled ? 1 : 0

  replication_group_id       = "${var.project_name}-${var.environment}-redis-cluster"
  description                = "Redis cluster mode for Collaboration System"

  # Redis configuration
  engine               = "redis"
  engine_version       = var.redis_version
  node_type           = var.redis_cluster_node_type
  port                = 6379
  parameter_group_name = aws_elasticache_parameter_group.collaboration.name

  # Cluster mode configuration
  num_node_groups         = var.redis_num_node_groups
  replicas_per_node_group = var.redis_replicas_per_node_group

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.collaboration.name
  security_group_ids = [aws_security_group.elasticache.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_password.result
  kms_key_id                = aws_kms_key.collaboration.arn

  # Backup configuration
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"  # UTC
  maintenance_window      = "sun:05:00-sun:07:00"  # UTC

  # Monitoring
  notification_topic_arn = aws_sns_topic.alerts.arn

  # Log delivery configuration
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-cluster"
  }
}

# CloudWatch Log Group for Redis slow log
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis-slow-log"
  retention_in_days = var.environment == "production" ? 30 : 7
  kms_key_id        = aws_kms_key.collaboration.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  }
}

# Store Redis credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_credentials" {
  name                    = "${var.project_name}/${var.environment}/redis-credentials"
  description             = "Redis credentials for Collaboration System"
  kms_key_id             = aws_kms_key.collaboration.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id

  secret_string = jsonencode({
    engine   = "redis"
    host     = aws_elasticache_replication_group.collaboration.primary_endpoint_address
    port     = aws_elasticache_replication_group.collaboration.port
    auth_token = random_password.redis_password.result
    url      = "redis://:${random_password.redis_password.result}@${aws_elasticache_replication_group.collaboration.primary_endpoint_address}:${aws_elasticache_replication_group.collaboration.port}/0"

    # Cluster configuration (if enabled)
    cluster_enabled = var.redis_cluster_mode_enabled
    cluster_endpoint = var.redis_cluster_mode_enabled ? aws_elasticache_replication_group.collaboration_cluster[0].configuration_endpoint_address : null

    # Read replica endpoints
    reader_endpoint_address = aws_elasticache_replication_group.collaboration.reader_endpoint_address
  })
}

# CloudWatch alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.collaboration.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.collaboration.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-memory-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "500"
  alarm_description   = "This metric monitors Redis connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.collaboration.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-connections-alarm"
  }
}

# ElastiCache User for fine-grained access control
resource "aws_elasticache_user" "collaboration" {
  user_id       = "${var.project_name}-${var.environment}-user"
  user_name     = "collaboration_user"
  access_string = "on ~* &* +@all"
  engine        = "REDIS"
  passwords     = [random_password.redis_password.result]

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-user"
  }
}

resource "aws_elasticache_user_group" "collaboration" {
  engine          = "REDIS"
  user_group_id   = "${var.project_name}-${var.environment}-user-group"
  user_ids        = [aws_elasticache_user.collaboration.user_id]

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-user-group"
  }
}

# Attach user group to replication group
resource "aws_elasticache_user_group_association" "collaboration" {
  user_group_id                = aws_elasticache_user_group.collaboration.user_group_id
  replication_group_id         = aws_elasticache_replication_group.collaboration.id
}
