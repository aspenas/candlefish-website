# CLOS Analytics Infrastructure Module
# Provides dedicated AWS resources for the analytics dashboard

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  name_prefix = "clos-analytics"
  
  common_tags = merge(var.common_tags, {
    Component   = "clos-analytics"
    Service     = "analytics-dashboard"
    Terraform   = "true"
  })
  
  # Database configuration
  db_name = "clos_analytics"
  db_port = 5432
  
  # Redis configuration
  redis_port = 6379
  
  # Application ports
  api_port       = 8000
  websocket_port = 8001
  dashboard_port = 3500
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_vpc" "main" {
  count = var.vpc_id != "" ? 1 : 0
  id    = var.vpc_id
}

data "aws_subnets" "private" {
  count = var.vpc_id != "" ? 1 : 0
  
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  
  filter {
    name   = "tag:Type"
    values = ["private"]
  }
}

data "aws_subnets" "public" {
  count = var.vpc_id != "" ? 1 : 0
  
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  
  filter {
    name   = "tag:Type"
    values = ["public"]
  }
}

# ============================================
# RDS PostgreSQL for Analytics Data
# ============================================
resource "aws_db_subnet_group" "analytics" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = var.vpc_id != "" ? data.aws_subnets.private[0].ids : var.private_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

resource "aws_security_group" "rds" {
  name_prefix = "${local.name_prefix}-rds-"
  vpc_id      = var.vpc_id != "" ? var.vpc_id : var.vpc_id
  
  description = "Security group for CLOS Analytics RDS instance"
  
  ingress {
    from_port       = local.db_port
    to_port         = local.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL access from application"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-sg"
  })
}

resource "aws_db_instance" "analytics" {
  identifier = "${local.name_prefix}-db"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class
  
  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database configuration
  db_name  = local.db_name
  username = var.db_username
  password = var.db_password
  port     = local.db_port
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.analytics.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  
  # Backup configuration
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Monitoring and logging
  monitoring_interval                   = var.environment == "production" ? 60 : 0
  monitoring_role_arn                  = var.environment == "production" ? aws_iam_role.rds_monitoring[0].arn : null
  performance_insights_enabled         = var.environment == "production"
  performance_insights_retention_period = var.environment == "production" ? 7 : 0
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  # Security
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database"
  })
}

# Enhanced monitoring role for RDS
resource "aws_iam_role" "rds_monitoring" {
  count = var.environment == "production" ? 1 : 0
  name  = "${local.name_prefix}-rds-monitoring-role"
  
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
  count      = var.environment == "production" ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================
# ElastiCache Redis for Caching
# ============================================
resource "aws_elasticache_subnet_group" "analytics" {
  name       = "${local.name_prefix}-cache-subnet-group"
  subnet_ids = var.vpc_id != "" ? data.aws_subnets.private[0].ids : var.private_subnet_ids
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cache-subnet-group"
  })
}

resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-redis-"
  vpc_id      = var.vpc_id != "" ? var.vpc_id : var.vpc_id
  
  description = "Security group for CLOS Analytics Redis cluster"
  
  ingress {
    from_port       = local.redis_port
    to_port         = local.redis_port
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Redis access from application"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })
}

resource "aws_elasticache_replication_group" "analytics" {
  replication_group_id       = "${local.name_prefix}-redis"
  description                = "CLOS Analytics Redis cluster for caching and sessions"
  
  # Redis configuration
  node_type                  = var.redis_node_type
  port                       = local.redis_port
  parameter_group_name       = aws_elasticache_parameter_group.analytics.name
  
  # Cluster configuration
  num_cache_clusters         = var.redis_num_cache_nodes
  
  # Network configuration
  subnet_group_name          = aws_elasticache_subnet_group.analytics.name
  security_group_ids         = [aws_security_group.redis.id]
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  
  # Backup configuration
  snapshot_retention_limit   = var.environment == "production" ? 5 : 1
  snapshot_window           = "03:00-05:00"
  
  # Maintenance
  maintenance_window        = "sun:05:00-sun:07:00"
  
  # Monitoring
  notification_topic_arn    = var.environment == "production" ? aws_sns_topic.alerts[0].arn : null
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })
}

resource "aws_elasticache_parameter_group" "analytics" {
  family = "redis7.x"
  name   = "${local.name_prefix}-redis-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  tags = local.common_tags
}

# ============================================
# Application Load Balancer
# ============================================
resource "aws_security_group" "alb" {
  name_prefix = "${local.name_prefix}-alb-"
  vpc_id      = var.vpc_id != "" ? var.vpc_id : var.vpc_id
  
  description = "Security group for CLOS Analytics ALB"
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })
}

resource "aws_security_group" "app" {
  name_prefix = "${local.name_prefix}-app-"
  vpc_id      = var.vpc_id != "" ? var.vpc_id : var.vpc_id
  
  description = "Security group for CLOS Analytics application containers"
  
  # API Server
  ingress {
    from_port       = local.api_port
    to_port         = local.api_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "API server from ALB"
  }
  
  # WebSocket Server
  ingress {
    from_port       = local.websocket_port
    to_port         = local.websocket_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "WebSocket server from ALB"
  }
  
  # Web Dashboard
  ingress {
    from_port       = local.dashboard_port
    to_port         = local.dashboard_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Web dashboard from ALB"
  }
  
  # Internal communication
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
    description = "Internal communication"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-sg"
  })
}

resource "aws_lb" "analytics" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.vpc_id != "" ? data.aws_subnets.public[0].ids : var.public_subnet_ids
  
  enable_deletion_protection = var.environment == "production"
  
  # Access logging
  access_logs {
    bucket  = var.access_logs_bucket
    prefix  = "clos-analytics"
    enabled = var.access_logs_bucket != ""
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

# ============================================
# CloudWatch Monitoring
# ============================================
resource "aws_cloudwatch_log_group" "analytics" {
  for_each = toset(["api", "websocket", "dashboard", "postgres", "redis"])
  
  name              = "/aws/clos-analytics/${each.key}"
  retention_in_days = var.log_retention_days
  
  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-${each.key}-logs"
    Component = each.key
  })
}

# SNS Topic for alerts (production only)
resource "aws_sns_topic" "alerts" {
  count = var.environment == "production" ? 1 : 0
  name  = "${local.name_prefix}-alerts"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alerts"
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  count = var.environment == "production" ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-database-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.analytics.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.environment == "production" ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.analytics.replication_group_id}-001"
  }
  
  tags = local.common_tags
}

# ============================================
# Secrets Manager
# ============================================
resource "aws_secretsmanager_secret" "analytics_db" {
  name        = "${local.name_prefix}/database"
  description = "Database credentials for CLOS Analytics"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-secret"
  })
}

resource "aws_secretsmanager_secret_version" "analytics_db" {
  secret_id = aws_secretsmanager_secret.analytics_db.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    engine   = "postgres"
    host     = aws_db_instance.analytics.endpoint
    port     = local.db_port
    dbname   = local.db_name
  })
}

resource "aws_secretsmanager_secret" "analytics_redis" {
  name        = "${local.name_prefix}/redis"
  description = "Redis credentials for CLOS Analytics"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-secret"
  })
}

resource "aws_secretsmanager_secret_version" "analytics_redis" {
  secret_id = aws_secretsmanager_secret.analytics_redis.id
  secret_string = jsonencode({
    endpoint   = aws_elasticache_replication_group.analytics.primary_endpoint_address
    port       = local.redis_port
    auth_token = var.redis_auth_token
  })
}

# ============================================
# IAM Roles for ECS/EKS
# ============================================
resource "aws_iam_role" "app_execution" {
  name = "${local.name_prefix}-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["ecs-tasks.amazonaws.com", "eks.amazonaws.com"]
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy" "app_execution" {
  name = "${local.name_prefix}-execution-policy"
  role = aws_iam_role.app_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.analytics_db.arn,
          aws_secretsmanager_secret.analytics_redis.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_execution" {
  role       = aws_iam_role.app_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}