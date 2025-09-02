# RDS PostgreSQL and ElastiCache Redis Configuration

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-subnet-group"
    }
  )
}

# RDS Parameter Group
resource "aws_db_parameter_group" "postgres" {
  name   = "${local.name_prefix}-postgres-params"
  family = "postgres15"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgaudit"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries longer than 1 second
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "work_mem"
    value = "16384"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-postgres-params"
    }
  )
}

# Generate random password for RDS
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store DB password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${local.name_prefix}-db-password"
  recovery_window_in_days = var.secret_recovery_window

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-password"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier     = "${local.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = var.db_storage_encrypted
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = "claude_config"
  username = "postgres"
  password = random_password.db_password.result
  port     = 5432

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.postgres.name

  backup_retention_period = var.db_backup_retention_period
  backup_window           = var.db_backup_window
  maintenance_window      = var.db_maintenance_window
  
  multi_az               = var.db_multi_az
  deletion_protection    = var.db_deletion_protection
  skip_final_snapshot    = false
  final_snapshot_identifier = "${local.name_prefix}-postgres-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  performance_insights_enabled    = var.enable_performance_insights
  performance_insights_retention_period = var.enable_performance_insights ? 7 : 0
  performance_insights_kms_key_id = var.enable_performance_insights ? aws_kms_key.rds.arn : null

  monitoring_interval = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-postgres"
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# RDS Read Replica (for production)
resource "aws_db_instance" "postgres_read_replica" {
  count = var.environment == "production" ? 1 : 0

  identifier             = "${local.name_prefix}-postgres-read-replica"
  replicate_source_db    = aws_db_instance.postgres.identifier
  instance_class         = var.db_read_replica_instance_class
  
  storage_encrypted      = var.db_storage_encrypted
  kms_key_id             = aws_kms_key.rds.arn
  
  skip_final_snapshot    = true
  deletion_protection    = var.db_deletion_protection

  performance_insights_enabled = var.enable_performance_insights
  monitoring_interval          = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn          = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-postgres-read-replica"
    }
  )
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name = "${local.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Store DB connection string in Secrets Manager
resource "aws_secretsmanager_secret" "db_connection_string" {
  name                    = "${local.name_prefix}-db-connection-string"
  recovery_window_in_days = var.secret_recovery_window

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-db-connection-string"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_connection_string" {
  secret_id = aws_secretsmanager_secret.db_connection_string.id
  secret_string = jsonencode({
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    database = aws_db_instance.postgres.db_name
    username = aws_db_instance.postgres.username
    password = random_password.db_password.result
    url      = "postgresql://${aws_db_instance.postgres.username}:${random_password.db_password.result}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}"
  })
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-cache-subnet-group"
  subnet_ids = aws_subnet.elasticache[*].id

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-cache-subnet-group"
    }
  )
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  name   = "${local.name_prefix}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-params"
    }
  )
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${local.name_prefix}-redis"
  replication_group_description = "Redis cluster for ${local.name_prefix}"
  
  engine               = "redis"
  engine_version       = var.redis_version
  node_type            = var.elasticache_node_type
  number_cache_clusters = var.elasticache_num_nodes
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.elasticache.id]
  parameter_group_name = aws_elasticache_parameter_group.redis.name

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  
  automatic_failover_enabled = var.elasticache_automatic_failover
  multi_az_enabled           = var.elasticache_multi_az
  
  snapshot_retention_limit = var.elasticache_snapshot_retention
  snapshot_window          = var.elasticache_snapshot_window
  
  notification_topic_arn = aws_sns_topic.alerts.arn
  
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

  apply_immediately = false
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis"
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# Generate random auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false  # Redis auth tokens don't support special characters
}

# Store Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${local.name_prefix}-redis-auth-token"
  recovery_window_in_days = var.secret_recovery_window

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-auth-token"
    }
  )
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    endpoint   = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
    url        = "redis://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  })
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${local.name_prefix}/redis/slow-log"
  retention_in_days = var.cloudwatch_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${local.name_prefix}/redis/engine-log"
  retention_in_days = var.cloudwatch_retention_days

  tags = local.common_tags
}

# KMS Key for RDS Encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = var.kms_deletion_window
  enable_key_rotation     = true

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-kms"
    }
  )
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${local.name_prefix}-rds"
  target_key_id = aws_kms_key.rds.key_id
}