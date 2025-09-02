# Claude Configuration System - Terraform Outputs

# VPC and Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

# ECS Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_service_names" {
  description = "Names of the ECS services"
  value       = { for k, v in aws_ecs_service.services : k => v.name }
}

output "ecs_service_arns" {
  description = "ARNs of the ECS services"
  value       = { for k, v in aws_ecs_service.services : k => v.id }
}

output "ecs_task_definition_arns" {
  description = "ARNs of the ECS task definitions"
  value       = { for k, v in aws_ecs_task_definition.services : k => v.arn }
}

# Load Balancer Outputs
output "alb_id" {
  description = "ID of the Application Load Balancer"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_security_group_id" {
  description = "Security group ID of the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "target_group_arns" {
  description = "ARNs of the target groups"
  value       = { for k, v in aws_lb_target_group.services : k => v.arn }
}

# RDS Outputs
output "rds_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "rds_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "Name of the database"
  value       = aws_db_instance.main.db_name
}

output "rds_username" {
  description = "Username for the database"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "rds_proxy_endpoint" {
  description = "Endpoint of the RDS Proxy"
  value       = aws_db_proxy.main.endpoint
  sensitive   = true
}

output "rds_read_replica_endpoint" {
  description = "Endpoint of the RDS read replica (if created)"
  value       = length(aws_db_instance.read_replica) > 0 ? aws_db_instance.read_replica[0].endpoint : null
  sensitive   = true
}

# Redis Outputs
output "redis_primary_endpoint" {
  description = "Primary endpoint of the Redis cluster"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Reader endpoint of the Redis cluster"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Port of the Redis cluster"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_sessions_endpoint" {
  description = "Primary endpoint of the Redis sessions cluster"
  value       = aws_elasticache_replication_group.sessions.primary_endpoint_address
  sensitive   = true
}

# DNS and SSL Outputs
output "domain_name" {
  description = "Domain name for the application"
  value       = "${var.subdomain}.${var.domain_name}"
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

# S3 Outputs
output "s3_config_storage_bucket" {
  description = "Name of the S3 bucket for config storage"
  value       = aws_s3_bucket.config_storage.id
}

output "s3_config_storage_bucket_arn" {
  description = "ARN of the S3 bucket for config storage"
  value       = aws_s3_bucket.config_storage.arn
}

output "s3_alb_logs_bucket" {
  description = "Name of the S3 bucket for ALB logs"
  value       = aws_s3_bucket.alb_logs.id
}

output "s3_cloudfront_logs_bucket" {
  description = "Name of the S3 bucket for CloudFront logs"
  value       = aws_s3_bucket.cloudfront_logs.id
}

# Security Outputs
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.main.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.main.arn
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

# Security Group Outputs
output "ecs_security_group_id" {
  description = "Security group ID for ECS services"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}

# IAM Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

# Secrets Manager Outputs
output "secrets_manager_secret_arns" {
  description = "ARNs of the Secrets Manager secrets"
  value = {
    for k, v in aws_secretsmanager_secret.main : k => v.arn
  }
  sensitive = true
}

output "rds_proxy_secret_arn" {
  description = "ARN of the RDS Proxy secret"
  value       = aws_secretsmanager_secret.rds_proxy.arn
  sensitive   = true
}

output "redis_auth_secret_arn" {
  description = "ARN of the Redis auth token secret"
  value       = aws_secretsmanager_secret.redis_auth.arn
  sensitive   = true
}

# Monitoring Outputs
output "sns_alerts_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "cloudwatch_log_groups" {
  description = "Names of CloudWatch log groups"
  value       = { for k, v in aws_cloudwatch_log_group.ecs : k => v.name }
}

# Application Insights Outputs
output "application_insights_application_arn" {
  description = "ARN of the Application Insights application"
  value       = aws_applicationinsights_application.main.arn
}

# Connection Information for Applications
output "database_connection_info" {
  description = "Database connection information"
  value = {
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    database = aws_db_instance.main.db_name
    username = aws_db_instance.main.username
    # Password is stored in Secrets Manager
    proxy_endpoint = aws_db_proxy.main.endpoint
  }
  sensitive = true
}

output "redis_connection_info" {
  description = "Redis connection information"
  value = {
    primary_endpoint = aws_elasticache_replication_group.main.primary_endpoint_address
    reader_endpoint  = aws_elasticache_replication_group.main.reader_endpoint_address
    port            = aws_elasticache_replication_group.main.port
    # Auth token is stored in Secrets Manager
    sessions_endpoint = aws_elasticache_replication_group.sessions.primary_endpoint_address
  }
  sensitive = true
}

# Environment Variables for ECS Tasks
output "environment_variables" {
  description = "Environment variables for ECS tasks"
  value = {
    AWS_REGION     = var.aws_region
    ENVIRONMENT    = var.environment
    PROJECT_NAME   = var.project_name
    DATABASE_URL   = "postgresql://${var.db_username}@${aws_db_proxy.main.endpoint}:5432/${var.db_name}"
    REDIS_URL      = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
    S3_BUCKET      = aws_s3_bucket.config_storage.id
    KMS_KEY_ID     = aws_kms_key.main.key_id
    DOMAIN_NAME    = "${var.subdomain}.${var.domain_name}"
  }
  sensitive = true
}

# Cost Information
output "estimated_monthly_costs" {
  description = "Estimated monthly costs breakdown (approximate)"
  value = {
    "ECS Fargate (4 services, 2GB RAM average)" = "$~150-300"
    "RDS PostgreSQL (db.t3.medium)"             = "$~50-100"
    "ElastiCache Redis (cache.t3.micro x2)"     = "$~30-60"
    "Application Load Balancer"                  = "$~20"
    "NAT Gateways (2x)"                         = "$~90"
    "CloudFront"                                 = "$~10-50"
    "Route53"                                    = "$~1"
    "KMS"                                        = "$~1"
    "CloudWatch Logs/Metrics"                   = "$~10-30"
    "Total Estimated"                           = "$~360-650/month"
  }
}

# Deployment Information
output "deployment_info" {
  description = "Deployment information and next steps"
  value = {
    terraform_state_bucket = "candlefish-terraform-state"
    state_key             = "claude-config/terraform.tfstate"
    region                = var.aws_region
    
    next_steps = [
      "1. Create ECR repositories for your 4 services (api, analytics, router, monitor)",
      "2. Build and push Docker images to ECR",
      "3. Update Secrets Manager with actual API keys and secrets",
      "4. Configure DNS delegation if using external domain registrar",
      "5. Set up CI/CD pipeline for automated deployments",
      "6. Configure monitoring alerts and notifications",
      "7. Test all services and endpoints",
      "8. Set up backup and disaster recovery procedures"
    ]
    
    important_urls = {
      application_url = "https://${var.subdomain}.${var.domain_name}"
      alb_url         = "https://${aws_lb.main.dns_name}"
      cloudfront_url  = "https://${aws_cloudfront_distribution.main.domain_name}"
      dashboard_url   = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
    }
  }
}