# Candlefish AI - Complete Infrastructure as Code
# AWS EKS-based unified deployment with cost optimization
# Target Budget: $200-800/month with autoscaling

terraform {
  required_version = ">= 1.5.0"

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "candlefish-terraform-locks"
    encrypt        = true
  }
}

# Local variables for common configurations
locals {
  project_name = "candlefish"
  environment  = var.environment

  # Cost optimization: Use spot instances for non-critical workloads
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "terraform"
    CostCenter  = "engineering"
  }

  # Multi-AZ for high availability but cost-conscious
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Random suffix for unique resource naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

#============================================================================
# VPC and Networking
#============================================================================

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.project_name}-vpc-${local.environment}"
  cidr = var.vpc_cidr

  azs             = local.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  # Cost optimization: Single NAT Gateway per environment
  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"
  enable_vpn_gateway = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Endpoints for cost optimization (reduce NAT Gateway usage)
  enable_s3_endpoint       = true
  enable_ecr_api_endpoint  = true
  enable_ecr_dkr_endpoint  = true

  # EKS specific tags
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/${local.project_name}-${local.environment}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${local.project_name}-${local.environment}" = "shared"
  }

  tags = local.common_tags
}

#============================================================================
# EKS Cluster
#============================================================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${local.project_name}-${local.environment}"
  cluster_version = var.kubernetes_version

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true

  # Cost optimization: Disable unnecessary logging
  cluster_enabled_log_types = var.environment == "production" ?
    ["api", "audit", "authenticator"] :
    ["api"]

  # Security
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  # EKS Managed Node Groups with mixed instance types for cost optimization
  eks_managed_node_groups = {
    general = {
      name = "general-${local.environment}"

      instance_types = var.environment == "production" ?
        ["t3.medium", "t3.large"] :
        ["t3.small", "t3.medium"]

      # Cost optimization: Use spot instances for non-production
      capacity_type = var.environment == "production" ? "ON_DEMAND" : "SPOT"

      min_size     = var.environment == "production" ? 3 : 1
      max_size     = var.environment == "production" ? 20 : 10
      desired_size = var.environment == "production" ? 6 : 2

      # Use latest EKS optimized AMI
      ami_type = "AL2_x86_64"

      disk_size = 50  # Cost optimization: Smaller root volume
      disk_type = "gp3"  # Cost optimization: gp3 instead of gp2

      # Labels and taints
      labels = {
        Environment = local.environment
        NodeGroup   = "general"
      }

      # Instance metadata options for security
      metadata_options = {
        http_endpoint = "enabled"
        http_tokens   = "required"
        http_put_response_hop_limit = 2
        instance_metadata_tags      = "disabled"
      }

      # User data for node customization
      user_data_template_path = "./templates/user_data.sh"

      tags = merge(local.common_tags, {
        "k8s.io/cluster-autoscaler/${local.project_name}-${local.environment}" = "owned"
        "k8s.io/cluster-autoscaler/enabled" = "true"
      })
    }

    # Compute-optimized nodes for resource-intensive workloads (production only)
    compute = var.environment == "production" ? {
      name = "compute-${local.environment}"

      instance_types = ["c5.large", "c5.xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 0
      max_size     = 10
      desired_size = 0

      ami_type  = "AL2_x86_64"
      disk_size = 50
      disk_type = "gp3"

      labels = {
        Environment = local.environment
        NodeGroup   = "compute"
        WorkloadType = "compute-intensive"
      }

      taints = [
        {
          key    = "compute-intensive"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]

      tags = local.common_tags
    } : {}
  }

  # Fargate profiles for serverless workloads (cost optimization for low-traffic services)
  fargate_profiles = var.enable_fargate ? {
    monitoring = {
      name = "monitoring-${local.environment}"
      selectors = [
        {
          namespace = "monitoring"
          labels = {
            fargate = "enabled"
          }
        }
      ]

      subnet_ids = module.vpc.private_subnets
      tags = local.common_tags
    }
  } : {}

  # IRSA for service accounts
  manage_aws_auth_configmap = true

  aws_auth_roles = [
    {
      rolearn  = module.eks_admins_iam_role.iam_role_arn
      username = "eks-admin"
      groups   = ["system:masters"]
    },
  ]

  tags = local.common_tags
}

#============================================================================
# EKS Add-ons
#============================================================================

# AWS Load Balancer Controller
resource "aws_eks_addon" "aws_load_balancer_controller" {
  cluster_name = module.eks.cluster_name
  addon_name   = "aws-load-balancer-controller"

  depends_on = [module.eks]
}

# EBS CSI Driver for persistent volumes
resource "aws_eks_addon" "ebs_csi_driver" {
  cluster_name = module.eks.cluster_name
  addon_name   = "aws-ebs-csi-driver"

  depends_on = [module.eks]
}

# CoreDNS
resource "aws_eks_addon" "coredns" {
  cluster_name = module.eks.cluster_name
  addon_name   = "coredns"

  depends_on = [module.eks]
}

# kube-proxy
resource "aws_eks_addon" "kube_proxy" {
  cluster_name = module.eks.cluster_name
  addon_name   = "kube-proxy"

  depends_on = [module.eks]
}

# VPC CNI
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = module.eks.cluster_name
  addon_name   = "vpc-cni"

  depends_on = [module.eks]
}

#============================================================================
# IAM Roles and Policies
#============================================================================

# EKS Admins IAM Role
module "eks_admins_iam_role" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "${local.project_name}-eks-admins-${local.environment}"

  trusted_role_arns = [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
  ]

  role_policy_arns = {
    AmazonEKSClusterPolicy = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  }

  tags = local.common_tags
}

# Service Account for applications
module "candlefish_irsa" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "${local.project_name}-app-${local.environment}"

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["${local.project_name}-${local.environment}:candlefish-service-account"]
    }
  }

  # Application-specific policies
  role_policy_arns = {
    AmazonS3ReadOnlyAccess = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
  }

  role_policies = {
    secrets_manager = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ]
          Resource = "${aws_secretsmanager_secret.app_secrets.arn}*"
        }
      ]
    })
  }

  tags = local.common_tags
}

#============================================================================
# Secrets Management
#============================================================================

# KMS key for encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key for ${local.project_name}-${local.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.project_name}-eks-${local.environment}"
  target_key_id = aws_kms_key.eks.key_id
}

# Application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${local.project_name}/app/${local.environment}"
  description = "Application secrets for ${local.project_name} ${local.environment}"
  kms_key_id  = aws_kms_key.eks.arn

  replica {
    region = "us-east-1"  # Cross-region backup
  }

  tags = local.common_tags
}

# Generate secure random secrets
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

resource "random_password" "database_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

# Store secrets
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    jwt-secret     = random_password.jwt_secret.result
    encryption-key = random_password.encryption_key.result
    database-password = random_password.database_password.result
    redis-password    = random_password.redis_password.result
  })
}

#============================================================================
# Storage (RDS and ElastiCache)
#============================================================================

# Database subnet group
resource "aws_db_subnet_group" "main" {
  name       = "${local.project_name}-db-subnet-group-${local.environment}"
  subnet_ids = module.vpc.database_subnets

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-db-subnet-group-${local.environment}"
  })
}

# RDS PostgreSQL with cost optimization
resource "aws_db_instance" "postgresql" {
  identifier = "${local.project_name}-postgres-${local.environment}"

  # Cost optimization: Use smaller instances for non-production
  instance_class = var.environment == "production" ?
    var.db_instance_class_prod :
    var.db_instance_class_dev

  engine         = "postgres"
  engine_version = "16.1"

  allocated_storage     = var.environment == "production" ? 100 : 20
  max_allocated_storage = var.environment == "production" ? 1000 : 100
  storage_type          = "gp3"  # Cost optimization
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.eks.arn

  db_name  = "candlefish"
  username = "candlefish"
  password = random_password.database_password.result

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  port                   = 5432

  # Backup and maintenance
  backup_retention_period = var.environment == "production" ? 7 : 3
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Cost optimization: Disable multi-AZ for non-production
  multi_az = var.environment == "production"

  # Monitoring
  monitoring_interval = var.environment == "production" ? 60 : 0
  enabled_cloudwatch_logs_exports = var.environment == "production" ?
    ["postgresql"] :
    []

  # Performance insights for production
  performance_insights_enabled = var.environment == "production"

  # Deletion protection for production
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  tags = local.common_tags
}

# ElastiCache Redis with cost optimization
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.project_name}-cache-subnet-group-${local.environment}"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "${local.project_name}-redis-${local.environment}"
  description                  = "Redis cluster for ${local.project_name} ${local.environment}"

  port               = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis.name

  # Cost optimization: Smaller instances for non-production
  node_type = var.environment == "production" ?
    "cache.t3.medium" :
    "cache.t3.micro"

  # Cost optimization: Single node for dev, multi-node for production
  num_cache_clusters = var.environment == "production" ? 2 : 1

  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_password.result

  # Backup
  snapshot_retention_limit = var.environment == "production" ? 5 : 1
  snapshot_window         = "03:00-05:00"

  # Cost optimization: Disable automatic failover for dev
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"

  tags = local.common_tags
}

resource "aws_elasticache_parameter_group" "redis" {
  name   = "${local.project_name}-redis-params-${local.environment}"
  family = "redis7.x"

  # Performance optimizations
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }
}

#============================================================================
# Security Groups
#============================================================================

# EKS cluster security group
resource "aws_security_group" "eks_cluster" {
  name_prefix = "${local.project_name}-eks-cluster-${local.environment}-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-eks-cluster-sg-${local.environment}"
  })
}

# RDS security group
resource "aws_security_group" "rds" {
  name_prefix = "${local.project_name}-rds-${local.environment}-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "PostgreSQL from EKS"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-rds-sg-${local.environment}"
  })
}

# ElastiCache security group
resource "aws_security_group" "elasticache" {
  name_prefix = "${local.project_name}-elasticache-${local.environment}-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Redis from EKS"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-elasticache-sg-${local.environment}"
  })
}

#============================================================================
# CloudWatch and Monitoring
#============================================================================

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  name              = "/candlefish/${local.environment}/application"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${local.project_name}-${local.environment}/cluster"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = local.common_tags
}

# CloudWatch Alarms for cost monitoring
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "${local.project_name}-${local.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors EKS cluster CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    ClusterName = module.eks.cluster_name
  }

  tags = local.common_tags
}

# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  count = var.environment == "production" ? 1 : 0

  name = "${local.project_name}-${local.environment}-alerts"

  tags = local.common_tags
}

#============================================================================
# S3 Buckets for static assets and backups
#============================================================================

resource "aws_s3_bucket" "assets" {
  bucket = "${local.project_name}-assets-${local.environment}-${random_string.suffix.result}"

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.eks.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle configuration for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  depends_on = [aws_s3_bucket_versioning.assets]
  bucket     = aws_s3_bucket.assets.id

  rule {
    id     = "cost_optimization"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
