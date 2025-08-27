# Security Dashboard Infrastructure Outputs
# Provides essential information for application deployment and monitoring

# ============================================================================
# VPC and Networking Outputs
# ============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnets
}

output "intra_subnet_ids" {
  description = "IDs of the intra (database) subnets"
  value       = module.vpc.intra_subnets
}

output "nat_gateway_ips" {
  description = "Elastic IPs of the NAT Gateways"
  value       = module.vpc.nat_public_ips
}

# ============================================================================
# EKS Cluster Outputs
# ============================================================================

output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_version" {
  description = "EKS cluster Kubernetes version"
  value       = module.eks.cluster_version
}

output "cluster_platform_version" {
  description = "Platform version for EKS cluster"
  value       = module.eks.cluster_platform_version
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

output "cluster_security_group_id" {
  description = "Cluster security group that was created by Amazon EKS for the cluster"
  value       = module.eks.cluster_primary_security_group_id
}

output "node_security_group_id" {
  description = "ID of the node shared security group"
  value       = module.eks.node_security_group_id
}

# ============================================================================
# EKS Node Groups Outputs
# ============================================================================

output "eks_managed_node_groups" {
  description = "Map of attribute maps for all EKS managed node groups"
  value       = module.eks.eks_managed_node_groups
  sensitive   = true
}

output "node_groups_asg_names" {
  description = "List of the autoscaling group names"
  value       = [for ng in module.eks.eks_managed_node_groups : ng.asg_name]
}

# ============================================================================
# Database Outputs
# ============================================================================

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "RDS instance database name"
  value       = aws_db_instance.main.db_name
}

output "database_username" {
  description = "RDS instance master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "database_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "database_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "database_hosted_zone_id" {
  description = "RDS instance hosted zone ID"
  value       = aws_db_instance.main.hosted_zone_id
}

output "database_resource_id" {
  description = "RDS instance resource ID"
  value       = aws_db_instance.main.resource_id
}

output "database_subnet_group_name" {
  description = "RDS subnet group name"
  value       = aws_db_subnet_group.main.name
}

output "database_parameter_group_name" {
  description = "RDS parameter group name"
  value       = aws_db_parameter_group.postgresql.name
}

# ============================================================================
# Redis Cache Outputs
# ============================================================================

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_replication_group_id" {
  description = "Redis replication group identifier"
  value       = aws_elasticache_replication_group.main.replication_group_id
}

output "redis_cluster_enabled" {
  description = "Whether Redis cluster mode is enabled"
  value       = aws_elasticache_replication_group.main.cluster_enabled
}

output "redis_node_type" {
  description = "Redis node type"
  value       = aws_elasticache_replication_group.main.node_type
}

# ============================================================================
# Load Balancer Outputs
# ============================================================================

output "load_balancer_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_hosted_zone_id" {
  description = "Hosted zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "load_balancer_security_group_id" {
  description = "Security group ID of the load balancer"
  value       = aws_security_group.alb.id
}

output "api_target_group_arn" {
  description = "ARN of the API target group"
  value       = aws_lb_target_group.api.arn
}

output "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  value       = aws_lb_target_group.frontend.arn
}

# ============================================================================
# Security Groups Outputs
# ============================================================================

output "database_security_group_id" {
  description = "Database security group ID"
  value       = aws_security_group.database.id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis.id
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

# ============================================================================
# KMS Keys Outputs
# ============================================================================

output "eks_kms_key_arn" {
  description = "ARN of the KMS key used for EKS encryption"
  value       = aws_kms_key.eks.arn
}

output "ebs_kms_key_arn" {
  description = "ARN of the KMS key used for EBS encryption"
  value       = aws_kms_key.ebs.arn
}

output "rds_kms_key_arn" {
  description = "ARN of the KMS key used for RDS encryption"
  value       = aws_kms_key.rds.arn
}

output "elasticache_kms_key_arn" {
  description = "ARN of the KMS key used for ElastiCache encryption"
  value       = aws_kms_key.elasticache.arn
}

output "cloudwatch_kms_key_arn" {
  description = "ARN of the KMS key used for CloudWatch logs encryption"
  value       = aws_kms_key.cloudwatch.arn
}

# ============================================================================
# IAM Roles Outputs
# ============================================================================

output "external_secrets_controller_role_arn" {
  description = "ARN of the External Secrets Controller IAM role"
  value       = aws_iam_role.external_secrets_controller.arn
}

output "rds_enhanced_monitoring_role_arn" {
  description = "ARN of the RDS Enhanced Monitoring IAM role"
  value       = aws_iam_role.rds_enhanced_monitoring.arn
}

# ============================================================================
# Secrets Manager Outputs
# ============================================================================

output "database_secrets_arn" {
  description = "ARN of the database secrets in Secrets Manager"
  value       = aws_secretsmanager_secret.database.arn
}

output "redis_secrets_arn" {
  description = "ARN of the Redis secrets in Secrets Manager"
  value       = aws_secretsmanager_secret.redis.arn
}

# ============================================================================
# S3 Bucket Outputs
# ============================================================================

output "alb_logs_bucket_name" {
  description = "Name of the S3 bucket for ALB access logs"
  value       = aws_s3_bucket.alb_logs.id
}

output "alb_logs_bucket_arn" {
  description = "ARN of the S3 bucket for ALB access logs"
  value       = aws_s3_bucket.alb_logs.arn
}

# ============================================================================
# kubectl and Helm Configuration Outputs
# ============================================================================

output "configure_kubectl" {
  description = "Configure kubectl: make sure you're logged in with the correct AWS profile and run the following command to update your kubeconfig"
  value       = "aws eks --region ${var.aws_region} update-kubeconfig --name ${module.eks.cluster_name}"
}

output "helm_external_secrets_values" {
  description = "Helm values for External Secrets Operator"
  value = {
    serviceAccount = {
      annotations = {
        "eks.amazonaws.com/role-arn" = aws_iam_role.external_secrets_controller.arn
      }
    }
  }
  sensitive = true
}

# ============================================================================
# Application Configuration Outputs
# ============================================================================

output "application_config" {
  description = "Configuration values for the Security Dashboard application"
  value = {
    database = {
      host     = aws_db_instance.main.endpoint
      port     = aws_db_instance.main.port
      database = aws_db_instance.main.db_name
      username = aws_db_instance.main.username
    }
    
    redis = {
      host = aws_elasticache_replication_group.main.configuration_endpoint_address
      port = aws_elasticache_replication_group.main.port
    }
    
    cluster = {
      name     = module.eks.cluster_name
      endpoint = module.eks.cluster_endpoint
      region   = var.aws_region
    }
    
    load_balancer = {
      dns_name      = aws_lb.main.dns_name
      hosted_zone_id = aws_lb.main.zone_id
    }
  }
  sensitive = true
}

# ============================================================================
# Monitoring and Logging Outputs
# ============================================================================

output "cloudwatch_log_groups" {
  description = "CloudWatch log groups created"
  value = {
    rds_logs   = aws_cloudwatch_log_group.rds_logs.name
    redis_slow = aws_cloudwatch_log_group.redis_slow.name
  }
}

output "vpc_flow_logs_id" {
  description = "VPC Flow Logs ID"
  value       = module.vpc.vpc_flow_log_id
}

output "vpc_flow_logs_cloudwatch_log_group_name" {
  description = "VPC Flow Logs CloudWatch Log Group name"
  value       = module.vpc.vpc_flow_log_cloudwatch_log_group_name
}

# ============================================================================
# Cost and Resource Information
# ============================================================================

output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown (USD)"
  value = {
    eks_cluster      = var.environment == "production" ? "73.00" : "73.00"
    node_groups      = var.environment == "production" ? "400.00" : "150.00"
    rds_database     = var.environment == "production" ? "350.00" : "50.00"
    elasticache      = var.environment == "production" ? "150.00" : "15.00"
    load_balancer    = "22.50"
    nat_gateway      = "135.00"
    data_transfer    = "50.00"
    cloudwatch_logs  = "10.00"
    total_estimated  = var.environment == "production" ? "1190.50" : "355.50"
  }
}

output "resource_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}

# ============================================================================
# Connection Information for CI/CD
# ============================================================================

output "connection_info" {
  description = "Connection information for CI/CD pipelines"
  value = {
    aws_region              = var.aws_region
    cluster_name           = module.eks.cluster_name
    cluster_endpoint       = module.eks.cluster_endpoint
    oidc_provider_arn      = module.eks.oidc_provider_arn
    database_secrets_name  = aws_secretsmanager_secret.database.name
    redis_secrets_name     = aws_secretsmanager_secret.redis.name
    ecr_registry          = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    load_balancer_dns     = aws_lb.main.dns_name
    vpc_id                = module.vpc.vpc_id
    private_subnet_ids    = module.vpc.private_subnets
    public_subnet_ids     = module.vpc.public_subnets
  }
  sensitive = true
}

# ============================================================================
# Troubleshooting Information
# ============================================================================

output "troubleshooting_info" {
  description = "Information for troubleshooting common issues"
  value = {
    cluster_logging_enabled   = var.enable_eks_logging
    vpc_flow_logs_enabled    = var.enable_vpc_flow_logs
    rds_performance_insights = aws_db_instance.main.performance_insights_enabled
    backup_retention_days    = aws_db_instance.main.backup_retention_period
    multi_az_enabled         = aws_db_instance.main.multi_az
    deletion_protection      = aws_db_instance.main.deletion_protection
  }
}