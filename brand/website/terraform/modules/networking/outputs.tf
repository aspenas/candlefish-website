# Networking Module Outputs
# Comprehensive networking configuration for Candlefish.ai

# ============================================
# VPC Outputs
# ============================================
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_arn" {
  description = "ARN of the VPC"
  value       = aws_vpc.main.arn
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "vpc_ipv6_cidr_block" {
  description = "IPv6 CIDR block of the VPC"
  value       = var.enable_ipv6 ? aws_vpc.main.ipv6_cidr_block : null
}

output "vpc_main_route_table_id" {
  description = "ID of the main route table associated with this VPC"
  value       = aws_vpc.main.main_route_table_id
}

output "vpc_default_network_acl_id" {
  description = "ID of the default network ACL"
  value       = aws_vpc.main.default_network_acl_id
}

output "vpc_default_security_group_id" {
  description = "ID of the security group created by default on VPC creation"
  value       = aws_vpc.main.default_security_group_id
}

# ============================================
# Internet Gateway Outputs
# ============================================
output "igw_id" {
  description = "ID of the Internet Gateway"
  value       = var.create_igw ? aws_internet_gateway.main[0].id : null
}

output "igw_arn" {
  description = "ARN of the Internet Gateway"
  value       = var.create_igw ? aws_internet_gateway.main[0].arn : null
}

output "egress_only_igw_id" {
  description = "ID of the Egress Only Internet Gateway"
  value       = var.create_egress_only_igw && var.enable_ipv6 ? aws_egress_only_internet_gateway.main[0].id : null
}

# ============================================
# Subnet Outputs
# ============================================
output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "public_subnet_arns" {
  description = "List of ARNs of public subnets"
  value       = aws_subnet.public[*].arn
}

output "public_subnets_cidr_blocks" {
  description = "List of CIDR blocks of public subnets"
  value       = aws_subnet.public[*].cidr_block
}

output "public_subnets_ipv6_cidr_blocks" {
  description = "List of IPv6 CIDR blocks of public subnets"
  value       = aws_subnet.public[*].ipv6_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "private_subnet_arns" {
  description = "List of ARNs of private subnets"
  value       = aws_subnet.private[*].arn
}

output "private_subnets_cidr_blocks" {
  description = "List of CIDR blocks of private subnets"
  value       = aws_subnet.private[*].cidr_block
}

output "private_subnets_ipv6_cidr_blocks" {
  description = "List of IPv6 CIDR blocks of private subnets"
  value       = aws_subnet.private[*].ipv6_cidr_block
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = aws_subnet.database[*].id
}

output "database_subnet_arns" {
  description = "List of ARNs of database subnets"
  value       = aws_subnet.database[*].arn
}

output "database_subnets_cidr_blocks" {
  description = "List of CIDR blocks of database subnets"
  value       = aws_subnet.database[*].cidr_block
}

output "database_subnets_ipv6_cidr_blocks" {
  description = "List of IPv6 CIDR blocks of database subnets"
  value       = aws_subnet.database[*].ipv6_cidr_block
}

output "intra_subnets" {
  description = "List of IDs of intra subnets"
  value       = aws_subnet.intra[*].id
}

output "intra_subnet_arns" {
  description = "List of ARNs of intra subnets"
  value       = aws_subnet.intra[*].arn
}

output "intra_subnets_cidr_blocks" {
  description = "List of CIDR blocks of intra subnets"
  value       = aws_subnet.intra[*].cidr_block
}

output "intra_subnets_ipv6_cidr_blocks" {
  description = "List of IPv6 CIDR blocks of intra subnets"
  value       = aws_subnet.intra[*].ipv6_cidr_block
}

# ============================================
# Availability Zone Outputs
# ============================================
output "azs" {
  description = "List of the Availability Zones"
  value       = local.azs
}

output "public_subnets_by_az" {
  description = "Map of public subnets by availability zone"
  value = zipmap(
    [for i, subnet in aws_subnet.public : subnet.availability_zone],
    aws_subnet.public[*].id
  )
}

output "private_subnets_by_az" {
  description = "Map of private subnets by availability zone"
  value = zipmap(
    [for i, subnet in aws_subnet.private : subnet.availability_zone],
    aws_subnet.private[*].id
  )
}

output "database_subnets_by_az" {
  description = "Map of database subnets by availability zone"
  value = zipmap(
    [for i, subnet in aws_subnet.database : subnet.availability_zone],
    aws_subnet.database[*].id
  )
}

# ============================================
# NAT Gateway Outputs
# ============================================
output "nat_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

output "nat_public_ips" {
  description = "List of public Elastic IPs for NAT Gateways"
  value       = aws_nat_gateway.main[*].public_ip
}

output "natgw_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.main[*].id
}

output "nat_gateway_endpoints" {
  description = "Map of NAT Gateway endpoints by subnet ID"
  value = zipmap(
    [for i, nat in aws_nat_gateway.main : nat.subnet_id],
    aws_nat_gateway.main[*].public_ip
  )
}

# ============================================
# Route Table Outputs
# ============================================
output "public_route_table_ids" {
  description = "List of IDs of public route tables"
  value       = [aws_route_table.public.id]
}

output "private_route_table_ids" {
  description = "List of IDs of private route tables"
  value       = aws_route_table.private[*].id
}

output "database_route_table_ids" {
  description = "List of IDs of database route tables"
  value       = aws_route_table.database[*].id
}

output "intra_route_table_ids" {
  description = "List of IDs of intra route tables"
  value       = aws_route_table.intra[*].id
}

output "public_internet_gateway_route_id" {
  description = "ID of the internet gateway route"
  value       = var.create_igw ? aws_route.public_internet_gateway[0].id : null
}

output "private_nat_gateway_route_ids" {
  description = "List of IDs of the private nat gateway routes"
  value       = aws_route.private_nat_gateway[*].id
}

# ============================================
# VPC Endpoint Outputs
# ============================================
output "vpc_endpoint_ids" {
  description = "Map of VPC endpoint IDs"
  value       = { for k, v in aws_vpc_endpoint.this : k => v.id }
}

output "vpc_endpoint_arns" {
  description = "Map of VPC endpoint ARNs"
  value       = { for k, v in aws_vpc_endpoint.this : k => v.arn }
}

output "vpc_endpoint_dns_entries" {
  description = "Map of VPC endpoint DNS entries"
  value       = { for k, v in aws_vpc_endpoint.this : k => v.dns_entry }
}

output "vpc_endpoint_network_interface_ids" {
  description = "Map of VPC endpoint network interface IDs"
  value       = { for k, v in aws_vpc_endpoint.this : k => v.network_interface_ids }
}

output "vpc_endpoints_security_group_id" {
  description = "Security group ID for VPC endpoints"
  value       = var.enable_vpc_endpoints ? aws_security_group.vpc_endpoints[0].id : null
}

# ============================================
# Flow Logs Outputs
# ============================================
output "vpc_flow_log_id" {
  description = "ID of the Flow Log resource"
  value       = var.enable_flow_log ? aws_flow_log.vpc[0].id : null
}

output "vpc_flow_log_destination_arn" {
  description = "ARN of the destination for VPC Flow Logs"
  value       = var.enable_flow_log ? (
    var.flow_log_destination_type == "cloud-watch-logs" ? 
      aws_cloudwatch_log_group.vpc_flow_log[0].arn : 
      var.flow_log_destination_arn
  ) : null
}

output "vpc_flow_log_cloudwatch_iam_role_arn" {
  description = "ARN of the IAM role for VPC Flow Logs CloudWatch"
  value       = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? aws_iam_role.flow_log[0].arn : null
}

# ============================================
# Transit Gateway Outputs
# ============================================
output "ec2_transit_gateway_id" {
  description = "EC2 Transit Gateway ID"
  value       = var.enable_transit_gateway ? aws_ec2_transit_gateway.main[0].id : null
}

output "ec2_transit_gateway_arn" {
  description = "EC2 Transit Gateway Amazon Resource Name (ARN)"
  value       = var.enable_transit_gateway ? aws_ec2_transit_gateway.main[0].arn : null
}

output "ec2_transit_gateway_association_default_route_table_id" {
  description = "Identifier of the default association route table"
  value       = var.enable_transit_gateway ? aws_ec2_transit_gateway.main[0].association_default_route_table_id : null
}

output "ec2_transit_gateway_propagation_default_route_table_id" {
  description = "Identifier of the default propagation route table"
  value       = var.enable_transit_gateway ? aws_ec2_transit_gateway.main[0].propagation_default_route_table_id : null
}

output "ec2_transit_gateway_vpc_attachment_ids" {
  description = "List of EC2 Transit Gateway VPC Attachment IDs"
  value       = var.enable_transit_gateway ? aws_ec2_transit_gateway_vpc_attachment.main[*].id : []
}

output "ec2_transit_gateway_peering_attachment_ids" {
  description = "List of EC2 Transit Gateway Peering Attachment IDs"
  value       = var.enable_transit_gateway ? aws_ec2_transit_gateway_peering_attachment.main[*].id : []
}

# ============================================
# Network ACL Outputs
# ============================================
output "public_network_acl_id" {
  description = "ID of the public network ACL"
  value       = var.enable_network_acls && var.public_dedicated_network_acl ? aws_network_acl.public[0].id : null
}

output "public_network_acl_arn" {
  description = "ARN of the public network ACL"
  value       = var.enable_network_acls && var.public_dedicated_network_acl ? aws_network_acl.public[0].arn : null
}

output "private_network_acl_id" {
  description = "ID of the private network ACL"
  value       = var.enable_network_acls && var.private_dedicated_network_acl ? aws_network_acl.private[0].id : null
}

output "private_network_acl_arn" {
  description = "ARN of the private network ACL"
  value       = var.enable_network_acls && var.private_dedicated_network_acl ? aws_network_acl.private[0].arn : null
}

output "database_network_acl_id" {
  description = "ID of the database network ACL"
  value       = var.enable_network_acls && var.database_dedicated_network_acl ? aws_network_acl.database[0].id : null
}

output "database_network_acl_arn" {
  description = "ARN of the database network ACL"
  value       = var.enable_network_acls && var.database_dedicated_network_acl ? aws_network_acl.database[0].arn : null
}

# ============================================
# DHCP Options Outputs
# ============================================
output "dhcp_options_id" {
  description = "ID of the DHCP options"
  value       = var.enable_dhcp_options ? aws_vpc_dhcp_options.main[0].id : null
}

# ============================================
# Cost Optimization Summary
# ============================================
output "cost_optimization_summary" {
  description = "Cost optimization configuration summary"
  value = {
    nat_gateway_count = local.nat_gateway_count
    single_nat_gateway = var.single_nat_gateway
    cost_optimization_mode = var.cost_optimization_mode
    vpc_endpoints_enabled = var.enable_vpc_endpoints
    vpc_endpoints_count = length(local.vpc_endpoints)
    flow_logs_enabled = var.enable_flow_log
    transit_gateway_enabled = var.enable_transit_gateway
    estimated_monthly_cost = {
      nat_gateways = "$45 × ${local.nat_gateway_count} = $${45 * local.nat_gateway_count}"
      vpc_endpoints = var.enable_vpc_endpoints ? "$0.01/hour × ${length([for k, v in local.vpc_endpoints : k if v.vpc_endpoint_type == "Interface"])} = $${0.01 * 24 * 30 * length([for k, v in local.vpc_endpoints : k if v.vpc_endpoint_type == "Interface"])}" : "$0"
      flow_logs = var.enable_flow_log ? "$10-50/month" : "$0"
      transit_gateway = var.enable_transit_gateway ? "$36-100/month" : "$0"
      data_transfer = "Variable based on usage"
    }
  }
}

# ============================================
# Network Configuration Summary
# ============================================
output "network_configuration" {
  description = "Complete network configuration summary"
  value = {
    vpc_cidr = aws_vpc.main.cidr_block
    availability_zones = local.azs
    subnet_configuration = {
      public_subnets = {
        count = length(aws_subnet.public)
        cidrs = aws_subnet.public[*].cidr_block
      }
      private_subnets = {
        count = length(aws_subnet.private)
        cidrs = aws_subnet.private[*].cidr_block
      }
      database_subnets = {
        count = length(aws_subnet.database)
        cidrs = aws_subnet.database[*].cidr_block
      }
      intra_subnets = {
        count = length(aws_subnet.intra)
        cidrs = aws_subnet.intra[*].cidr_block
      }
    }
    high_availability = {
      multi_az_deployment = local.az_count > 1
      nat_gateway_redundancy = local.nat_gateway_count > 1
      subnet_distribution = "Balanced across AZs"
    }
    security_features = {
      vpc_flow_logs = var.enable_flow_log
      network_acls = var.enable_network_acls
      vpc_endpoints = var.enable_vpc_endpoints
      private_dns = var.enable_dns_hostnames
    }
    connectivity = {
      internet_gateway = var.create_igw
      nat_gateways = var.enable_nat_gateway
      transit_gateway = var.enable_transit_gateway
      vpn_gateway = var.enable_vpn_gateway
      ipv6_support = var.enable_ipv6
    }
  }
}

# ============================================
# Integration Data
# ============================================
output "integration_data" {
  description = "Data for integration with other modules"
  value = {
    vpc_id = aws_vpc.main.id
    vpc_cidr = aws_vpc.main.cidr_block
    environment = var.environment
    region = var.region
    project_name = var.project_name
    
    subnets = {
      public = aws_subnet.public[*].id
      private = aws_subnet.private[*].id
      database = aws_subnet.database[*].id
      intra = aws_subnet.intra[*].id
    }
    
    subnet_cidrs = {
      public = aws_subnet.public[*].cidr_block
      private = aws_subnet.private[*].cidr_block
      database = aws_subnet.database[*].cidr_block
      intra = aws_subnet.intra[*].cidr_block
    }
    
    route_tables = {
      public = [aws_route_table.public.id]
      private = aws_route_table.private[*].id
      database = aws_route_table.database[*].id
      intra = aws_route_table.intra[*].id
    }
    
    gateways = {
      internet = var.create_igw ? aws_internet_gateway.main[0].id : null
      nat = aws_nat_gateway.main[*].id
      transit = var.enable_transit_gateway ? aws_ec2_transit_gateway.main[0].id : null
    }
    
    vpc_endpoints = {
      enabled = var.enable_vpc_endpoints
      security_group_id = var.enable_vpc_endpoints ? aws_security_group.vpc_endpoints[0].id : null
      endpoints = { for k, v in aws_vpc_endpoint.this : k => v.id }
    }
    
    availability_zones = local.azs
    nat_gateway_ips = aws_nat_gateway.main[*].public_ip
  }
}

# ============================================
# Monitoring Integration
# ============================================
output "monitoring_integration" {
  description = "Monitoring integration endpoints and metrics"
  value = {
    cloudwatch_log_groups = {
      vpc_flow_logs = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? aws_cloudwatch_log_group.vpc_flow_log[0].name : null
    }
    
    metrics_namespaces = {
      vpc = "AWS/VPC"
      nat_gateway = "AWS/NATGateway"
      vpc_endpoints = "AWS/VPC"
      transit_gateway = "AWS/TransitGateway"
    }
    
    alarm_dimensions = {
      vpc = { "VpcId" = aws_vpc.main.id }
      nat_gateways = [for nat in aws_nat_gateway.main : { "NatGatewayId" = nat.id }]
      vpc_endpoints = [for endpoint in aws_vpc_endpoint.this : { "VpceId" = endpoint.id }]
      transit_gateway = var.enable_transit_gateway ? { "TransitGateway" = aws_ec2_transit_gateway.main[0].id } : null
    }
    
    flow_log_configuration = {
      enabled = var.enable_flow_log
      destination_type = var.flow_log_destination_type
      traffic_type = var.flow_log_traffic_type
    }
  }
}