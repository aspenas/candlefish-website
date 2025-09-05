# Networking Module Variables
# VPC, Subnets, NAT, Transit Gateway for Candlefish.ai

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "project_name" {
  description = "Name of the project/application"
  type        = string
}

variable "region" {
  description = "AWS region where resources will be created"
  type        = string
}

# ============================================
# VPC Configuration
# ============================================
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

variable "enable_ipv6" {
  description = "Enable IPv6 support for the VPC"
  type        = bool
  default     = false
}

# ============================================
# Subnet Configuration
# ============================================
variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

variable "intra_subnet_cidrs" {
  description = "CIDR blocks for intranet subnets (no internet access)"
  type        = list(string)
  default     = ["10.0.31.0/24", "10.0.32.0/24", "10.0.33.0/24"]
}

# ============================================
# NAT Gateway Configuration
# ============================================
variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all private subnets (cost optimization)"
  type        = bool
  default     = false
}

variable "one_nat_gateway_per_az" {
  description = "Create one NAT Gateway per availability zone"
  type        = bool
  default     = true
}

variable "reuse_nat_ips" {
  description = "Reuse existing Elastic IPs for NAT Gateways"
  type        = bool
  default     = false
}

variable "external_nat_ip_ids" {
  description = "List of EIP IDs to be used for NAT Gateways"
  type        = list(string)
  default     = []
}

# ============================================
# VPC Endpoints Configuration
# ============================================
variable "enable_vpc_endpoints" {
  description = "Enable VPC endpoints for AWS services"
  type        = bool
  default     = true
}

variable "vpc_endpoints" {
  description = "Map of VPC endpoints to create"
  type = map(object({
    service             = string
    vpc_endpoint_type   = string
    auto_accept         = optional(bool, true)
    policy              = optional(string)
    private_dns_enabled = optional(bool, true)
    route_table_ids     = optional(list(string), [])
    subnet_ids          = optional(list(string), [])
    security_group_ids  = optional(list(string), [])
  }))
  default = {
    s3 = {
      service           = "s3"
      vpc_endpoint_type = "Gateway"
    }
    dynamodb = {
      service           = "dynamodb"
      vpc_endpoint_type = "Gateway"
    }
    ec2 = {
      service           = "ec2"
      vpc_endpoint_type = "Interface"
    }
    ecr_api = {
      service           = "ecr.api"
      vpc_endpoint_type = "Interface"
    }
    ecr_dkr = {
      service           = "ecr.dkr"
      vpc_endpoint_type = "Interface"
    }
    ecs = {
      service           = "ecs"
      vpc_endpoint_type = "Interface"
    }
    ecs_agent = {
      service           = "ecs-agent"
      vpc_endpoint_type = "Interface"
    }
    ecs_telemetry = {
      service           = "ecs-telemetry"
      vpc_endpoint_type = "Interface"
    }
    logs = {
      service           = "logs"
      vpc_endpoint_type = "Interface"
    }
    monitoring = {
      service           = "monitoring"
      vpc_endpoint_type = "Interface"
    }
    secretsmanager = {
      service           = "secretsmanager"
      vpc_endpoint_type = "Interface"
    }
  }
}

# ============================================
# Internet Gateway Configuration
# ============================================
variable "create_igw" {
  description = "Create Internet Gateway"
  type        = bool
  default     = true
}

variable "create_egress_only_igw" {
  description = "Create Egress Only Internet Gateway for IPv6"
  type        = bool
  default     = false
}

# ============================================
# Flow Logs Configuration
# ============================================
variable "enable_flow_log" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "flow_log_destination_type" {
  description = "Type of the logging destination (cloud-watch-logs, s3)"
  type        = string
  default     = "cloud-watch-logs"
  validation {
    condition     = contains(["cloud-watch-logs", "s3"], var.flow_log_destination_type)
    error_message = "Flow log destination type must be either 'cloud-watch-logs' or 's3'."
  }
}

variable "flow_log_destination_arn" {
  description = "ARN of the destination for VPC Flow Logs"
  type        = string
  default     = ""
}

variable "flow_log_traffic_type" {
  description = "Type of traffic to capture (ALL, ACCEPT, REJECT)"
  type        = string
  default     = "ALL"
  validation {
    condition     = contains(["ALL", "ACCEPT", "REJECT"], var.flow_log_traffic_type)
    error_message = "Flow log traffic type must be ALL, ACCEPT, or REJECT."
  }
}

# ============================================
# Transit Gateway Configuration
# ============================================
variable "enable_transit_gateway" {
  description = "Enable Transit Gateway for multi-region connectivity"
  type        = bool
  default     = false
}

variable "transit_gateway_config" {
  description = "Transit Gateway configuration"
  type = object({
    amazon_side_asn                 = optional(number, 64512)
    auto_accept_shared_attachments  = optional(string, "disable")
    default_route_table_association = optional(string, "enable")
    default_route_table_propagation = optional(string, "enable")
    dns_support                     = optional(string, "enable")
    vpn_ecmp_support               = optional(string, "enable")
    
    # Cross-region peering
    peer_regions = optional(list(object({
      region                    = string
      transit_gateway_id       = optional(string)
      auto_accept              = optional(bool, false)
    })), [])
  })
  default = {
    amazon_side_asn = 64512
    auto_accept_shared_attachments = "disable"
    default_route_table_association = "enable"
    default_route_table_propagation = "enable"
    dns_support = "enable"
    vpn_ecmp_support = "enable"
  }
}

# ============================================
# Network ACLs Configuration
# ============================================
variable "enable_network_acls" {
  description = "Enable custom Network ACLs"
  type        = bool
  default     = false
}

variable "public_dedicated_network_acl" {
  description = "Use dedicated network ACL for public subnets"
  type        = bool
  default     = false
}

variable "private_dedicated_network_acl" {
  description = "Use dedicated network ACL for private subnets"
  type        = bool
  default     = false
}

variable "database_dedicated_network_acl" {
  description = "Use dedicated network ACL for database subnets"
  type        = bool
  default     = false
}

# ============================================
# Security Configuration
# ============================================
variable "map_public_ip_on_launch" {
  description = "Automatically map public IP on instance launch in public subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

variable "vpn_gateway_config" {
  description = "VPN Gateway configuration"
  type = object({
    vpn_gateway_id      = optional(string)
    vpn_connection_id   = optional(string)
    customer_gateway_id = optional(string)
  })
  default = {}
}

# ============================================
# DHCP Options Configuration
# ============================================
variable "enable_dhcp_options" {
  description = "Enable custom DHCP options"
  type        = bool
  default     = false
}

variable "dhcp_options_config" {
  description = "DHCP options configuration"
  type = object({
    domain_name          = optional(string)
    domain_name_servers  = optional(list(string), ["AmazonProvidedDNS"])
    ntp_servers         = optional(list(string))
    netbios_name_servers = optional(list(string))
    netbios_node_type   = optional(number)
  })
  default = {}
}

# ============================================
# Cost Optimization
# ============================================
variable "enable_spot_fleet_vpc_config" {
  description = "Optimize VPC for Spot Fleet usage"
  type        = bool
  default     = false
}

variable "cost_optimization_mode" {
  description = "Cost optimization mode (minimal, balanced, performance)"
  type        = string
  default     = "balanced"
  validation {
    condition     = contains(["minimal", "balanced", "performance"], var.cost_optimization_mode)
    error_message = "Cost optimization mode must be minimal, balanced, or performance."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}