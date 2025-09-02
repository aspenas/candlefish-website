# CLOS Analytics Infrastructure Deployment
# Uses the clos-analytics module for dedicated analytics infrastructure

# Local values for analytics configuration
locals {
  analytics_tags = merge(local.cost_tags, {
    Component    = "clos-analytics"
    Service      = "analytics-dashboard"
    DataClass    = "internal"
    Compliance   = "gdpr-ready"
  })
  
  # Environment-specific configurations
  analytics_config = {
    dev = {
      db_instance_class       = "db.t3.micro"
      db_allocated_storage   = 20
      redis_node_type        = "cache.t3.micro"
      redis_num_cache_nodes  = 1
      min_capacity           = 1
      max_capacity           = 2
      log_retention_days     = 7
      enable_enhanced_monitoring = false
      use_spot_instances     = true
      project_budget         = 100
    }
    staging = {
      db_instance_class       = "db.t3.small"
      db_allocated_storage   = 50
      redis_node_type        = "cache.t3.small"
      redis_num_cache_nodes  = 2
      min_capacity           = 2
      max_capacity           = 4
      log_retention_days     = 14
      enable_enhanced_monitoring = false
      use_spot_instances     = true
      project_budget         = 200
    }
    production = {
      db_instance_class       = "db.t3.medium"
      db_allocated_storage   = 100
      redis_node_type        = "cache.t3.medium"
      redis_num_cache_nodes  = 2
      min_capacity           = 3
      max_capacity           = 10
      log_retention_days     = 30
      enable_enhanced_monitoring = true
      use_spot_instances     = false
      project_budget         = 500
    }
  }
  
  current_config = local.analytics_config[var.environment]
}

# Random password generation for database
resource "random_password" "analytics_db_password" {
  length  = 16
  special = true
}

resource "random_password" "analytics_redis_auth_token" {
  length  = 32
  special = false
}

# CLOS Analytics infrastructure module
module "clos_analytics" {
  source = "./modules/clos-analytics"
  
  # Basic configuration
  environment  = var.environment
  common_tags  = local.analytics_tags
  
  # Network configuration (use existing VPC from main infrastructure)
  vpc_id             = try(module.vpc[0].vpc_id, "")
  private_subnet_ids = try(module.vpc[0].private_subnets, [])
  public_subnet_ids  = try(module.vpc[0].public_subnets, [])
  
  # Database configuration
  postgres_version        = "16.1"
  db_instance_class      = local.current_config.db_instance_class
  db_allocated_storage   = local.current_config.db_allocated_storage
  db_max_allocated_storage = local.current_config.db_allocated_storage * 5
  db_username            = "clos_admin"
  db_password            = random_password.analytics_db_password.result
  
  # Redis configuration
  redis_node_type       = local.current_config.redis_node_type
  redis_num_cache_nodes = local.current_config.redis_num_cache_nodes
  redis_auth_token      = random_password.analytics_redis_auth_token.result
  
  # SSL certificate (if available)
  certificate_arn = try(aws_acm_certificate.main[0].arn, "")
  domain_name     = var.environment == "production" ? "analytics.candlefish.ai" : "${var.environment}-analytics.candlefish.ai"
  
  # Monitoring configuration
  log_retention_days         = local.current_config.log_retention_days
  enable_enhanced_monitoring = local.current_config.enable_enhanced_monitoring
  sns_alerts_email          = var.environment == "production" ? "ops@candlefish.ai" : ""
  
  # Scaling configuration
  min_capacity              = local.current_config.min_capacity
  max_capacity             = local.current_config.max_capacity
  target_cpu_utilization   = 70
  
  # Security configuration
  allowed_cidr_blocks = var.environment == "production" ? ["0.0.0.0/0"] : ["10.0.0.0/8"]
  enable_waf         = var.environment == "production"
  enable_backup      = true
  
  # Cost optimization
  use_spot_instances       = local.current_config.use_spot_instances
  enable_cost_optimization = true
  cost_center             = "engineering"
  project_budget          = local.current_config.project_budget
  
  # Feature flags
  enable_analytics_export     = var.environment == "production"
  enable_real_time_processing = true
  enable_data_retention_policy = true
  data_retention_days         = var.environment == "production" ? 365 : 90
  
  # Access logging (use existing S3 bucket if available)
  access_logs_bucket = try(aws_s3_bucket.access_logs[0].bucket, "")
}

# Route 53 DNS records for analytics dashboard
resource "aws_route53_record" "analytics_dashboard" {
  count = var.environment == "production" ? 1 : 0
  
  zone_id = try(aws_route53_zone.main[0].zone_id, "")
  name    = "analytics"
  type    = "A"
  
  alias {
    name                   = module.clos_analytics.load_balancer_dns_name
    zone_id                = module.clos_analytics.load_balancer_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "analytics_api" {
  count = var.environment == "production" ? 1 : 0
  
  zone_id = try(aws_route53_zone.main[0].zone_id, "")
  name    = "api.analytics"
  type    = "A"
  
  alias {
    name                   = module.clos_analytics.load_balancer_dns_name
    zone_id                = module.clos_analytics.load_balancer_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "analytics_ws" {
  count = var.environment == "production" ? 1 : 0
  
  zone_id = try(aws_route53_zone.main[0].zone_id, "")
  name    = "ws.analytics"
  type    = "A"
  
  alias {
    name                   = module.clos_analytics.load_balancer_dns_name
    zone_id                = module.clos_analytics.load_balancer_zone_id
    evaluate_target_health = true
  }
}

# CloudWatch Dashboard for analytics monitoring
resource "aws_cloudwatch_dashboard" "analytics" {
  dashboard_name = "CLOS-Analytics-${title(var.environment)}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", module.clos_analytics.database_endpoint],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Database Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${module.clos_analytics.redis_endpoint}-001"],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."],
            [".", "CurrConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Redis Cache Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", split("/", module.clos_analytics.load_balancer_arn)[1]],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      }
    ]
  })
  
  tags = local.analytics_tags
}

# Budget alarm for analytics infrastructure
resource "aws_budgets_budget" "analytics" {
  count = var.environment == "production" ? 1 : 0
  
  name          = "clos-analytics-budget"
  budget_type   = "COST"
  limit_amount  = local.current_config.project_budget
  limit_unit    = "USD"
  time_unit     = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-01_00:00", timestamp())
  
  cost_filters = {
    Tag = {
      Component = ["clos-analytics"]
    }
  }
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["ops@candlefish.ai"]
  }
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["ops@candlefish.ai"]
  }
  
  tags = local.analytics_tags
}