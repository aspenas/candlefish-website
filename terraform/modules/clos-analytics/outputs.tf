# CLOS Analytics Terraform Module Outputs

# ============================================
# Database Outputs
# ============================================
output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.analytics.endpoint
}

output "database_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.analytics.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.analytics.db_name
}

output "database_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.analytics.arn
}

output "database_secret_arn" {
  description = "Secrets Manager ARN for database credentials"
  value       = aws_secretsmanager_secret.analytics_db.arn
}

# ============================================
# Redis Cache Outputs
# ============================================
output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.analytics.primary_endpoint_address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_replication_group.analytics.port
}

output "redis_secret_arn" {
  description = "Secrets Manager ARN for Redis credentials"
  value       = aws_secretsmanager_secret.analytics_redis.arn
}

# ============================================
# Load Balancer Outputs
# ============================================
output "load_balancer_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.analytics.arn
}

output "load_balancer_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.analytics.dns_name
}

output "load_balancer_zone_id" {
  description = "Application Load Balancer Route53 zone ID"
  value       = aws_lb.analytics.zone_id
}

# ============================================
# Security Group Outputs
# ============================================
output "app_security_group_id" {
  description = "Security group ID for application containers"
  value       = aws_security_group.app.id
}

output "alb_security_group_id" {
  description = "Security group ID for Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS instance"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis cluster"
  value       = aws_security_group.redis.id
}

# ============================================
# IAM Role Outputs
# ============================================
output "app_execution_role_arn" {
  description = "IAM role ARN for application execution"
  value       = aws_iam_role.app_execution.arn
}

output "app_execution_role_name" {
  description = "IAM role name for application execution"
  value       = aws_iam_role.app_execution.name
}

# ============================================
# CloudWatch Outputs
# ============================================
output "log_groups" {
  description = "CloudWatch log group names"
  value = {
    for k, v in aws_cloudwatch_log_group.analytics : k => v.name
  }
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts (if enabled)"
  value       = var.environment == "production" ? aws_sns_topic.alerts[0].arn : null
}

# ============================================
# Connection Information
# ============================================
output "database_connection_string" {
  description = "Database connection string (without password)"
  value       = "postgresql://${var.db_username}:***@${aws_db_instance.analytics.endpoint}:${aws_db_instance.analytics.port}/${aws_db_instance.analytics.db_name}"
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = "redis://${aws_elasticache_replication_group.analytics.primary_endpoint_address}:${aws_elasticache_replication_group.analytics.port}"
}

# ============================================
# Environment Configuration
# ============================================
output "environment_variables" {
  description = "Environment variables for application deployment"
  value = {
    NODE_ENV                    = var.environment
    DATABASE_URL               = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.analytics.endpoint}:${aws_db_instance.analytics.port}/${aws_db_instance.analytics.db_name}"
    REDIS_URL                  = "redis://${aws_elasticache_replication_group.analytics.primary_endpoint_address}:${aws_elasticache_replication_group.analytics.port}"
    AWS_REGION                 = data.aws_region.current.name
    DATABASE_SECRET_ARN        = aws_secretsmanager_secret.analytics_db.arn
    REDIS_SECRET_ARN          = aws_secretsmanager_secret.analytics_redis.arn
    LOG_GROUP_API             = aws_cloudwatch_log_group.analytics["api"].name
    LOG_GROUP_WEBSOCKET       = aws_cloudwatch_log_group.analytics["websocket"].name
    LOG_GROUP_DASHBOARD       = aws_cloudwatch_log_group.analytics["dashboard"].name
    ANALYTICS_RETENTION_DAYS   = var.data_retention_days
    ENVIRONMENT               = var.environment
  }
  sensitive = true
}

# ============================================
# Kubernetes Configuration
# ============================================
output "kubernetes_config" {
  description = "Configuration values for Kubernetes deployment"
  value = {
    namespace = "clos-analytics"
    
    database = {
      host     = aws_db_instance.analytics.endpoint
      port     = aws_db_instance.analytics.port
      name     = aws_db_instance.analytics.db_name
      username = var.db_username
      secret_arn = aws_secretsmanager_secret.analytics_db.arn
    }
    
    redis = {
      host       = aws_elasticache_replication_group.analytics.primary_endpoint_address
      port       = aws_elasticache_replication_group.analytics.port
      secret_arn = aws_secretsmanager_secret.analytics_redis.arn
    }
    
    security_groups = {
      app   = aws_security_group.app.id
      alb   = aws_security_group.alb.id
      rds   = aws_security_group.rds.id
      redis = aws_security_group.redis.id
    }
    
    iam_role = aws_iam_role.app_execution.arn
  }
  sensitive = true
}

# ============================================
# Cost and Resource Information
# ============================================
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown (USD)"
  value = {
    database = var.db_instance_class == "db.t3.micro" ? 15 : 
              var.db_instance_class == "db.t3.small" ? 30 : 
              var.db_instance_class == "db.t3.medium" ? 60 : 120
    
    redis = var.redis_node_type == "cache.t3.micro" ? 15 * var.redis_num_cache_nodes : 
           var.redis_node_type == "cache.t3.small" ? 30 * var.redis_num_cache_nodes : 
           60 * var.redis_num_cache_nodes
    
    load_balancer = 22
    
    cloudwatch_logs = 5
    
    total_estimated = (
      (var.db_instance_class == "db.t3.micro" ? 15 : 
       var.db_instance_class == "db.t3.small" ? 30 : 
       var.db_instance_class == "db.t3.medium" ? 60 : 120) +
      (var.redis_node_type == "cache.t3.micro" ? 15 * var.redis_num_cache_nodes : 
       var.redis_node_type == "cache.t3.small" ? 30 * var.redis_num_cache_nodes : 
       60 * var.redis_num_cache_nodes) +
      22 + 5
    )
  }
}

output "resource_summary" {
  description = "Summary of created resources"
  value = {
    rds_instance = {
      identifier     = aws_db_instance.analytics.identifier
      instance_class = aws_db_instance.analytics.instance_class
      engine_version = aws_db_instance.analytics.engine_version
      storage_gb     = aws_db_instance.analytics.allocated_storage
    }
    
    redis_cluster = {
      id         = aws_elasticache_replication_group.analytics.replication_group_id
      node_type  = aws_elasticache_replication_group.analytics.node_type
      num_nodes  = aws_elasticache_replication_group.analytics.num_cache_clusters
    }
    
    load_balancer = {
      name = aws_lb.analytics.name
      type = aws_lb.analytics.load_balancer_type
    }
    
    security_groups = length([
      aws_security_group.app.id,
      aws_security_group.alb.id,
      aws_security_group.rds.id,
      aws_security_group.redis.id
    ])
    
    log_groups = length(aws_cloudwatch_log_group.analytics)
  }
}

# Data source for current AWS region
data "aws_region" "current" {}