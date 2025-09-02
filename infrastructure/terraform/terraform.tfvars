# Terraform Variables for Candlefish AI Infrastructure
# EKS + RDS + ElastiCache Deployment
# Generated: September 2, 2025

# Environment Configuration
environment = "production"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
private_subnet_cidrs = [
  "10.0.1.0/24",
  "10.0.2.0/24", 
  "10.0.3.0/24"
]
public_subnet_cidrs = [
  "10.0.101.0/24",
  "10.0.102.0/24",
  "10.0.103.0/24"
]
database_subnet_cidrs = [
  "10.0.201.0/24",
  "10.0.202.0/24",
  "10.0.203.0/24"
]

# EKS Configuration
kubernetes_version = "1.28"
enable_fargate = false

# RDS PostgreSQL Configuration
db_instance_class_prod = "db.r6g.xlarge"  # 4 vCPU, 32GB RAM
db_instance_class_dev  = "db.r6g.large"   # 2 vCPU, 16GB RAM

# Cost Optimization Settings
# These settings help control costs while maintaining performance
cost_optimization = {
  # Use spot instances for non-critical workloads
  use_spot_instances = true
  
  # Single NAT gateway for non-production
  single_nat_gateway = false  # Set to true for production HA
  
  # Reserved instance recommendations
  enable_reserved_instances = false
}

# Monitoring and Logging
enable_monitoring = true
monitoring_interval = 60  # Enhanced monitoring every 60 seconds

# Backup Configuration
backup_retention_days = {
  production = 30
  staging    = 14
  development = 7
}
enable_cross_region_backup = true

# Tags for Resource Management
common_tags = {
  Project     = "candlefish-ai"
  Environment = "production"
  ManagedBy   = "Terraform"
  Owner       = "Patrick Smith"
  CostCenter  = "Engineering"
  CreatedDate = "2025-09-02"
}