# EKS Node Groups for PromoterOS
# Creates separate node groups for different workload types

# API Node Group - General purpose nodes for API services
resource "aws_eks_node_group" "api" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-api-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids
  
  scaling_config {
    desired_size = var.api_nodes_desired_size
    max_size     = var.api_nodes_max_size
    min_size     = var.api_nodes_min_size
  }
  
  update_config {
    max_unavailable_percentage = 33
  }
  
  instance_types = var.api_instance_types
  capacity_type  = "ON_DEMAND"
  
  disk_size = 100
  
  remote_access {
    ec2_ssh_key = var.ssh_key_name
    source_security_group_ids = var.bastion_security_group_ids
  }
  
  labels = {
    workload    = "api"
    environment = var.environment
  }
  
  taints {
    key    = "workload"
    value  = "api"
    effect = "NO_SCHEDULE"
  }
  
  tags = {
    Name        = "${var.project_name}-api-nodes"
    Environment = var.environment
    Workload    = "api"
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# Scraper Node Group - Compute optimized nodes for scraping workloads
resource "aws_eks_node_group" "scrapers" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-scraper-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids
  
  scaling_config {
    desired_size = var.scraper_nodes_desired_size
    max_size     = var.scraper_nodes_max_size
    min_size     = var.scraper_nodes_min_size
  }
  
  update_config {
    max_unavailable_percentage = 50
  }
  
  instance_types = var.scraper_instance_types
  capacity_type  = var.scraper_capacity_type  # SPOT for cost savings
  
  disk_size = 150
  
  remote_access {
    ec2_ssh_key = var.ssh_key_name
    source_security_group_ids = var.bastion_security_group_ids
  }
  
  labels = {
    workload    = "scrapers"
    environment = var.environment
  }
  
  taints {
    key    = "workload"
    value  = "scrapers"
    effect = "NO_SCHEDULE"
  }
  
  tags = {
    Name        = "${var.project_name}-scraper-nodes"
    Environment = var.environment
    Workload    = "scrapers"
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# ML Node Group - GPU-enabled nodes for ML workloads
resource "aws_eks_node_group" "ml" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-ml-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids
  
  scaling_config {
    desired_size = var.ml_nodes_desired_size
    max_size     = var.ml_nodes_max_size
    min_size     = var.ml_nodes_min_size
  }
  
  update_config {
    max_unavailable_percentage = 33
  }
  
  instance_types = var.ml_instance_types
  capacity_type  = "ON_DEMAND"
  
  disk_size = 200
  
  ami_type = "AL2_x86_64_GPU"  # GPU-optimized AMI
  
  remote_access {
    ec2_ssh_key = var.ssh_key_name
    source_security_group_ids = var.bastion_security_group_ids
  }
  
  labels = {
    workload    = "ml"
    environment = var.environment
    gpu         = "true"
  }
  
  taints {
    key    = "workload"
    value  = "ml"
    effect = "NO_SCHEDULE"
  }
  
  tags = {
    Name        = "${var.project_name}-ml-nodes"
    Environment = var.environment
    Workload    = "ml"
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# System Node Group - Small nodes for system components
resource "aws_eks_node_group" "system" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-system-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids
  
  scaling_config {
    desired_size = 3
    max_size     = 5
    min_size     = 3
  }
  
  update_config {
    max_unavailable = 1
  }
  
  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"
  
  disk_size = 50
  
  labels = {
    workload    = "system"
    environment = var.environment
  }
  
  tags = {
    Name        = "${var.project_name}-system-nodes"
    Environment = var.environment
    Workload    = "system"
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# Fargate Profile for serverless workloads
resource "aws_eks_fargate_profile" "main" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "${var.project_name}-fargate"
  pod_execution_role_arn = aws_iam_role.eks_fargate_pod.arn
  subnet_ids             = var.private_subnet_ids
  
  selector {
    namespace = "fargate"
  }
  
  selector {
    namespace = "kube-system"
    labels = {
      k8s-app = "kube-dns"
    }
  }
  
  tags = {
    Name        = "${var.project_name}-fargate-profile"
    Environment = var.environment
  }
}

# IAM role for Fargate pods
resource "aws_iam_role" "eks_fargate_pod" {
  name = "${var.project_name}-eks-fargate-pod-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks-fargate-pods.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "${var.project_name}-eks-fargate-pod-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "eks_fargate_pod" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy"
  role       = aws_iam_role.eks_fargate_pod.name
}