terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket  = "paintbox-terraform-state"
    key     = "paintbox/terraform.tfstate"
    region  = "us-west-2"
    encrypt = true

    dynamodb_table = "paintbox-terraform-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Paintbox"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local variables
locals {
  cluster_name = "paintbox-${var.environment}"

  common_tags = {
    Project     = "Paintbox"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# VPC and networking
module "vpc" {
  source = "./modules/vpc"

  name               = local.cluster_name
  cidr               = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
  environment        = var.environment

  tags = local.common_tags
}

# EKS cluster
module "eks" {
  source = "./modules/eks"

  cluster_name    = local.cluster_name
  cluster_version = var.eks_cluster_version

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  node_groups = var.eks_node_groups

  tags = local.common_tags
}

# RDS databases
module "databases" {
  source = "./modules/rds"

  vpc_id               = module.vpc.vpc_id
  database_subnets     = module.vpc.database_subnets
  allowed_cidr_blocks  = [var.vpc_cidr]

  environment = var.environment

  databases = {
    estimates = {
      identifier = "paintbox-estimates-${var.environment}"
      db_name    = "paintbox_estimates"
    }
    customers = {
      identifier = "paintbox-customers-${var.environment}"
      db_name    = "paintbox_customers"
    }
    projects = {
      identifier = "paintbox-projects-${var.environment}"
      db_name    = "paintbox_projects"
    }
    integrations = {
      identifier = "paintbox-integrations-${var.environment}"
      db_name    = "paintbox_integrations"
    }
  }

  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/elasticache"

  cluster_id     = "paintbox-redis-${var.environment}"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.elasticache_subnets
  allowed_cidrs  = [var.vpc_cidr]

  node_type           = var.redis_node_type
  num_cache_clusters  = var.redis_num_clusters

  tags = local.common_tags
}

# ECR repositories
module "ecr" {
  source = "./modules/ecr"

  repositories = [
    "paintbox-estimates",
    "paintbox-customers",
    "paintbox-projects",
    "paintbox-integrations",
    "paintbox-router",
    "paintbox-frontend"
  ]

  environment = var.environment
  tags        = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  name     = "paintbox-${var.environment}"
  vpc_id   = module.vpc.vpc_id
  subnets  = module.vpc.public_subnets

  certificate_arn = module.acm.certificate_arn
  domain_name     = var.domain_name

  tags = local.common_tags
}

# ACM Certificate
module "acm" {
  source = "./modules/acm"

  domain_name = var.domain_name
  zone_id     = var.route53_zone_id

  subject_alternative_names = [
    "*.${var.domain_name}",
    "api.${var.domain_name}"
  ]

  tags = local.common_tags
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  environment = var.environment

  secrets = {
    apollo_key = {
      name        = "paintbox/${var.environment}/apollo-key"
      description = "Apollo Studio API key"
    }
    database_passwords = {
      name        = "paintbox/${var.environment}/database-passwords"
      description = "Database passwords for all services"
    }
    external_api_keys = {
      name        = "paintbox/${var.environment}/external-api-keys"
      description = "External API keys (Salesforce, Company Cam, etc.)"
    }
    jwt_secrets = {
      name        = "paintbox/${var.environment}/jwt-secrets"
      description = "JWT signing and refresh secrets"
    }
  }

  tags = local.common_tags
}

# IAM roles and policies
module "iam" {
  source = "./modules/iam"

  cluster_name        = local.cluster_name
  cluster_oidc_issuer = module.eks.cluster_oidc_issuer_url

  environment = var.environment
  tags        = local.common_tags
}

# Monitoring and observability
module "monitoring" {
  source = "./modules/monitoring"

  cluster_name = local.cluster_name
  vpc_id       = module.vpc.vpc_id

  environment = var.environment
  tags        = local.common_tags
}
