# Storage Module Outputs
# Comprehensive outputs for S3, DynamoDB, ElastiCache, and Aurora

# ============================================
# S3 Bucket Outputs
# ============================================
output "s3_bucket_ids" {
  description = "S3 bucket IDs"
  value       = { for k, v in aws_s3_bucket.main : k => v.id }
}

output "s3_bucket_arns" {
  description = "S3 bucket ARNs"
  value       = { for k, v in aws_s3_bucket.main : k => v.arn }
}

output "s3_bucket_domain_names" {
  description = "S3 bucket domain names"
  value       = { for k, v in aws_s3_bucket.main : k => v.bucket_domain_name }
}

output "s3_bucket_regional_domain_names" {
  description = "S3 bucket regional domain names"
  value       = { for k, v in aws_s3_bucket.main : k => v.bucket_regional_domain_name }
}

output "s3_website_endpoints" {
  description = "S3 website endpoints"
  value       = { for k, v in aws_s3_bucket_website_configuration.main : k => v.website_endpoint }
}

output "s3_replica_bucket_ids" {
  description = "S3 replica bucket IDs for cross-region replication"
  value       = var.enable_cross_region_replication ? { for k, v in aws_s3_bucket.replica : k => v.id } : {}
}

# ============================================
# DynamoDB Outputs
# ============================================
output "dynamodb_table_names" {
  description = "DynamoDB table names"
  value       = { for k, v in aws_dynamodb_table.main : k => v.name }
}

output "dynamodb_table_arns" {
  description = "DynamoDB table ARNs"
  value       = { for k, v in aws_dynamodb_table.main : k => v.arn }
}

output "dynamodb_table_ids" {
  description = "DynamoDB table IDs"
  value       = { for k, v in aws_dynamodb_table.main : k => v.id }
}

output "dynamodb_table_stream_arns" {
  description = "DynamoDB table stream ARNs"
  value       = { for k, v in aws_dynamodb_table.main : k => v.stream_arn }
}

output "dynamodb_global_secondary_indexes" {
  description = "DynamoDB Global Secondary Index information"
  value = {
    for table_key, table in aws_dynamodb_table.main : table_key => [
      for gsi in table.global_secondary_index : {
        name = gsi.name
        hash_key = gsi.hash_key
        range_key = gsi.range_key
        projection_type = gsi.projection_type
      }
    ]
  }
}

# ============================================
# ElastiCache Outputs
# ============================================
output "elasticache_cluster_id" {
  description = "ElastiCache cluster ID"
  value       = var.elasticache_config.enabled ? aws_elasticache_replication_group.main[0].id : null
}

output "elasticache_cluster_arn" {
  description = "ElastiCache cluster ARN"
  value       = var.elasticache_config.enabled ? aws_elasticache_replication_group.main[0].arn : null
}

output "elasticache_primary_endpoint" {
  description = "ElastiCache primary endpoint"
  value       = var.elasticache_config.enabled ? aws_elasticache_replication_group.main[0].primary_endpoint_address : null
}

output "elasticache_reader_endpoint" {
  description = "ElastiCache reader endpoint"
  value       = var.elasticache_config.enabled ? aws_elasticache_replication_group.main[0].reader_endpoint_address : null
}

output "elasticache_configuration_endpoint" {
  description = "ElastiCache configuration endpoint"
  value       = var.elasticache_config.enabled ? aws_elasticache_replication_group.main[0].configuration_endpoint_address : null
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = var.elasticache_config.enabled ? var.elasticache_config.port : null
}

output "elasticache_auth_token" {
  description = "ElastiCache auth token (if enabled)"
  value       = var.elasticache_config.enabled && var.elasticache_config.auth_token != null ? "*** (stored in terraform state)" : null
  sensitive   = true
}

# ============================================
# Aurora Outputs
# ============================================
output "aurora_cluster_id" {
  description = "Aurora cluster ID"
  value       = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].id : null
}

output "aurora_cluster_arn" {
  description = "Aurora cluster ARN"
  value       = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].arn : null
}

output "aurora_cluster_endpoint" {
  description = "Aurora cluster endpoint"
  value       = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].endpoint : null
}

output "aurora_cluster_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].reader_endpoint : null
}

output "aurora_cluster_port" {
  description = "Aurora cluster port"
  value       = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].port : null
}

output "aurora_cluster_database_name" {
  description = "Aurora cluster database name"
  value       = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].database_name : null
}

output "aurora_cluster_master_username" {
  description = "Aurora cluster master username"
  value       = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].master_username : null
}

output "aurora_password_secret_arn" {
  description = "Aurora password secret ARN"
  value       = var.aurora_config.enabled ? aws_secretsmanager_secret.aurora_password[0].arn : null
}

output "aurora_instance_endpoints" {
  description = "Aurora instance endpoints"
  value       = var.aurora_config.enabled ? [for instance in aws_rds_cluster_instance.aurora : instance.endpoint] : []
}

# ============================================
# Security and Networking Outputs
# ============================================
output "security_group_ids" {
  description = "Security group IDs"
  value = {
    elasticache = var.elasticache_config.enabled ? aws_security_group.elasticache[0].id : null
    aurora     = var.aurora_config.enabled ? aws_security_group.aurora[0].id : null
  }
}

output "subnet_group_names" {
  description = "Subnet group names"
  value = {
    elasticache = var.elasticache_config.enabled ? aws_elasticache_subnet_group.main[0].name : null
    aurora     = var.aurora_config.enabled ? aws_db_subnet_group.aurora[0].name : null
  }
}

# ============================================
# KMS and Encryption Outputs
# ============================================
output "kms_key_arn" {
  description = "KMS key ARN used for encryption"
  value       = local.kms_key_arn
}

output "kms_key_id" {
  description = "KMS key ID used for encryption"
  value       = var.kms_key_arn == null ? aws_kms_key.storage[0].key_id : null
}

output "kms_alias" {
  description = "KMS key alias"
  value       = var.kms_key_arn == null ? aws_kms_alias.storage[0].name : null
}

# ============================================
# Connection Strings and Configuration
# ============================================
output "connection_info" {
  description = "Connection information for all storage services"
  value = {
    elasticache = var.elasticache_config.enabled ? {
      endpoint = aws_elasticache_replication_group.main[0].primary_endpoint_address
      port     = var.elasticache_config.port
      url      = "redis://${aws_elasticache_replication_group.main[0].primary_endpoint_address}:${var.elasticache_config.port}"
    } : null
    
    aurora = var.aurora_config.enabled ? {
      endpoint = aws_rds_cluster.aurora[0].endpoint
      port     = aws_rds_cluster.aurora[0].port
      database = aws_rds_cluster.aurora[0].database_name
      username = aws_rds_cluster.aurora[0].master_username
      url      = "postgresql://${aws_rds_cluster.aurora[0].master_username}@${aws_rds_cluster.aurora[0].endpoint}:${aws_rds_cluster.aurora[0].port}/${aws_rds_cluster.aurora[0].database_name}"
    } : null
  }
  
  sensitive = true
}

# ============================================
# Cost Optimization Summary
# ============================================
output "cost_optimization_summary" {
  description = "Cost optimization configuration summary"
  value = {
    s3_lifecycle_rules_enabled = length([for k, v in var.s3_buckets : k if v.lifecycle_rules_enabled])
    s3_intelligent_tiering     = "Enabled via lifecycle rules"
    dynamodb_billing_mode      = { for k, v in var.dynamodb_tables : k => v.billing_mode }
    elasticache_node_type      = var.elasticache_config.enabled ? var.elasticache_config.node_type : null
    aurora_serverless_enabled  = var.aurora_config.enabled
    cross_region_replication   = var.enable_cross_region_replication
    estimated_monthly_cost = {
      s3_storage        = "$10-50 (depending on usage)"
      dynamodb         = "Pay-per-request (cost scales with usage)"
      elasticache      = var.elasticache_config.enabled ? "$15-100/month (${var.elasticache_config.node_type})" : "$0"
      aurora_serverless = var.aurora_config.enabled ? "$15-200/month (scales with usage)" : "$0"
    }
  }
}

# ============================================
# Performance Configuration
# ============================================
output "performance_configuration" {
  description = "Performance configuration summary"
  value = {
    s3_transfer_acceleration   = "Available (can be enabled per bucket)"
    s3_multipart_uploads      = "Automatically managed"
    dynamodb_autoscaling      = length([for k, v in var.dynamodb_tables : k if v.autoscaling != null])
    elasticache_engine_version = var.elasticache_config.enabled ? var.elasticache_config.engine_version : null
    aurora_serverless_scaling = var.aurora_config.enabled ? {
      min_capacity = var.aurora_config.serverlessv2_scaling_configuration.min_capacity
      max_capacity = var.aurora_config.serverlessv2_scaling_configuration.max_capacity
    } : null
  }
}

# ============================================
# Backup and Recovery Information
# ============================================
output "backup_configuration" {
  description = "Backup and recovery configuration"
  value = {
    s3_versioning = { for k, v in var.s3_buckets : k => v.versioning_enabled }
    s3_cross_region_replication = var.enable_cross_region_replication
    dynamodb_point_in_time_recovery = { for k, v in var.dynamodb_tables : k => v.point_in_time_recovery }
    elasticache_backup_retention = var.elasticache_config.enabled ? var.elasticache_config.backup_retention_period : null
    aurora_backup_retention = var.aurora_config.enabled ? var.aurora_config.backup_retention_period : null
    backup_region = var.enable_cross_region_replication ? var.backup_region : null
  }
}

# ============================================
# Integration Data
# ============================================
output "integration_data" {
  description = "Data for integration with other modules"
  value = {
    vpc_id = var.vpc_id
    private_subnet_ids = var.private_subnet_ids
    environment = var.environment
    project_name = var.project_name
    kms_key_arn = local.kms_key_arn
    
    storage_endpoints = {
      s3_buckets = { for k, v in aws_s3_bucket.main : k => v.bucket_domain_name }
      dynamodb_tables = { for k, v in aws_dynamodb_table.main : k => v.name }
      elasticache = var.elasticache_config.enabled ? aws_elasticache_replication_group.main[0].primary_endpoint_address : null
      aurora = var.aurora_config.enabled ? aws_rds_cluster.aurora[0].endpoint : null
    }
    
    security_groups = {
      elasticache = var.elasticache_config.enabled ? aws_security_group.elasticache[0].id : null
      aurora = var.aurora_config.enabled ? aws_security_group.aurora[0].id : null
    }
  }
}

# ============================================
# Monitoring Endpoints
# ============================================
output "monitoring_endpoints" {
  description = "Endpoints and metrics for monitoring integration"
  value = {
    cloudwatch_log_groups = {
      aurora = var.aurora_config.enabled ? "/aws/rds/cluster/${aws_rds_cluster.aurora[0].cluster_identifier}/postgresql" : null
    }
    
    metrics_namespaces = {
      s3        = "AWS/S3"
      dynamodb  = "AWS/DynamoDB"
      elasticache = "AWS/ElastiCache"
      rds       = "AWS/RDS"
    }
    
    alarm_dimensions = {
      s3_buckets = { for k, v in aws_s3_bucket.main : k => { "BucketName" = v.id } }
      dynamodb_tables = { for k, v in aws_dynamodb_table.main : k => { "TableName" = v.name } }
      elasticache = var.elasticache_config.enabled ? { "CacheClusterId" = aws_elasticache_replication_group.main[0].id } : null
      aurora = var.aurora_config.enabled ? { "DBClusterIdentifier" = aws_rds_cluster.aurora[0].cluster_identifier } : null
    }
  }
}