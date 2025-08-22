# Real-time Performance Monitoring - AWS Infrastructure
# Production-ready Terraform configuration for RTPM platform

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "candlefish-terraform-state"
    key            = "rtpm/terraform.tfstate"
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
      Project     = "RTPM"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "Candlefish"
      CostCenter  = "Engineering"
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
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values
locals {
  name   = "rtpm-${var.environment}"
  region = var.aws_region

  vpc_cidr = "10.0.0.0/16"
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)

  tags = {
    Example    = local.name
    GithubRepo = "candlefish-ai"
    GithubOrg  = "candlefish"
  }
}

################################################################################
# VPC
################################################################################

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = local.name
  cidr = local.vpc_cidr

  azs             = local.azs
  private_subnets = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 4, k)]
  public_subnets  = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 48)]
  intra_subnets   = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 52)]

  enable_nat_gateway = true
  single_nat_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.tags
}

################################################################################
# EKS Cluster
################################################################################

module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.15"

  cluster_name    = "${local.name}-cluster"
  cluster_version = "1.28"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    # General purpose nodes for API and frontend
    general = {
      name = "general"

      instance_types = ["t3.large", "t3a.large"]
      capacity_type  = "SPOT"

      min_size     = 3
      max_size     = 20
      desired_size = 6

      # Launch template configuration
      launch_template_name = "${local.name}-general"
      description = "EKS managed node group for general workloads"

      ebs_optimized = true
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 50
            volume_type           = "gp3"
            iops                  = 3000
            throughput            = 150
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 2
        instance_metadata_tags      = "disabled"
      }

      create_iam_role          = true
      iam_role_name            = "${local.name}-eks-managed-node-group-general"
      iam_role_use_name_prefix = false
      iam_role_description     = "EKS managed node group IAM role"
      iam_role_tags = {
        Purpose = "Protector of the kubelet"
      }
      iam_role_additional_policies = {
        AmazonEKSWorkerNodePolicy          = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
        AmazonEKS_CNI_Policy               = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
        AmazonEC2ContainerRegistryReadOnly = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
        AmazonEBSCSIDriverPolicy          = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
      }

      labels = {
        "node-type" = "general"
      }

      taints = {}

      tags = {
        ExtraTag = "general-nodes"
      }
    }

    # High-performance nodes for TimescaleDB and Redis
    database = {
      name = "database"

      instance_types = ["r5.xlarge", "r5a.xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      max_size     = 6
      desired_size = 3

      # Launch template configuration
      launch_template_name = "${local.name}-database"
      description = "EKS managed node group for database workloads"

      ebs_optimized = true
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            iops                  = 4000
            throughput            = 250
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      create_iam_role          = true
      iam_role_name            = "${local.name}-eks-managed-node-group-database"
      iam_role_use_name_prefix = false

      labels = {
        "node-type" = "database"
      }

      taints = {
        database = {
          key    = "database"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }

      tags = {
        ExtraTag = "database-nodes"
      }
    }

    # Worker nodes for Celery tasks
    workers = {
      name = "workers"

      instance_types = ["c5.large", "c5a.large"]
      capacity_type  = "SPOT"

      min_size     = 2
      max_size     = 20
      desired_size = 4

      # Launch template configuration
      launch_template_name = "${local.name}-workers"
      description = "EKS managed node group for worker tasks"

      labels = {
        "node-type" = "workers"
      }

      taints = {}

      tags = {
        ExtraTag = "worker-nodes"
      }
    }
  }

  # Fargate profiles for scheduled tasks
  fargate_profiles = {
    default = {
      name = "default"
      selectors = [
        {
          namespace = "fargate"
          labels = {
            workload = "fargate"
          }
        }
      ]

      tags = {
        Owner = "fargate"
      }

      timeouts = {
        create = "20m"
        delete = "20m"
      }
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true

  aws_auth_roles = [
    {
      rolearn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/github-actions-role"
      username = "github-actions"
      groups   = ["system:masters"]
    },
  ]

  aws_auth_users = [
    {
      userarn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/admin"
      username = "admin"
      groups   = ["system:masters"]
    },
  ]

  tags = local.tags
}

################################################################################
# EKS Blueprints Addons
################################################################################

module "eks_blueprints_addons" {
  source = "aws-ia/eks-blueprints-addons/aws"
  version = "~> 1.2"

  cluster_name      = module.eks.cluster_name
  cluster_endpoint  = module.eks.cluster_endpoint
  cluster_version   = module.eks.cluster_version
  oidc_provider_arn = module.eks.oidc_provider_arn

  # EKS Add-ons
  eks_addons = {
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_driver_irsa.iam_role_arn
    }
    coredns = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
  }

  # Add-ons
  enable_aws_load_balancer_controller = true
  enable_cluster_autoscaler           = true
  enable_metrics_server               = true
  enable_cert_manager                 = true
  enable_external_dns                 = true
  enable_external_secrets             = true

  # Prometheus and Grafana for monitoring
  enable_kube_prometheus_stack = true
  kube_prometheus_stack = {
    values = [
      <<-EOT
        prometheus:
          prometheusSpec:
            retention: 30d
            storageSpec:
              volumeClaimTemplate:
                spec:
                  storageClassName: gp3
                  accessModes: ["ReadWriteOnce"]
                  resources:
                    requests:
                      storage: 50Gi
        grafana:
          persistence:
            enabled: true
            storageClassName: gp3
            size: 10Gi
          adminPassword: ${random_password.grafana_admin_password.result}
        alertmanager:
          alertmanagerSpec:
            storage:
              volumeClaimTemplate:
                spec:
                  storageClassName: gp3
                  accessModes: ["ReadWriteOnce"]
                  resources:
                    requests:
                      storage: 10Gi
      EOT
    ]
  }

  # EFS CSI Driver for shared storage
  enable_aws_efs_csi_driver = true

  # Ingress controllers
  enable_ingress_nginx = true
  ingress_nginx = {
    values = [
      <<-EOT
        controller:
          service:
            annotations:
              service.beta.kubernetes.io/aws-load-balancer-type: nlb
              service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
          metrics:
            enabled: true
            serviceMonitor:
              enabled: true
          config:
            use-gzip: "true"
            gzip-types: "*"
            enable-brotli: "true"
      EOT
    ]
  }

  tags = local.tags
}

################################################################################
# Supporting Resources
################################################################################

# EBS CSI Driver IRSA
module "ebs_csi_driver_irsa" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.20"

  role_name             = "${local.name}-ebs-csi-driver"
  attach_ebs_csi_policy = true

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }

  tags = local.tags
}

# Random password for Grafana
resource "random_password" "grafana_admin_password" {
  length  = 16
  special = true
}

# Store Grafana password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "grafana_admin_password" {
  name                    = "${local.name}-grafana-admin-password"
  description             = "Grafana admin password for RTPM monitoring"
  recovery_window_in_days = 7

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "grafana_admin_password" {
  secret_id = aws_secretsmanager_secret.grafana_admin_password.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.grafana_admin_password.result
  })
}

################################################################################
# RDS (PostgreSQL/TimescaleDB)
################################################################################

# Create RDS subnet group
resource "aws_db_subnet_group" "rtpm" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = merge(local.tags, {
    Name = "${local.name}-db-subnet-group"
  })
}

# Create RDS parameter group for PostgreSQL optimization
resource "aws_db_parameter_group" "rtpm" {
  family = "postgres15"
  name   = "${local.name}-db-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "timescaledb,pg_stat_statements"
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "work_mem"
    value = "4MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "64MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "1GB"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name  = "log_statement"
    value = "mod"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = local.tags
}

# RDS security group
resource "aws_security_group" "rds" {
  name_prefix = "${local.name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
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

  tags = merge(local.tags, {
    Name = "${local.name}-rds-sg"
  })
}

# Generate random password for RDS
resource "random_password" "rds_password" {
  length  = 32
  special = true
}

# Store RDS credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_credentials" {
  name                    = "${local.name}-rds-credentials"
  description             = "RDS credentials for RTPM TimescaleDB"
  recovery_window_in_days = 7

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id
  secret_string = jsonencode({
    username = "rtpm_admin"
    password = random_password.rds_password.result
    engine   = "postgres"
    host     = aws_db_instance.rtpm.endpoint
    port     = 5432
    dbname   = aws_db_instance.rtmp.db_name
  })
}

# RDS instance
resource "aws_db_instance" "rtpm" {
  identifier     = "${local.name}-timescaledb"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.environment == "production" ? "db.r5.xlarge" : "db.t3.medium"

  allocated_storage     = var.environment == "production" ? 500 : 100
  max_allocated_storage = var.environment == "production" ? 2000 : 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "rtpm_db"
  username = "rtmp_admin"
  password = random_password.rds_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.rtpm.name
  parameter_group_name   = aws_db_parameter_group.rtpm.name

  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  performance_insights_enabled = true
  performance_insights_retention_period = var.environment == "production" ? 731 : 7

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(local.tags, {
    Name = "${local.name}-timescaledb"
  })
}

# RDS Enhanced Monitoring IAM Role
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name_prefix = "${local.name}-rds-monitoring-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

################################################################################
# ElastiCache (Redis)
################################################################################

# ElastiCache subnet group
resource "aws_elasticache_subnet_group" "rtpm" {
  name       = "${local.name}-cache-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = local.tags
}

# ElastiCache parameter group
resource "aws_elasticache_parameter_group" "rtpm" {
  family = "redis7.x"
  name   = "${local.name}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = local.tags
}

# ElastiCache security group
resource "aws_security_group" "elasticache" {
  name_prefix = "${local.name}-elasticache-"
  vpc_id      = module.vpc.vpc_id

  ingress {
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

  tags = merge(local.tags, {
    Name = "${local.name}-elasticache-sg"
  })
}

# Generate auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 64
  special = false
}

# Store Redis auth token in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${local.name}-redis-auth-token"
  description             = "Redis auth token for RTPM"
  recovery_window_in_days = 7

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    host       = aws_elasticache_replication_group.rtpm.primary_endpoint_address
    port       = 6379
  })
}

# ElastiCache Redis cluster
resource "aws_elasticache_replication_group" "rtpm" {
  replication_group_id         = "${local.name}-redis"
  description                  = "Redis cluster for RTPM"

  port                         = 6379
  parameter_group_name         = aws_elasticache_parameter_group.rtpm.name
  subnet_group_name            = aws_elasticache_subnet_group.rtpm.name
  security_group_ids           = [aws_security_group.elasticache.id]

  node_type                    = var.environment == "production" ? "cache.r6g.large" : "cache.t3.micro"
  num_cache_clusters           = var.environment == "production" ? 3 : 2

  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  auth_token                   = random_password.redis_auth_token.result

  automatic_failover_enabled   = true
  multi_az_enabled            = var.environment == "production"

  maintenance_window          = "sun:05:00-sun:06:00"
  snapshot_retention_limit    = var.environment == "production" ? 7 : 1
  snapshot_window             = "03:00-05:00"

  apply_immediately           = var.environment != "production"

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = merge(local.tags, {
    Name = "${local.name}-redis"
  })
}

# CloudWatch log group for Redis slow logs
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${local.name}/slow-log"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = local.tags
}

################################################################################
# ECR Repositories
################################################################################

resource "aws_ecr_repository" "rtpm_api" {
  name                 = "rtpm-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.tags
}

resource "aws_ecr_repository" "rtpm_frontend" {
  name                 = "rtpm-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.tags
}

# ECR lifecycle policies
resource "aws_ecr_lifecycle_policy" "rtpm_api" {
  repository = aws_ecr_repository.rtpm_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "rtpm_frontend" {
  repository = aws_ecr_repository.rtpm_frontend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
