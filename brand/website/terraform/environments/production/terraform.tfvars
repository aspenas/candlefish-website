# Production Environment Configuration
# Full production setup with high availability, security, and performance

aws_region = "us-east-1"
backup_region = "us-west-2"

# Network configuration - multi-AZ for high availability
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# High availability and performance
enable_multi_region_deployment = true
enable_detailed_monitoring     = true
enable_backup_services         = true
enable_security_services       = true
enable_cross_region_backup     = true

# Auto-scaling configuration - production scale
min_capacity = 3
max_capacity = 20
target_cpu_utilization = 70

# Resource sizing - optimized for production workloads
ecs_cpu_units    = 2048  # 2 vCPU
ecs_memory_mb    = 4096  # 4 GB
lambda_memory_mb = 1024

# Database configuration - Aurora Serverless v2 for production
enable_aurora_serverless  = true
aurora_min_capacity      = 1.0
aurora_max_capacity      = 16.0
enable_aurora_global_database = true

# ElastiCache - production cluster
elasticache_node_type    = "cache.r7g.large"
elasticache_num_nodes    = 3
enable_elasticache_cluster_mode = true

# Performance optimizations
cloudfront_price_class   = "PriceClass_All"
enable_cloudfront_compression = true
enable_http2 = true

# Monitoring and observability - comprehensive
log_retention_days       = 30
enable_x_ray_tracing     = true
x_ray_sampling_rate      = 0.1
enable_container_insights = true
enable_application_insights = true

# Security - full production security suite
enable_cloudtrail      = true
enable_guardduty       = true
enable_config          = true
enable_security_hub    = true
enable_inspector       = true

# WAF configuration
enable_waf             = true
rate_limit_per_5min    = 10000
enable_geo_blocking    = false
blocked_countries      = []

# Cost optimization (while maintaining performance)
enable_spot_instances       = false  # On-demand for production stability
single_nat_gateway         = false   # Multi-AZ NAT for HA
enable_s3_intelligent_tiering = true

# Performance and reliability
enable_read_replicas        = true
enable_automated_backups    = true
backup_retention_days      = 30
enable_point_in_time_recovery = true

# Domain and SSL
domain_name = "candlefish.ai"
alternate_domain_names = ["www.candlefish.ai"]

# Budget and cost controls
monthly_budget_limit = 1500  # $1500/month for production
enable_cost_anomaly_detection = true

# Compliance and governance
enable_compliance_monitoring = true
enable_resource_tagging_enforcement = true
enable_access_logging = true

# Performance targets
target_availability = 99.95
max_response_time_ms = 500
target_throughput_rps = 1000

# WebGL and real-time features
max_animation_particles = 50000
max_websocket_connections = 5000
enable_webgl_acceleration = true

# Operational excellence
enable_canary_deployments = true
enable_feature_flags = true
enable_chaos_engineering = false  # Disabled by default

# Development features (disabled in production)
enable_debug_mode = false
enable_performance_mode = true
enable_experimental_features = false

# Tags for production
additional_tags = {
  Purpose     = "production"
  CostCenter  = "operations"
  Owner       = "sre-team"
  Environment = "production"
  Compliance  = "required"
  Backup      = "required"
  Monitoring  = "comprehensive"
}