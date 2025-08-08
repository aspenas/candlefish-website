# Paintbox Infrastructure as Code
# AWS resources for secure production deployment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state backend
  backend "s3" {
    bucket         = "paintbox-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "paintbox-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Paintbox"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "CandlefishAI"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = {
    Project     = "Paintbox"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# KMS Key for encryption
resource "aws_kms_key" "paintbox" {
  description             = "Paintbox application encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow application access"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.paintbox_app.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_kms_alias" "paintbox" {
  name          = "alias/paintbox-${var.environment}"
  target_key_id = aws_kms_key.paintbox.key_id
}

# Secrets Manager for secure secret storage
resource "aws_secretsmanager_secret" "paintbox_secrets" {
  name                    = "paintbox-${var.environment}"
  description             = "Paintbox application secrets"
  kms_key_id              = aws_kms_key.paintbox.arn
  recovery_window_in_days = 7

  replica {
    region     = "us-west-2"
    kms_key_id = aws_kms_key.paintbox.arn
  }

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "paintbox_secrets" {
  secret_id = aws_secretsmanager_secret.paintbox_secrets.id
  secret_string = jsonencode({
    SALESFORCE_CLIENT_ID     = var.salesforce_client_id
    SALESFORCE_CLIENT_SECRET = var.salesforce_client_secret
    SALESFORCE_USERNAME      = var.salesforce_username
    SALESFORCE_PASSWORD      = var.salesforce_password
    SALESFORCE_SECURITY_TOKEN = var.salesforce_security_token
    SALESFORCE_INSTANCE_URL  = var.salesforce_instance_url
    COMPANYCAM_API_TOKEN     = var.companycam_api_token
    COMPANYCAM_WEBHOOK_SECRET = var.companycam_webhook_secret
    ANTHROPIC_API_KEY        = var.anthropic_api_key
    DATABASE_URL             = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.paintbox.endpoint}:5432/${aws_db_instance.paintbox.db_name}"
    REDIS_URL                = "redis://${aws_elasticache_replication_group.paintbox.configuration_endpoint_address}:6379"
    ENCRYPTION_KEY           = var.encryption_key
    JWT_SECRET               = var.jwt_secret
    NEXTAUTH_SECRET          = var.nextauth_secret
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# IAM Role for application
resource "aws_iam_role" "paintbox_app" {
  name = "paintbox-app-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["ec2.amazonaws.com", "ecs-tasks.amazonaws.com"]
        }
      },
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:candlefish-ai/paintbox:*"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "paintbox_app_policy" {
  name = "paintbox-app-policy"
  role = aws_iam_role.paintbox_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.paintbox_secrets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.paintbox.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/paintbox/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      }
    ]
  })
}

# VPC for network isolation
resource "aws_vpc" "paintbox" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "paintbox-vpc-${var.environment}"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "paintbox" {
  vpc_id = aws_vpc.paintbox.id

  tags = merge(local.common_tags, {
    Name = "paintbox-igw-${var.environment}"
  })
}

# Public Subnets
resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.paintbox.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "paintbox-public-subnet-${count.index + 1}-${var.environment}"
    Type = "public"
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.paintbox.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "paintbox-private-subnet-${count.index + 1}-${var.environment}"
    Type = "private"
  })
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.paintbox.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.paintbox.id
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-public-rt-${var.environment}"
  })
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# NAT Gateway for private subnet internet access
resource "aws_eip" "nat" {
  count = var.environment == "production" ? 2 : 1

  domain = "vpc"
  tags = merge(local.common_tags, {
    Name = "paintbox-nat-eip-${count.index + 1}-${var.environment}"
  })
}

resource "aws_nat_gateway" "paintbox" {
  count = var.environment == "production" ? 2 : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(local.common_tags, {
    Name = "paintbox-nat-gw-${count.index + 1}-${var.environment}"
  })

  depends_on = [aws_internet_gateway.paintbox]
}

resource "aws_route_table" "private" {
  count = var.environment == "production" ? 2 : 1

  vpc_id = aws_vpc.paintbox.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.paintbox[count.index].id
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-private-rt-${count.index + 1}-${var.environment}"
  })
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[min(count.index, length(aws_route_table.private) - 1)].id
}

# Security Groups
resource "aws_security_group" "database" {
  name        = "paintbox-database-${var.environment}"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-database-sg-${var.environment}"
  })
}

resource "aws_security_group" "redis" {
  name        = "paintbox-redis-${var.environment}"
  description = "Security group for Redis cache"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-redis-sg-${var.environment}"
  })
}

resource "aws_security_group" "app" {
  name        = "paintbox-app-${var.environment}"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
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
    Name = "paintbox-app-sg-${var.environment}"
  })
}

# RDS PostgreSQL Database
resource "aws_db_subnet_group" "paintbox" {
  name       = "paintbox-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(local.common_tags, {
    Name = "paintbox-db-subnet-group-${var.environment}"
  })
}

resource "aws_db_instance" "paintbox" {
  identifier = "paintbox-${var.environment}"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.environment == "production" ? "db.t3.medium" : "db.t3.micro"

  allocated_storage     = var.environment == "production" ? 100 : 20
  max_allocated_storage = var.environment == "production" ? 1000 : 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.paintbox.arn

  db_name  = "paintbox"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.paintbox.name

  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = var.environment != "production"
  deletion_protection = var.environment == "production"

  performance_insights_enabled = var.environment == "production"
  monitoring_interval         = var.environment == "production" ? 60 : 0

  auto_minor_version_upgrade = true
  apply_immediately         = false

  tags = merge(local.common_tags, {
    Name = "paintbox-database-${var.environment}"
  })
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "paintbox" {
  name       = "paintbox-cache-subnet-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(local.common_tags, {
    Name = "paintbox-cache-subnet-group-${var.environment}"
  })
}

resource "aws_elasticache_replication_group" "paintbox" {
  replication_group_id         = "paintbox-${var.environment}"
  description                  = "Redis cluster for Paintbox application"

  node_type                    = var.environment == "production" ? "cache.t3.medium" : "cache.t3.micro"
  port                         = 6379
  parameter_group_name         = "default.redis7"

  num_cache_clusters           = var.environment == "production" ? 2 : 1

  subnet_group_name            = aws_elasticache_subnet_group.paintbox.name
  security_group_ids           = [aws_security_group.redis.id]

  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  auth_token                   = var.redis_auth_token

  snapshot_retention_limit     = var.environment == "production" ? 7 : 1
  snapshot_window              = "03:00-05:00"
  maintenance_window           = "sun:05:00-sun:07:00"

  auto_minor_version_upgrade   = true

  tags = merge(local.common_tags, {
    Name = "paintbox-redis-${var.environment}"
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "paintbox_app" {
  name              = "/aws/paintbox/app-${var.environment}"
  retention_in_days = var.environment == "production" ? 30 : 14
  kms_key_id        = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "paintbox_api" {
  name              = "/aws/paintbox/api-${var.environment}"
  retention_in_days = var.environment == "production" ? 30 : 14
  kms_key_id        = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}
