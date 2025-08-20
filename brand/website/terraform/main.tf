# Candlefish.ai Website Infrastructure
# Production-ready AWS infrastructure with high availability and auto-scaling

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "website/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "candlefish-terraform-locks"
  }
}

# Configure providers
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "candlefish-website"
      ManagedBy   = "terraform"
      Owner       = "candlefish-ai"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {}

# Local values
locals {
  account_id = data.aws_caller_identity.current.account_id
  azs        = slice(data.aws_availability_zones.available.names, 0, 3)
  
  common_tags = {
    Environment = var.environment
    Project     = "candlefish-website"
    ManagedBy   = "terraform"
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  environment = var.environment
  cidr_block  = var.vpc_cidr
  azs         = local.azs
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  environment                = var.environment
  cluster_name              = "${var.environment}-candlefish-website"
  cluster_version           = var.eks_cluster_version
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  endpoint_private_access   = true
  endpoint_public_access    = true
  
  # Node groups configuration
  node_groups = {
    main = {
      instance_types = var.eks_node_instance_types
      scaling_config = {
        desired_size = var.eks_node_desired_capacity
        max_size     = var.eks_node_max_capacity
        min_size     = var.eks_node_min_capacity
      }
      disk_size = 50
      ami_type  = "AL2_x86_64"
    }
  }
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.public_subnet_ids
  
  # SSL Certificate for HTTPS
  certificate_arn = module.acm.certificate_arn
  
  tags = local.common_tags
}

# CloudFront CDN
module "cloudfront" {
  source = "./modules/cloudfront"
  
  environment     = var.environment
  domain_name     = var.domain_name
  certificate_arn = module.acm.certificate_arn
  alb_domain_name = module.alb.dns_name
  
  tags = local.common_tags
}

# SSL Certificate
module "acm" {
  source = "./modules/acm"
  
  domain_name = var.domain_name
  zone_id     = var.route53_zone_id
  
  tags = local.common_tags
}

# RDS PostgreSQL for application data
module "rds" {
  source = "./modules/rds"
  
  environment               = var.environment
  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnet_ids
  allowed_security_groups  = [module.eks.worker_security_group_id]
  
  # Database configuration
  engine_version          = var.rds_engine_version
  instance_class         = var.rds_instance_class
  allocated_storage      = var.rds_allocated_storage
  max_allocated_storage  = var.rds_max_allocated_storage
  
  # Backup and maintenance
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  # High availability
  multi_az               = true
  deletion_protection    = true
  
  tags = local.common_tags
}

# ElastiCache Redis for caching and sessions
module "elasticache" {
  source = "./modules/elasticache"
  
  environment             = var.environment
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.worker_security_group_id]
  
  # Redis configuration
  node_type               = var.redis_node_type
  num_cache_nodes        = var.redis_num_nodes
  port                   = 6379
  
  # Backup configuration
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  tags = local.common_tags
}

# S3 bucket for static assets and backups
module "s3" {
  source = "./modules/s3"
  
  environment = var.environment
  
  buckets = {
    static-assets = {
      versioning = true
      lifecycle_rules = [
        {
          id     = "delete_old_versions"
          status = "Enabled"
          noncurrent_version_expiration = {
            days = 30
          }
        }
      ]
    }
    
    backups = {
      versioning = true
      lifecycle_rules = [
        {
          id     = "transition_to_ia"
          status = "Enabled"
          transition = {
            days          = 30
            storage_class = "STANDARD_IA"
          }
        },
        {
          id     = "transition_to_glacier"
          status = "Enabled"
          transition = {
            days          = 90
            storage_class = "GLACIER"
          }
        }
      ]
    }
  }
  
  tags = local.common_tags
}

# ECR Repository for container images
resource "aws_ecr_repository" "website" {
  name                 = "candlefish-website"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle_policy {
    policy = jsonencode({
      rules = [
        {
          rulePriority = 1
          description  = "Keep last 30 images"
          selection = {
            tagStatus     = "tagged"
            tagPrefixList = ["v"]
            countType     = "imageCountMoreThan"
            countNumber   = 30
          }
          action = {
            type = "expire"
          }
        }
      ]
    })
  }

  tags = local.common_tags
}

# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.environment}/candlefish-website/app-secrets"
  description = "Application secrets for Candlefish website"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${module.rds.username}:${module.rds.password}@${module.rds.endpoint}:${module.rds.port}/${module.rds.database_name}"
    REDIS_URL    = "redis://${module.elasticache.primary_endpoint}:6379"
    JWT_SECRET   = random_password.jwt_secret.result
  })
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# IAM roles for EKS service accounts
module "iam" {
  source = "./modules/iam"
  
  environment  = var.environment
  cluster_name = module.eks.cluster_name
  oidc_issuer  = module.eks.cluster_oidc_issuer_url
  
  # Service account roles
  service_accounts = {
    website-app = {
      namespace = "production"
      policies = [
        "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
        aws_iam_policy.app_secrets_policy.arn,
        aws_iam_policy.s3_assets_policy.arn
      ]
    }
    
    aws-load-balancer-controller = {
      namespace = "kube-system"
      policies = [
        "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess"
      ]
    }
  }
  
  tags = local.common_tags
}

# IAM policy for accessing secrets
resource "aws_iam_policy" "app_secrets_policy" {
  name        = "${var.environment}-candlefish-website-secrets"
  description = "Policy for accessing application secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}

# IAM policy for S3 assets bucket
resource "aws_iam_policy" "s3_assets_policy" {
  name        = "${var.environment}-candlefish-website-s3-assets"
  description = "Policy for accessing S3 assets bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${module.s3.bucket_arns["static-assets"]}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = module.s3.bucket_arns["static-assets"]
      }
    ]
  })
}

# Route53 DNS record
resource "aws_route53_record" "website" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.cloudfront.domain_name
    zone_id               = module.cloudfront.hosted_zone_id
    evaluate_target_health = false
  }
}