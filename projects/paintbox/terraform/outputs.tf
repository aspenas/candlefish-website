# Terraform Outputs for Paintbox Infrastructure

# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.paintbox.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.paintbox.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.paintbox.id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = aws_nat_gateway.paintbox[*].id
}

# Security Group Outputs
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

# Database Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.paintbox.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.paintbox.port
}

output "database_name" {
  description = "RDS database name"
  value       = aws_db_instance.paintbox.db_name
}

output "database_username" {
  description = "RDS database username"
  value       = aws_db_instance.paintbox.username
  sensitive   = true
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.paintbox.configuration_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_replication_group.paintbox.port
}

# KMS Outputs
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.paintbox.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.paintbox.arn
}

output "kms_alias_name" {
  description = "Name of the KMS key alias"
  value       = aws_kms_alias.paintbox.name
}

# Secrets Manager Outputs
output "secrets_manager_secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.paintbox_secrets.arn
}

output "secrets_manager_secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.paintbox_secrets.name
}

# IAM Outputs
output "app_role_arn" {
  description = "ARN of the application IAM role"
  value       = aws_iam_role.paintbox_app.arn
}

output "app_role_name" {
  description = "Name of the application IAM role"
  value       = aws_iam_role.paintbox_app.name
}

# CloudWatch Outputs
output "app_log_group_name" {
  description = "Name of the application CloudWatch log group"
  value       = aws_cloudwatch_log_group.paintbox_app.name
}

output "api_log_group_name" {
  description = "Name of the API CloudWatch log group"
  value       = aws_cloudwatch_log_group.paintbox_api.name
}

# Environment Outputs
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS account ID"
  value       = local.account_id
}

# Connection Strings for Applications
output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${aws_db_instance.paintbox.username}:${var.db_password}@${aws_db_instance.paintbox.endpoint}:${aws_db_instance.paintbox.port}/${aws_db_instance.paintbox.db_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${aws_elasticache_replication_group.paintbox.configuration_endpoint_address}:${aws_elasticache_replication_group.paintbox.port}"
  sensitive   = true
}

# Deployment Information
output "deployment_info" {
  description = "Key deployment information"
  value = {
    environment                = var.environment
    region                    = var.aws_region
    vpc_id                    = aws_vpc.paintbox.id
    secrets_manager_secret    = aws_secretsmanager_secret.paintbox_secrets.name
    kms_key_alias            = aws_kms_alias.paintbox.name
    app_role_arn             = aws_iam_role.paintbox_app.arn
    database_endpoint        = aws_db_instance.paintbox.endpoint
    redis_endpoint           = aws_elasticache_replication_group.paintbox.configuration_endpoint_address
  }
  sensitive = true
}
