# RDS PostgreSQL Secure Configuration - REMEDIATION CR-002
# Hardened RDS instance with proper logging and security settings

resource "aws_db_instance" "postgres_secure" {
  identifier     = "${var.project_name}-postgres-secure"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.rds_instance_class
  
  # Storage configuration
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn
  
  # Database configuration
  db_name  = "promoteros"
  username = "promoteros_admin"
  password = random_password.rds_password.result
  port     = 5432
  
  # Network configuration - CRITICAL: Not publicly accessible
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds_secure.id]
  publicly_accessible    = false  # CR-002: CRITICAL - Must be false
  
  # High availability
  multi_az               = true
  availability_zone      = var.multi_az ? null : data.aws_availability_zones.available.names[0]
  
  # Backup configuration
  backup_retention_period   = 30
  backup_window            = "03:00-04:00"
  maintenance_window       = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot    = true
  delete_automated_backups = false
  
  # Parameter group with secure logging
  parameter_group_name = aws_db_parameter_group.postgres_secure.name
  
  # Performance Insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn
  performance_insights_retention_period = 7
  
  # Enhanced monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval             = 60
  monitoring_role_arn            = aws_iam_role.rds_monitoring.arn
  
  # Security
  deletion_protection      = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Auto minor version upgrade for security patches
  auto_minor_version_upgrade = true
  apply_immediately         = false
  
  tags = {
    Name        = "${var.project_name}-postgres-secure"
    Environment = var.environment
    Remediation = "CR-002"
    Encrypted   = "true"
    MultiAZ     = "true"
  }
}

# Secure RDS Parameter Group - CR-002 Fix
resource "aws_db_parameter_group" "postgres_secure" {
  name   = "${var.project_name}-postgres-secure-params"
  family = "postgres15"
  
  # CRITICAL: Secure logging configuration to prevent sensitive data exposure
  parameter {
    name  = "log_statement"
    value = "ddl"  # Only log DDL statements, not DML with sensitive data
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log slow queries over 1 second
  }
  
  parameter {
    name  = "log_min_error_statement"
    value = "error"  # Only log errors, not all statements
  }
  
  # CRITICAL: Prevent logging of query parameters that may contain sensitive data
  parameter {
    name  = "log_parameter_max_length"
    value = "0"  # Don't log parameter values
  }
  
  parameter {
    name  = "log_parameter_max_length_on_error"
    value = "0"  # Don't log parameter values even on error
  }
  
  # Additional security parameters
  parameter {
    name  = "log_connections"
    value = "1"
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  
  parameter {
    name  = "log_duration"
    value = "0"  # Don't log all statement durations
  }
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgaudit"
  }
  
  # Connection limits
  parameter {
    name  = "max_connections"
    value = "200"
  }
  
  # SSL enforcement
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  
  tags = {
    Name        = "${var.project_name}-postgres-secure-params"
    Environment = var.environment
    Remediation = "CR-002"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "rds" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = {
    Name        = "${var.project_name}-rds-subnet-group"
    Environment = var.environment
  }
}

# Random password for RDS
resource "random_password" "rds_password" {
  length  = 32
  special = true
  
  lifecycle {
    ignore_changes = [result]
  }
}

# Store RDS password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name                    = "${var.project_name}/rds/master-password"
  recovery_window_in_days = 7
  kms_key_id             = aws_kms_key.secrets.arn
  
  tags = {
    Name        = "${var.project_name}-rds-password"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id = aws_secretsmanager_secret.rds_password.id
  secret_string = jsonencode({
    username = aws_db_instance.postgres_secure.username
    password = random_password.rds_password.result
    engine   = "postgres"
    host     = aws_db_instance.postgres_secure.address
    port     = aws_db_instance.postgres_secure.port
    dbname   = aws_db_instance.postgres_secure.db_name
  })
}

# IAM role for RDS enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring-role"
  
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
    Name        = "${var.project_name}-rds-monitoring-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# KMS keys for encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
  
  tags = {
    Name        = "${var.project_name}-rds-kms"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# AWS Config rule to ensure RDS is not publicly accessible
resource "aws_config_config_rule" "rds_public_access" {
  name = "${var.project_name}-rds-no-public-access"
  
  source {
    owner             = "AWS"
    source_identifier = "RDS_INSTANCE_PUBLIC_ACCESS_CHECK"
  }
  
  depends_on = [aws_config_configuration_recorder.main]
  
  tags = {
    Name        = "${var.project_name}-rds-public-access-check"
    Environment = var.environment
    Remediation = "CR-002"
  }
}