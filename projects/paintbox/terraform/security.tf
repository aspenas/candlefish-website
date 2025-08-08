# Security Configuration for Paintbox Infrastructure

# WAF Web ACL for Application Protection
resource "aws_wafv2_web_acl" "paintbox" {
  count = var.enable_waf ? 1 : 0

  name  = "paintbox-web-acl-${var.environment}"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "RateLimitRule"
      sampled_requests_enabled    = true
    }

    action {
      block {}
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 2

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
      metric_name                 = "CommonRuleSetMetric"
      sampled_requests_enabled    = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "SQLiRuleSetMetric"
      sampled_requests_enabled    = true
    }
  }

  # Block suspicious IPs
  rule {
    name     = "BlockSuspiciousIPs"
    priority = 4

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.suspicious_ips[0].arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "BlockSuspiciousIPs"
      sampled_requests_enabled    = true
    }
  }

  # Geo-blocking rule (optional)
  rule {
    name     = "GeoBlockingRule"
    priority = 5

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = ["CN", "RU", "KP"] # Block China, Russia, North Korea
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "GeoBlockingRule"
      sampled_requests_enabled    = true
    }
  }

  tags = local.common_tags
}

# IP Set for suspicious IPs
resource "aws_wafv2_ip_set" "suspicious_ips" {
  count = var.enable_waf ? 1 : 0

  name               = "suspicious-ips-${var.environment}"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"

  addresses = [
    # Add known malicious IPs here
    # "192.0.2.0/32"
  ]

  tags = local.common_tags
}

# Security Groups with strict rules
resource "aws_security_group_rule" "app_egress_https" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
  description       = "HTTPS outbound"
}

resource "aws_security_group_rule" "app_egress_http" {
  type              = "egress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
  description       = "HTTP outbound"
}

resource "aws_security_group_rule" "app_egress_database" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.database.id
  security_group_id        = aws_security_group.app.id
  description              = "Database access"
}

resource "aws_security_group_rule" "app_egress_redis" {
  type                     = "egress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.redis.id
  security_group_id        = aws_security_group.app.id
  description              = "Redis access"
}

# Network ACLs for additional protection
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.paintbox.id
  subnet_ids = aws_subnet.private[*].id

  # Allow inbound from VPC
  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = aws_vpc.paintbox.cidr_block
    from_port  = 0
    to_port    = 0
  }

  # Allow outbound HTTPS
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow outbound HTTP
  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow outbound to VPC
  egress {
    protocol   = "-1"
    rule_no    = 120
    action     = "allow"
    cidr_block = aws_vpc.paintbox.cidr_block
    from_port  = 0
    to_port    = 0
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-private-nacl-${var.environment}"
  })
}

# GuardDuty for threat detection (Production only)
resource "aws_guardduty_detector" "paintbox" {
  count = var.environment == "production" ? 1 : 0

  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = false # We're not using EKS in this setup
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

  tags = local.common_tags
}

# Config for compliance monitoring (Production only)
resource "aws_config_configuration_recorder" "paintbox" {
  count = var.environment == "production" ? 1 : 0

  name     = "paintbox-config-recorder-${var.environment}"
  role_arn = aws_iam_role.config[0].arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  depends_on = [aws_config_delivery_channel.paintbox[0]]
}

resource "aws_config_delivery_channel" "paintbox" {
  count = var.environment == "production" ? 1 : 0

  name           = "paintbox-config-delivery-${var.environment}"
  s3_bucket_name = aws_s3_bucket.config[0].bucket
}

resource "aws_config_configuration_recorder_status" "paintbox" {
  count = var.environment == "production" ? 1 : 0

  name       = aws_config_configuration_recorder.paintbox[0].name
  is_enabled = true
  depends_on = [aws_config_delivery_channel.paintbox[0]]
}

# S3 bucket for Config
resource "aws_s3_bucket" "config" {
  count = var.environment == "production" ? 1 : 0

  bucket        = "paintbox-config-${var.environment}-${random_id.config_bucket_suffix[0].hex}"
  force_destroy = false

  tags = local.common_tags
}

resource "aws_s3_bucket_policy" "config" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.config[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSConfigBucketPermissionsCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.config[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = local.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketExistenceCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.config[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = local.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketDelivery"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"     = "bucket-owner-full-control"
            "AWS:SourceAccount" = local.account_id
          }
        }
      }
    ]
  })
}

# IAM role for Config
resource "aws_iam_role" "config" {
  count = var.environment == "production" ? 1 : 0

  name = "paintbox-config-role-${var.environment}"

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

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "config" {
  count = var.environment == "production" ? 1 : 0

  role       = aws_iam_role.config[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}

resource "random_id" "config_bucket_suffix" {
  count = var.environment == "production" ? 1 : 0

  byte_length = 8
}

# Security Hub for centralized security findings (Production only)
resource "aws_securityhub_account" "paintbox" {
  count = var.environment == "production" ? 1 : 0

  enable_default_standards = true
}

# Inspector for vulnerability assessments (Production only)
resource "aws_inspector2_enabler" "paintbox" {
  count = var.environment == "production" ? 1 : 0

  account_ids    = [local.account_id]
  resource_types = ["ECR", "EC2"]
}

# Secrets rotation Lambda function
resource "aws_lambda_function" "secret_rotation" {
  filename         = "secret_rotation.zip"
  function_name    = "paintbox-secret-rotation-${var.environment}"
  role            = aws_iam_role.lambda_rotation.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.secret_rotation_zip.output_base64sha256
  runtime         = "python3.11"
  timeout         = 300

  environment {
    variables = {
      SECRET_ARN = aws_secretsmanager_secret.paintbox_secrets.arn
    }
  }

  tags = local.common_tags
}

# Lambda function code
data "archive_file" "secret_rotation_zip" {
  type        = "zip"
  output_path = "secret_rotation.zip"
  source {
    content = <<EOF
import json
import boto3
import os
import secrets
import string

def handler(event, context):
    secret_arn = os.environ['SECRET_ARN']
    client = boto3.client('secretsmanager')

    # Generate new secrets
    new_secrets = {
        'JWT_SECRET': generate_secret(64),
        'ENCRYPTION_KEY': generate_secret(64),
        'NEXTAUTH_SECRET': generate_secret(64),
    }

    # Get current secret
    current_secret = client.get_secret_value(SecretId=secret_arn)
    current_data = json.loads(current_secret['SecretString'])

    # Update with new secrets
    current_data.update(new_secrets)

    # Update secret
    client.update_secret(
        SecretId=secret_arn,
        SecretString=json.dumps(current_data)
    )

    return {
        'statusCode': 200,
        'body': json.dumps('Secrets rotated successfully')
    }

def generate_secret(length):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))
EOF
    filename = "index.py"
  }
}

# IAM role for Lambda rotation function
resource "aws_iam_role" "lambda_rotation" {
  name = "paintbox-lambda-rotation-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "lambda_rotation" {
  name = "lambda-rotation-policy"
  role = aws_iam_role.lambda_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:UpdateSecret"
        ]
        Resource = aws_secretsmanager_secret.paintbox_secrets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.paintbox.arn
      }
    ]
  })
}

# EventBridge rule for scheduled secret rotation
resource "aws_cloudwatch_event_rule" "secret_rotation" {
  name                = "paintbox-secret-rotation-${var.environment}"
  description         = "Trigger secret rotation"
  schedule_expression = "rate(90 days)" # Rotate every 90 days

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "secret_rotation" {
  rule      = aws_cloudwatch_event_rule.secret_rotation.name
  target_id = "SecretRotationTarget"
  arn       = aws_lambda_function.secret_rotation.arn
}

resource "aws_lambda_permission" "secret_rotation" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.secret_rotation.arn
}
