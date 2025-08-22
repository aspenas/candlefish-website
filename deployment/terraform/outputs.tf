# Outputs for RTPM Infrastructure

################################################################################
# VPC Outputs
################################################################################

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
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

output "nat_gateway_ips" {
  description = "List of public Elastic IPs for NAT Gateways"
  value       = module.vpc.nat_public_ips
}

################################################################################
# EKS Outputs
################################################################################

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = module.eks.cluster_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC Provider"
  value       = module.eks.oidc_provider_arn
}

output "node_groups" {
  description = "EKS node groups"
  value       = module.eks.eks_managed_node_groups
  sensitive   = true
}

################################################################################
# RDS Outputs
################################################################################

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.rtpm.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.rtpm.port
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.rtpm.id
}

output "rds_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.rtpm.arn
}

output "rds_db_name" {
  description = "RDS database name"
  value       = aws_db_instance.rtpm.db_name
  sensitive   = true
}

output "rds_username" {
  description = "RDS master username"
  value       = aws_db_instance.rtpm.username
  sensitive   = true
}

output "rds_credentials_secret_arn" {
  description = "ARN of the secret containing RDS credentials"
  value       = aws_secretsmanager_secret.rds_credentials.arn
}

################################################################################
# ElastiCache Outputs
################################################################################

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.rtpm.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.rtpm.port
}

output "redis_cluster_id" {
  description = "Redis cluster ID"
  value       = aws_elasticache_replication_group.rtpm.id
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the secret containing Redis auth token"
  value       = aws_secretsmanager_secret.redis_auth_token.arn
}

################################################################################
# ECR Outputs
################################################################################

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    api      = aws_ecr_repository.rtpm_api.repository_url
    frontend = aws_ecr_repository.rtpm_frontend.repository_url
  }
}

output "ecr_repository_arns" {
  description = "ECR repository ARNs"
  value = {
    api      = aws_ecr_repository.rtpm_api.arn
    frontend = aws_ecr_repository.rtpm_frontend.arn
  }
}

################################################################################
# Security Outputs
################################################################################

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.elasticache.id
}

################################################################################
# Monitoring Outputs
################################################################################

output "grafana_admin_password_secret_arn" {
  description = "ARN of the secret containing Grafana admin password"
  value       = aws_secretsmanager_secret.grafana_admin_password.arn
}

################################################################################
# DNS and Load Balancer Outputs
################################################################################

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = "Will be available after ALB controller creates the load balancer"
}

################################################################################
# Application URLs
################################################################################

output "application_urls" {
  description = "Application URLs"
  value = {
    frontend    = "https://${var.domain_name}"
    api         = "https://api.${var.domain_name}"
    dashboard   = "https://dashboard.${var.domain_name}"
    grafana     = "https://grafana.${var.domain_name}"
    prometheus  = "https://prometheus.${var.domain_name}"
  }
}

################################################################################
# Connection Information
################################################################################

output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "database_connection_info" {
  description = "Database connection information"
  value = {
    host     = aws_db_instance.rtpm.endpoint
    port     = aws_db_instance.rtpm.port
    database = aws_db_instance.rtpm.db_name
    username = aws_db_instance.rtpm.username
    ssl_mode = "require"
  }
  sensitive = true
}

output "redis_connection_info" {
  description = "Redis connection information"
  value = {
    host = aws_elasticache_replication_group.rtpm.primary_endpoint_address
    port = aws_elasticache_replication_group.rtpm.port
    tls  = true
  }
  sensitive = true
}

################################################################################
# Resource Counts and Costs
################################################################################

output "resource_summary" {
  description = "Summary of created resources"
  value = {
    vpc_id                = module.vpc.vpc_id
    eks_cluster           = module.eks.cluster_name
    rds_instance          = aws_db_instance.rtpm.id
    redis_cluster         = aws_elasticache_replication_group.rtpm.id
    ecr_repositories      = 2
    security_groups       = 2
    secrets               = 3
    node_groups          = length(module.eks.eks_managed_node_groups)
  }
}

################################################################################
# Deployment Information
################################################################################

output "deployment_info" {
  description = "Deployment information for CI/CD"
  value = {
    cluster_name    = module.eks.cluster_name
    region         = var.aws_region
    environment    = var.environment
    registry_url   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    namespace      = "rtpm-system"
  }
}

################################################################################
# Monitoring and Alerting
################################################################################

output "monitoring_endpoints" {
  description = "Monitoring and alerting endpoints"
  value = {
    prometheus_url  = "http://prometheus-server.monitoring.svc.cluster.local"
    grafana_url    = "http://grafana.monitoring.svc.cluster.local"
    alertmanager_url = "http://alertmanager.monitoring.svc.cluster.local"
  }
}

################################################################################
# Backup and Recovery
################################################################################

output "backup_info" {
  description = "Backup and recovery information"
  value = {
    rds_backup_window    = aws_db_instance.rtpm.backup_window
    rds_retention_period = aws_db_instance.rtpm.backup_retention_period
    redis_snapshot_window = aws_elasticache_replication_group.rtpm.snapshot_window
    redis_retention_limit = aws_elasticache_replication_group.rtpm.snapshot_retention_limit
  }
}

################################################################################
# Network Configuration
################################################################################

output "network_configuration" {
  description = "Network configuration details"
  value = {
    vpc_cidr           = module.vpc.vpc_cidr_block
    availability_zones = module.vpc.azs
    private_subnets    = module.vpc.private_subnets
    public_subnets     = module.vpc.public_subnets
    nat_gateways       = module.vpc.nat_public_ips
  }
}

################################################################################
# Security Configuration
################################################################################

output "security_configuration" {
  description = "Security configuration details"
  value = {
    encryption_at_rest    = true
    encryption_in_transit = true
    vpc_flow_logs        = true
    rds_encryption       = aws_db_instance.rtpm.storage_encrypted
    redis_encryption     = aws_elasticache_replication_group.rtpm.at_rest_encryption_enabled
    secrets_manager      = true
  }
}
