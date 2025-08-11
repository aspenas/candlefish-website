# Outputs for Candlefish Collaboration System Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnets
}

output "nat_gateway_ips" {
  description = "Public IPs of the NAT Gateways"
  value       = module.vpc.nat_public_ips
}

# EKS Cluster Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "cluster_platform_version" {
  description = "Platform version for the EKS cluster"
  value       = module.eks.cluster_platform_version
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "node_security_group_id" {
  description = "ID of the EKS node shared security group"
  value       = module.eks.node_security_group_id
}

output "eks_managed_node_groups" {
  description = "Map of attribute maps for all EKS managed node groups created"
  value       = module.eks.eks_managed_node_groups
  sensitive   = true
}

# Database Outputs
output "db_instance_address" {
  description = "RDS instance hostname"
  value       = aws_db_instance.collaboration.address
  sensitive   = true
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.collaboration.endpoint
  sensitive   = true
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.collaboration.port
}

output "db_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.collaboration.id
}

output "db_instance_name" {
  description = "RDS database name"
  value       = aws_db_instance.collaboration.db_name
}

output "db_instance_username" {
  description = "RDS instance master username"
  value       = aws_db_instance.collaboration.username
  sensitive   = true
}

output "db_read_replica_endpoints" {
  description = "RDS read replica endpoints"
  value       = aws_db_instance.collaboration_read_replica[*].endpoint
  sensitive   = true
}

output "db_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

# Redis Outputs
output "redis_primary_endpoint" {
  description = "Primary endpoint for Redis cluster"
  value       = aws_elasticache_replication_group.collaboration.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Reader endpoint for Redis cluster"
  value       = aws_elasticache_replication_group.collaboration.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Port number for Redis"
  value       = aws_elasticache_replication_group.collaboration.port
}

output "redis_cluster_endpoint" {
  description = "Configuration endpoint for Redis cluster mode"
  value       = var.redis_cluster_mode_enabled ? aws_elasticache_replication_group.collaboration_cluster[0].configuration_endpoint_address : null
  sensitive   = true
}

output "redis_security_group_id" {
  description = "Security group ID for ElastiCache"
  value       = aws_security_group.elasticache.id
}

# S3 Outputs
output "s3_document_bucket_name" {
  description = "Name of the S3 bucket for document storage"
  value       = aws_s3_bucket.documents.id
}

output "s3_document_bucket_arn" {
  description = "ARN of the S3 bucket for document storage"
  value       = aws_s3_bucket.documents.arn
}

output "s3_document_bucket_domain_name" {
  description = "Bucket domain name for document storage"
  value       = aws_s3_bucket.documents.bucket_domain_name
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = var.cloudfront_enabled ? aws_cloudfront_distribution.assets[0].id : null
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = var.cloudfront_enabled ? aws_cloudfront_distribution.assets[0].domain_name : null
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront Route 53 zone ID"
  value       = var.cloudfront_enabled ? aws_cloudfront_distribution.assets[0].hosted_zone_id : null
}

# ALB Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.collaboration.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.collaboration.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.collaboration.arn
}

# Security Outputs
output "kms_key_id" {
  description = "ID of the KMS key used for encryption"
  value       = aws_kms_key.collaboration.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for encryption"
  value       = aws_kms_key.collaboration.arn
}

# Secrets Manager Outputs
output "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

output "redis_credentials_secret_arn" {
  description = "ARN of the Redis credentials secret"
  value       = aws_secretsmanager_secret.redis_credentials.arn
  sensitive   = true
}

output "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
  sensitive   = true
}

output "encryption_key_secret_arn" {
  description = "ARN of the encryption key secret"
  value       = aws_secretsmanager_secret.encryption_key.arn
  sensitive   = true
}

# IAM Outputs
output "eks_node_group_role_arn" {
  description = "ARN of the EKS node group IAM role"
  value       = module.eks.eks_managed_node_groups["general"]["iam_role_arn"]
}

output "worker_iam_role_name" {
  description = "Name of the worker IAM role"
  value       = aws_iam_role.collaboration_worker.name
}

output "worker_iam_role_arn" {
  description = "ARN of the worker IAM role"
  value       = aws_iam_role.collaboration_worker.arn
}

# Monitoring Outputs
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_log_group_names" {
  description = "Names of CloudWatch log groups"
  value = [
    aws_cloudwatch_log_group.postgresql.name,
    aws_cloudwatch_log_group.upgrade.name,
    aws_cloudwatch_log_group.redis_slow_log.name,
    aws_cloudwatch_log_group.application.name
  ]
}

# WAF Outputs
output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = var.waf_enabled ? aws_wafv2_web_acl.collaboration[0].arn : null
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = var.waf_enabled ? aws_wafv2_web_acl.collaboration[0].id : null
}

# Route53 Outputs
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.collaboration.zone_id
}

output "route53_zone_name" {
  description = "Route53 hosted zone name"
  value       = aws_route53_zone.collaboration.name
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = aws_route53_zone.collaboration.name_servers
}

# Application URLs
output "collaboration_editor_url" {
  description = "URL for the collaboration editor"
  value       = "https://${var.app_subdomain}.${var.app_domain}"
}

output "graphql_api_url" {
  description = "URL for the GraphQL API"
  value       = "https://${var.api_subdomain}.${var.app_domain}/graphql"
}

output "websocket_url" {
  description = "URL for WebSocket connections"
  value       = "wss://${var.ws_subdomain}.${var.app_domain}"
}

output "cdn_url" {
  description = "URL for CDN/static assets"
  value       = var.cloudfront_enabled ? "https://${var.cdn_subdomain}.${var.app_domain}" : null
}

# Kubernetes Configuration
output "kubectl_config" {
  description = "kubectl config as a string"
  value = templatefile("${path.module}/kubectl_config.yaml.tpl", {
    cluster_name     = module.eks.cluster_name
    cluster_endpoint = module.eks.cluster_endpoint
    cluster_ca_data  = module.eks.cluster_certificate_authority_data
    aws_region       = var.aws_region
  })
  sensitive = true
}

# Environment Information
output "environment" {
  description = "Current environment"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

# Cost Information
output "estimated_monthly_cost" {
  description = "Estimated monthly cost (USD) - rough calculation"
  value = {
    eks_cluster    = 73  # $0.10 per hour
    rds_instance   = var.db_instance_class == "db.r6g.large" ? 182 : 0  # Approximate
    redis_cluster  = var.redis_node_type == "cache.r7g.large" ? 146 * var.redis_num_cache_nodes : 0
    nat_gateways   = 45 * length(module.vpc.private_subnets)  # $0.045 per hour per NAT gateway
    load_balancer  = 23  # ALB pricing
    data_transfer  = "variable"
    storage        = "variable"
    total_fixed    = 73 + 182 + (146 * var.redis_num_cache_nodes) + (45 * length(module.vpc.private_subnets)) + 23
  }
}

# Deployment Information
output "deployment_info" {
  description = "Information about the deployment"
  value = {
    terraform_version = terraform.version
    timestamp        = timestamp()
    git_commit       = try(file("${path.module}/.git/HEAD"), "unknown")
    deployment_id    = random_id.deployment.hex
  }
}

resource "random_id" "deployment" {
  byte_length = 4
}
