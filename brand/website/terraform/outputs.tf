# Terraform Outputs for Candlefish Website Infrastructure

# VPC Outputs
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
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

# EKS Outputs
output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster OIDC Issuer"
  value       = module.eks.cluster_oidc_issuer_url
}

output "worker_security_group_id" {
  description = "Security group ID attached to the EKS worker nodes"
  value       = module.eks.worker_security_group_id
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.alb.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = module.alb.arn
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = module.cloudfront.hosted_zone_id
}

# SSL Certificate Outputs
output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = module.acm.certificate_arn
}

output "certificate_status" {
  description = "Status of the SSL certificate"
  value       = module.acm.certificate_status
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.database_name
}

# Cache Outputs
output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.elasticache.port
}

# S3 Outputs
output "s3_bucket_names" {
  description = "Names of the S3 buckets"
  value       = module.s3.bucket_names
}

output "s3_bucket_arns" {
  description = "ARNs of the S3 buckets"
  value       = module.s3.bucket_arns
}

# ECR Outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.website.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.website.arn
}

# Secrets Manager Outputs
output "secrets_manager_secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

# IAM Outputs
output "service_account_role_arns" {
  description = "ARNs of the service account IAM roles"
  value       = module.iam.service_account_role_arns
}

# DNS Outputs
output "website_url" {
  description = "Website URL"
  value       = "https://${var.domain_name}"
}

# Monitoring Endpoints
output "monitoring_endpoints" {
  description = "Monitoring and observability endpoints"
  value = {
    health_check    = "https://${var.domain_name}/api/health"
    metrics        = "https://${var.domain_name}/api/metrics"
    prometheus_url = "http://prometheus.${var.domain_name}"
    grafana_url    = "http://grafana.${var.domain_name}"
  }
}

# Connection Information for CI/CD
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "deployment_info" {
  description = "Information needed for deployments"
  value = {
    cluster_name     = module.eks.cluster_name
    ecr_repository   = aws_ecr_repository.website.repository_url
    secrets_arn      = aws_secretsmanager_secret.app_secrets.arn
    load_balancer_dns = module.alb.dns_name
    cloudfront_domain = module.cloudfront.domain_name
  }
  sensitive = true
}

# Cost Optimization Information
output "cost_optimization_info" {
  description = "Information for cost monitoring and optimization"
  value = {
    resource_tags = {
      Environment  = var.environment
      Project      = "candlefish-website"
      CostCenter   = var.cost_center
      ProjectCode  = var.project_code
    }
    
    scaling_limits = {
      eks_min_nodes = var.eks_node_min_capacity
      eks_max_nodes = var.eks_node_max_capacity
      rds_max_storage = var.rds_max_allocated_storage
    }
    
    backup_retention = {
      rds_backup_days = var.backup_retention_period
      log_retention_days = var.log_retention_days
    }
  }
}