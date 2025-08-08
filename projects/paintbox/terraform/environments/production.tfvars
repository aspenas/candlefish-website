# Production Environment Configuration for Paintbox
# This file contains production-specific variable values

# Basic Configuration
environment    = "production"
project_name   = "paintbox"
aws_region     = "us-east-1"

# Domain and SSL Configuration
domain_name        = "paintbox.candlefish.ai"  # Replace with actual domain
create_certificate = true

# ECS/Fargate Configuration
app_image      = "ghcr.io/aspenas/candlefish-ai/paintbox:latest"
container_port = 3000
fargate_cpu    = 2048  # 2 vCPU for production
fargate_memory = 4096  # 4 GB RAM for production
app_count      = 3     # Minimum 3 instances for high availability

# Auto Scaling Configuration
min_capacity          = 3
max_capacity          = 20
desired_capacity      = 3
cpu_threshold_high    = 70
memory_threshold_high = 80
request_count_threshold = 1000

# Database Configuration (passwords should be set via environment variables or secrets)
db_username = "paintbox_admin"
# db_password will be retrieved from AWS Secrets Manager
# redis_auth_token will be retrieved from AWS Secrets Manager

# Load Balancer Configuration
health_check_path    = "/api/health"
health_check_matcher = "200"
ssl_policy          = "ELBSecurityPolicy-TLS13-1-2-2021-06"

# CloudFront CDN Configuration
enable_cdn       = true
cdn_price_class  = "PriceClass_All"  # Global distribution for production
enable_compression = true
static_assets_cache_ttl = 31536000  # 1 year

# Monitoring and Alerting
enable_detailed_monitoring = true
enable_container_insights  = true
alert_email_addresses = [
  "alerts@candlefish.ai",
  "devops@candlefish.ai",
  "patrick@candlefish.ai"
]

# Security Configuration
enable_waf       = true
waf_rate_limit   = 2000
enable_service_discovery = true

# Backup Configuration
backup_retention_days = 90  # 3 months for production

# Instance Types
instance_type = "t3.large"  # Larger instances for production workloads

# Salesforce Configuration (production sandbox or production org)
salesforce_instance_url = "https://kindhomesolutions1.my.salesforce.com"  # Production URL

# Additional tags for production resources
additional_tags = {
  Environment     = "production"
  Owner          = "DevOps Team"
  CostCenter     = "Engineering"
  Backup         = "required"
  Monitoring     = "critical"
  Compliance     = "required"
  DataRetention  = "90days"
  MaintenanceWindow = "sunday-03:00-05:00-utc"
}

# Application secrets should be set via AWS Secrets Manager:
# - db_password
# - redis_auth_token
# - salesforce_client_id
# - salesforce_client_secret
# - salesforce_username
# - salesforce_password
# - salesforce_security_token
# - companycam_api_token
# - companycam_webhook_secret
# - anthropic_api_key
# - encryption_key
# - jwt_secret
# - nextauth_secret
