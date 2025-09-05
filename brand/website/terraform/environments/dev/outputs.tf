# Development Environment Outputs

# ============================================
# Environment Information
# ============================================
output "environment" {
  description = "Environment name"
  value       = "dev"
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# ============================================
# Networking Outputs
# ============================================
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.networking.vpc_cidr_block
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnets
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnets
}

output "database_subnets" {
  description = "Database subnet IDs"
  value       = module.networking.database_subnets
}

output "nat_gateway_ips" {
  description = "NAT Gateway public IPs"
  value       = module.networking.nat_public_ips
}

# ============================================
# Application Outputs
# ============================================
output "application_url" {
  description = "Application URL"
  value       = module.cdn.custom_domain_url
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = module.compute.load_balancer_dns_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.distribution_id
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = module.cdn.cloudfront_url
}

# ============================================
# Database and Storage Outputs
# ============================================
output "s3_buckets" {
  description = "S3 bucket names"
  value       = module.storage.s3_bucket_ids
}

output "dynamodb_tables" {
  description = "DynamoDB table names"
  value       = module.storage.dynamodb_table_names
}

output "elasticache_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.storage.elasticache_primary_endpoint
}

# ============================================
# Security Outputs
# ============================================
output "kms_key_ids" {
  description = "KMS key IDs"
  value       = module.security.kms_key_ids
}

output "secret_arns" {
  description = "Secrets Manager secret ARNs"
  value       = module.security.secret_arns
  sensitive   = true
}

output "security_group_ids" {
  description = "Security group IDs"
  value       = module.security.security_group_ids
}

# ============================================
# Monitoring Outputs
# ============================================
output "cloudwatch_dashboard_urls" {
  description = "CloudWatch dashboard URLs"
  value       = module.monitoring.dashboard_urls
}

output "log_group_names" {
  description = "CloudWatch log group names"
  value       = module.monitoring.log_group_names
}

output "sns_topic_arns" {
  description = "SNS topic ARNs for alerts"
  value       = module.monitoring.sns_topic_arns
}

# ============================================
# Cost Optimization Outputs
# ============================================
output "cost_optimization_summary" {
  description = "Cost optimization configuration summary"
  value = {
    single_nat_gateway     = true
    spot_instances_enabled = true
    minimal_monitoring     = true
    short_log_retention   = "7 days"
    auto_shutdown_enabled = true
    estimated_monthly_cost = "$50-100"
    
    cost_saving_features = [
      "Single NAT Gateway",
      "FARGATE_SPOT instances",
      "Minimal CloudWatch monitoring",
      "Short log retention",
      "No CloudTrail or GuardDuty",
      "Basic ElastiCache instance",
      "No Aurora database"
    ]
  }
}

# ============================================
# Developer Access Information
# ============================================
output "developer_access" {
  description = "Information for developers"
  value = {
    environment_type = "development"
    
    access_endpoints = {
      application     = module.cdn.custom_domain_url
      load_balancer  = "https://${module.compute.load_balancer_dns_name}"
      monitoring     = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}"
    }
    
    development_features = {
      debug_logging     = true
      detailed_errors   = true
      hot_reload       = "configured"
      experimental_features = var.enable_experimental_features
    }
    
    database_connections = {
      redis_endpoint = module.storage.elasticache_primary_endpoint
      redis_port     = 6379
    }
    
    deployment_info = {
      container_platform = "ECS Fargate"
      scaling_mode      = "auto-scaling enabled"
      deployment_strategy = "rolling updates"
      spot_instances    = "100% spot allocation"
    }
  }
}

# ============================================
# Resource Management
# ============================================
output "resource_management" {
  description = "Resource management information"
  value = {
    auto_shutdown = {
      enabled  = true
      schedule = var.auto_shutdown_schedule
    }
    
    auto_startup = {
      enabled  = true
      schedule = var.auto_startup_schedule
    }
    
    cleanup_policy = {
      force_delete_enabled = var.force_delete_resources
      log_retention_days  = 7
      backup_retention    = "minimal"
    }
    
    tagging_strategy = {
      environment    = "dev"
      cost_center   = "development"
      auto_shutdown = "enabled"
      managed_by    = "terraform"
    }
  }
}

# ============================================
# Integration Information
# ============================================
output "integration_data" {
  description = "Data for integration with other systems"
  value = {
    infrastructure = {
      vpc_id            = module.networking.vpc_id
      private_subnets   = module.networking.private_subnets
      security_groups   = module.security.security_group_ids
      kms_key_arn      = module.security.kms_key_arns["general"]
    }
    
    application = {
      cluster_name     = module.compute.cluster_name
      service_names    = keys(module.compute.service_names)
      load_balancer_arn = module.compute.load_balancer_arn
    }
    
    storage = {
      s3_buckets       = module.storage.s3_bucket_ids
      dynamodb_tables  = module.storage.dynamodb_table_names
      cache_endpoint   = module.storage.elasticache_primary_endpoint
    }
    
    monitoring = {
      log_groups      = module.monitoring.log_group_names
      alert_topics    = module.monitoring.sns_topic_arns
      dashboards      = keys(module.monitoring.dashboard_names)
    }
  }
  
  sensitive = true
}