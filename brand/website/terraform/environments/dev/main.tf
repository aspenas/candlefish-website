# Development Environment Configuration for Candlefish.ai
# Cost-optimized setup for development and testing

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "candlefish-terraform-locks"
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Candlefish"
      Environment = "dev"
      ManagedBy   = "Terraform"
      CostCenter  = "Development"
      Owner       = "Engineering Team"
    }
  }
}

# Provider for us-east-1 (required for CloudFront and ACM)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  project_name = "candlefish"
  environment  = "dev"
  
  # Cost optimization for dev environment
  cost_optimization_mode = "minimal"
  
  common_tags = {
    Project     = "Candlefish"
    Environment = "dev"
    ManagedBy   = "Terraform"
    CostCenter  = "Development"
  }
}

# ============================================
# Networking Module
# ============================================
module "networking" {
  source = "../../modules/networking"

  project_name = local.project_name
  environment  = local.environment
  region       = var.aws_region

  # VPC Configuration - smaller CIDR for dev
  vpc_cidr = "10.10.0.0/16"
  
  # Subnets - fewer AZs for cost optimization
  availability_zones      = ["us-east-1a", "us-east-1b"]
  public_subnet_cidrs    = ["10.10.1.0/24", "10.10.2.0/24"]
  private_subnet_cidrs   = ["10.10.11.0/24", "10.10.12.0/24"]
  database_subnet_cidrs  = ["10.10.21.0/24", "10.10.22.0/24"]

  # Cost optimization - single NAT gateway
  single_nat_gateway = true
  enable_nat_gateway = true
  
  # VPC endpoints - minimal set for dev
  enable_vpc_endpoints = true
  vpc_endpoints = {
    s3 = {
      service           = "s3"
      vpc_endpoint_type = "Gateway"
    }
    ecr_dkr = {
      service           = "ecr.dkr"
      vpc_endpoint_type = "Interface"
    }
  }

  # Flow logs - disabled for cost savings
  enable_flow_log = false
  
  # Transit gateway - disabled for dev
  enable_transit_gateway = false
  
  cost_optimization_mode = local.cost_optimization_mode

  tags = local.common_tags
}

# ============================================
# Security Module
# ============================================
module "security" {
  source = "../../modules/security"

  project_name = local.project_name
  environment  = local.environment
  vpc_id       = module.networking.vpc_id
  vpc_cidr     = module.networking.vpc_cidr_block

  private_subnet_ids = module.networking.private_subnets

  # KMS - simplified key structure for dev
  kms_keys = {
    general = {
      description             = "General purpose encryption key for dev"
      key_usage              = "ENCRYPT_DECRYPT"
      deletion_window_in_days = 7
      enable_key_rotation     = false # Disabled for dev
      multi_region           = false
      
      key_administrators = []
      key_users         = []
      key_services      = ["s3.amazonaws.com", "secretsmanager.amazonaws.com"]
      
      aliases = ["general", "dev"]
    }
  }

  # Secrets - minimal set for dev
  secrets = {
    app_secrets = {
      description             = "Application secrets for development"
      rotation_enabled        = false
      recovery_window_in_days = 7
      initial_value = {
        database_url = "postgresql://dev:password@localhost:5432/candlefish_dev"
        api_key     = "dev-api-key-placeholder"
      }
    }
  }

  # Security services - minimal for dev
  enable_cloudtrail      = false  # Disabled for cost savings
  enable_guardduty       = false  # Disabled for cost savings
  enable_config_compliance = false # Disabled for cost savings
  enable_security_hub    = false  # Disabled for cost savings

  tags = local.common_tags
}

# ============================================
# Storage Module
# ============================================
module "storage" {
  source = "../../modules/storage"

  project_name        = local.project_name
  environment         = local.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnets

  # S3 buckets - minimal configuration
  s3_buckets = {
    assets = {
      purpose                = "Static Assets"
      versioning_enabled     = false  # Disabled for dev
      lifecycle_rules_enabled = true
      public_access_block    = false
      cors_enabled          = true
      website_hosting       = true
      
      lifecycle_rules = {
        transition_to_ia_days      = 90    # Longer transitions for dev
        transition_to_glacier_days = 180
        transition_to_deep_archive_days = 365
        expiration_days           = 730    # 2 years for dev cleanup
        noncurrent_version_expiration_days = 30
        incomplete_multipart_upload_days = 7
      }
    }
    
    data = {
      purpose                = "Application Data"
      versioning_enabled     = false  # Disabled for dev
      lifecycle_rules_enabled = true
      public_access_block    = true
      cors_enabled          = false
      website_hosting       = false
    }
  }

  # DynamoDB - pay per request for dev
  dynamodb_tables = {
    sessions = {
      hash_key     = "session_id"
      billing_mode = "PAY_PER_REQUEST"
      
      attributes = [
        {
          name = "session_id"
          type = "S"
        }
      ]
      
      point_in_time_recovery = false  # Disabled for dev
      server_side_encryption = true
      ttl_attribute         = "expires_at"
      ttl_enabled          = true
    }
  }

  # ElastiCache - minimal configuration
  elasticache_config = {
    enabled                = true
    engine                = "redis"
    engine_version        = "7.0"
    node_type             = "cache.t3.micro"  # Smallest instance for dev
    num_cache_nodes       = 1
    parameter_group_family = "redis7.x"
    port                  = 6379
    
    backup_retention_period = 1     # Minimal backup retention
    backup_window          = "03:00-04:00"
    maintenance_window     = "sun:04:00-sun:05:00"
    
    at_rest_encryption_enabled = false  # Disabled for dev
    transit_encryption_enabled = false  # Disabled for dev
    
    auto_minor_version_upgrade = true
  }

  # Aurora - disabled for dev (use RDS instead if needed)
  aurora_config = {
    enabled = false
  }

  # Cross-region replication - disabled for dev
  enable_cross_region_replication = false

  kms_key_arn = module.security.kms_key_arns["general"]

  tags = local.common_tags
}

# ============================================
# Compute Module
# ============================================
module "compute" {
  source = "../../modules/compute"

  project_name        = local.project_name
  environment         = local.environment
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnets
  private_subnet_ids = module.networking.private_subnets
  public_subnet_ids  = module.networking.public_subnets

  # ECS Configuration - minimal for dev
  cluster_name = "${local.project_name}-${local.environment}"
  enable_container_insights = false  # Disabled for cost savings
  
  cluster_capacity_providers = ["FARGATE_SPOT"]  # Spot instances for dev
  default_capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE_SPOT"
      weight           = 100
      base            = 0
    }
  ]

  # Services configuration
  services = {
    web = {
      image             = "nginx:latest"
      cpu              = 256   # Minimal resources for dev
      memory           = 512
      port             = 80
      protocol         = "HTTP"
      health_check_path = "/"
      
      environment_variables = {
        ENVIRONMENT = "dev"
        DEBUG      = "true"
      }
      secrets = {
        DATABASE_URL = module.security.secret_arns["app_secrets"]
      }
      
      # Auto-scaling - minimal for dev
      min_capacity     = 1
      max_capacity     = 2
      target_cpu       = 80
      target_memory    = 80
      
      # Deployment
      deployment_minimum_healthy_percent = 0   # Allow zero downtime for dev
      deployment_maximum_percent        = 200
      
      # Load balancer
      enable_load_balancer = true
      
      # Use spot instances
      use_spot_instances = true
      spot_allocation   = 100  # 100% spot for dev
    }
  }

  # Lambda functions - minimal set
  lambda_functions = {
    api_handler = {
      filename      = "../../lambda/api-handler.zip"
      function_name = "api-handler"
      handler      = "index.handler"
      runtime      = "nodejs18.x"
      timeout      = 30
      memory_size  = 256  # Minimal memory for dev
      
      environment_variables = {
        ENVIRONMENT = "dev"
        LOG_LEVEL  = "debug"
      }
      
      provisioned_concurrency = 0  # No provisioned concurrency for dev
    }
  }

  # Load balancer configuration
  load_balancer_config = {
    enable_deletion_protection = false  # Allow deletion in dev
    idle_timeout              = 60
    enable_cross_zone_load_balancing = false  # Disabled for cost
  }

  # Cost optimization
  enable_spot_instances = true
  spot_allocation_percentage = 100

  tags = local.common_tags

  depends_on = [module.networking, module.security]
}

# ============================================
# CDN Module
# ============================================
module "cdn" {
  source = "../../modules/cdn"

  project_name = local.project_name
  environment  = local.environment

  domain_name        = "dev.candlefish.ai"
  origin_domain_name = module.storage.s3_bucket_regional_domain_names["assets"]

  # Cost optimization for dev
  price_class = "PriceClass_100"  # Minimal edge locations
  default_ttl = 3600   # 1 hour (shorter for dev)
  max_ttl     = 86400  # 1 day

  # Logging - minimal for dev
  enable_logging        = false  # Disabled for cost
  enable_real_time_logs = false  # Disabled for cost

  # No Lambda@Edge functions for dev
  lambda_edge_functions = {}

  tags = local.common_tags

  depends_on = [module.storage]
}

# ============================================
# Monitoring Module
# ============================================
module "monitoring" {
  source = "../../modules/monitoring"

  project_name = local.project_name
  environment  = local.environment
  aws_region   = var.aws_region

  # CloudWatch - minimal configuration for dev
  cloudwatch_config = {
    log_retention_days         = 7     # Short retention for dev
    create_log_groups         = true
    enable_detailed_monitoring = false  # Basic monitoring for dev
    enable_container_insights  = false  # Disabled for cost
    create_metric_filters     = false  # Disabled for cost
    enable_cross_region_replication = false
  }

  # Log groups - minimal set
  log_groups = {
    application = {
      retention_in_days = 7
    }
    ecs_tasks = {
      retention_in_days = 3  # Very short for dev
    }
  }

  # Dashboards - basic operational dashboard
  dashboards = {
    operational = {
      description = "Candlefish Dev Environment Dashboard"
      widgets = [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          
          properties = {
            title   = "Application Performance"
            metrics = [
              ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", module.compute.load_balancer_dns_name]
            ]
            period = 300
            stat   = "Sum"
          }
        }
      ]
    }
  }

  # Alerts - minimal for dev
  alerts = {
    high_error_rate = {
      description         = "High error rate in dev"
      metric_name        = "HTTPCode_Target_5XX_Count"
      namespace          = "AWS/ApplicationELB"
      statistic          = "Sum"
      period             = 300
      evaluation_periods = 2
      threshold          = 50  # Higher threshold for dev
      comparison_operator = "GreaterThanThreshold"
      dimensions = {
        LoadBalancer = module.compute.load_balancer_dns_name
      }
      alarm_actions             = []
      ok_actions               = []
      insufficient_data_actions = []
    }
  }

  # SNS - basic email notifications
  notification_config = {
    create_topics = true
    topics = {
      alerts = {
        name         = "dev-alerts"
        display_name = "Candlefish Dev Alerts"
        email_endpoints = ["dev-team@candlefish.ai"]
        sms_endpoints   = []
        slack_endpoints = []
        lambda_endpoints = []
      }
    }
  }

  # X-Ray - basic tracing for dev
  xray_config = {
    enable_tracing    = true
    sampling_rate    = 0.1
    create_service_map = true
    enable_insights   = false  # Disabled for cost
    enable_encryption = false  # Disabled for dev
    
    sampling_rules = []  # Use default rules for dev
  }

  # Cost monitoring - basic budget
  cost_monitoring = {
    enable_budgets = true
    budgets = {
      dev_monthly_budget = {
        budget_type    = "COST"
        limit_amount   = 100  # $100 monthly limit for dev
        limit_unit     = "USD"
        time_unit      = "MONTHLY"
        time_period_start = "2024-01-01_00:00"
        
        notifications = [
          {
            comparison_operator = "GREATER_THAN"
            threshold          = 80
            threshold_type     = "PERCENTAGE"
            notification_type  = "ACTUAL"
            subscriber_email_addresses = ["dev-team@candlefish.ai"]
            subscriber_sns_topic_arns  = []
          }
        ]
      }
    }
  }

  tags = local.common_tags

  depends_on = [module.compute]
}