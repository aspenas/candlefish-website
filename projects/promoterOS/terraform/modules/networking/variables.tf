# Variables for Networking Module

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "promoteros"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "promoteros-eks"
}

data "aws_availability_zones" "available" {
  state = "available"
}
