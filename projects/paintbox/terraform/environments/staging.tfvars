# Staging Environment Configuration for Paintbox
# This file contains staging-specific variable values

# Basic Configuration
environment    = "staging"
project_name   = "paintbox"
aws_region     = "us-east-1"

# Domain and SSL Configuration
domain_name        = "staging.paintbox.candlefish.ai"  # Replace with actual staging domain
create_certificate = true

# ECS/Fargate Configuration
app_image      = "ghcr.io/aspenas/candlefish-ai/paintbox:staging"
container_port = 3000
fargate_cpu    = 1024  # 1 vCPU for staging
fargate_memory = 2048  # 2 GB RAM for staging
app_count      = 2     # Minimum 2 instances for staging

# Auto Scaling Configuration
min_capacity          = 1
max_capacity          = 10
desired_capacity      = 2
cpu_threshold_high    = 75
memory_threshold_high = 85
request_count_threshold = 500

# Database Configuration
db_username = "paintbox_staging"
# Secrets managed via AWS Secrets Manager

# Load Balancer Configuration
health_check_path    = "/api/health"
health_check_matcher = "200"
ssl_policy          = "ELBSecurityPolicy-TLS13-1-2-2021-06"

# CloudFront CDN Configuration
enable_cdn       = true
cdn_price_class  = "PriceClass_100"  # US/Europe only for staging
enable_compression = true
static_assets_cache_ttl = 86400  # 1 day for staging

# Monitoring and Alerting
enable_detailed_monitoring = false  # Reduce costs in staging
enable_container_insights  = true
alert_email_addresses = [
  "alerts@candlefish.ai",
  "patrick@candlefish.ai"
]

# Security Configuration
enable_waf       = true
waf_rate_limit   = 1000  # Lower limit for staging
enable_service_discovery = true

# Backup Configuration
backup_retention_days = 7  # 1 week for staging

# Instance Types
instance_type = "t3.medium"  # Smaller instances for staging

# Salesforce Configuration (sandbox)
salesforce_instance_url = "https://kindhomesolutions1--bartsand.sandbox.my.salesforce.com"

# Additional tags for staging resources
additional_tags = {
  Environment     = "staging"
  Owner          = "Development Team"
  CostCenter     = "Engineering"
  Backup         = "optional"
  Monitoring     = "standard"
  DataRetention  = "7days"
  AutoShutdown   = "enabled"
}

# Application secrets should be set via AWS Secrets Manager:
# - db_password (staging values)
# - redis_auth_token (staging values)
# - salesforce_client_id (sandbox)
# - salesforce_client_secret (sandbox)
# - salesforce_username (sandbox)
# - salesforce_password (sandbox)
# - salesforce_security_token (sandbox)
# - companycam_api_token (test)
# - companycam_webhook_secret (test)
# - anthropic_api_key (development tier)
# - encryption_key (staging)
# - jwt_secret (staging)
# - nextauth_secret (staging)
