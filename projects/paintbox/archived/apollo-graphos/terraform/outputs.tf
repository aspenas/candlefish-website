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

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

# EKS Cluster outputs
output "cluster_id" {
  description = "Name/ID of the EKS cluster"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = module.eks.cluster_arn
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
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

# Database outputs
output "database_endpoints" {
  description = "RDS instance endpoints"
  value = {
    estimates    = module.databases.endpoints.estimates
    customers    = module.databases.endpoints.customers
    projects     = module.databases.endpoints.projects
    integrations = module.databases.endpoints.integrations
  }
  sensitive = true
}

output "database_connection_strings" {
  description = "Database connection strings"
  value = {
    estimates    = module.databases.connection_strings.estimates
    customers    = module.databases.connection_strings.customers
    projects     = module.databases.connection_strings.projects
    integrations = module.databases.connection_strings.integrations
  }
  sensitive = true
}

# Redis outputs
output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = module.redis.primary_endpoint
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = module.redis.reader_endpoint
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = module.redis.connection_string
  sensitive   = true
}

# ECR outputs
output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

# Load Balancer outputs
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

# Certificate outputs
output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = module.acm.certificate_arn
}

# Secrets outputs
output "secrets_arns" {
  description = "ARNs of the secrets in AWS Secrets Manager"
  value       = module.secrets.secrets_arns
  sensitive   = true
}

# IAM outputs
output "node_group_role_arn" {
  description = "ARN of the EKS node group IAM role"
  value       = module.iam.node_group_role_arn
}

output "cluster_service_role_arn" {
  description = "ARN of the EKS cluster service IAM role"
  value       = module.iam.cluster_service_role_arn
}

output "pod_execution_role_arn" {
  description = "ARN of the pod execution IAM role"
  value       = module.iam.pod_execution_role_arn
}

# Application URLs
output "application_urls" {
  description = "Application URLs"
  value = {
    frontend = var.environment == "production" ?
      "https://paintbox.candlefish.ai" :
      "https://${var.environment}.paintbox.candlefish.ai"

    api = var.environment == "production" ?
      "https://api.paintbox.candlefish.ai/graphql" :
      "https://${var.environment}-api.paintbox.candlefish.ai/graphql"

    apollo_studio = "https://studio.apollographql.com/graph/paintbox"
  }
}

# Kubectl configuration
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_id}"
}

# Environment-specific information
output "environment_info" {
  description = "Environment-specific deployment information"
  value = {
    environment     = var.environment
    region         = var.aws_region
    cluster_name   = local.cluster_name
    namespace      = var.environment == "production" ? "paintbox" : "paintbox-${var.environment}"

    # Resource counts
    node_groups    = length(var.eks_node_groups)
    databases      = length(module.databases.endpoints)
    ecr_repos      = length(module.ecr.repository_urls)

    # Cost optimization settings
    spot_instances = var.enable_spot_instances
    autoscaling    = var.enable_cluster_autoscaler
  }
}
