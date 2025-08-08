terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "claude-resources/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "claude-resources"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "candlefish-ai"
    }
  }
}

data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random password for RDS
resource "random_password" "rds_password" {
  length  = 32
  special = true
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names

  tags = local.common_tags
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  environment    = var.environment
  cluster_name   = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  node_groups = var.node_groups

  tags = local.common_tags
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  environment = var.environment

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  db_instance_class = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_password = random_password.rds_password.result

  backup_retention_period = var.backup_retention_period
  backup_window = var.backup_window
  maintenance_window = var.maintenance_window

  tags = local.common_tags
}

# ElastiCache Module
module "elasticache" {
  source = "./modules/elasticache"

  environment = var.environment

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  node_type = var.redis_node_type
  num_cache_nodes = var.redis_num_nodes

  tags = local.common_tags
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  environment = var.environment

  database_password = random_password.rds_password.result
  database_url = "postgresql://${module.rds.db_username}:${random_password.rds_password.result}@${module.rds.db_endpoint}/${module.rds.db_name}"
  redis_url = "redis://${module.elasticache.redis_endpoint}:6379"

  anthropic_api_key = var.anthropic_api_key
  openai_api_key = var.openai_api_key
  github_token = var.github_token

  tags = local.common_tags
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"

  environment = var.environment

  tags = local.common_tags
}

# CloudWatch
module "monitoring" {
  source = "./modules/monitoring"

  environment = var.environment
  cluster_name = module.eks.cluster_name

  tags = local.common_tags
}

# Route53
module "route53" {
  source = "./modules/route53"

  environment = var.environment
  domain_name = var.domain_name

  tags = local.common_tags
}

# WAF
module "waf" {
  source = "./modules/waf"

  environment = var.environment

  tags = local.common_tags
}

locals {
  common_tags = {
    Project     = "claude-resources"
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "candlefish-ai"
  }
}
