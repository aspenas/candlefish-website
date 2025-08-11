# Outputs for Tyler Setup Platform Infrastructure

# Network Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "target_group_blue_arn" {
  description = "ARN of the blue target group"
  value       = aws_lb_target_group.blue.arn
}

output "target_group_green_arn" {
  description = "ARN of the green target group"
  value       = aws_lb_target_group.green.arn
}

output "target_group_websocket_arn" {
  description = "ARN of the WebSocket target group"
  value       = aws_lb_target_group.websocket.arn
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

output "ecs_service_blue_name" {
  description = "Name of the blue ECS service"
  value       = aws_ecs_service.blue.name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.app.arn
}

# ECR Outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.app.name
}

# Database Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "database_username" {
  description = "Database username"
  value       = aws_db_instance.main.username
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

# S3 Outputs
output "frontend_bucket_name" {
  description = "Name of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_bucket_domain_name" {
  description = "Domain name of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend.bucket_domain_name
}

output "cloudtrail_bucket_name" {
  description = "Name of the CloudTrail S3 bucket"
  value       = aws_s3_bucket.cloudtrail.bucket
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

# Route53 Outputs
output "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "hosted_zone_name_servers" {
  description = "Route53 hosted zone name servers"
  value       = aws_route53_zone.main.name_servers
}

# SSL Certificate Outputs
output "ssl_certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = aws_acm_certificate.main.arn
}

output "ssl_certificate_domain_validation_options" {
  description = "Domain validation options for the SSL certificate"
  value       = aws_acm_certificate.main.domain_validation_options
}

# Security Outputs
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.main.id
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

# Secrets Manager Outputs
output "database_secret_arn" {
  description = "ARN of the database connection secret"
  value       = aws_secretsmanager_secret.database_url.arn
}

output "redis_secret_arn" {
  description = "ARN of the Redis connection secret"
  value       = aws_secretsmanager_secret.redis_url.arn
}

output "claude_api_key_secret_arn" {
  description = "ARN of the Claude API key secret"
  value       = aws_secretsmanager_secret.claude_api_key.arn
}

output "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "encryption_key_secret_arn" {
  description = "ARN of the encryption key secret"
  value       = aws_secretsmanager_secret.encryption_key.arn
}

# DynamoDB Outputs
output "sessions_table_name" {
  description = "Name of the sessions DynamoDB table"
  value       = aws_dynamodb_table.sessions.name
}

output "sessions_table_arn" {
  description = "ARN of the sessions DynamoDB table"
  value       = aws_dynamodb_table.sessions.arn
}

output "websocket_connections_table_name" {
  description = "Name of the WebSocket connections DynamoDB table"
  value       = aws_dynamodb_table.websocket_connections.name
}

output "websocket_connections_table_arn" {
  description = "ARN of the WebSocket connections DynamoDB table"
  value       = aws_dynamodb_table.websocket_connections.arn
}

output "real_time_events_table_name" {
  description = "Name of the real-time events DynamoDB table"
  value       = aws_dynamodb_table.real_time_events.name
}

output "real_time_events_table_arn" {
  description = "ARN of the real-time events DynamoDB table"
  value       = aws_dynamodb_table.real_time_events.arn
}

# Monitoring Outputs
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "sns_alerts_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

# IAM Role Outputs
output "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

# Domain Outputs
output "domain_name" {
  description = "Primary domain name"
  value       = var.domain_name
}

output "api_domain_name" {
  description = "API domain name"
  value       = var.api_domain_name
}

output "websocket_domain_name" {
  description = "WebSocket domain name"
  value       = "ws.${var.domain_name}"
}

# Application URLs
output "application_url" {
  description = "Primary application URL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API base URL"
  value       = "https://${var.api_domain_name}"
}

output "graphql_url" {
  description = "GraphQL endpoint URL"
  value       = "https://${var.api_domain_name}/graphql"
}

output "websocket_url" {
  description = "WebSocket endpoint URL"
  value       = "wss://ws.${var.domain_name}:8080"
}

# Security Group IDs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app.id
}

output "database_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.database.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

# Lambda Outputs
output "secret_rotation_lambda_arn" {
  description = "ARN of the secret rotation Lambda function"
  value       = aws_lambda_function.secret_rotation.arn
}

# Deployment Information
output "deployment_summary" {
  description = "Summary of deployment configuration"
  value = {
    environment             = var.environment
    project_name           = var.project_name
    aws_region             = var.aws_region
    availability_zones     = var.availability_zones
    app_count              = var.app_count
    min_capacity           = var.min_capacity
    max_capacity           = var.max_capacity
    db_instance_class      = var.db_instance_class
    redis_node_type        = var.redis_node_type
    enable_blue_green      = var.enable_blue_green
    enable_websockets      = var.enable_websockets
    enable_analytics       = var.enable_analytics
    cloudfront_price_class = var.cloudfront_price_class
  }
}

# Connection Strings (for application configuration)
output "application_config" {
  description = "Application configuration values"
  value = {
    database_secret_name = aws_secretsmanager_secret.database_url.name
    redis_secret_name    = aws_secretsmanager_secret.redis_url.name
    claude_secret_name   = aws_secretsmanager_secret.claude_api_key.name
    jwt_secret_name      = aws_secretsmanager_secret.jwt_secret.name
    encryption_key_name  = aws_secretsmanager_secret.encryption_key.name
    sessions_table       = aws_dynamodb_table.sessions.name
    websocket_table      = aws_dynamodb_table.websocket_connections.name
    events_table         = aws_dynamodb_table.real_time_events.name
    log_group           = aws_cloudwatch_log_group.ecs.name
    kms_key_id          = aws_kms_key.main.id
  }
  sensitive = false
}

# Health Check URLs
output "health_check_urls" {
  description = "Health check endpoints"
  value = {
    alb_health        = "https://${aws_lb.main.dns_name}/health"
    api_health        = "https://${var.api_domain_name}/health"
    websocket_health  = "https://ws.${var.domain_name}:8080/ws/health"
    frontend_health   = "https://${var.domain_name}/health"
  }
}

# Cost Estimation Information
output "estimated_monthly_costs" {
  description = "Estimated monthly costs breakdown"
  value = {
    fargate_ecs      = "~$50-150 (depending on usage)"
    rds_postgresql   = "~$25-100 (${var.db_instance_class})"
    elasticache_redis = "~$15-50 (${var.redis_node_type})"
    alb              = "~$25"
    cloudfront       = "~$5-20 (depending on traffic)"
    route53          = "~$0.50"
    secrets_manager  = "~$5-15"
    cloudwatch       = "~$10-30"
    s3_storage       = "~$5-20"
    data_transfer    = "~$10-50"
    total_estimated  = "~$150-500/month"
    note            = "Costs vary based on traffic, storage, and feature usage"
  }
}
