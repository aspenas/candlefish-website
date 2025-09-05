# Staging Environment Configuration
# Balanced configuration between cost and production-like features

aws_region = "us-east-1"

# Network configuration
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# Feature toggles for staging
enable_detailed_monitoring = true
enable_backup_services     = true
enable_security_services   = true
enable_cross_region_backup = false  # Disabled for cost in staging

# Auto-scaling configuration
min_capacity = 1
max_capacity = 4

# Resource sizing (medium tier for staging)
ecs_cpu_units    = 512
ecs_memory_mb    = 1024
lambda_memory_mb = 512

# Storage configuration
enable_aurora_serverless  = true
aurora_min_capacity      = 0.5
aurora_max_capacity      = 2.0

elasticache_node_type    = "cache.t3.small"
elasticache_num_nodes    = 1

# Monitoring and logging
log_retention_days       = 14
enable_x_ray_tracing     = true
x_ray_sampling_rate      = 0.1

# Cost controls
enable_spot_instances       = true
spot_allocation_percentage  = 70  # 70% spot, 30% on-demand
single_nat_gateway         = false  # HA setup for staging

# Security
enable_cloudtrail      = true
enable_guardduty       = false  # Disabled for cost in staging
enable_config          = true
enable_security_hub    = false

# Development features
enable_debug_mode        = false
enable_performance_mode  = true

# Domain configuration
domain_name = "staging.candlefish.ai"

# Budget limits
monthly_budget_limit = 300  # $300/month for staging

# Backup and retention
backup_retention_days = 7
enable_point_in_time_recovery = true

# Tags
additional_tags = {
  Purpose     = "staging"
  CostCenter  = "engineering"
  Owner       = "devops-team"
  Environment = "staging"
}