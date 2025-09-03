# Security Module for Bioluminescent Candlefish Animation
# Comprehensive security controls including WAF, security groups, and compliance

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# WAF v2 for Application Protection
resource "aws_wafv2_web_acl" "candlefish_waf" {
  name  = "${var.environment}-candlefish-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit          = var.rate_limit_per_5min
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Geographic blocking rule
  rule {
    name     = "GeoBlockRule"
    priority = 2

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = var.blocked_countries
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockRule"
      sampled_requests_enabled   = true
    }
  }

  # Known bad inputs rule
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Core rule set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Animation-specific protection
  rule {
    name     = "ProtectAnimationEndpoints"
    priority = 5

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string = "/api/animation"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 1
              type     = "URL_DECODE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }
        statement {
          rate_based_statement {
            limit              = 100
            aggregate_key_type = "IP"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AnimationEndpointProtection"
      sampled_requests_enabled   = true
    }
  }

  tags = var.tags
}

# Security Groups
resource "aws_security_group" "alb_security_group" {
  name        = "${var.environment}-candlefish-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # HTTP access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP access"
  }

  # HTTPS access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS access"
  }

  # WebSocket connections for animation
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "WebSocket connections"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-candlefish-alb-sg"
  })
}

resource "aws_security_group" "application_security_group" {
  name        = "${var.environment}-candlefish-app-sg"
  description = "Security group for Candlefish application pods"
  vpc_id      = var.vpc_id

  # Application port
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_security_group.id]
    description     = "Application traffic from ALB"
  }

  # Health check port
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_security_group.id]
    description     = "Health checks from ALB"
  }

  # Prometheus metrics
  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Prometheus metrics collection"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-candlefish-app-sg"
  })
}

resource "aws_security_group" "database_security_group" {
  name        = "${var.environment}-candlefish-db-sg"
  description = "Security group for RDS database"
  vpc_id      = var.vpc_id

  # PostgreSQL access from application
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.application_security_group.id]
    description     = "PostgreSQL access from application"
  }

  # Redis access from application
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.application_security_group.id]
    description     = "Redis access from application"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-candlefish-db-sg"
  })
}

# Network ACLs for additional security
resource "aws_network_acl" "private_nacl" {
  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  # Allow inbound HTTPS
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    from_port  = 443
    to_port    = 443
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  # Allow inbound HTTP
  ingress {
    rule_no    = 110
    protocol   = "tcp"
    from_port  = 80
    to_port    = 80
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  # Allow high port return traffic
  ingress {
    rule_no    = 120
    protocol   = "tcp"
    from_port  = 1024
    to_port    = 65535
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  # Allow all outbound traffic
  egress {
    rule_no    = 100
    protocol   = "-1"
    from_port  = 0
    to_port    = 0
    cidr_block = "0.0.0.0/0"
    action     = "allow"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-candlefish-private-nacl"
  })
}

# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "animation_config" {
  name        = "${var.environment}/candlefish/animation-config"
  description = "Configuration secrets for bioluminescent animation"
  
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "animation_config" {
  secret_id = aws_secretsmanager_secret.animation_config.id
  secret_string = jsonencode({
    webgl_config = {
      max_particles = var.max_animation_particles
      frame_rate_target = 60
      quality_fallback = true
    }
    websocket_config = {
      max_connections = var.max_websocket_connections
      heartbeat_interval = 30
    }
    api_keys = {
      analytics_key = var.analytics_api_key
      monitoring_key = var.monitoring_api_key
    }
  })
}

# GuardDuty for threat detection
resource "aws_guardduty_detector" "candlefish" {
  count  = var.enable_guardduty ? 1 : 0
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  tags = var.tags
}

# Config rules for compliance
resource "aws_config_configuration_recorder" "candlefish" {
  count    = var.enable_config_compliance ? 1 : 0
  name     = "${var.environment}-candlefish-recorder"
  role_arn = aws_iam_role.config_role[0].arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "candlefish" {
  count          = var.enable_config_compliance ? 1 : 0
  name           = "${var.environment}-candlefish-delivery-channel"
  s3_bucket_name = aws_s3_bucket.config_bucket[0].bucket
}

resource "aws_s3_bucket" "config_bucket" {
  count  = var.enable_config_compliance ? 1 : 0
  bucket = "${var.environment}-candlefish-config-${random_string.bucket_suffix[0].result}"

  tags = var.tags
}

resource "random_string" "bucket_suffix" {
  count   = var.enable_config_compliance ? 1 : 0
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_versioning" "config_bucket_versioning" {
  count  = var.enable_config_compliance ? 1 : 0
  bucket = aws_s3_bucket.config_bucket[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "config_bucket_encryption" {
  count  = var.enable_config_compliance ? 1 : 0
  bucket = aws_s3_bucket.config_bucket[0].id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# IAM role for Config
resource "aws_iam_role" "config_role" {
  count = var.enable_config_compliance ? 1 : 0
  name  = "${var.environment}-candlefish-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "config_role_policy" {
  count      = var.enable_config_compliance ? 1 : 0
  role       = aws_iam_role.config_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}

# CloudTrail for audit logging
resource "aws_cloudtrail" "candlefish_audit" {
  count                         = var.enable_cloudtrail ? 1 : 0
  name                         = "${var.environment}-candlefish-audit"
  s3_bucket_name               = aws_s3_bucket.cloudtrail_bucket[0].bucket
  include_global_service_events = true
  is_multi_region_trail        = true
  enable_logging               = true

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    exclude_management_event_sources = []

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::${aws_s3_bucket.cloudtrail_bucket[0].bucket}/*"]
    }
  }

  tags = var.tags
}

resource "aws_s3_bucket" "cloudtrail_bucket" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = "${var.environment}-candlefish-cloudtrail-${random_string.cloudtrail_suffix[0].result}"

  tags = var.tags
}

resource "random_string" "cloudtrail_suffix" {
  count   = var.enable_cloudtrail ? 1 : 0
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_versioning" "cloudtrail_bucket_versioning" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_bucket[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "cloudtrail_bucket_encryption" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_bucket[0].id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}