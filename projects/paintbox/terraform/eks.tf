# EKS Cluster for Kubernetes orchestration
# This provides a managed Kubernetes control plane for container orchestration

# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster" {
  name = "paintbox-eks-cluster-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Node Group IAM Role
resource "aws_iam_role" "eks_node_group" {
  name = "paintbox-eks-node-group-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group.name
}

# Additional policy for AWS Load Balancer Controller
resource "aws_iam_role_policy" "eks_node_group_additional" {
  name = "paintbox-eks-node-group-additional"
  role = aws_iam_role.eks_node_group.id

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
          "cloudwatch:PutMetricData",
          "ec2:DescribeVolumes",
          "ec2:DescribeTags",
          "logs:PutLogEvents",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })
}

# EKS Cluster Security Group
resource "aws_security_group" "eks_cluster" {
  name        = "paintbox-eks-cluster-${var.environment}"
  description = "Security group for EKS cluster control plane"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    description = "HTTPS from anywhere"
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
    Name = "paintbox-eks-cluster-sg-${var.environment}"
  })
}

# EKS Node Security Group
resource "aws_security_group" "eks_nodes" {
  name        = "paintbox-eks-nodes-${var.environment}"
  description = "Security group for EKS worker nodes"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    description = "Node to node communication"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description     = "Allow pods to communicate with cluster API Server"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  ingress {
    description = "Allow ALB ingress controller"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.paintbox.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name                                                  = "paintbox-eks-nodes-sg-${var.environment}"
    "kubernetes.io/cluster/paintbox-${var.environment}" = "owned"
  })
}

# EKS Cluster
resource "aws_eks_cluster" "paintbox" {
  name     = "paintbox-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    security_group_ids      = [aws_security_group.eks_cluster.id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.environment == "production" ? var.allowed_cidr_blocks : ["0.0.0.0/0"]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.paintbox.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_cloudwatch_log_group.eks_cluster,
  ]

  tags = local.common_tags
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/paintbox-${var.environment}/cluster"
  retention_in_days = var.environment == "production" ? 30 : 14
  kms_key_id        = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

# EKS Node Group
resource "aws_eks_node_group" "paintbox_nodes" {
  cluster_name    = aws_eks_cluster.paintbox.name
  node_group_name = "paintbox-nodes-${var.environment}"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = aws_subnet.private[*].id

  capacity_type  = var.environment == "production" ? "ON_DEMAND" : "SPOT"
  instance_types = var.environment == "production" ? ["t3.large"] : ["t3.medium"]

  scaling_config {
    desired_size = var.environment == "production" ? 3 : 2
    max_size     = var.environment == "production" ? 6 : 4
    min_size     = var.environment == "production" ? 2 : 1
  }

  update_config {
    max_unavailable = 1
  }

  # Launch template for additional configuration
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = "$Latest"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = merge(local.common_tags, {
    Name = "paintbox-eks-nodes-${var.environment}"
  })

  labels = {
    Environment = var.environment
    NodeGroup   = "paintbox-nodes"
  }
}

# Launch template for EKS nodes
resource "aws_launch_template" "eks_nodes" {
  name = "paintbox-eks-nodes-${var.environment}"

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 50
      volume_type = "gp3"
      encrypted   = true
      kms_key_id  = aws_kms_key.paintbox.arn
    }
  }

  vpc_security_group_ids = [aws_security_group.eks_nodes.id]

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    cluster_name     = aws_eks_cluster.paintbox.name
    cluster_endpoint = aws_eks_cluster.paintbox.endpoint
    cluster_ca       = aws_eks_cluster.paintbox.certificate_authority[0].data
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name                                                  = "paintbox-eks-node-${var.environment}"
      "kubernetes.io/cluster/paintbox-${var.environment}" = "owned"
    })
  }

  tags = local.common_tags
}

# EKS Addons
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.paintbox.name
  addon_name   = "vpc-cni"
  
  tags = local.common_tags
}

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.paintbox.name
  addon_name   = "coredns"
  
  depends_on = [aws_eks_node_group.paintbox_nodes]
  tags = local.common_tags
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.paintbox.name
  addon_name   = "kube-proxy"
  
  tags = local.common_tags
}

resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.paintbox.name
  addon_name   = "aws-ebs-csi-driver"
  
  tags = local.common_tags
}

# OIDC Identity Provider for EKS
data "tls_certificate" "eks_oidc" {
  url = aws_eks_cluster.paintbox.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks_oidc" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks_oidc.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.paintbox.identity[0].oidc[0].issuer

  tags = local.common_tags
}

# AWS Load Balancer Controller IAM Role
resource "aws_iam_role" "aws_load_balancer_controller" {
  count = var.environment == "production" ? 1 : 0
  name  = "AmazonEKSLoadBalancerControllerRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks_oidc.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks_oidc.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(aws_iam_openid_connect_provider.eks_oidc.url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "aws_load_balancer_controller" {
  count = var.environment == "production" ? 1 : 0
  name  = "AWSLoadBalancerControllerIAMPolicy-${var.environment}"

  policy = file("${path.module}/policies/aws-load-balancer-controller-policy.json")

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  count      = var.environment == "production" ? 1 : 0
  policy_arn = aws_iam_policy.aws_load_balancer_controller[0].arn
  role       = aws_iam_role.aws_load_balancer_controller[0].name
}

# ECR Repository for container images
resource "aws_ecr_repository" "paintbox_frontend" {
  name                 = "paintbox/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.paintbox.arn
  }

  lifecycle_policy {
    policy = jsonencode({
      rules = [
        {
          rulePriority = 1
          description  = "Keep last 30 production images"
          selection = {
            tagStatus     = "tagged"
            tagPrefixList = ["v", "prod"]
            countType     = "imageCountMoreThan"
            countNumber   = 30
          }
          action = {
            type = "expire"
          }
        },
        {
          rulePriority = 2
          description  = "Keep last 10 untagged images"
          selection = {
            tagStatus   = "untagged"
            countType   = "imageCountMoreThan"
            countNumber = 10
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

resource "aws_ecr_repository" "paintbox_apollo_router" {
  name                 = "paintbox/apollo-router"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.paintbox.arn
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "paintbox_subgraphs" {
  for_each = toset(["customers", "projects", "estimates", "integrations"])
  
  name                 = "paintbox/subgraph-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.paintbox.arn
  }

  tags = local.common_tags
}