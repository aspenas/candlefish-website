# Paintbox Cloud Infrastructure - Main Configuration
# Target Budget: $200-500/month
# Multi-tenant paint estimation platform with analytics

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "paintbox-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "paintbox-terraform-locks"
    encrypt        = true
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "system-analyzer"
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random suffix for unique naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc-${var.environment}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}-${var.environment}"
    Type = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}-${var.environment}"
    Type = "private"
  }
}

# Database Subnets
resource "aws_subnet" "database" {
  count             = length(var.database_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-database-subnet-${count.index + 1}-${var.environment}"
    Type = "database"
  }
}

# NAT Gateways
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? length(aws_subnet.public) : 0
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip-${count.index + 1}-${var.environment}"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? length(aws_subnet.public) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-nat-gateway-${count.index + 1}-${var.environment}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt-${var.environment}"
    Type = "public"
  }
}

resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? length(aws_nat_gateway.main) : 1
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[count.index].id
    }
  }

  tags = {
    Name = "${var.project_name}-private-rt-${count.index + 1}-${var.environment}"
    Type = "private"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.enable_nat_gateway ? count.index : 0].id
}

# Security Groups
resource "aws_security_group" "eks_cluster" {
  name_prefix = "${var.project_name}-eks-cluster-"
  vpc_id      = aws_vpc.main.id

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

  tags = {
    Name = "${var.project_name}-eks-cluster-sg-${var.environment}"
  }
}

resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.project_name}-eks-nodes-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Node to node communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  ingress {
    description     = "Cluster API to node communication"
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-eks-nodes-sg-${var.environment}"
  }
}

resource "aws_security_group" "database" {
  name_prefix = "${var.project_name}-database-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-database-sg-${var.environment}"
  }
}

resource "aws_security_group" "cache" {
  name_prefix = "${var.project_name}-cache-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from EKS nodes"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-cache-sg-${var.environment}"
  }
}

# Database Subnet Group
resource "aws_db_subnet_group" "database" {
  name       = "${var.project_name}-database-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "${var.project_name}-database-subnet-group-${var.environment}"
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "cache" {
  name       = "${var.project_name}-cache-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "${var.project_name}-cache-subnet-group-${var.environment}"
  }
}

# S3 Bucket for application assets and backups
resource "aws_s3_bucket" "app_assets" {
  bucket = "${var.project_name}-assets-${var.environment}-${random_string.suffix.result}"

  tags = {
    Name        = "${var.project_name}-assets-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/application/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.project_name}-${var.environment}/cluster"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

# KMS Key for encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for ${var.project_name} ${var.environment}"
  deletion_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-kms-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project_name}-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}

# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "database" {
  name        = "${var.project_name}/database/${var.environment}"
  description = "Database credentials for ${var.project_name} ${var.environment}"
  kms_key_id  = aws_kms_key.main.arn

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

resource "aws_secretsmanager_secret" "redis" {
  name        = "${var.project_name}/redis/${var.environment}"
  description = "Redis credentials for ${var.project_name} ${var.environment}"
  kms_key_id  = aws_kms_key.main.arn

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

resource "aws_secretsmanager_secret" "api" {
  name        = "${var.project_name}/api/${var.environment}"
  description = "API secrets for ${var.project_name} ${var.environment}"
  kms_key_id  = aws_kms_key.main.arn

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

# Generate random passwords for database and Redis
resource "random_password" "database_password" {
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

# Store secrets in AWS Secrets Manager
resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = var.database_username
    password = random_password.database_password.result
    engine   = "postgres"
    host     = module.database.db_instance_endpoint
    port     = 5432
    database = var.database_name
    url      = "postgresql://${var.database_username}:${random_password.database_password.result}@${module.database.db_instance_endpoint}:5432/${var.database_name}"
  })
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    password = random_password.redis_password.result
    host     = module.cache.replication_group_primary_endpoint_address
    port     = 6379
    url      = "redis://:${random_password.redis_password.result}@${module.cache.replication_group_primary_endpoint_address}:6379/0"
  })
}

resource "aws_secretsmanager_secret_version" "api" {
  secret_id = aws_secretsmanager_secret.api.id
  secret_string = jsonencode({
    jwt-secret     = random_password.jwt_secret.result
    encryption-key = random_password.encryption_key.result
  })
}

# Output important values
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of IDs of database subnets"
  value       = aws_subnet.database[*].id
}

output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = aws_security_group.eks_cluster.id
}

output "eks_nodes_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = aws_security_group.eks_nodes.id
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.app_assets.bucket
}

output "kms_key_id" {
  description = "The globally unique identifier for the key"
  value       = aws_kms_key.main.key_id
}

output "kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the key"
  value       = aws_kms_key.main.arn
}

output "secrets_arns" {
  description = "ARNs of the secrets"
  value = {
    database = aws_secretsmanager_secret.database.arn
    redis    = aws_secretsmanager_secret.redis.arn
    api      = aws_secretsmanager_secret.api.arn
  }
}
