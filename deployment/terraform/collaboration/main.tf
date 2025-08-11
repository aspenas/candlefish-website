# Terraform configuration for Candlefish Collaboration System Infrastructure
terraform {
  required_version = ">= 1.5"

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
    key            = "collaboration/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Configure providers
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "candlefish-collaboration"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Random password generation
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# VPC and networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # EKS requirements
  public_subnet_tags = {
    "kubernetes.io/role/elb"                                = "1"
    "kubernetes.io/cluster/${var.cluster_name}"            = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                       = "1"
    "kubernetes.io/cluster/${var.cluster_name}"            = "shared"
  }

  tags = {
    Terraform = "true"
    Environment = var.environment
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name                   = var.cluster_name
  cluster_version                = var.kubernetes_version
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    # General purpose nodes
    general = {
      name           = "general"
      instance_types = ["m6i.large", "m6i.xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 3
      max_size     = 20
      desired_size = 6

      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "general"
      }

      update_config = {
        max_unavailable_percentage = 33
      }

      # Use custom launch template for optimized settings
      create_launch_template = true
      launch_template_name   = "general-${random_id.node_group_id.hex}"

      disk_size = 100
      disk_type = "gp3"
      disk_encrypted = true

      remote_access = {
        ec2_ssh_key = var.ec2_key_pair_name
        source_security_group_ids = [aws_security_group.admin_access.id]
      }
    }

    # Compute optimized nodes for document processing
    compute_optimized = {
      name           = "compute-optimized"
      instance_types = ["c6i.large", "c6i.xlarge"]
      capacity_type  = "SPOT"

      min_size     = 0
      max_size     = 10
      desired_size = 2

      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "compute-optimized"
        WorkloadType = "document-processing"
      }

      taints = [
        {
          key    = "workload-type"
          value  = "compute-intensive"
          effect = "NO_SCHEDULE"
        }
      ]

      create_launch_template = true
      launch_template_name   = "compute-optimized-${random_id.node_group_id.hex}"

      disk_size = 50
      disk_type = "gp3"
      disk_encrypted = true
    }

    # Memory optimized nodes for Redis and caching
    memory_optimized = {
      name           = "memory-optimized"
      instance_types = ["r6i.large", "r6i.xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 1
      max_size     = 5
      desired_size = 2

      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "memory-optimized"
        WorkloadType = "memory-intensive"
      }

      taints = [
        {
          key    = "workload-type"
          value  = "memory-intensive"
          effect = "NO_SCHEDULE"
        }
      ]

      create_launch_template = true
      launch_template_name   = "memory-optimized-${random_id.node_group_id.hex}"

      disk_size = 100
      disk_type = "gp3"
      disk_encrypted = true
    }
  }

  # Security groups
  node_security_group_additional_rules = {
    ingress_allow_access_from_control_plane = {
      type                          = "ingress"
      protocol                      = "tcp"
      from_port                     = 9443
      to_port                       = 9443
      source_cluster_security_group = true
      description                   = "Allow access from control plane to webhook port of AWS load balancer controller"
    }

    # Allow nodes to communicate with each other
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  tags = {
    Environment = var.environment
  }
}

# Random ID for node groups
resource "random_id" "node_group_id" {
  byte_length = 4
}

# Configure Kubernetes provider
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

# Security Groups
resource "aws_security_group" "admin_access" {
  name_prefix = "${var.project_name}-${var.environment}-admin-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for admin access to EKS nodes"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_access_cidrs
    description = "SSH access for administrators"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-admin-sg"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for RDS database"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
    description     = "PostgreSQL access from EKS cluster"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${var.project_name}-${var.environment}-elasticache-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for ElastiCache Redis"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
    description     = "Redis access from EKS cluster"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-elasticache-sg"
  }
}
