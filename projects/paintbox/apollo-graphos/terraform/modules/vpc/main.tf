locals {
  vpc_name = var.name
  azs      = slice(var.availability_zones, 0, 3)
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = local.vpc_name
  cidr = var.cidr

  azs              = local.azs
  private_subnets  = [for k, v in local.azs : cidrsubnet(var.cidr, 4, k)]
  public_subnets   = [for k, v in local.azs : cidrsubnet(var.cidr, 8, k + 48)]
  database_subnets = [for k, v in local.azs : cidrsubnet(var.cidr, 8, k + 16)]
  elasticache_subnets = [for k, v in local.azs : cidrsubnet(var.cidr, 8, k + 32)]

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  enable_vpn_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # Database subnet group
  create_database_subnet_group       = true
  create_database_subnet_route_table = true
  create_database_nat_gateway_route  = false
  create_database_internet_gateway_route = false

  # ElastiCache subnet group
  create_elasticache_subnet_group       = true
  create_elasticache_subnet_route_table = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  # Public subnet tags for load balancer
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
    "kubernetes.io/cluster/${local.vpc_name}" = "shared"
  }

  # Private subnet tags for load balancer
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
    "kubernetes.io/cluster/${local.vpc_name}" = "shared"
  }

  tags = merge(var.tags, {
    "kubernetes.io/cluster/${local.vpc_name}" = "shared"
  })
}
