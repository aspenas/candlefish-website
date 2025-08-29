# Candlefish Infrastructure - Main Configuration
# Optimized for GitHub Actions with AWS

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # Temporarily commented due to provider issues
    # github = {
    #   source  = "integrations/github"
    #   version = "~> 5.0"
    # }
  }

  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "infrastructure/terraform.tfstate"
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
      ManagedBy   = "Terraform"
      Environment = var.environment
      CostCenter  = "Engineering"
    }
  }
}

# Temporarily commented due to provider issues
# provider "github" {
#   owner = var.github_org
# }

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "github_org" {
  description = "GitHub organization"
  type        = string
  default     = "candlefish-ai"
}

variable "github_repo" {
  description = "GitHub repository"
  type        = string
  default     = "candlefish-ai"
}

variable "projects" {
  description = "List of Candlefish projects"
  type = map(object({
    name        = string
    type        = string
    path        = string
    domain      = optional(string)
    resources   = optional(map(string))
  }))

  default = {
    cf = {
      name = "cf"
      type = "webapp"
      path = "apps/website"
      domain = "candlefish.ai"
    }
    cfweb = {
      name = "cfweb"
      type = "webapp"
      path = "apps/website"
      domain = "www.candlefish.ai"
    }
    cftyler = {
      name = "cftyler"
      type = "webapp"
      path = "apps/tyler-onboarding"
      domain = "onboarding.candlefish.ai"
    }
    cfpaint = {
      name = "cfpaint"
      type = "enterprise"
      path = "projects/paintbox"
      domain = "paintbox.candlefish.ai"
      resources = {
        cpu    = "1024"
        memory = "2048"
      }
    }
    cfprom = {
      name = "cfprom"
      type = "enterprise"
      path = "projects/promoterOS"
      domain = "promoter.candlefish.ai"
      resources = {
        cpu    = "2048"
        memory = "4096"
      }
    }
    cfbrew = {
      name = "cfbrew"
      type = "enterprise"
      path = "projects/brewery"
      domain = "brewery.candlefish.ai"
      resources = {
        cpu    = "1024"
        memory = "2048"
      }
    }
    cfcrown = {
      name = "cfcrown"
      type = "business"
      path = "projects/crowntrophy"
      domain = "crown.candlefish.ai"
    }
    cfbart = {
      name = "cfbart"
      type = "business"
      path = "projects/bart-estimator-pwa"
      domain = "bart.candlefish.ai"
    }
    cfbart2 = {
      name = "cfbart2"
      type = "business"
      path = "projects/newbart"
      domain = "bart2.candlefish.ai"
    }
    cfexcel = {
      name = "cfexcel"
      type = "business"
      path = "projects/excel"
      domain = "excel.candlefish.ai"
    }
    cfcolo = {
      name = "cfcolo"
      type = "client"
      path = "projects/colorado-springs-auditorium"
      domain = "colorado.candlefish.ai"
    }
    cfjon = {
      name = "cfjon"
      type = "client"
      path = "projects/jonathon"
      domain = "jonathon.candlefish.ai"
    }
    cfmorr = {
      name = "cfmorr"
      type = "client"
      path = "projects/morreale"
      domain = "morreale.candlefish.ai"
    }
    cfnew = {
      name = "cfnew"
      type = "client"
      path = "projects/new-client"
      domain = "new.candlefish.ai"
    }
  }
}

# Local values for computed resources
locals {
  webapp_projects     = { for k, v in var.projects : k => v if v.type == "webapp" }
  enterprise_projects = { for k, v in var.projects : k => v if v.type == "enterprise" }
  business_projects   = { for k, v in var.projects : k => v if v.type == "business" }
  client_projects     = { for k, v in var.projects : k => v if v.type == "client" }

  all_static_projects = merge(
    local.webapp_projects,
    local.business_projects,
    local.client_projects
  )

  # Cost optimization tags
  cost_tags = {
    CostOptimization = "enabled"
    AutoShutdown     = var.environment != "production" ? "true" : "false"
    Budget           = var.environment == "production" ? "1000" : "200"
  }
}

# ============================================
# GitHub OIDC Configuration
# ============================================
module "github_oidc" {
  source = "./modules/github-oidc"

  github_org         = var.github_org
  github_repo        = var.github_repo
  environment        = var.environment
  aws_account_id     = data.aws_caller_identity.current.account_id

  tags = local.cost_tags
}

# ============================================
# S3 + CloudFront for Static Sites
# ============================================
module "static_sites" {
  source = "./modules/s3-cloudfront"

  for_each = local.all_static_projects

  project_name    = each.value.name
  domain_name     = each.value.domain
  environment     = var.environment

  # Cost optimizations
  cloudfront_price_class = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"
  s3_lifecycle_rules = {
    transition_to_ia_days      = 30
    transition_to_glacier_days = 90
    expiration_days           = var.environment == "production" ? 0 : 180
  }

  tags = merge(local.cost_tags, {
    ProjectType = each.value.type
    ProjectName = each.value.name
  })
}

# ============================================
# ECS Fargate for Enterprise Applications
# ============================================
module "ecs_cluster" {
  source = "./modules/ecs-fargate"

  cluster_name = "candlefish-${var.environment}"
  environment  = var.environment

  # Container Insights for monitoring (disabled in dev to save costs)
  container_insights = var.environment == "production"

  tags = local.cost_tags
}

module "ecs_services" {
  source = "./modules/ecs-fargate"

  for_each = local.enterprise_projects

  cluster_id      = module.ecs_cluster.cluster_id
  service_name    = each.value.name
  environment     = var.environment

  # Resource allocation
  cpu    = each.value.resources.cpu
  memory = each.value.resources.memory

  # Auto-scaling configuration
  min_capacity = var.environment == "production" ? 2 : 1
  max_capacity = var.environment == "production" ? 10 : 3

  # Cost optimization: Use Fargate Spot for non-production
  capacity_providers = var.environment == "production" ? ["FARGATE"] : ["FARGATE_SPOT"]

  tags = merge(local.cost_tags, {
    ProjectType = each.value.type
    ProjectName = each.value.name
  })
}

# ============================================
# Monitoring and Observability
# ============================================
module "monitoring" {
  source = "./modules/monitoring"

  environment = var.environment
  projects    = var.projects

  # CloudWatch configuration
  log_retention_days = var.environment == "production" ? 30 : 7

  # Alarms configuration
  enable_alarms = var.environment == "production"
  alarm_endpoints = {
    email = "ops@candlefish.ai"
    slack = var.environment == "production" ? "https://hooks.slack.com/services/xxx" : null
  }

  # Cost monitoring
  budget_amount = var.environment == "production" ? 1000 : 200
  budget_alerts = [80, 90, 100]

  tags = local.cost_tags
}

# ============================================
# Secrets Management
# ============================================
resource "aws_secretsmanager_secret" "project_secrets" {
  for_each = var.projects

  name = "candlefish/${var.environment}/${each.value.name}"

  # Rotation configuration (only for production)
  rotation_rules {
    automatically_after_days = var.environment == "production" ? 30 : 0
  }

  tags = merge(local.cost_tags, {
    Project = each.value.name
    Type    = each.value.type
  })
}

# ============================================
# IAM Roles for GitHub Actions
# ============================================
resource "aws_iam_role" "github_actions_deploy" {
  name = "github-actions-deploy-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = module.github_oidc.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = local.cost_tags
}

# Attach policies for deployment permissions
resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "github-actions-deploy-policy"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:*",
          "cloudfront:CreateInvalidation",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================
# Outputs
# ============================================
output "static_site_urls" {
  description = "URLs for static sites"
  value = {
    for k, v in module.static_sites : k => v.cloudfront_url
  }
}

output "ecs_service_urls" {
  description = "URLs for ECS services"
  value = {
    for k, v in module.ecs_services : k => v.service_url
  }
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions_deploy.arn
}

output "monthly_cost_estimate" {
  description = "Estimated monthly AWS costs"
  value = {
    cloudfront = "$${local.all_static_projects != {} ? length(local.all_static_projects) * 5 : 0}"
    s3         = "$${local.all_static_projects != {} ? length(local.all_static_projects) * 2 : 0}"
    ecs        = "$${local.enterprise_projects != {} ? length(local.enterprise_projects) * 30 : 0}"
    monitoring = "$10"
    total      = "$${(length(local.all_static_projects) * 7) + (length(local.enterprise_projects) * 30) + 10}"
  }
}

# Data sources
data "aws_caller_identity" "current" {}
