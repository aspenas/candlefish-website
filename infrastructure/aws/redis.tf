# Claude Configuration System - ElastiCache Redis Configuration

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = var.redis_parameter_group_name
  name   = "${var.project_name}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  parameter {
    name  = "maxclients"
    value = "1000"
  }

  tags = {
    Name = "${var.project_name}-redis-params"
  }
}

# Redis Replication Group (Cluster Mode)
resource "aws_elasticache_replication_group" "main" {
  description          = "Redis cluster for ${var.project_name}"
  replication_group_id = "${var.project_name}-redis"

  # Node configuration
  node_type            = var.redis_node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Cluster configuration
  num_cache_clusters = var.redis_num_cache_nodes
  engine             = "redis"
  engine_version     = var.redis_engine_version

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.main.arn

  # Auth token for transit encryption
  auth_token = random_password.redis_auth_token.result

  # Backup configuration
  automatic_failover_enabled = var.redis_num_cache_nodes > 1
  multi_az_enabled          = var.redis_num_cache_nodes > 1
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  # Maintenance
  maintenance_window = "sun:05:00-sun:07:00"

  # Notification
  notification_topic_arn = aws_sns_topic.alerts.arn

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.project_name}-redis-cluster"
  }

  lifecycle {
    ignore_changes = [auth_token]
  }
}

# Random password for Redis auth token
resource "random_password" "redis_auth_token" {
  length  = 64
  special = false # Redis auth tokens don't support special characters
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/redis/${var.project_name}/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.main.arn

  tags = {
    Name = "${var.project_name}-redis-slow-log"
  }
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-redis-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-redis-memory-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "${var.project_name}-redis-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "800"
  alarm_description   = "This metric monitors Redis current connections"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-redis-connections-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.project_name}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors Redis evictions"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-redis-evictions-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_cache_hit_rate" {
  alarm_name          = "${var.project_name}-redis-cache-hit-rate-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CacheHitRate"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis cache hit rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }

  tags = {
    Name = "${var.project_name}-redis-hit-rate-alarm"
  }
}

# Store Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name                    = "${var.project_name}-redis-auth-token"
  description             = "Redis auth token for ${var.project_name}"
  recovery_window_in_days = 7
  kms_key_id              = aws_kms_key.main.arn

  tags = {
    Name = "${var.project_name}-redis-auth-token"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = random_password.redis_auth_token.result
}

# Redis cluster for session storage (separate from main cache)
resource "aws_elasticache_replication_group" "sessions" {
  description          = "Redis cluster for session storage - ${var.project_name}"
  replication_group_id = "${var.project_name}-sessions"

  # Node configuration
  node_type            = "cache.t3.micro"
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.sessions.name

  # Cluster configuration
  num_cache_clusters = 2
  engine             = "redis"
  engine_version     = var.redis_engine_version

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.main.arn

  # Auth token for transit encryption
  auth_token = random_password.redis_sessions_auth_token.result

  # Backup configuration
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  snapshot_retention_limit = 3
  snapshot_window         = "02:00-03:00"
  
  # Maintenance
  maintenance_window = "sun:02:00-sun:03:00"

  # Notification
  notification_topic_arn = aws_sns_topic.alerts.arn

  tags = {
    Name = "${var.project_name}-redis-sessions"
  }

  lifecycle {
    ignore_changes = [auth_token]
  }
}

# Parameter group for sessions Redis
resource "aws_elasticache_parameter_group" "sessions" {
  family = var.redis_parameter_group_name
  name   = "${var.project_name}-redis-sessions-params"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-ttl"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  tags = {
    Name = "${var.project_name}-redis-sessions-params"
  }
}

# Random password for Redis sessions auth token
resource "random_password" "redis_sessions_auth_token" {
  length  = 64
  special = false
}

# Store Redis sessions auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_sessions_auth" {
  name                    = "${var.project_name}-redis-sessions-auth-token"
  description             = "Redis sessions auth token for ${var.project_name}"
  recovery_window_in_days = 7
  kms_key_id              = aws_kms_key.main.arn

  tags = {
    Name = "${var.project_name}-redis-sessions-auth-token"
  }
}

resource "aws_secretsmanager_secret_version" "redis_sessions_auth" {
  secret_id     = aws_secretsmanager_secret.redis_sessions_auth.id
  secret_string = random_password.redis_sessions_auth_token.result
}