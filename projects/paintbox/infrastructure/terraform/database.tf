# Database Infrastructure - PostgreSQL with TimescaleDB
# Cost-optimized for $200-500/month budget

# RDS PostgreSQL Instance for main application data
resource "aws_db_instance" "paintbox" {
  identifier = "${var.project_name}-db-${var.environment}"

  # Engine Configuration
  engine         = "postgres"
  engine_version = "15.4"

  # Instance Configuration - Cost optimized
  instance_class               = var.db_instance_class # t3.small ~$25/month
  allocated_storage           = var.db_allocated_storage
  max_allocated_storage       = var.db_max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                 = aws_kms_key.paintbox.arn

  # Multi-tenant database configuration
  db_name  = "paintbox"
  username = "paintbox_admin"
  password = random_password.db_password.result

  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.paintbox.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup Configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # High Availability - only in production
  multi_az = var.environment == "production" ? var.db_multi_az : false

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval            = var.environment == "production" ? 60 : 0
  monitoring_role_arn           = var.environment == "production" ? aws_iam_role.rds_monitoring.arn : null

  # Performance Insights - production only
  performance_insights_enabled    = var.environment == "production"
  performance_insights_kms_key_id = var.environment == "production" ? aws_kms_key.paintbox.arn : null

  # Deletion Protection
  deletion_protection      = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-database"
    Type = "PostgreSQL"
  })
}

# TimescaleDB for Analytics (using separate instance for better performance)
resource "aws_db_instance" "timescaledb" {
  count = var.enable_timescaledb ? 1 : 0

  identifier = "${var.project_name}-timescale-${var.environment}"

  # Engine Configuration with TimescaleDB extension
  engine         = "postgres"
  engine_version = "15.4"

  # Instance Configuration
  instance_class               = "db.t3.micro" # Cost optimization: ~$15/month
  allocated_storage           = 20
  max_allocated_storage       = 100
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                 = aws_kms_key.paintbox.arn

  db_name  = "paintbox_analytics"
  username = "timescale_admin"
  password = random_password.timescale_password.result

  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.paintbox.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup Configuration
  backup_retention_period = 7
  backup_window          = "03:30-04:30"
  maintenance_window     = "sun:04:30-sun:05:30"

  # Single AZ for cost optimization
  multi_az = false

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Deletion Protection
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-timescaledb"
    Type = "TimescaleDB"
  })
}

# Database Subnet Group
resource "aws_db_subnet_group" "paintbox" {
  name       = "${var.project_name}-db-subnet-${var.environment}"
  subnet_ids = module.vpc.database_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-db-subnet-group"
  })
}

# Security Group for Database
resource "aws_security_group" "database" {
  name_prefix = "${var.project_name}-db-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_service.id]
    description     = "PostgreSQL from ECS services"
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
    Name = "${var.project_name}-database-sg"
  })
}

# Parameter Groups for optimization
resource "aws_db_parameter_group" "paintbox" {
  name   = "${var.project_name}-pg15-${var.environment}"
  family = "postgres15"

  # Optimized parameters for multi-tenant SaaS
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
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
    name  = "max_connections"
    value = "200"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-pg-params"
  })
}

# IAM Role for RDS Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring-${var.environment}"

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
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Random Passwords
resource "random_password" "db_password" {
  length  = 32
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "timescale_password" {
  length  = 32
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Secrets Manager for Database Credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}/rds/credentials/${var.environment}"
  description = "RDS PostgreSQL credentials for Paintbox"
  kms_key_id = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = aws_db_instance.paintbox.username
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.paintbox.address
    port     = aws_db_instance.paintbox.port
    dbname   = aws_db_instance.paintbox.db_name
  })
}

# Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.paintbox.endpoint
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.paintbox.db_name
}

output "timescaledb_endpoint" {
  description = "TimescaleDB instance endpoint"
  value       = var.enable_timescaledb ? aws_db_instance.timescaledb[0].endpoint : null
  sensitive   = true
}
