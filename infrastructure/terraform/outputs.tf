# Terraform Outputs for Candlefish AI Infrastructure

#============================================================================
# Cluster Information
#============================================================================

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_version" {
  description = "The Kubernetes server version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "cluster_platform_version" {
  description = "Platform version for the EKS cluster"
  value       = module.eks.cluster_platform_version
}

output "cluster_status" {
  description = "Status of the EKS cluster. One of `CREATING`, `ACTIVE`, `DELETING`, `FAILED`"
  value       = module.eks.cluster_status
}

output "cluster_primary_security_group_id" {
  description = "The cluster primary security group ID created by EKS"
  value       = module.eks.cluster_primary_security_group_id
}

#============================================================================
# Node Group Information
#============================================================================

output "node_groups" {
  description = "Map of attribute maps for all EKS managed node groups created"
  value       = module.eks.eks_managed_node_groups
  sensitive   = true
}

output "node_security_group_id" {
  description = "ID of the node shared security group"
  value       = module.eks.node_security_group_id
}

output "node_security_group_arn" {
  description = "Amazon Resource Name (ARN) of the node shared security group"
  value       = module.eks.node_security_group_arn
}

#============================================================================
# OIDC Provider
#============================================================================

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider for IRSA"
  value       = module.eks.oidc_provider_arn
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

#============================================================================
# VPC Information
#============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_arn" {
  description = "The ARN of the VPC"
  value       = module.vpc.vpc_arn
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "nat_public_ips" {
  description = "List of public Elastic IPs created for AWS NAT Gateway"
  value       = module.vpc.nat_public_ips
}

#============================================================================
# Database Information
#============================================================================

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgresql.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.postgresql.port
}

output "database_name" {
  description = "RDS instance database name"
  value       = aws_db_instance.postgresql.db_name
}

output "database_username" {
  description = "RDS instance master username"
  value       = aws_db_instance.postgresql.username
  sensitive   = true
}

output "database_engine_version" {
  description = "RDS instance engine version"
  value       = aws_db_instance.postgresql.engine_version_actual
}

output "database_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.postgresql.arn
}

#============================================================================
# Cache Information
#============================================================================

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_arn" {
  description = "Redis replication group ARN"
  value       = aws_elasticache_replication_group.redis.arn
}

#============================================================================
# Security Information
#============================================================================

output "kms_key_id" {
  description = "The globally unique identifier for the KMS key"
  value       = aws_kms_key.eks.key_id
}

output "kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the KMS key"
  value       = aws_kms_key.eks.arn
}

output "secrets_manager_secret_arn" {
  description = "ARN of the secrets manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

#============================================================================
# Storage Information
#============================================================================

output "s3_bucket_name" {
  description = "Name of the S3 bucket for assets"
  value       = aws_s3_bucket.assets.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for assets"
  value       = aws_s3_bucket.assets.arn
}

output "s3_bucket_domain_name" {
  description = "The bucket domain name"
  value       = aws_s3_bucket.assets.bucket_domain_name
}

output "s3_bucket_regional_domain_name" {
  description = "The bucket region-specific domain name"
  value       = aws_s3_bucket.assets.bucket_regional_domain_name
}

#============================================================================
# IAM Information
#============================================================================

output "service_account_role_arn" {
  description = "IAM role ARN for Kubernetes service accounts"
  value       = module.candlefish_irsa.iam_role_arn
}

output "service_account_role_name" {
  description = "IAM role name for Kubernetes service accounts"
  value       = module.candlefish_irsa.iam_role_name
}

output "eks_admins_role_arn" {
  description = "IAM role ARN for EKS administrators"
  value       = module.eks_admins_iam_role.iam_role_arn
}

#============================================================================
# Monitoring Information
#============================================================================

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name for applications"
  value       = aws_cloudwatch_log_group.application.name
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN for applications"
  value       = aws_cloudwatch_log_group.application.arn
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = var.environment == "production" ? aws_sns_topic.alerts[0].arn : null
}

#============================================================================
# Cost Information
#============================================================================

output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown (approximate)"
  value = {
    eks_cluster        = "$75"  # EKS cluster management fee
    ec2_instances      = var.environment == "production" ? "$200-400" : "$50-150"
    rds_database      = var.environment == "production" ? "$100-200" : "$20-50"
    elasticache       = var.environment == "production" ? "$50-100" : "$10-30"
    data_transfer     = "$10-50"
    storage           = "$20-100"
    load_balancer     = "$25"
    other_services    = "$20-50"
    total_estimate    = var.environment == "production" ? "$500-1000" : "$200-400"
  }
}

#============================================================================
# Connection Information
#============================================================================

output "kubectl_config_command" {
  description = "Command to update kubectl config"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "database_connection_string" {
  description = "Database connection string template"
  value       = "postgresql://${aws_db_instance.postgresql.username}:<password>@${aws_db_instance.postgresql.endpoint}/${aws_db_instance.postgresql.db_name}"
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string template"
  value       = "redis://:<auth_token>@${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}/0"
  sensitive   = true
}

#============================================================================
# Environment Information
#============================================================================

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "availability_zones" {
  description = "Availability zones used"
  value       = local.availability_zones
}

#============================================================================
# Application URLs (for reference)
#============================================================================

output "application_urls" {
  description = "Application URLs (update with actual load balancer DNS)"
  value = {
    main_website      = "https://${var.domain_name}"
    api_endpoint     = "https://api.${var.domain_name}"
    analytics        = "https://analytics.${var.domain_name}"
    paintbox         = "https://paintbox.${var.domain_name}"
    brand_portal     = "https://brand.${var.domain_name}"
  }
}

#============================================================================
# Deployment Information
#============================================================================

output "deployment_info" {
  description = "Important deployment information"
  value = {
    cluster_name          = module.eks.cluster_name
    namespace            = "${local.project_name}-${local.environment}"
    service_account_name = "candlefish-service-account"
    helm_chart_name      = "candlefish"
    image_registry       = "ghcr.io/candlefish-ai"
  }
}

#============================================================================
# Security Group IDs (for application configuration)
#============================================================================

output "security_group_ids" {
  description = "Security group IDs for application configuration"
  value = {
    eks_cluster  = aws_security_group.eks_cluster.id
    rds         = aws_security_group.rds.id
    elasticache = aws_security_group.elasticache.id
  }
}

#============================================================================
# Debug Information
#============================================================================

output "debug_info" {
  description = "Debug information for troubleshooting"
  value = var.enable_dev_tools ? {
    terraform_version = "~> 1.5"
    aws_provider_version = "~> 5.0"
    kubernetes_version = var.kubernetes_version
    node_group_instance_types = var.node_group_instance_types[var.environment]
    capacity_type = var.node_group_capacity_type[var.environment]
  } : null
}
