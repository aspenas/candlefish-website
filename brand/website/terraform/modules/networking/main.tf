# Networking Module - VPC, Subnets, NAT, Transit Gateway
# Enterprise-grade networking for Candlefish.ai operational atelier

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Get availability zones for the current region
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Use provided AZs or default to available ones
  azs = length(var.availability_zones) > 0 ? var.availability_zones : slice(data.aws_availability_zones.available.names, 0, min(3, length(data.aws_availability_zones.available.names)))
  
  # Calculate the number of AZs to use
  az_count = length(local.azs)
  
  # Cost optimization settings
  nat_gateway_count = var.cost_optimization_mode == "minimal" ? 1 : (
    var.single_nat_gateway ? 1 : (
      var.one_nat_gateway_per_az ? local.az_count : 1
    )
  )
  
  # VPC endpoints based on cost optimization
  vpc_endpoints = var.cost_optimization_mode == "minimal" ? {
    s3 = var.vpc_endpoints.s3
    dynamodb = var.vpc_endpoints.dynamodb
  } : var.vpc_endpoints
  
  # Common tags
  common_tags = merge(var.tags, {
    Environment = var.environment
    Region      = var.region
    Purpose     = "Networking Infrastructure"
  })
}

# ============================================
# VPC
# ============================================
resource "aws_vpc" "main" {
  cidr_block                       = var.vpc_cidr
  enable_dns_hostnames             = var.enable_dns_hostnames
  enable_dns_support               = var.enable_dns_support
  assign_generated_ipv6_cidr_block = var.enable_ipv6

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc"
  })
}

# IPv6 CIDR block association (if enabled)
resource "aws_vpc_ipv6_cidr_block_association" "main" {
  count = var.enable_ipv6 ? 1 : 0
  
  vpc_id = aws_vpc.main.id
}

# ============================================
# DHCP Options Set
# ============================================
resource "aws_vpc_dhcp_options" "main" {
  count = var.enable_dhcp_options ? 1 : 0
  
  domain_name          = var.dhcp_options_config.domain_name
  domain_name_servers  = var.dhcp_options_config.domain_name_servers
  ntp_servers         = var.dhcp_options_config.ntp_servers
  netbios_name_servers = var.dhcp_options_config.netbios_name_servers
  netbios_node_type   = var.dhcp_options_config.netbios_node_type

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-dhcp-options"
  })
}

resource "aws_vpc_dhcp_options_association" "main" {
  count = var.enable_dhcp_options ? 1 : 0
  
  vpc_id          = aws_vpc.main.id
  dhcp_options_id = aws_vpc_dhcp_options.main[0].id
}

# ============================================
# Internet Gateway
# ============================================
resource "aws_internet_gateway" "main" {
  count = var.create_igw ? 1 : 0
  
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

# Egress Only Internet Gateway for IPv6
resource "aws_egress_only_internet_gateway" "main" {
  count = var.create_egress_only_igw && var.enable_ipv6 ? 1 : 0
  
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-eigw"
  })
}

# ============================================
# Public Subnets
# ============================================
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index % local.az_count]
  map_public_ip_on_launch = var.map_public_ip_on_launch

  # IPv6 configuration
  ipv6_cidr_block                 = var.enable_ipv6 ? cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, count.index) : null
  assign_ipv6_address_on_creation = var.enable_ipv6

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-${count.index + 1}"
    Type = "Public"
    AZ   = local.azs[count.index % local.az_count]
    Tier = "dmz"
  })
}

# ============================================
# Private Subnets
# ============================================
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index % local.az_count]

  # IPv6 configuration
  ipv6_cidr_block                 = var.enable_ipv6 ? cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, count.index + 10) : null
  assign_ipv6_address_on_creation = false

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-${count.index + 1}"
    Type = "Private"
    AZ   = local.azs[count.index % local.az_count]
    Tier = "application"
  })
}

# ============================================
# Database Subnets
# ============================================
resource "aws_subnet" "database" {
  count = length(var.database_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index % local.az_count]

  # IPv6 configuration
  ipv6_cidr_block                 = var.enable_ipv6 ? cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, count.index + 20) : null
  assign_ipv6_address_on_creation = false

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-database-${count.index + 1}"
    Type = "Database"
    AZ   = local.azs[count.index % local.az_count]
    Tier = "data"
  })
}

# ============================================
# Intra Subnets (no internet access)
# ============================================
resource "aws_subnet" "intra" {
  count = length(var.intra_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.intra_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index % local.az_count]

  # IPv6 configuration
  ipv6_cidr_block                 = var.enable_ipv6 ? cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, count.index + 30) : null
  assign_ipv6_address_on_creation = false

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-intra-${count.index + 1}"
    Type = "Intra"
    AZ   = local.azs[count.index % local.az_count]
    Tier = "isolated"
  })
}

# ============================================
# Elastic IPs for NAT Gateways
# ============================================
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway && !var.reuse_nat_ips ? local.nat_gateway_count : 0

  domain = "vpc"
  depends_on = [aws_internet_gateway.main]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
    Type = "NAT Gateway EIP"
  })
}

# ============================================
# NAT Gateways
# ============================================
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? local.nat_gateway_count : 0

  allocation_id = var.reuse_nat_ips ? var.external_nat_ip_ids[count.index] : aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[var.single_nat_gateway ? 0 : count.index].id
  
  depends_on = [aws_internet_gateway.main]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-gateway-${count.index + 1}"
    Type = "NAT Gateway"
    AZ   = aws_subnet.public[var.single_nat_gateway ? 0 : count.index].availability_zone
  })
}

# ============================================
# Route Tables
# ============================================
# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-rt"
    Type = "Public"
  })
}

# Private Route Tables (one per AZ if multiple NAT gateways)
resource "aws_route_table" "private" {
  count = local.az_count

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
    Type = "Private"
    AZ   = local.azs[count.index]
  })
}

# Database Route Tables
resource "aws_route_table" "database" {
  count = length(var.database_subnet_cidrs) > 0 ? local.az_count : 0

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-database-rt-${count.index + 1}"
    Type = "Database"
    AZ   = local.azs[count.index]
  })
}

# Intra Route Tables (isolated, no internet)
resource "aws_route_table" "intra" {
  count = length(var.intra_subnet_cidrs) > 0 ? local.az_count : 0

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-intra-rt-${count.index + 1}"
    Type = "Intra"
    AZ   = local.azs[count.index]
  })
}

# ============================================
# Routes
# ============================================
# Public Route to Internet Gateway
resource "aws_route" "public_internet_gateway" {
  count = var.create_igw ? 1 : 0

  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main[0].id

  timeouts {
    create = "5m"
  }
}

# Public IPv6 Route to Internet Gateway
resource "aws_route" "public_internet_gateway_ipv6" {
  count = var.create_igw && var.enable_ipv6 ? 1 : 0

  route_table_id              = aws_route_table.public.id
  destination_ipv6_cidr_block = "::/0"
  gateway_id                  = aws_internet_gateway.main[0].id

  timeouts {
    create = "5m"
  }
}

# Private Routes to NAT Gateways
resource "aws_route" "private_nat_gateway" {
  count = var.enable_nat_gateway ? local.az_count : 0

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[var.single_nat_gateway ? 0 : count.index].id

  timeouts {
    create = "5m"
  }
}

# Private IPv6 Routes to Egress Only Internet Gateway
resource "aws_route" "private_ipv6_egress" {
  count = var.create_egress_only_igw && var.enable_ipv6 ? local.az_count : 0

  route_table_id              = aws_route_table.private[count.index].id
  destination_ipv6_cidr_block = "::/0"
  egress_only_gateway_id      = aws_egress_only_internet_gateway.main[0].id

  timeouts {
    create = "5m"
  }
}

# Database Routes to NAT Gateways (if needed)
resource "aws_route" "database_nat_gateway" {
  count = var.enable_nat_gateway && length(var.database_subnet_cidrs) > 0 ? local.az_count : 0

  route_table_id         = aws_route_table.database[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[var.single_nat_gateway ? 0 : count.index].id

  timeouts {
    create = "5m"
  }
}

# ============================================
# Route Table Associations
# ============================================
# Public Subnet Associations
resource "aws_route_table_association" "public" {
  count = length(var.public_subnet_cidrs)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Subnet Associations
resource "aws_route_table_association" "private" {
  count = length(var.private_subnet_cidrs)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index % local.az_count].id
}

# Database Subnet Associations
resource "aws_route_table_association" "database" {
  count = length(var.database_subnet_cidrs)

  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database[count.index % local.az_count].id
}

# Intra Subnet Associations
resource "aws_route_table_association" "intra" {
  count = length(var.intra_subnet_cidrs)

  subnet_id      = aws_subnet.intra[count.index].id
  route_table_id = aws_route_table.intra[count.index % local.az_count].id
}

# ============================================
# VPC Endpoints
# ============================================
# Security Group for Interface VPC Endpoints
resource "aws_security_group" "vpc_endpoints" {
  count = var.enable_vpc_endpoints ? 1 : 0

  name_prefix = "${var.project_name}-${var.environment}-vpc-endpoints"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "HTTP from VPC"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc-endpoints-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# VPC Endpoints
resource "aws_vpc_endpoint" "this" {
  for_each = var.enable_vpc_endpoints ? local.vpc_endpoints : {}

  vpc_id              = aws_vpc.main.id
  service_name        = data.aws_vpc_endpoint_service.this[each.key].service_name
  vpc_endpoint_type   = each.value.vpc_endpoint_type
  auto_accept         = each.value.auto_accept
  policy              = each.value.policy
  private_dns_enabled = each.value.vpc_endpoint_type == "Interface" ? each.value.private_dns_enabled : null

  # Gateway endpoints use route tables
  route_table_ids = each.value.vpc_endpoint_type == "Gateway" ? (
    length(each.value.route_table_ids) > 0 ? each.value.route_table_ids : concat(
      aws_route_table.private[*].id,
      aws_route_table.database[*].id,
      aws_route_table.intra[*].id
    )
  ) : null

  # Interface endpoints use subnets and security groups
  subnet_ids = each.value.vpc_endpoint_type == "Interface" ? (
    length(each.value.subnet_ids) > 0 ? each.value.subnet_ids : aws_subnet.private[*].id
  ) : null

  security_group_ids = each.value.vpc_endpoint_type == "Interface" ? (
    length(each.value.security_group_ids) > 0 ? each.value.security_group_ids : [aws_security_group.vpc_endpoints[0].id]
  ) : null

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}-endpoint"
    Type = each.value.vpc_endpoint_type
  })
}

# Data source for VPC endpoint services
data "aws_vpc_endpoint_service" "this" {
  for_each = var.enable_vpc_endpoints ? local.vpc_endpoints : {}

  service = each.value.service
}

# ============================================
# VPC Flow Logs
# ============================================
# CloudWatch Log Group for Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  count = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? 1 : 0

  name              = "/aws/vpc/flowlogs/${var.project_name}-${var.environment}"
  retention_in_days = var.environment == "production" ? 14 : 7

  tags = local.common_tags
}

# IAM Role for Flow Logs
resource "aws_iam_role" "flow_log" {
  count = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? 1 : 0

  name = "${var.project_name}-${var.environment}-vpc-flow-log"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Role Policy for Flow Logs
resource "aws_iam_role_policy" "flow_log" {
  count = var.enable_flow_log && var.flow_log_destination_type == "cloud-watch-logs" ? 1 : 0

  name = "${var.project_name}-${var.environment}-vpc-flow-log"
  role = aws_iam_role.flow_log[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# VPC Flow Logs
resource "aws_flow_log" "vpc" {
  count = var.enable_flow_log ? 1 : 0

  iam_role_arn         = var.flow_log_destination_type == "cloud-watch-logs" ? aws_iam_role.flow_log[0].arn : null
  log_destination      = var.flow_log_destination_type == "s3" ? var.flow_log_destination_arn : aws_cloudwatch_log_group.vpc_flow_log[0].arn
  log_destination_type = var.flow_log_destination_type
  traffic_type         = var.flow_log_traffic_type
  vpc_id              = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc-flow-log"
  })
}

# ============================================
# Transit Gateway (Optional)
# ============================================
resource "aws_ec2_transit_gateway" "main" {
  count = var.enable_transit_gateway ? 1 : 0

  amazon_side_asn                 = var.transit_gateway_config.amazon_side_asn
  auto_accept_shared_attachments  = var.transit_gateway_config.auto_accept_shared_attachments
  default_route_table_association = var.transit_gateway_config.default_route_table_association
  default_route_table_propagation = var.transit_gateway_config.default_route_table_propagation
  dns_support                     = var.transit_gateway_config.dns_support
  vpn_ecmp_support               = var.transit_gateway_config.vpn_ecmp_support

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-tgw"
    Type = "Transit Gateway"
  })
}

# Transit Gateway VPC Attachment
resource "aws_ec2_transit_gateway_vpc_attachment" "main" {
  count = var.enable_transit_gateway ? 1 : 0

  subnet_ids         = aws_subnet.private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main[0].id
  vpc_id             = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-tgw-attachment"
  })
}

# Cross-Region Transit Gateway Peering
resource "aws_ec2_transit_gateway_peering_attachment" "main" {
  count = var.enable_transit_gateway ? length(var.transit_gateway_config.peer_regions) : 0

  peer_region             = var.transit_gateway_config.peer_regions[count.index].region
  peer_transit_gateway_id = var.transit_gateway_config.peer_regions[count.index].transit_gateway_id
  transit_gateway_id      = aws_ec2_transit_gateway.main[0].id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-tgw-peer-${var.transit_gateway_config.peer_regions[count.index].region}"
  })
}

# ============================================
# Network ACLs (Optional)
# ============================================
# Public Network ACL
resource "aws_network_acl" "public" {
  count = var.enable_network_acls && var.public_dedicated_network_acl ? 1 : 0

  vpc_id = aws_vpc.main.id

  # Inbound rules
  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  # Outbound rules
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-nacl"
    Type = "Public Network ACL"
  })
}

# Private Network ACL
resource "aws_network_acl" "private" {
  count = var.enable_network_acls && var.private_dedicated_network_acl ? 1 : 0

  vpc_id = aws_vpc.main.id

  # Inbound rules
  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = var.vpc_cidr
    from_port  = 0
    to_port    = 0
  }

  # Outbound rules
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-nacl"
    Type = "Private Network ACL"
  })
}

# Database Network ACL
resource "aws_network_acl" "database" {
  count = var.enable_network_acls && var.database_dedicated_network_acl ? 1 : 0

  vpc_id = aws_vpc.main.id

  # Inbound rules - only from private subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = var.vpc_cidr
    from_port  = 3306
    to_port    = 3306
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = var.vpc_cidr
    from_port  = 5432
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = var.vpc_cidr
    from_port  = 6379
    to_port    = 6379
  }

  # Outbound rules
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-database-nacl"
    Type = "Database Network ACL"
  })
}