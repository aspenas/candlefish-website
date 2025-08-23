# Security Groups with Restricted Egress - REMEDIATION CR-001
# Fixed security groups with least-privilege egress rules

# ALB Security Group - Restricted Egress
resource "aws_security_group" "alb_secure" {
  name_prefix = "${var.project_name}-alb-secure-"
  vpc_id      = aws_vpc.main.id
  description = "Hardened security group for Application Load Balancer"
  
  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Restricted egress - only to internal targets
  egress {
    description     = "HTTPS to EKS nodes"
    from_port       = 30000
    to_port         = 32767
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_secure.id]
  }
  
  egress {
    description = "DNS queries to VPC"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  egress {
    description = "DNS queries TCP to VPC"
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  tags = {
    Name        = "${var.project_name}-alb-secure-sg"
    Environment = var.environment
    Remediation = "CR-001"
  }
}

# EKS Cluster Security Group - Restricted Egress
resource "aws_security_group" "eks_cluster_secure" {
  name_prefix = "${var.project_name}-eks-cluster-secure-"
  vpc_id      = aws_vpc.main.id
  description = "Hardened security group for EKS cluster control plane"
  
  ingress {
    description     = "API server from nodes"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_secure.id]
  }
  
  # Restricted egress
  egress {
    description     = "HTTPS to worker nodes"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_secure.id]
  }
  
  egress {
    description     = "Kubelet API to nodes"
    from_port       = 10250
    to_port         = 10250
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_secure.id]
  }
  
  egress {
    description = "DNS queries to VPC"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  tags = {
    Name        = "${var.project_name}-eks-cluster-secure-sg"
    Environment = var.environment
    Remediation = "CR-001"
  }
}

# EKS Node Security Group - Restricted Egress
resource "aws_security_group" "eks_nodes_secure" {
  name_prefix = "${var.project_name}-eks-nodes-secure-"
  vpc_id      = aws_vpc.main.id
  description = "Hardened security group for EKS worker nodes"
  
  ingress {
    description = "Allow nodes to communicate with each other"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }
  
  ingress {
    description     = "Allow pods to communicate with the cluster API"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster_secure.id]
  }
  
  ingress {
    description     = "Allow ALB to reach nodes"
    from_port       = 30000
    to_port         = 32767
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_secure.id]
  }
  
  ingress {
    description     = "Kubelet API from control plane"
    from_port       = 10250
    to_port         = 10250
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster_secure.id]
  }
  
  # Restricted egress rules
  egress {
    description     = "HTTPS to EKS API"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster_secure.id]
  }
  
  egress {
    description = "HTTPS to ECR endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    prefix_list_ids = [data.aws_prefix_list.s3.id]
  }
  
  egress {
    description = "HTTPS to AWS services via VPC endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds_secure.id]
  }
  
  egress {
    description     = "Redis to ElastiCache"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis_secure.id]
  }
  
  egress {
    description = "DNS queries to VPC"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  egress {
    description = "DNS queries TCP to VPC"
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  # Specific external API access (allowlisted)
  egress {
    description = "HTTPS to TikTok API"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [
      "34.96.0.0/16",    # TikTok API range
      "34.102.0.0/16"    # TikTok API secondary
    ]
  }
  
  egress {
    description = "HTTPS to Stripe API"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [
      "34.19.0.0/16",    # Stripe API
      "35.235.0.0/16"    # Stripe webhooks
    ]
  }
  
  tags = {
    Name        = "${var.project_name}-eks-nodes-secure-sg"
    Environment = var.environment
    Remediation = "CR-001"
  }
}

# RDS Security Group - Restricted
resource "aws_security_group" "rds_secure" {
  name_prefix = "${var.project_name}-rds-secure-"
  vpc_id      = aws_vpc.main.id
  description = "Hardened security group for RDS PostgreSQL"
  
  ingress {
    description     = "PostgreSQL from EKS nodes only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_secure.id]
  }
  
  # No egress needed for RDS
  
  tags = {
    Name        = "${var.project_name}-rds-secure-sg"
    Environment = var.environment
    Remediation = "CR-001"
  }
}

# Redis Security Group - Restricted
resource "aws_security_group" "redis_secure" {
  name_prefix = "${var.project_name}-redis-secure-"
  vpc_id      = aws_vpc.main.id
  description = "Hardened security group for ElastiCache Redis"
  
  ingress {
    description     = "Redis from EKS nodes only"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_secure.id]
  }
  
  # No egress needed for ElastiCache
  
  tags = {
    Name        = "${var.project_name}-redis-secure-sg"
    Environment = var.environment
    Remediation = "CR-001"
  }
}

# Data source for S3 prefix list (for ECR access)
data "aws_prefix_list" "s3" {
  name = "com.amazonaws.${data.aws_region.current.name}.s3"
}

data "aws_region" "current" {}