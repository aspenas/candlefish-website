# Security Dashboard Staging Environment Configuration
project_name = "security-dashboard"
environment  = "staging"
aws_region   = "us-east-1"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]
intra_subnet_cidrs   = ["10.0.201.0/24", "10.0.202.0/24"]

# Database Configuration
database_name     = "security_dashboard"
database_username = "secadmin"

# EKS Configuration
cluster_version = "1.28"

# Node Groups - Minimal for staging
node_groups = {
  general = {
    desired_capacity = 2
    min_capacity     = 1
    max_capacity     = 3
    instance_types   = ["t3.medium"]
    disk_size        = 50
  }
}

# Monitoring
enable_vpc_flow_logs   = true
enable_eks_logging     = true
enable_cost_monitoring = true