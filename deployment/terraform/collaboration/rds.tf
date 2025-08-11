# RDS PostgreSQL with TimescaleDB for Collaboration System

# DB Subnet Group
resource "aws_db_subnet_group" "collaboration" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# DB Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "collaboration" {
  family = "postgres15"
  name   = "${var.project_name}-${var.environment}-db-params"

  # Performance optimizations for collaboration workloads
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/2}"
  }

  parameter {
    name  = "work_mem"
    value = "4096"  # 4MB
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "65536"  # 64MB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "wal_buffers"
    value = "16384"  # 16MB
  }

  parameter {
    name  = "default_statistics_target"
    value = "100"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }

  # Logging configuration
  parameter {
    name  = "log_statement"
    value = "mod"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # 1 second
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-params"
  }
}

# RDS Instance
resource "aws_db_instance" "collaboration" {
  identifier = "${var.project_name}-${var.environment}-db"

  # Engine configuration
  engine              = "postgres"
  engine_version      = var.postgres_version
  instance_class      = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type        = "gp3"
  storage_encrypted   = true
  kms_key_id         = aws_kms_key.collaboration.arn

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.collaboration.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.collaboration.name

  # Backup configuration
  backup_retention_period   = var.environment == "production" ? 30 : 7
  backup_window            = "03:00-04:00"  # UTC
  maintenance_window       = "sun:04:00-sun:05:00"  # UTC
  delete_automated_backups = false
  deletion_protection      = var.environment == "production" ? true : false

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Performance insights
  performance_insights_enabled = true
  performance_insights_retention_period = var.environment == "production" ? 731 : 7
  performance_insights_kms_key_id = aws_kms_key.collaboration.arn

  # Multi-AZ for production
  multi_az = var.environment == "production" ? true : false

  # Minor version auto upgrade
  auto_minor_version_upgrade = true

  # Apply changes immediately for non-production
  apply_immediately = var.environment != "production"

  # Skip final snapshot for non-production
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }

  # Prevent accidental deletion in production
  lifecycle {
    prevent_destroy = false  # Set to true in production
  }
}

# Read Replica for production
resource "aws_db_instance" "collaboration_read_replica" {
  count = var.environment == "production" ? var.db_read_replicas_count : 0

  identifier = "${var.project_name}-${var.environment}-db-replica-${count.index + 1}"

  # Replica configuration
  replicate_source_db = aws_db_instance.collaboration.id
  instance_class      = var.db_replica_instance_class

  # Network configuration
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  # Performance insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id = aws_kms_key.collaboration.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-db-replica-${count.index + 1}"
  }
}

# IAM role for RDS enhanced monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

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

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Group for PostgreSQL logs
resource "aws_cloudwatch_log_group" "postgresql" {
  name              = "/aws/rds/instance/${aws_db_instance.collaboration.id}/postgresql"
  retention_in_days = var.environment == "production" ? 30 : 7
  kms_key_id        = aws_kms_key.collaboration.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-postgresql-logs"
  }
}

# CloudWatch Log Group for upgrade logs
resource "aws_cloudwatch_log_group" "upgrade" {
  name              = "/aws/rds/instance/${aws_db_instance.collaboration.id}/upgrade"
  retention_in_days = var.environment == "production" ? 30 : 7
  kms_key_id        = aws_kms_key.collaboration.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-upgrade-logs"
  }
}

# Store database credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/${var.environment}/database-credentials"
  description             = "Database credentials for Collaboration System"
  kms_key_id             = aws_kms_key.collaboration.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_db_instance.collaboration.endpoint
    port     = aws_db_instance.collaboration.port
    dbname   = aws_db_instance.collaboration.db_name
    username = aws_db_instance.collaboration.username
    password = random_password.db_password.result
    url      = "postgresql://${aws_db_instance.collaboration.username}:${random_password.db_password.result}@${aws_db_instance.collaboration.endpoint}:${aws_db_instance.collaboration.port}/${aws_db_instance.collaboration.db_name}"

    # Read replica endpoints (if any)
    read_replicas = [
      for replica in aws_db_instance.collaboration_read_replica : {
        host = replica.endpoint
        port = replica.port
        url  = "postgresql://${aws_db_instance.collaboration.username}:${random_password.db_password.result}@${replica.endpoint}:${replica.port}/${aws_db_instance.collaboration.db_name}"
      }
    ]
  })
}

# CloudWatch alarms for database monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-db-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors database CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.collaboration.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-db-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "160"  # 80% of max_connections (200)
  alarm_description   = "This metric monitors database connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.collaboration.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-connections-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_freeable_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-db-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "134217728"  # 128MB in bytes
  alarm_description   = "This metric monitors database freeable memory"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.collaboration.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-memory-alarm"
  }
}
