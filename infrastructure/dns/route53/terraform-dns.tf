# Terraform configuration for Route53 DNS
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Route53 Hosted Zone for candlefish.ai
resource "aws_route53_zone" "candlefish_ai" {
  name = "candlefish.ai"
  
  tags = {
    Environment = "production"
    Project     = "candlefish-ai"
    ManagedBy   = "terraform"
  }
}

# Application Load Balancer for all subdomains
resource "aws_lb" "candlefish_alb" {
  name               = "candlefish-ai-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = var.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Environment = "production"
    Project     = "candlefish-ai"
  }
}

# Security group for ALB
resource "aws_security_group" "alb_sg" {
  name_prefix = "candlefish-alb-"
  vpc_id      = var.vpc_id

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

  tags = {
    Name = "candlefish-alb-sg"
  }
}

# DNS Records
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.candlefish_ai.zone_id
  name    = "api.candlefish.ai"
  type    = "A"

  alias {
    name                   = aws_lb.candlefish_alb.dns_name
    zone_id                = aws_lb.candlefish_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "analytics" {
  zone_id = aws_route53_zone.candlefish_ai.zone_id
  name    = "analytics.candlefish.ai"
  type    = "A"

  alias {
    name                   = aws_lb.candlefish_alb.dns_name
    zone_id                = aws_lb.candlefish_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "router" {
  zone_id = aws_route53_zone.candlefish_ai.zone_id
  name    = "router.candlefish.ai"
  type    = "A"

  alias {
    name                   = aws_lb.candlefish_alb.dns_name
    zone_id                = aws_lb.candlefish_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "monitor" {
  zone_id = aws_route53_zone.candlefish_ai.zone_id
  name    = "monitor.candlefish.ai"
  type    = "A"

  alias {
    name                   = aws_lb.candlefish_alb.dns_name
    zone_id                = aws_lb.candlefish_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "config" {
  zone_id = aws_route53_zone.candlefish_ai.zone_id
  name    = "config.candlefish.ai"
  type    = "A"

  alias {
    name                   = aws_lb.candlefish_alb.dns_name
    zone_id                = aws_lb.candlefish_alb.zone_id
    evaluate_target_health = true
  }
}

# ACM Certificate for SSL
resource "aws_acm_certificate" "candlefish_cert" {
  domain_name       = "candlefish.ai"
  subject_alternative_names = [
    "*.candlefish.ai",
    "api.candlefish.ai",
    "analytics.candlefish.ai",
    "router.candlefish.ai",
    "monitor.candlefish.ai",
    "config.candlefish.ai"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = "production"
    Project     = "candlefish-ai"
  }
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.candlefish_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.candlefish_ai.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "candlefish_cert" {
  certificate_arn         = aws_acm_certificate.candlefish_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Variables
variable "vpc_id" {
  description = "VPC ID for ALB"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

# Outputs
output "zone_id" {
  description = "Route53 zone ID"
  value       = aws_route53_zone.candlefish_ai.zone_id
}

output "name_servers" {
  description = "Route53 name servers"
  value       = aws_route53_zone.candlefish_ai.name_servers
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.candlefish_alb.dns_name
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.candlefish_cert.arn
}