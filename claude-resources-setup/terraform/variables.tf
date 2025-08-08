variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "claude-resources-prod"
}

variable "cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.28"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    ami_type      = string
    capacity_type = string
    desired_size  = number
    max_size      = number
    min_size      = number
    disk_size     = number
    labels        = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.large", "t3a.large"]
      ami_type      = "AL2_x86_64"
      capacity_type = "ON_DEMAND"
      desired_size  = 3
      max_size      = 10
      min_size      = 3
      disk_size     = 50
      labels = {
        role = "general"
      }
      taints = []
    }
    spot = {
      instance_types = ["t3.large", "t3a.large", "t3.xlarge", "t3a.xlarge"]
      ami_type      = "AL2_x86_64"
      capacity_type = "SPOT"
      desired_size  = 0
      max_size      = 20
      min_size      = 0
      disk_size     = 50
      labels = {
        role = "spot"
      }
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "RDS backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "RDS maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of ElastiCache Redis nodes"
  type        = number
  default     = 1
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "claude-resources.candlefish.ai"
}

# Sensitive variables
variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub token for deployments"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sentry_dsn" {
  description = "Sentry DSN for error tracking"
  type        = string
  sensitive   = true
  default     = ""
}
